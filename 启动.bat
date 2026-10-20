@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==============================================
echo   云上仙都 · 非遗数字化传承与VR全景云游览
echo ==============================================
echo.
echo 正在启动后端服务...
echo 启动后请用浏览器打开:  http://127.0.0.1:5000
echo 手机同局域网访问:       http://本机IP:5000
echo 按 Ctrl+C 停止服务
echo.
python app.py
pause
