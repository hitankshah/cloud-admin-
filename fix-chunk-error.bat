@echo off
echo Fixing Next.js Chunk Loading Error...
echo.

cd /d "c:\Users\hitan\OneDrive\Desktop\cloud\cloud-Admin"

echo Step 1: Stopping any running Node processes...
taskkill /F /IM node.exe /T >nul 2>&1

echo Step 2: Cleaning .next directory...
if exist .next rmdir /s /q .next

echo Step 3: Cleaning node_modules/.cache...
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo Step 4: Installing dependencies (if needed)...
call npm install

echo.
echo ======================================
echo Cleanup Complete!
echo ======================================
echo.
echo Now run: npm run dev
echo.
pause
