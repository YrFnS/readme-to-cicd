# Django REST API

A robust REST API built with Django and Django REST Framework for managing a task management system.

## Features

- 🔐 JWT Authentication
- 📝 CRUD operations for tasks
- 👥 User management
- 🔍 Advanced filtering and search
- 📊 API documentation with Swagger
- 🐳 Docker support
- 🧪 Comprehensive test suite

## Tech Stack

- **Backend**: Django 4.2, Django REST Framework
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Documentation**: drf-spectacular (Swagger)
- **Testing**: pytest, factory-boy
- **Containerization**: Docker, docker-compose
- **Code Quality**: Black, isort, flake8, bandit

## API Endpoints

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration
- `POST /api/auth/refresh/` - Refresh JWT token

### Tasks
- `GET /api/tasks/` - List tasks
- `POST /api/tasks/` - Create task
- `GET /api/tasks/{id}/` - Get task details
- `PUT /api/tasks/{id}/` - Update task
- `DELETE /api/tasks/{id}/` - Delete task

### Users
- `GET /api/users/profile/` - Get user profile
- `PUT /api/users/profile/` - Update user profile

## Getting Started

### Prerequisites

- Python 3.11+
- PostgreSQL 13+
- Docker (optional)

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd django-rest-api
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

4. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

5. **Run migrations**
```bash
python manage.py migrate
```

6. **Create superuser**
```bash
python manage.py createsuperuser
```

7. **Run development server**
```bash
python manage.py runserver
```

### Docker Development

```bash
docker-compose up --build
```

## Testing

### Run all tests
```bash
pytest
```

### Run with coverage
```bash
pytest --cov=.
```

### Run specific test file
```bash
pytest tests/test_tasks.py
```

## Code Quality

### Format code
```bash
black .
isort .
```

### Lint code
```bash
flake8
bandit -r .
```

### Type checking
```bash
mypy .
```

## Database

### Run migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### Create test data
```bash
python manage.py loaddata fixtures/test_data.json
```

## Deployment

### Environment Variables

Required environment variables:
- `SECRET_KEY` - Django secret key
- `DATABASE_URL` - PostgreSQL connection string
- `ALLOWED_HOSTS` - Comma-separated list of allowed hosts
- `DEBUG` - Set to False in production

### Docker Production

```bash
docker build -t django-api .
docker run -p 8000:8000 django-api
```

### Collect Static Files

```bash
python manage.py collectstatic --noinput
```

## API Documentation

API documentation is available at:
- Swagger UI: `/api/docs/`
- ReDoc: `/api/redoc/`
- OpenAPI Schema: `/api/schema/`

## Security

- JWT token authentication
- CORS configuration
- SQL injection protection
- XSS protection
- CSRF protection
- Security headers

## Monitoring

- Health check endpoint: `/health/`
- Metrics endpoint: `/metrics/`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for your changes
4. Ensure all tests pass
5. Run code quality checks
6. Submit a pull request

## License

MIT License