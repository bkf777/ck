import { useState, useEffect } from "react";

/**
 * Hook to track the availability of the AMIS SDK.
 * Listens for the 'amis-ready' event and performs a safety check.
 */
export function useAmisSdk() {
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    // 检查 SDK 是否已经存在（可能在组件挂载前已加载完成）
    if (typeof window !== "undefined" && (window as any).amisRequire) {
      setSdkReady(true);
      return;
    }

    const onAmisReady = () => {
      console.log("useAmisSdk: SDK ready event received");
      setSdkReady(true);
    };

    // 监听来自 AmisGlobalScript 的事件
    window.addEventListener("amis-ready", onAmisReady);

    // 安全检查轮询，防止事件丢失
    const interval = setInterval(() => {
      if ((window as any).amisRequire) {
        setSdkReady(true);
        clearInterval(interval);
      }
    }, 200);

    return () => {
      window.removeEventListener("amis-ready", onAmisReady);
      clearInterval(interval);
    };
  }, []);

  return sdkReady;
}
