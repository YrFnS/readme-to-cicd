# Go Gin Microservice

A production-ready Go microservice built with Gin framework, featuring authentication, database integration, and comprehensive testing.

## Features

- 🚀 **Gin Framework** - High-performance HTTP web framework
- 🔐 **JWT Authentication** - Secure token-based authentication
- 🗄️ **PostgreSQL** - Reliable relational database
- 📊 **Redis** - Caching and session storage
- 🧪 **Comprehensive Testing** - Unit and integration tests
- 📝 **Swagger Documentation** - Auto-generated API docs
- 🔍 **Structured Logging** - Zap logger for production
- 🐳 **Docker Support** - Containerized deployment
- 🔄 **Database Migrations** - Version-controlled schema changes
- 📈 **Health Checks** - Service monitoring endpoints

## Getting Started

### Prerequisites

- Go 1.21+
- PostgreSQL 13+
- Redis 6+
- Docker (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/example/go-gin-microservice.git
cd go-gin-microservice

# Install dependencies
go mod download

# Copy environment configuration
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
make migrate-up

# Start the server
make run

# Or run in development mode with hot reload
make dev
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=8080
GIN_MODE=debug

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=microservice_db
DB_SSL_MODE=disable

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRY=24h

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## API Endpoints

### Health Check
- `GET /health` - Service health status
- `GET /ready` - Service readiness check

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `POST /api/v1/auth/logout` - User logout

### Users
- `GET /api/v1/users` - List users (authenticated)
- `GET /api/v1/users/:id` - Get user by ID
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Example Resource
- `GET /api/v1/items` - List items
- `POST /api/v1/items` - Create item
- `GET /api/v1/items/:id` - Get item by ID
- `PUT /api/v1/items/:id` - Update item
- `DELETE /api/v1/items/:id` - Delete item

## Development

### Available Commands

```bash
# Run the application
make run

# Run in development mode with hot reload
make dev

# Build the application
make build

# Run tests
make test

# Run tests with coverage
make test-coverage

# Run linting
make lint

# Format code
make fmt

# Run database migrations
make migrate-up

# Rollback database migrations
make migrate-down

# Generate Swagger documentation
make swagger

# Build Docker image
make docker-build

# Run with Docker Compose
make docker-up
```

### Project Structure

```
├── cmd/
│   └── server/
│       └── main.go          # Application entry point
├── internal/
│   ├── config/              # Configuration management
│   ├── handlers/            # HTTP handlers
│   ├── middleware/          # HTTP middleware
│   ├── models/              # Data models
│   ├── repository/          # Data access layer
│   ├── services/            # Business logic
│   └── utils/               # Utility functions
├── pkg/
│   ├── auth/                # Authentication utilities
│   ├── database/            # Database connection
│   ├── logger/              # Logging utilities
│   └── validator/           # Input validation
├── migrations/              # Database migrations
├── docs/                    # Swagger documentation
├── tests/                   # Test files
├── scripts/                 # Build and deployment scripts
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile               # Docker image configuration
├── Makefile                 # Build automation
├── go.mod                   # Go module definition
└── go.sum                   # Go module checksums
```

### Testing

```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run tests with detailed coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Run specific test package
go test ./internal/handlers

# Run tests with race detection
go test -race ./...

# Run benchmarks
go test -bench=. ./...
```

### Database Migrations

```bash
# Create a new migration
migrate create -ext sql -dir migrations -seq create_users_table

# Run migrations
migrate -path migrations -database "postgresql://user:password@localhost/dbname?sslmode=disable" up

# Rollback migrations
migrate -path migrations -database "postgresql://user:password@localhost/dbname?sslmode=disable" down 1
```

## Deployment

### Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in production mode
docker-compose -f docker-compose.prod.yml up -d

# Scale the service
docker-compose up --scale app=3
```

### Manual Deployment

```bash
# Build for production
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main cmd/server/main.go

# Run the binary
./main
```

### Kubernetes

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -l app=go-gin-microservice

# View logs
kubectl logs -f deployment/go-gin-microservice
```

## API Documentation

- **Swagger UI**: `http://localhost:8080/swagger/index.html`
- **OpenAPI Spec**: `http://localhost:8080/swagger/doc.json`

Generate documentation:

```bash
# Install swag
go install github.com/swaggo/swag/cmd/swag@latest

# Generate docs
swag init -g cmd/server/main.go
```

## Monitoring

### Health Checks

- `GET /health` - Returns service health status
- `GET /ready` - Returns service readiness status

### Metrics

The service exposes Prometheus metrics at `/metrics` endpoint:

- HTTP request duration
- HTTP request count
- Database connection pool stats
- Custom business metrics

### Logging

Structured logging with Zap:

```go
logger.Info("User created",
    zap.String("user_id", userID),
    zap.String("email", email),
    zap.Duration("duration", time.Since(start)),
)
```

## Security

- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection prevention
- CORS configuration
- Rate limiting middleware
- Security headers middleware

## Performance

- Connection pooling for database
- Redis caching for frequently accessed data
- Gin's high-performance HTTP router
- Graceful shutdown handling
- Request timeout middleware
- Compression middleware

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`make test`)
6. Run linting (`make lint`)
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.