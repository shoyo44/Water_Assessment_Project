@echo off
setlocal

cd /d "%~dp0back_end"

echo Starting Smart Water backend on http://127.0.0.1:8000
echo Using conda env: assess
echo.

REM Use the assess environment's Python directly
set PYTHON=D:\anaconda3\envs\assess\python.exe

if not exist "%PYTHON%" (
    echo [ERROR] Could not find assess env at %PYTHON%
    echo Run: conda create -n assess python=3.13
    pause
    exit /b 1
)

"%PYTHON%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

endlocal
