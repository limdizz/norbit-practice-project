@echo off
echo Starting WebAPI...
start "WebAPI" cmd /k "cd /d %~dp0WebAPI && dotnet run --launch-profile https"
timeout /t 5 >nul

echo Starting frontend server...
start "Frontend" cmd /k "cd /d %~dp0frontend && python -m http.server 5050"
timeout /t 3 >nul

echo Opening browser...
start "" http://localhost:5050

echo.
echo WebAPI: https://localhost:7123
echo Frontend: http://localhost:5050
echo.
pause