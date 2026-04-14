@echo off
setlocal

cd /d "%~dp0back_end"

echo Starting Smart Water backend on http://127.0.0.1:8001
echo.

if exist "D:\anaconda3\python.exe" (
  "D:\anaconda3\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8001
) else (
  python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
)

endlocal
