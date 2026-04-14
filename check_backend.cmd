@echo off
setlocal

echo Checking backend health...
echo.
curl http://127.0.0.1:8001/health
echo.

endlocal
