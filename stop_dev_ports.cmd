@echo off
setlocal enabledelayedexpansion

echo Stopping processes listening on ports 8001, 5173, 5174, and 5175...
echo.

for %%P in (8001 5173 5174 5175) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P" ^| findstr "LISTENING"') do (
    echo Stopping PID %%A on port %%P
    taskkill /PID %%A /F >nul 2>nul
  )
)

echo.
echo Done.

endlocal
