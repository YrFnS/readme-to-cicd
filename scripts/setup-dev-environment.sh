#!/bin/bash

# Development Environment Setup Script for Integration & Deployment
# This script sets up the local development environment with all required services

set -e

echo "🚀 Setting up Integration & Deployment development environment..."

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/datasources
mkdir -p config/development
mkdir -p config/staging
mkdir -p config/production
mkdir -p logs

# Create Prometheus configuration
echo "⚙️ Creating Prometheus configuration..."
cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

scrape_configs:
  - job_name: 'integration-service'
    static_configs:
      - targets: ['integration-service:9091']
    scrape_interval: 5s
    metrics_path: /metrics

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

alerting:
  alertmanagers:
    - static_configs:
        - targets: []
EOF

# Create Grafana datasource configuration
echo "📊 Creating Grafana datasource configuration..."
cat > monitoring/grafana/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

# Create basic Grafana dashboard
echo "📈 Creating Grafana dashboard configuration..."
cat > monitoring/grafana/dashboards/dashboard.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF

# Create environment configuration files
echo "🔧 Creating environment configuration files..."
cat > config/development/app.json << 'EOF'
{
  "server": {
    "port": 8080,
    "metricsPort": 9091
  },
  "database": {
    "url": "postgresql://readme_user:readme_password@postgres:5432/readme_to_cicd",
    "pool": {
      "min": 2,
      "max": 10
    }
  },
  "redis": {
    "url": "redis://redis:6379",
    "keyPrefix": "readme-to-cicd:"
  },
  "vault": {
    "url": "http://vault:8200",
    "token": "myroot"
  },
  "monitoring": {
    "prometheus": {
      "url": "http://prometheus:9090"
    },
    "jaeger": {
      "endpoint": "http://jaeger:14268/api/traces"
    },
    "elasticsearch": {
      "url": "http://elasticsearch:9200"
    }
  },
  "logging": {
    "level": "debug",
    "format": "json"
  }
}
EOF

# Create Docker environment file
echo "🐳 Creating Docker environment file..."
cat > .env.integration << 'EOF'
# Integration & Deployment Environment Variables
NODE_ENV=development
LOG_LEVEL=debug

# Database
POSTGRES_DB=readme_to_cicd
POSTGRES_USER=readme_user
POSTGRES_PASSWORD=readme_password

# Redis
REDIS_URL=redis://redis:6379

# Vault
VAULT_URL=http://vault:8200
VAULT_TOKEN=myroot

# Monitoring
PROMETHEUS_URL=http://prometheus:9090
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
ELASTICSEARCH_URL=http://elasticsearch:9200

# Service Ports
PORT=8080
METRICS_PORT=9091
EOF

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
else
    echo "⚠️ package.json not found, skipping npm install"
fi

# Start the development environment
echo "🚀 Starting development environment..."
docker-compose -f docker-compose.integration.yml --env-file .env.integration up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
services=("redis:6379" "postgres:5432" "prometheus:9090" "grafana:3000" "vault:8200" "elasticsearch:9200" "kibana:5601" "jaeger:16686")

for service in "${services[@]}"; do
    IFS=':' read -r host port <<< "$service"
    if docker-compose -f docker-compose.integration.yml exec -T $host nc -z localhost $port 2>/dev/null; then
        echo "✅ $host is healthy"
    else
        echo "❌ $host is not responding"
    fi
done

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "📋 Service URLs:"
echo "   • Integration Service: http://localhost:8080"
echo "   • Prometheus: http://localhost:9090"
echo "   • Grafana: http://localhost:3000 (admin/admin)"
echo "   • Jaeger: http://localhost:16686"
echo "   • Kibana: http://localhost:5601"
echo "   • Vault: http://localhost:8200"
echo ""
echo "🔧 To stop the environment:"
echo "   docker-compose -f docker-compose.integration.yml down"
echo ""
echo "🔄 To restart the environment:"
echo "   docker-compose -f docker-compose.integration.yml restart"
echo ""
echo "📊 To view logs:"
echo "   docker-compose -f docker-compose.integration.yml logs -f [service-name]"
echo ""