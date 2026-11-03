@echo off
title TechZone IT Store Server
cd /d "%~dp0"
echo ==============================================
echo  TechZone IT Innovation & Hardware Solutions
echo  Frontend : %~dp0frontend
echo  Backend  : %~dp0backend
echo  Server is starting on http://localhost:5000
echo ==============================================
node backend/server.js
pause
