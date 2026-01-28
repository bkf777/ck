# GitHub Secrets 手动配置指南

## 快速开始（推荐使用GitHub网页界面）

### 方法 1：通过网页界面（最简单）

1. **打开 GitHub 仓库设置**
   - 进入: https://github.com/bkf777/ck/settings/secrets/actions
   - 或在仓库首页: Settings > Secrets and variables > Actions

2. **点击 "New repository secret" 按钮**

3. **依次添加以下 Secrets**：

#### 必需配置（4个）

| Secret 名称                | 说明                     | 示例值                    |
| -------------------------- | ------------------------ | ------------------------- |
| `ALIYUN_REGISTRY_USERNAME` | 阿里云容器镜像服务用户名 | `your-username`           |
| `ALIYUN_REGISTRY_PASSWORD` | 阿里云容器镜像服务密码   | `your-password`           |
| `ANTHROPIC_API_KEY`        | Anthropic API密钥        | `sk-ant-xxxxx`            |
| `ANTHROPIC_API_URL`        | Anthropic API地址        | `https://claude.mk8s.cn/` |

#### 可选配置（LangSmith集成）

| Secret 名称          | 说明     | 示例值                            |
| -------------------- | -------- | --------------------------------- |
| `LANGSMITH_TRACING`  | 启用跟踪 | `true`                            |
| `LANGSMITH_ENDPOINT` | API端点  | `https://api.smith.langchain.com` |
| `LANGSMITH_API_KEY`  | API密钥  | `lsv2_pt_xxxxx`                   |
| `LANGSMITH_PROJECT`  | 项目名称 | `pr-advanced-toenail-67`          |

#### 可选配置（LangGraph部署）

| Secret 名称                | 说明             | 示例值                                                 |
| -------------------------- | ---------------- | ------------------------------------------------------ |
| `LANGGRAPH_DEPLOYMENT_URL` | LangGraph部署URL | `https://langgraph.example.com` 或 `http://agent:8123` |

#### 可选配置（自动部署）

| Secret 名称      | 说明      | 获取方式                  |
| ---------------- | --------- | ------------------------- |
| `DEPLOY_SSH_KEY` | SSH私钥   | 本地生成的id_rsa内容      |
| `DEPLOY_HOST`    | 服务器IP  | `123.45.67.89`            |
| `DEPLOY_USER`    | SSH用户名 | `root`                    |
| `DEPLOY_PATH`    | 部署路径  | `/opt/copilotkit`         |
| `DEPLOY_URL`     | 前端地址  | `https://app.example.com` |
| `API_URL`        | API地址   | `https://api.example.com` |

### 方法 2：使用 GitHub CLI（如果已安装）

```powershell
# 1. 登录 GitHub
gh auth login

# 2. 配置必需的 Secrets
gh secret set ALIYUN_REGISTRY_USERNAME --body "your-username"
gh secret set ALIYUN_REGISTRY_PASSWORD --body "your-password"
gh secret set ANTHROPIC_API_KEY --body "sk-ant-xxxxx"
gh secret set ANTHROPIC_API_URL --body "https://claude.mk8s.cn/"

# 3. 可选：配置 LangSmith
gh secret set LANGSMITH_TRACING --body "true"
gh secret set LANGSMITH_ENDPOINT --body "https://api.smith.langchain.com"
gh secret set LANGSMITH_API_KEY --body "lsv2_pt_xxxxx"
gh secret set LANGSMITH_PROJECT --body "pr-advanced-toenail-67"

# 4. 查看已配置的 Secrets
gh secret list
```

## 获取 Secrets 的值

### 1. 阿里云容器镜像服务

```
ALIYUN_REGISTRY_USERNAME
```

- 访问：https://cr.console.aliyun.com/
- 进入：左侧菜单 > 容器镜像服务 > 个人实例 > 访问凭证
- 获取：用户名

```
ALIYUN_REGISTRY_PASSWORD
```

- 同上页面获取密码
- 或设置新的固定密码

### 2. Anthropic API

```
ANTHROPIC_API_KEY
```

从项目的 `.env` 文件或Anthropic控制台获取：

```
sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

```
ANTHROPIC_API_URL
```

从项目的 `.env` 文件获取：

```
https://claude.mk8s.cn/
```

### 3. LangSmith（可选）

从项目的 `.env` 文件获取：

- `LANGSMITH_TRACING`
- `LANGSMITH_ENDPOINT`
- `LANGSMITH_API_KEY`
- `LANGSMITH_PROJECT`

### 4. 部署配置（可选）

#### 生成 SSH 密钥

在本地机器运行：

```bash
# 生成 SSH 密钥对
ssh-keygen -t rsa -b 4096 -C "deploy@copilotkit" -f ~/.ssh/copilotkit_deploy

# 获取私钥（用于 DEPLOY_SSH_KEY）
cat ~/.ssh/copilotkit_deploy

# 将公钥添加到服务器
ssh-copy-id -i ~/.ssh/copilotkit_deploy.pub user@your-server.com
```

#### 其他部署配置

- `DEPLOY_HOST`：服务器IP或域名
- `DEPLOY_USER`：SSH登录用户
- `DEPLOY_PATH`：应用部署目录（如 `/opt/copilotkit`）
- `DEPLOY_URL`：应用访问地址（如 `https://app.example.com`）
- `API_URL`：API访问地址（如 `https://api.example.com`）

## 验证配置

### 1. 通过网页界面验证

- Settings > Secrets and variables > Actions
- 应该看到已配置的 Secrets 列表

### 2. 通过 GitHub CLI 验证

```powershell
gh secret list
```

输出应该显示所有已配置的 Secrets：

```
ALIYUN_REGISTRY_USERNAME   Updated Jan 20, 2026 at 10:00
ALIYUN_REGISTRY_PASSWORD   Updated Jan 20, 2026 at 10:01
ANTHROPIC_API_KEY          Updated Jan 20, 2026 at 10:02
...
```

## 测试 CI/CD

### 1. 推送代码激活流程

```bash
# 推送到 develop 分支（触发 staging 部署）
git push origin develop

# 或推送到 main 分支（触发 production 部署）
git push origin main
```

### 2. 查看构建进度

- GitHub 仓库 > Actions 标签
- 或通过 CLI：`gh run list`

### 3. 查看详细日志

```powershell
# 列出最近的运行
gh run list

# 查看特定运行的日志
gh run view <RUN_ID> --log
```

## 常见问题

### Q1: 如何重新设置某个 Secret？

**A:** 在网页界面点击 Secret 旁的"Update"或直接删除并重新添加

### Q2: Secret 的值可以包含特殊字符吗？

**A:** 可以，GitHub CLI 会自动处理转义

### Q3: 如何删除不需要的 Secret？

**A:** 点击 Secret 旁的删除按钮，或使用 CLI：

```powershell
gh secret delete SECRET_NAME
```

### Q4: 推送代码后 CI/CD 没有触发？

**A:** 检查以下几点：

1. 确认推送到了 `main` 或 `develop` 分支
2. 检查 `.github/workflows/ci-cd.yml` 文件是否存在
3. 在 Actions 标签中查看是否有错误信息

### Q5: 如何手动运行工作流？

**A:**

- 网页界面：Actions > CI/CD Pipeline > Run workflow
- CLI：`gh workflow run ci-cd.yml`

## 快速检查清单

在配置完成前，请检查：

- [ ] `ALIYUN_REGISTRY_USERNAME` ✓
- [ ] `ALIYUN_REGISTRY_PASSWORD` ✓
- [ ] `ANTHROPIC_API_KEY` ✓
- [ ] `ANTHROPIC_API_URL` ✓
- [ ] 可选项已按需配置
- [ ] 在 GitHub 网页界面验证了所有 Secrets
- [ ] 已推送代码到 `main` 或 `develop` 分支
- [ ] 已在 Actions 标签中验证工作流已触发

## 获取帮助

- 查看具体的工作流错误：GitHub > Actions > CI/CD Pipeline > 点击失败的任务
- 查看详细日志：点击展开各个步骤
- 本地测试：`docker-compose -f docker-compose.prod.yml up`
