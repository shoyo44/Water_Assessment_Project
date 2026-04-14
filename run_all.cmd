@echo off
setlocal

echo Starting backend and frontend in separate terminal windows...
echo.

start "Smart Water Backend" cmd /k "%~dp0run_backend.cmd"
start "Aqua Campus Frontend" cmd /k "%~dp0run_frontend.cmd"

echo Backend:  http://127.0.0.1:8001
echo Frontend: http://127.0.0.1:5173
echo.
echo Browser URL:
echo http://127.0.0.1:5173
echo.

endlocal
