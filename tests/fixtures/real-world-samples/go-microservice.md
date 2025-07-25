# Go Microservice Template

A production-ready microservice template built with Go, featuring clean architecture, comprehensive testing, and observability.

## Features

- 🏗️ Clean Architecture with dependency injection
- 🔐 JWT authentication and authorization
- 📊 Prometheus metrics and health checks
- 📝 Structured logging with zerolog
- 🗄️ PostgreSQL with migrations
- 🔄 Redis caching layer
- 🐳 Docker and Kubernetes ready
- 🧪 Comprehensive test suite
- 📖 OpenAPI/Swagger documentation

## Tech Stack

- **Language**: Go 1.21+
- **Framework**: Gin HTTP framework
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **Messaging**: NATS
- **Monitoring**: Prometheus, Grafana
- **Tracing**: Jaeger
- **Documentation**: Swagger/OpenAPI

## Quick Start

### Prerequisites

- Go 1.21 or higher
- Docker and Docker Compose
- Make (optional, for convenience commands)

### Local Development

```bash
# Clone repository
git clone https://github.com/example/go-microservice.git
cd go-microservice

# Start dependencies
docker-compose up -d postgres redis nats

# Install dependencies
go mod download

# Run database migrations
make migrate-up

# Start the service
make run

# Or run directly
go run cmd/server/main.go
```

### Using Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in production mode
docker-compose -f docker-compose.prod.yml up
```

## Configuration

The service uses environment variables for configuration:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=microservice
DB_USER=postgres
DB_PASSWORD=password
DB_SSL_MODE=disable

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Server
SERVER_PORT=8080
SERVER_READ_TIMEOUT=30s
SERVER_WRITE_TIMEOUT=30s

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
METRICS_PORT=9090
HEALTH_CHECK_PORT=8081
```

## API Documentation

The service provides OpenAPI/Swagger documentation at `/swagger/index.html` when running.

### Key Endpoints

```bash
# Health checks
GET /health          # Application health
GET /ready           # Readiness probe
GET /metrics         # Prometheus metrics

# Authentication
POST /auth/login     # User login
POST /auth/refresh   # Refresh token
POST /auth/logout    # User logout

# Users
GET /api/v1/users           # List users
POST /api/v1/users          # Create user
GET /api/v1/users/{id}      # Get user by ID
PUT /api/v1/users/{id}      # Update user
DELETE /api/v1/users/{id}   # Delete user
```

## Development

### Project Structure

```
├── cmd/
│   └── server/             # Application entrypoint
├── internal/
│   ├── config/             # Configuration management
│   ├── domain/             # Business logic and entities
│   ├── handler/            # HTTP handlers
│   ├── middleware/         # HTTP middleware
│   ├── repository/         # Data access layer
│   ├── service/            # Business logic layer
│   └── util/               # Utility functions
├── pkg/                    # Public packages
├── migrations/             # Database migrations
├── docs/                   # API documentation
├── scripts/                # Build and deployment scripts
└── tests/                  # Test files
```

### Available Commands

```bash
# Development
make run                    # Run the service
make build                  # Build binary
make clean                  # Clean build artifacts

# Testing
make test                   # Run all tests
make test-unit              # Run unit tests only
make test-integration       # Run integration tests
make test-coverage          # Generate coverage report
make test-race              # Run tests with race detection

# Database
make migrate-up             # Run database migrations
make migrate-down           # Rollback migrations
make migrate-create NAME=   # Create new migration

# Code Quality
make lint                   # Run golangci-lint
make fmt                    # Format code
make vet                    # Run go vet
make mod-tidy               # Tidy go modules

# Docker
make docker-build           # Build Docker image
make docker-run             # Run Docker container
make docker-push            # Push to registry

# Documentation
make docs                   # Generate API docs
make swagger                # Update Swagger specs
```

### Testing

```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run tests with race detection
go test -race ./...

# Run integration tests
go test -tags=integration ./tests/integration/...

# Run benchmarks
go test -bench=. ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

## Deployment

### Kubernetes

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Or use Helm
helm install microservice ./helm/microservice
```

### Docker Swarm

```bash
# Deploy to Docker Swarm
docker stack deploy -c docker-compose.prod.yml microservice
```

## Monitoring and Observability

### Metrics

The service exposes Prometheus metrics at `/metrics`:

- HTTP request duration and count
- Database connection pool stats
- Redis operation metrics
- Custom business metrics

### Logging

Structured JSON logging with configurable levels:

```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00Z",
  "message": "HTTP request processed",
  "method": "GET",
  "path": "/api/v1/users",
  "status": 200,
  "duration": "15ms",
  "request_id": "req-123"
}
```

### Tracing

Distributed tracing with Jaeger integration for request flow analysis.

### Health Checks

- `/health`: Application health status
- `/ready`: Readiness for traffic
- Database connectivity check
- Redis connectivity check
- External service dependencies

## Security

- JWT-based authentication
- CORS configuration
- Rate limiting middleware
- Input validation and sanitization
- SQL injection prevention
- Security headers middleware

## Performance

- Connection pooling for database and Redis
- Graceful shutdown handling
- Request timeout configuration
- Memory and CPU profiling endpoints
- Caching strategies for frequently accessed data

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Run the test suite (`make test`)
6. Run linting (`make lint`)
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.