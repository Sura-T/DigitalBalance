@echo off
REM Digital Balance - Quick Start Script for Windows

echo Starting Digital Balance Finance Assistant...
echo.

REM Check if .env exists
if not exist .env (
    echo .env file not found!
    echo Creating .env from .env.example...
    copy .env.example .env
    echo .env file created. Please edit it with your API keys:
    echo    - Set OPENAI_API_KEY if using OpenAI
    echo    - Or configure alternative LLM provider
    echo.
    echo After editing .env, run this script again.
    pause
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo Starting Docker containers...
docker-compose up --build -d

echo.
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo.
echo Digital Balance is now running!
echo.
echo Access the application:
echo    Frontend:  http://localhost:3000
echo    API:       http://localhost:3001
echo    Health:    http://localhost:3001/health
echo.
echo To view logs:
echo    docker-compose logs -f
echo.
echo To stop:
echo    docker-compose down
echo.
pause

