# GitHub CLI 环境变量配置指南

## 📍 安装位置

GitHub CLI 已安装在以下位置：

```
C:\Program Files\GitHub CLI\gh.exe
```

## 🔧 配置环境变量

### 方法 1：手动配置系统环境变量（推荐）

#### 步骤 1：打开系统环境变量设置

1. 按 `Win + X`，选择"系统"
2. 或搜索"环境变量"
3. 点击"编辑系统环境变量"

#### 步骤 2：编辑 PATH 变量

1. 在"系统属性"窗口中，点击"环境变量"按钮
2. 在"系统变量"部分，找到并选中 `Path` 变量
3. 点击"编辑"按钮
4. 点击"新建"，添加以下路径：

```
C:\Program Files\GitHub CLI
```

5. 点击"确定"保存

#### 步骤 3：重启 PowerShell

关闭所有 PowerShell 窗口，重新打开一个新的 PowerShell 窗口。

#### 步骤 4：验证安装

```powershell
gh --version
```

如果输出版本号（如 `gh version X.X.X`），说明配置成功！

### 方法 2：快速配置（PowerShell 管理员）

如果你有管理员权限，可以运行以下命令：

```powershell
# 获取当前 PATH
$currentPath = [Environment]::GetEnvironmentVariable('Path', 'Machine')

# 添加 GitHub CLI 路径
$newPath = "$currentPath;C:\Program Files\GitHub CLI"

# 设置新的 PATH
[Environment]::SetEnvironmentVariable('Path', $newPath, 'Machine')

Write-Host "已添加 GitHub CLI 到系统 PATH"
Write-Host "请关闭并重新打开 PowerShell"
```

### 方法 3：临时使用（当前 PowerShell 会话）

如果不想修改系统设置，可以在当前 PowerShell 会话中临时添加：

```powershell
$env:Path = "C:\Program Files\GitHub CLI;$env:Path"
```

**注意**：这只在当前 PowerShell 窗口有效，关闭后失效。

## ✅ 验证配置

### 1. 检查 gh 是否可用

```powershell
gh --version
# 输出示例：gh version 2.83.2 (2026-01-20)
```

### 2. 查看 gh 的位置

```powershell
Get-Command gh
# 输出示例：
# CommandType     Name                                               Source
# -----------     ----                                               ------
# Application     gh.exe                                             C:\Program Files\GitHub CLI\gh.exe
```

### 3. 查看可用的 gh 命令

```powershell
gh --help
```

## 🔐 登录 GitHub

配置完环境变量后，可以登录 GitHub：

```powershell
gh auth login
```

根据提示选择：
- **What is your preferred protocol for Git operations?** → HTTPS
- **Authenticate Git with your GitHub credentials?** → Yes
- **How would you like to authenticate GitHub CLI?** → Login with a web browser

然后会打开浏览器进行认证。

## 📋 常见问题

### Q1: 提示找不到 gh 命令？

**A:** 
1. 确认已将 `C:\Program Files\GitHub CLI` 添加到 PATH
2. 关闭所有 PowerShell 窗口，重新打开
3. 运行 `[Environment]::GetEnvironmentVariable('Path', 'Machine')` 验证 PATH 是否包含该路径

### Q2: 如何验证 PATH 是否配置正确？

**A:**
```powershell
# 查看所有 PATH 路径
$env:Path -split ';' | Where-Object {$_ -match 'GitHub'}

# 或查看完整 PATH
[Environment]::GetEnvironmentVariable('Path', 'Machine')
```

### Q3: 是否需要重启电脑？

**A:** 一般不需要，只需关闭并重新打开 PowerShell 即可。

### Q4: 如何撤销 PATH 修改？

**A:**
1. 打开"编辑系统环境变量"
2. 找到 `Path` 变量
3. 删除 `C:\Program Files\GitHub CLI` 这一项
4. 保存并重启 PowerShell

## 🚀 后续步骤

环境变量配置完成后：

1. **登录 GitHub**
   ```powershell
   gh auth login
   ```

2. **验证登录状态**
   ```powershell
   gh auth status
   ```

3. **配置 Secrets**
   ```powershell
   # 根据需要逐条添加
   gh secret set ALIYUN_REGISTRY_USERNAME --body "your-username"
   gh secret set ALIYUN_REGISTRY_PASSWORD --body "your-password"
   # ... 其他配置项
   ```

4. **查看已配置的 Secrets**
   ```powershell
   gh secret list
   ```

## 📚 相关命令

```powershell
# 显示版本
gh --version

# 显示帮助
gh --help

# 显示 gh 配置信息
gh config list

# 设置 Secrets
gh secret set <secret-name> --body "<secret-value>"

# 列出所有 Secrets
gh secret list

# 删除 Secret
gh secret delete <secret-name>

# 查看仓库信息
gh repo view

# 列出工作流运行
gh run list

# 查看特定运行的日志
gh run view <run-id> --log
```

## 📝 完整配置清单

- [ ] 将 `C:\Program Files\GitHub CLI` 添加到系统 PATH
- [ ] 重启 PowerShell
- [ ] 验证 `gh --version` 命令有效
- [ ] 运行 `gh auth login` 登录 GitHub
- [ ] 验证 `gh auth status` 显示已登录
- [ ] 使用 `gh secret set` 配置所需的 Secrets
- [ ] 使用 `gh secret list` 验证配置
