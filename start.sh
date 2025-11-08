#!/bin/bash

# Digital Balance - Quick Start Script

echo "🚀 Starting Digital Balance Finance Assistant..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your API keys:"
    echo "   - Set OPENAI_API_KEY if using OpenAI"
    echo "   - Or configure alternative LLM provider"
    echo ""
    echo "After editing .env, run this script again."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

# Check if files exist
if [ ! -f "VENDAS SETEMBRO.xlsx" ] && [ ! -f "Extracto Bai 02 - Setembro 2025.pdf" ]; then
    echo "⚠️  Sample files not found in current directory"
    echo "Expected files:"
    echo "  - VENDAS SETEMBRO.xlsx (or any sales Excel file)"
    echo "  - Extracto Bai 02 - Setembro 2025.pdf (or any bank PDF)"
    echo ""
    echo "You can still start the system and upload files through the web interface."
    echo ""
fi

echo "🐳 Starting Docker containers..."
docker-compose up --build -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "✅ Digital Balance is now running!"
    echo ""
    echo "📊 Access the application:"
    echo "   Frontend:  http://localhost:3000"
    echo "   API:       http://localhost:3001"
    echo "   Health:    http://localhost:3001/health"
    echo ""
    echo "📝 To view logs:"
    echo "   docker-compose logs -f"
    echo ""
    echo "🛑 To stop:"
    echo "   docker-compose down"
    echo ""
else
    echo "❌ Failed to start services. Check logs with:"
    echo "   docker-compose logs"
    exit 1
fi

