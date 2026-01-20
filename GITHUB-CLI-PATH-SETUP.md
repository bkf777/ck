# GitHub CLI PATH 手动配置指南

## 📍 GitHub CLI 位置

```
C:\Program Files\GitHub CLI\gh.exe
```

## 🖱️ 手动添加到系统 PATH（3步）

### 步骤 1：打开环境变量编辑器

**选项 A：通过控制面板**
1. 按 `Win` 键，输入"环境变量"
2. 点击"编辑系统环境变量"
3. 在弹出的窗口中，点击右下方的"环境变量"按钮

**选项 B：通过设置**
1. 按 `Win + I` 打开设置
2. 搜索"环境变量"
3. 点击"编辑系统环境变量"

### 步骤 2：编辑 PATH 变量

1. 在"环境变量"窗口中，找到"系统变量"部分
2. 找到并选中变量名为 `Path` 的项
3. 点击"编辑"按钮
4. 在打开的"编辑环境变量"窗口中，点击"新建"
5. 输入以下路径：

```
C:\Program Files\GitHub CLI
```

6. 点击"确定"

### 步骤 3：应用并验证

1. 点击所有窗口的"确定"关闭设置
2. **关闭所有 PowerShell/CMD 窗口**
3. **打开一个新的 PowerShell 或 CMD 窗口**
4. 运行以下命令验证：

```powershell
gh --version
```

应该看到类似输出：
```
gh version 2.83.2 (2026-01-20)
```

## ✅ 验证步骤

### 方法 1：检查命令是否可用

```powershell
gh --version
```

### 方法 2：查看 gh 的完整路径

```powershell
Get-Command gh
```

### 方法 3：查看 PATH 中是否包含 GitHub CLI

```powershell
$env:Path -split ';' | Where-Object {$_ -like '*GitHub*'}
```

## 📸 截图参考

### 环境变量编辑窗口

在"编辑环境变量"窗口中应该看到：
- 一个列表，显示所有 PATH 条目
- "新建"按钮在窗口中
- 在列表最后添加新项：`C:\Program Files\GitHub CLI`

### 正确的结果

完成后，PATH 中应该包含：
```
...
C:\Program Files\Volta\bin
C:\Program Files\GitHub CLI
```

## 🔄 重要提示

⚠️ **必须关闭所有 PowerShell/CMD 窗口**

PATH 修改后，只有新打开的窗口才能看到新的 PATH 设置。
已打开的窗口仍然使用旧的 PATH。

## 🐛 故障排查

### 问题 1：添加后仍然找不到 gh 命令

**解决方案：**
1. 确认已关闭并重新打开 PowerShell
2. 检查路径是否拼写正确：`C:\Program Files\GitHub CLI`
3. 验证文件确实存在：
   ```powershell
   Test-Path "C:\Program Files\GitHub CLI\gh.exe"
   # 应该输出 True
   ```

### 问题 2：环境变量编辑器打不开

**解决方案：**
1. 在 PowerShell 中直接设置（需要管理员权限）：
   ```powershell
   # 以管理员身份运行 PowerShell
   $path = [Environment]::GetEnvironmentVariable('Path','Machine')
   $newPath = $path + ';C:\Program Files\GitHub CLI'
   [Environment]::SetEnvironmentVariable('Path',$newPath,'Machine')
   ```

2. 或使用 CMD 中的 setx 命令（需要管理员权限）：
   ```cmd
   setx PATH "%PATH%;C:\Program Files\GitHub CLI"
   ```

### 问题 3：查看当前 PATH 设置

```powershell
# 显示所有 PATH 条目，每行一个
$env:Path -split ';' | Format-Table

# 或查看系统 PATH（来源：环境变量设置）
[Environment]::GetEnvironmentVariable('Path','Machine')
```

## 📋 检查清单

- [ ] GitHub CLI 已安装在 `C:\Program Files\GitHub CLI`
- [ ] 已将 `C:\Program Files\GitHub CLI` 添加到系统 PATH
- [ ] 已关闭所有 PowerShell/CMD 窗口
- [ ] 打开了新的 PowerShell 窗口
- [ ] `gh --version` 命令返回版本号（成功！）
- [ ] 准备好登录 GitHub：`gh auth login`

## 🚀 下一步

PATH 配置完成后，运行以下命令：

```powershell
# 1. 验证版本
gh --version

# 2. 登录 GitHub
gh auth login

# 3. 配置 Secrets（根据需要）
gh secret set ALIYUN_REGISTRY_USERNAME --body "your-value"
# ... 其他配置项
```

参考完整的 Secrets 配置列表，请查看：[SECRETS-SETUP.md](SECRETS-SETUP.md)
