# Go Gin Microservice

A high-performance microservice built with Go and the Gin web framework for handling user authentication and profile management.

## Features

- 🚀 High-performance HTTP server with Gin
- 🔐 JWT authentication middleware
- 📊 Structured logging with logrus
- 🐳 Docker containerization
- ☸️ Kubernetes deployment ready
- 📈 Prometheus metrics
- 🧪 Comprehensive test coverage
- 🔧 Graceful shutdown
- 📝 OpenAPI/Swagger documentation

## Tech Stack

- **Language**: Go 1.21
- **Web Framework**: Gin
- **Database**: PostgreSQL with GORM
- **Authentication**: JWT
- **Logging**: Logrus
- **Metrics**: Prometheus
- **Documentation**: Swaggo
- **Testing**: Testify
- **Containerization**: Docker
- **Orchestration**: Kubernetes

## API Endpoints

### Health
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/refresh` - Refresh token

### Users
- `GET /api/v1/users/profile` - Get user profile (authenticated)
- `PUT /api/v1/users/profile` - Update user profile (authenticated)
- `GET /api/v1/users` - List users (admin only)

## Getting Started

### Prerequisites

- Go 1.21+
- PostgreSQL 13+
- Docker (optional)

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd go-gin-microservice
```

2. **Install dependencies**
```bash
go mod download
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Run database migrations**
```bash
go run cmd/migrate/main.go
```

5. **Start the server**
```bash
go run cmd/server/main.go
```

The server will start on `http://localhost:8080`

### Docker Development

```bash
docker-compose up --build
```

## Project Structure

```
├── cmd/
│   ├── server/          # Main application entry point
│   └── migrate/         # Database migration tool
├── internal/
│   ├── api/            # HTTP handlers and routes
│   ├── auth/           # Authentication logic
│   ├── config/         # Configuration management
│   ├── database/       # Database connection and models
│   ├── middleware/     # HTTP middleware
│   └── services/       # Business logic
├── pkg/
│   ├── logger/         # Logging utilities
│   └── utils/          # Common utilities
├── deployments/
│   ├── docker/         # Docker configurations
│   └── k8s/           # Kubernetes manifests
├── docs/              # API documentation
├── scripts/           # Build and deployment scripts
└── tests/             # Test files
```

## Configuration

Environment variables:

```bash
# Server
PORT=8080
GIN_MODE=release

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=microservice

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Testing

### Run all tests
```bash
go test ./...
```

### Run tests with coverage
```bash
go test -cover ./...
```

### Run integration tests
```bash
go test -tags=integration ./...
```

### Run benchmarks
```bash
go test -bench=. ./...
```

## Building

### Build binary
```bash
go build -o bin/server cmd/server/main.go
```

### Build with optimizations
```bash
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags '-w -s' -o bin/server cmd/server/main.go
```

## Docker

### Build image
```bash
docker build -t go-gin-microservice .
```

### Run container
```bash
docker run -p 8080:8080 go-gin-microservice
```

### Multi-stage build
The Dockerfile uses multi-stage builds for optimized production images.

## Kubernetes Deployment

### Deploy to Kubernetes
```bash
kubectl apply -f deployments/k8s/
```

### Check deployment status
```bash
kubectl get pods -l app=go-gin-microservice
```

### View logs
```bash
kubectl logs -f deployment/go-gin-microservice
```

## Monitoring

### Metrics
Prometheus metrics are available at `/metrics`:
- HTTP request duration
- HTTP request count
- Active connections
- Memory usage
- Go runtime metrics

### Health Checks
- Liveness probe: `/health`
- Readiness probe: `/health/ready`

### Logging
Structured JSON logging with configurable levels:
- Request/response logging
- Error tracking
- Performance metrics

## Security

- JWT token validation
- CORS middleware
- Rate limiting
- Input validation
- SQL injection prevention
- Security headers

## Performance

- Connection pooling
- Graceful shutdown
- Request timeout handling
- Memory optimization
- CPU profiling support

## API Documentation

Swagger documentation is available at `/swagger/index.html` when running in development mode.

Generate docs:
```bash
swag init -g cmd/server/main.go
```

## Development Tools

### Code formatting
```bash
go fmt ./...
```

### Linting
```bash
golangci-lint run
```

### Security scanning
```bash
gosec ./...
```

### Dependency updates
```bash
go mod tidy
go mod vendor
```

## Deployment

### Environment-specific configs
- Development: `.env.dev`
- Staging: `.env.staging`
- Production: `.env.prod`

### CI/CD Pipeline
The service includes GitHub Actions workflows for:
- Testing
- Building
- Security scanning
- Docker image building
- Kubernetes deployment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for your changes
4. Ensure all tests pass
5. Run linting and formatting
6. Submit a pull request

## License

MIT License