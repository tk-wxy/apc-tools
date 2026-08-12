@echo off
chcp 65001 >nul
title APC 知识库浏览器
echo ============================================
echo   APC 知识库浏览器 - 一键启动
echo ============================================
echo.

cd /d "%~dp0"

rem ── 检查 Node.js 是否安装 ──
where node >nul 2>nul
if errorlevel 1 (
    echo [✖ 错误] 未检测到 Node.js，无法启动服务器。
    echo   请先安装 Node.js: https://nodejs.org/
    echo   安装完成后重新运行本脚本。
    echo.
    pause
    exit /b 1
)
echo [✓] Node.js 已安装: 
node --version

rem ── 检查知识库目录是否存在 ──
if not exist "..\apc\.apc" (
    echo.
    echo [⚠ 警告] 未找到知识库目录: ..\apc\.apc
    echo   服务器仍将启动，但知识库会显示为空。
    echo   请确认项目结构是否正确。
    echo.
)

rem ── 检查端口 3000 是否已被占用 ──
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
    echo.
    echo [✖ 错误] 端口 3000 已被占用。
    echo   可能已有 APC 服务器在运行，或其它程序占用了该端口。
    echo.
    echo   解决办法:
    echo     1. 若已有 APC 服务器运行，请直接访问 http://localhost:3000
    echo     2. 关闭占用端口的程序后重试
    echo     3. 修改 server.js 中的 PORT 变量使用其它端口
    echo.
    pause
    exit /b 1
)

rem ── 启动服务器 ──
echo.
echo [→] 正在启动 APC 知识库服务器...
start "APC Server" cmd /k "node server.js"

rem ── 等待服务器就绪（最多等 5 秒） ──
set /a retry=0
:wait_loop
timeout /t 1 /nobreak >nul
set /a retry+=1
curl -s -o nul http://localhost:3000/api/meta 2>nul
if not errorlevel 1 goto ready
if %retry% geq 5 goto fail
goto wait_loop

:ready
echo [✓] 服务器已就绪！
echo.
echo 正在打开浏览器...
start http://localhost:3000
echo.
echo ============================================
echo   服务器运行中:  http://localhost:3000
echo   关闭 "APC Server" 窗口即可停止服务器。
echo ============================================
echo.
pause
exit /b 0

:fail
echo.
echo [✖ 错误] 服务器启动超时（5 秒内未响应）。
echo   请检查 "APC Server" 窗口中的错误信息。
echo.
pause
exit /b 1