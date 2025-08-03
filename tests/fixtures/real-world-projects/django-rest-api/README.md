# Django REST API

A production-ready Django REST API with authentication, testing, and deployment configuration.

## Features

- 🐍 Django 4.2 with Django REST Framework
- 🔐 JWT Authentication with Djoser
- 🗄️ PostgreSQL database
- 📊 Celery for background tasks
- 🔄 Redis for caching and message broker
- 🧪 Comprehensive testing with pytest
- 🚀 Production deployment with Gunicorn
- 📝 API documentation with DRF
- 🎨 Code formatting with Black and isort
- ✅ Code quality with flake8

## Getting Started

### Prerequisites

- Python 3.9+
- PostgreSQL 13+
- Redis 6+

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

### Environment Variables

Create a `.env` file with the following variables:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
REDIS_URL=redis://localhost:6379/0
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## API Endpoints

### Authentication
- `POST /auth/users/` - User registration
- `POST /auth/jwt/create/` - Login (get JWT tokens)
- `POST /auth/jwt/refresh/` - Refresh JWT token
- `POST /auth/jwt/verify/` - Verify JWT token

### Users
- `GET /api/users/` - List users (admin only)
- `GET /api/users/me/` - Get current user profile
- `PUT /api/users/me/` - Update current user profile

### Example Resource
- `GET /api/items/` - List items
- `POST /api/items/` - Create item
- `GET /api/items/{id}/` - Get item details
- `PUT /api/items/{id}/` - Update item
- `DELETE /api/items/{id}/` - Delete item

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=.

# Run specific test file
pytest tests/test_models.py

# Run with verbose output
pytest -v
```

### Code Quality

```bash
# Format code with Black
black .

# Sort imports with isort
isort .

# Check code style with flake8
flake8

# Run all quality checks
pre-commit run --all-files
```

### Database Operations

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Load sample data
python manage.py loaddata fixtures/sample_data.json
```

### Background Tasks

```bash
# Start Celery worker
celery -A config worker -l info

# Start Celery beat (scheduler)
celery -A config beat -l info

# Monitor tasks with Flower
celery -A config flower
```

## Project Structure

```
├── config/                 # Django settings and configuration
│   ├── settings/
│   │   ├── base.py        # Base settings
│   │   ├── development.py # Development settings
│   │   └── production.py  # Production settings
│   ├── urls.py            # Main URL configuration
│   └── wsgi.py            # WSGI configuration
├── apps/                   # Django applications
│   ├── users/             # User management
│   ├── items/             # Example resource app
│   └── common/            # Shared utilities
├── tests/                  # Test files
├── fixtures/              # Sample data
├── requirements.txt       # Python dependencies
├── manage.py              # Django management script
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose setup
└── .env.example           # Environment variables template
```

## Deployment

### Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in production mode
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

```bash
# Install production dependencies
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --noinput

# Run database migrations
python manage.py migrate

# Start with Gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

### Environment Setup

For production deployment:

1. Set `DEBUG=False`
2. Configure proper `SECRET_KEY`
3. Set up PostgreSQL database
4. Configure Redis for caching
5. Set up proper `ALLOWED_HOSTS`
6. Configure CORS settings
7. Set up SSL/TLS certificates

## API Documentation

- **Swagger UI**: `/api/docs/`
- **ReDoc**: `/api/redoc/`
- **OpenAPI Schema**: `/api/schema/`

## Testing

The project includes comprehensive tests:

- **Unit Tests**: Test individual components
- **Integration Tests**: Test API endpoints
- **Model Tests**: Test database models
- **Authentication Tests**: Test JWT authentication

Run tests with coverage:

```bash
pytest --cov=. --cov-report=html
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Run code quality checks
7. Submit a pull request

## License

MIT License - see LICENSE file for details