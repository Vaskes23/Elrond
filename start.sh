#!/bin/bash

# Elrond HS Code Classification - Startup Script
# This script helps set up and run the full-stack application

set -e  # Exit on any error

echo "🚀 Elrond HS Code Classification Startup"
echo "=========================================="

# Check if required files exist
echo "📋 Checking required files..."

if [ ! -f "hscodes.xlsx" ]; then
    echo "❌ Error: hscodes.xlsx not found!"
    echo "Please ensure the HS codes Excel file is in the project root."
    exit 1
fi

if [ ! -f "hs_embeddings_600970782048097937.pkl" ]; then
    echo "❌ Error: hs_embeddings_600970782048097937.pkl not found!"
    echo "Please ensure the embeddings file is in the project root."
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Creating from template..."
    cp .env.example .env
    echo "📝 Please edit .env and add your ANTHROPIC_API_KEY before continuing."
    echo "Press Enter when ready, or Ctrl+C to exit and edit .env first."
    read -r
fi

# Check if Docker is running
echo "🐳 Checking Docker..."
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "Please start Docker Desktop or Docker daemon and try again."
    exit 1
fi

if ! command -v docker-compose >/dev/null 2>&1; then
    echo "❌ Error: docker-compose not found!"
    echo "Please install Docker Compose and try again."
    exit 1
fi

# Load environment variables to check API key
if [ -f ".env" ]; then
    # Check if ANTHROPIC_API_KEY is set (without loading it)
    if ! grep -q "ANTHROPIC_API_KEY=sk-" .env 2>/dev/null; then
        echo "⚠️  Warning: ANTHROPIC_API_KEY not properly set in .env"
        echo "Make sure it starts with 'sk-' and is your actual API key from Anthropic."
        echo "Press Enter to continue anyway, or Ctrl+C to exit and fix it."
        read -r
    fi
fi

echo "✅ All checks passed!"

# Build and start the application
echo ""
echo "🏗️  Building Docker containers..."
docker-compose build

echo ""
echo "🚀 Starting the application..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🔍 Checking service status..."

# Check backend health
echo -n "Backend API: "
if curl -f -s http://localhost:5000/health >/dev/null 2>&1; then
    echo "✅ Healthy"
else
    echo "❌ Not responding"
    echo "Check backend logs with: docker-compose logs backend"
fi

# Check frontend
echo -n "Frontend: "
if curl -f -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not responding"
    echo "Check frontend logs with: docker-compose logs frontend"
fi

echo ""
echo "🎉 Application is starting up!"
echo ""
echo "📱 Access the application:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:5000"
echo "   API Docs:  http://localhost:5000/health"
echo ""
echo "📊 Monitor with:"
echo "   docker-compose logs -f        # All services"
echo "   docker-compose logs -f backend   # Backend only"
echo "   docker-compose logs -f frontend  # Frontend only"
echo ""
echo "🛑 Stop with:"
echo "   docker-compose down"
echo ""

# Wait a bit more and show final status
sleep 5

echo "🏁 Final Status Check:"
echo "====================="

if docker-compose ps | grep -q "Up"; then
    echo "✅ Services are running!"
    
    # Try to get backend status
    if backend_status=$(curl -s http://localhost:5000/health 2>/dev/null); then
        echo "🤖 Backend Status:"
        echo "$backend_status" | python3 -m json.tool 2>/dev/null || echo "$backend_status"
    fi
    
    echo ""
    echo "🎯 Ready to use! Open http://localhost:3000 in your browser."
else
    echo "❌ Some services may not be running properly."
    echo "Check logs with: docker-compose logs"
fi