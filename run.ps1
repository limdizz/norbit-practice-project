Write-Host "Starting WebAPI..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\WebAPI'; dotnet run --launch-profile https"

Start-Sleep -Seconds 3

Write-Host "Starting frontend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; python -m http.server 5050"

Write-Host "`nWebAPI: https://localhost:7123" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5050" -ForegroundColor Cyan