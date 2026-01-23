import { ChatAnthropic } from "@langchain/anthropic";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Global state to track key usage index
let keyIndex = 0;

export function getRotatedApiKey(): string | undefined {
  const keysEnv = process.env.ANTHROPIC_API_KEYS;
  if (keysEnv) {
    const keys = keysEnv
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k);
    if (keys.length > 0) {
      const key = keys[keyIndex % keys.length];
      keyIndex++;
      return key;
    }
  }
  return process.env.ANTHROPIC_API_KEY;
}

/**
 * Persistent Token Bucket Rate Limiter with Minimum Interval
 * Uses a local file to persist request timestamps across process restarts.
 */
class RateLimiter {
  private queue: number[] = [];
  private limit: number;
  private window: number;
  private minInterval: number;
  private lastRequestTime: number = 0;
  private persistenceFile: string;

  constructor(limit: number, windowMs: number, minIntervalMs: number = 0) {
    this.limit = limit;
    this.window = windowMs;
    this.minInterval = minIntervalMs;

    const projectHash = Buffer.from(process.cwd())
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8);
    this.persistenceFile = path.join(
      os.tmpdir(),
      `gemini-agent-ratelimit-${projectHash}.json`,
    );

    console.log(
      `[RateLimiter] Initialized with limit ${limit}/${windowMs}ms, persistence: ${this.persistenceFile}`,
    );
    this.loadState();
  }

  private loadState() {
    try {
      if (fs.existsSync(this.persistenceFile)) {
        const data = JSON.parse(fs.readFileSync(this.persistenceFile, "utf-8"));
        if (Array.isArray(data.queue)) {
          const now = Date.now();
          this.queue = data.queue.filter((t: number) => now - t < this.window);
        }
        if (typeof data.lastRequestTime === "number") {
          this.lastRequestTime = data.lastRequestTime;
        }
      }
    } catch (e) {
      // Ignore read errors
    }
  }

  private saveState() {
    try {
      fs.writeFileSync(
        this.persistenceFile,
        JSON.stringify({
          queue: this.queue,
          lastRequestTime: this.lastRequestTime,
        }),
      );
    } catch (e) {
      // Ignore write errors
    }
  }

  /**
   * Waits until a token is available.
   */
  async acquire(): Promise<void> {
    this.loadState();

    while (true) {
      const now = Date.now();

      const effectiveLastTime = Math.max(
        this.lastRequestTime,
        this.queue.length > 0 ? this.queue[this.queue.length - 1] : 0,
      );
      const timeSinceLast = now - effectiveLastTime;

      if (timeSinceLast < this.minInterval) {
        const waitTime = this.minInterval - timeSinceLast;
        console.log(
          `[RateLimiter] Smoothing interval: Waiting ${waitTime}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      this.queue = this.queue.filter((t) => now - t < this.window);

      if (this.queue.length < this.limit) {
        this.queue.push(now);
        this.lastRequestTime = now;
        this.saveState();
        console.log(
          `[RateLimiter] Token acquired. Queue size: ${this.queue.length}/${this.limit}`,
        );
        return;
      }

      const oldest = this.queue[0];
      const waitTime = this.window - (now - oldest) + 1000; // Increased buffer to 1s

      console.log(
        `[RateLimiter] Limit reached (${this.limit}/${this.window / 1000}s). Waiting ${Math.ceil(waitTime / 1000)}s... (Queue: ${this.queue.length})`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.loadState();
    }
  }
}

// Global rate limiter instance
// Using a slightly more conservative limit: 4 RPM to avoid edge cases
const globalRateLimiter = new RateLimiter(4, 60000, 3000);

export interface CreateChatModelOptions {
  temperature?: number;
  modelName?: string;
  maxRetries?: number;
  [key: string]: any;
}

export function createChatModel(options: CreateChatModelOptions = {}) {
  const apiKey = getRotatedApiKey();
  const apiUrl = process.env.ANTHROPIC_API_URL;
  const modelName =
    options.modelName || process.env.ANTHROPIC_MODEL || "glm-4.7";

  const { thinking, ...safeOptions } = options;

  const model = new ChatAnthropic({
    temperature: options.temperature ?? 0.3,
    model: modelName,
    anthropicApiKey: apiKey,
    anthropicApiUrl: apiUrl,
    maxRetries: options.maxRetries ?? 5,
    ...safeOptions,
  });

  const originalInvoke = model.invoke.bind(model);
  model.invoke = async (...args: any[]) => {
    await globalRateLimiter.acquire();
    return originalInvoke(...args);
  };

  return model;
}
