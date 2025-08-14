# Java Spring Boot Application

A modern Spring Boot application with REST API, database integration, and comprehensive testing.

## Features

- 🌱 Spring Boot 3.1 with Java 17
- 🔐 Spring Security with JWT authentication
- 🗄️ JPA/Hibernate with PostgreSQL
- 📝 OpenAPI 3 documentation
- 🧪 Comprehensive test suite
- 🐳 Docker containerization
- 📊 Actuator health checks and metrics

## Tech Stack

- **Framework**: Spring Boot 3.1
- **Language**: Java 17
- **Build Tool**: Maven
- **Database**: PostgreSQL
- **Security**: Spring Security + JWT
- **Documentation**: SpringDoc OpenAPI
- **Testing**: JUnit 5, Mockito, TestContainers
- **Containerization**: Docker

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh JWT token

### Users
- `GET /api/users` - List users (admin only)
- `GET /api/users/{id}` - Get user by ID
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/products/{id}` - Get product by ID
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product

## Getting Started

### Prerequisites

- Java 17+
- Maven 3.8+
- PostgreSQL 13+
- Docker (optional)

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd java-spring-boot
```

2. **Set up database**
```bash
# Using Docker
docker run --name postgres-dev \
  -e POSTGRES_DB=springboot_app \
  -e POSTGRES_USER=dev \
  -e POSTGRES_PASSWORD=dev \
  -p 5432:5432 -d postgres:13
```

3. **Configure application**
```bash
cp src/main/resources/application-dev.yml.example src/main/resources/application-dev.yml
# Edit database connection settings
```

4. **Run the application**
```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

The application will start on `http://localhost:8080`

### Docker Development

```bash
docker-compose up --build
```

## Testing

### Run all tests
```bash
./mvnw test
```

### Run integration tests
```bash
./mvnw test -Dtest="**/*IntegrationTest"
```

### Run with coverage
```bash
./mvnw test jacoco:report
```

Coverage reports are generated in `target/site/jacoco/`

## Building

### Build JAR
```bash
./mvnw clean package
```

### Build Docker image
```bash
docker build -t spring-boot-app .
```

### Build with Maven profiles
```bash
# Development build
./mvnw clean package -Pdev

# Production build
./mvnw clean package -Pprod
```

## Database

### Migrations
Database migrations are handled by Flyway:

```bash
./mvnw flyway:migrate
./mvnw flyway:info
./mvnw flyway:clean  # WARNING: Drops all data
```

### Schema
Migration files are located in `src/main/resources/db/migration/`

## Configuration

### Profiles
- `dev` - Development profile with H2 database
- `test` - Testing profile with TestContainers
- `prod` - Production profile with PostgreSQL

### Environment Variables

Required for production:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `SPRING_PROFILES_ACTIVE` - Active profile (prod)

Optional:
- `SERVER_PORT` - Server port (default: 8080)
- `LOG_LEVEL` - Logging level (default: INFO)

## API Documentation

API documentation is available at:
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

## Monitoring

### Health Checks
- Health endpoint: `/actuator/health`
- Readiness probe: `/actuator/health/readiness`
- Liveness probe: `/actuator/health/liveness`

### Metrics
- Metrics endpoint: `/actuator/metrics`
- Prometheus metrics: `/actuator/prometheus`

## Security

- JWT-based authentication
- CORS configuration
- SQL injection prevention
- XSS protection
- CSRF protection for non-API endpoints
- Security headers configuration

## Deployment

### Docker
```bash
docker run -p 8080:8080 \
  -e DATABASE_URL=jdbc:postgresql://host:5432/db \
  -e JWT_SECRET=your-secret \
  spring-boot-app
```

### Kubernetes
```bash
kubectl apply -f k8s/
```

### Environment Variables for Production
```bash
export DATABASE_URL="jdbc:postgresql://localhost:5432/springboot_app"
export JWT_SECRET="your-very-secure-secret-key"
export SPRING_PROFILES_ACTIVE="prod"
```

## Development Tools

### Code Quality
```bash
# Checkstyle
./mvnw checkstyle:check

# SpotBugs
./mvnw spotbugs:check

# PMD
./mvnw pmd:check
```

### Formatting
```bash
./mvnw spring-javaformat:apply
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for your changes
4. Ensure all tests pass
5. Run code quality checks
6. Submit a pull request

## License

MIT License