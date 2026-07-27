@echo off
chcp 65001 >nul
where node.exe >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装并确保 node.exe 已加入 PATH。
    pause
    exit /b 1
)
node.exe "%~dp0apply.cjs" %*
if errorlevel 1 pause