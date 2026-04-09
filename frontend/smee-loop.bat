@echo off
:loop
echo Starting smee.io...
call smee -u https://smee.io/arclancer123 -p 3000 -P /api/telegram/deal-copilot
echo Smee crashed or stopped, restarting in 2 seconds...
timeout /t 2 >nul
goto loop
