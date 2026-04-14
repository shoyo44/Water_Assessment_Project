@echo off
setlocal

cd /d "%~dp0front_end"

echo Starting Aqua Campus frontend on http://127.0.0.1:5173
echo.
echo If this says port 5173 is already in use, run stop_dev_ports.cmd first.
echo.

npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort

endlocal
