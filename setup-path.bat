@echo off
REM GitHub CLI 环境变量配置脚本

echo ======================================
echo GitHub CLI 环境变量配置
echo ======================================
echo.

REM 检查是否已添加到 PATH
echo 检查 PATH 配置...
echo %PATH% | find "GitHub CLI" > nul
if %errorlevel% equ 0 (
    echo [OK] GitHub CLI 已在 PATH 中
    echo.
    gh --version
) else (
    echo [添加中] 将 GitHub CLI 添加到系统 PATH...
    
    REM 使用 setx 添加到系统 PATH
    setx PATH "%PATH%;C:\Program Files\GitHub CLI"
    
    echo.
    echo [OK] GitHub CLI 已添加到系统 PATH
    echo.
    echo 重要：请关闭所有 PowerShell/CMD 窗口，重新打开一个新的窗口
    echo.
    pause
)
