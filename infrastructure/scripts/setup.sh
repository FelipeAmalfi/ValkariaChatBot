#!/bin/bash
# ValkariaChatBot — Bootstrap script
set -e

echo "🏰 ValkariaChatBot — Setup"
echo "=========================="

# Check required tools
command -v npm >/dev/null 2>&1 || { echo "❌ npm not found. Install Node.js 20+: https://nodejs.org"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ docker not found. Install Docker Desktop."; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "❌ docker compose not found."; exit 1; }

# Copy env if not exists
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✅ .env created from .env.example — fill in your values."
else
  echo "ℹ️  .env already exists — skipped."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start infrastructure
echo "🐳 Starting Docker services..."
docker compose -f infrastructure/docker/docker-compose.yml up -d

# Wait for postgres
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec valkaria_postgres pg_isready -U valkaria -d valkaria_db 2>/dev/null; do
  sleep 2
done
echo "✅ PostgreSQL ready."

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  npm run dev                              — start all apps"
echo "  npm run dev -w @valkaria/api             — start API only"
echo "  npm run dev -w @valkaria/web             — start Web only"
echo ""
echo "Services:"
echo "  PostgreSQL: localhost:5432"
echo "  Redis:      localhost:6379"
echo "  Neo4j:      localhost:7474 (browser) / localhost:7687 (bolt)"
echo "  API:        http://localhost:3001"
echo "  Web:        http://localhost:3000"
