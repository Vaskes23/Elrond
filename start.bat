@echo off
REM Elrond HS Code Classification - Windows Startup Script
REM This script helps set up and run the full-stack application on Windows

echo 🚀 Elrond HS Code Classification Startup
echo ==========================================

REM Check if required files exist
echo 📋 Checking required files...

if not exist "hscodes.xlsx" (
    echo ❌ Error: hscodes.xlsx not found!
    echo Please ensure the HS codes Excel file is in the project root.
    pause
    exit /b 1
)

if not exist "hs_embeddings_600970782048097937.pkl" (
    echo ❌ Error: hs_embeddings_600970782048097937.pkl not found!
    echo Please ensure the embeddings file is in the project root.
    pause
    exit /b 1
)

if not exist ".env" (
    echo ⚠️  Warning: .env file not found. Creating from template...
    copy .env.example .env
    echo 📝 Please edit .env and add your ANTHROPIC_API_KEY before continuing.
    pause
)

REM Check if Docker is running
echo 🐳 Checking Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: docker-compose not found!
    echo Please install Docker Compose and try again.
    pause
    exit /b 1
)

REM Check if API key is set
findstr /c:"ANTHROPIC_API_KEY=sk-" .env >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Warning: ANTHROPIC_API_KEY not properly set in .env
    echo Make sure it starts with 'sk-' and is your actual API key from Anthropic.
    pause
)

echo ✅ All checks passed!
echo.

REM Build and start the application
echo 🏗️  Building Docker containers...
docker-compose build
if %errorlevel% neq 0 (
    echo ❌ Docker build failed!
    pause
    exit /b 1
)

echo.
echo 🚀 Starting the application...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ❌ Docker start failed!
    pause
    exit /b 1
)

echo.
echo ⏳ Waiting for services to start...
timeout /t 15 /nobreak >nul

REM Check service health
echo 🔍 Checking service status...

REM Check backend health
echo|set /p="Backend API: "
curl -f -s http://localhost:5000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Healthy
) else (
    echo ❌ Not responding
    echo Check backend logs with: docker-compose logs backend
)

REM Check frontend
echo|set /p="Frontend: "
curl -f -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Running
) else (
    echo ❌ Not responding
    echo Check frontend logs with: docker-compose logs frontend
)

echo.
echo 🎉 Application is starting up!
echo.
echo 📱 Access the application:
echo    Frontend:  http://localhost:3000
echo    Backend:   http://localhost:5000
echo    API Docs:  http://localhost:5000/health
echo.
echo 📊 Monitor with:
echo    docker-compose logs -f        # All services
echo    docker-compose logs -f backend   # Backend only
echo    docker-compose logs -f frontend  # Frontend only
echo.
echo 🛑 Stop with:
echo    docker-compose down
echo.

REM Wait a bit more and show final status
timeout /t 10 /nobreak >nul

echo 🏁 Final Status Check:
echo =====================

docker-compose ps | findstr "Up" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Services are running!
    
    REM Try to get backend status
    curl -s http://localhost:5000/health >temp_health.json 2>nul
    if %errorlevel% equ 0 (
        echo 🤖 Backend Status:
        type temp_health.json
        del temp_health.json >nul 2>&1
    )
    
    echo.
    echo 🎯 Ready to use! Open http://localhost:3000 in your browser.
    echo.
    echo Press any key to open the application in your default browser...
    pause >nul
    start http://localhost:3000
) else (
    echo ❌ Some services may not be running properly.
    echo Check logs with: docker-compose logs
    pause
)