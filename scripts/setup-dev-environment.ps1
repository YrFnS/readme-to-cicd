# Development Environment Setup Script for Integration & Deployment
# This script sets up the local development environment with all required services

$ErrorActionPreference = "Stop"

Write-Host "🚀 Setting up Integration & Deployment development environment..." -ForegroundColor Green

# Check if Docker and Docker Compose are installed
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not installed. Please install Docker Compose first." -ForegroundColor Red
    exit 1
}

# Create necessary directories
Write-Host "📁 Creating necessary directories..." -ForegroundColor Yellow
$directories = @(
    "monitoring/grafana/dashboards",
    "monitoring/grafana/datasources", 
    "config/development",
    "config/staging",
    "config/production",
    "logs"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "   Created: $dir" -ForegroundColor Gray
    }
}

# Create Prometheus configuration
Write-Host "⚙️ Creating Prometheus configuration..." -ForegroundColor Yellow
$prometheusConfig = @"
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
"@

$prometheusConfig | Out-File -FilePath "monitoring/prometheus.yml" -Encoding UTF8

# Create Grafana datasource configuration
Write-Host "📊 Creating Grafana datasource configuration..." -ForegroundColor Yellow
$grafanaDatasource = @"
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
"@

$grafanaDatasource | Out-File -FilePath "monitoring/grafana/datasources/prometheus.yml" -Encoding UTF8

# Create basic Grafana dashboard
Write-Host "📈 Creating Grafana dashboard configuration..." -ForegroundColor Yellow
$grafanaDashboard = @"
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
"@

$grafanaDashboard | Out-File -FilePath "monitoring/grafana/dashboards/dashboard.yml" -Encoding UTF8

# Create environment configuration files
Write-Host "🔧 Creating environment configuration files..." -ForegroundColor Yellow
$appConfig = @"
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
"@

$appConfig | Out-File -FilePath "config/development/app.json" -Encoding UTF8

# Create Docker environment file
Write-Host "🐳 Creating Docker environment file..." -ForegroundColor Yellow
$envFile = @"
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
"@

$envFile | Out-File -FilePath ".env.integration" -Encoding UTF8

# Install dependencies if package.json exists
if (Test-Path "package.json") {
    Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "⚠️ package.json not found, skipping npm install" -ForegroundColor Yellow
}

# Start the development environment
Write-Host "🚀 Starting development environment..." -ForegroundColor Green
docker-compose -f docker-compose.integration.yml --env-file .env.integration up -d

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check service health
Write-Host "🔍 Checking service health..." -ForegroundColor Yellow
$services = @(
    @{Name="Redis"; Host="localhost"; Port=6379},
    @{Name="PostgreSQL"; Host="localhost"; Port=5432},
    @{Name="Prometheus"; Host="localhost"; Port=9090},
    @{Name="Grafana"; Host="localhost"; Port=3000},
    @{Name="Vault"; Host="localhost"; Port=8200},
    @{Name="Elasticsearch"; Host="localhost"; Port=9200},
    @{Name="Kibana"; Host="localhost"; Port=5601},
    @{Name="Jaeger"; Host="localhost"; Port=16686}
)

foreach ($service in $services) {
    try {
        $connection = Test-NetConnection -ComputerName $service.Host -Port $service.Port -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-Host "✅ $($service.Name) is healthy" -ForegroundColor Green
        } else {
            Write-Host "❌ $($service.Name) is not responding" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ $($service.Name) is not responding" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎉 Development environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Service URLs:" -ForegroundColor Cyan
Write-Host "   • Integration Service: http://localhost:8080" -ForegroundColor White
Write-Host "   • Prometheus: http://localhost:9090" -ForegroundColor White
Write-Host "   • Grafana: http://localhost:3000 (admin/admin)" -ForegroundColor White
Write-Host "   • Jaeger: http://localhost:16686" -ForegroundColor White
Write-Host "   • Kibana: http://localhost:5601" -ForegroundColor White
Write-Host "   • Vault: http://localhost:8200" -ForegroundColor White
Write-Host ""
Write-Host "🔧 To stop the environment:" -ForegroundColor Cyan
Write-Host "   docker-compose -f docker-compose.integration.yml down" -ForegroundColor White
Write-Host ""
Write-Host "🔄 To restart the environment:" -ForegroundColor Cyan
Write-Host "   docker-compose -f docker-compose.integration.yml restart" -ForegroundColor White
Write-Host ""
Write-Host "📊 To view logs:" -ForegroundColor Cyan
Write-Host "   docker-compose -f docker-compose.integration.yml logs -f [service-name]" -ForegroundColor White
Write-Host ""