# Django Web Application

A full-featured web application built with Django framework, featuring user management, content creation, and API endpoints.

## Features

- User authentication and authorization
- Admin interface
- RESTful API with Django REST Framework
- PostgreSQL database
- Redis caching
- Celery task queue
- Docker containerization

## Installation

Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## Database Setup

Run migrations:

```bash
python manage.py migrate
```

Create a superuser:

```bash
python manage.py createsuperuser
```

## Development

Start the development server:

```bash
python manage.py runserver
```

## Testing

Run the test suite:

```bash
python manage.py test
```

Run tests with coverage:

```bash
coverage run --source='.' manage.py test
coverage report
```

## Production Deployment

Build Docker image:

```bash
docker build -t myapp .
```

Run with Docker Compose:

```bash
docker-compose up -d
```

## Environment Variables

```
DEBUG=False
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
REDIS_URL=redis://localhost:6379/0
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

## API Endpoints

- `/api/auth/` - Authentication endpoints
- `/api/users/` - User management
- `/api/posts/` - Content management
- `/admin/` - Django admin interface

## Requirements

See `requirements.txt` for full list of dependencies:

- Django>=4.2.0
- djangorestframework>=3.14.0
- psycopg2-binary>=2.9.0
- redis>=4.5.0
- celery>=5.2.0
- gunicorn>=20.1.0