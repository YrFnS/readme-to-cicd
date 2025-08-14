# Monorepo Workspace

A comprehensive monorepo containing multiple applications and shared libraries using modern tooling and best practices.

## Architecture

This monorepo contains:
- **Frontend Applications**: React web app, React Native mobile app
- **Backend Services**: Node.js API, Python microservices
- **Shared Libraries**: UI components, utilities, types
- **Documentation**: Storybook, API docs

## Project Structure

```
├── apps/
│   ├── web-app/              # React web application
│   ├── mobile-app/           # React Native mobile app
│   ├── api-server/           # Node.js Express API
│   ├── user-service/         # Python FastAPI microservice
│   └── notification-service/ # Python Flask microservice
├── packages/
│   ├── ui-components/        # Shared React components
│   ├── shared-types/         # TypeScript type definitions
│   ├── utils/               # Shared utility functions
│   └── config/              # Shared configuration
├── tools/
│   ├── build-scripts/       # Custom build tools
│   └── dev-tools/           # Development utilities
└── docs/
    ├── storybook/           # Component documentation
    └── api-docs/            # API documentation
```

## Tech Stack

### Frontend
- **Framework**: React 18, React Native 0.72
- **Build Tool**: Vite, Metro
- **Styling**: Tailwind CSS, Styled Components
- **State Management**: Redux Toolkit, Zustand
- **Testing**: Jest, React Testing Library, Detox

### Backend
- **Node.js**: Express, TypeScript
- **Python**: FastAPI, Flask
- **Database**: PostgreSQL, Redis
- **Authentication**: JWT, OAuth2
- **API Documentation**: OpenAPI/Swagger

### Monorepo Tools
- **Package Manager**: pnpm with workspaces
- **Build System**: Nx, Turborepo
- **Linting**: ESLint, Prettier, Black, isort
- **Testing**: Jest, pytest
- **CI/CD**: GitHub Actions with matrix builds

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- pnpm 8+
- Docker & Docker Compose

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd monorepo-workspace

# Install dependencies for all packages
pnpm install

# Set up environment variables
cp .env.example .env
```

### Development

#### Start all services
```bash
pnpm dev
```

#### Start specific applications
```bash
# Web application
pnpm dev:web

# Mobile application
pnpm dev:mobile

# API server
pnpm dev:api

# Python services
pnpm dev:python
```

#### Start with Docker
```bash
docker-compose up --build
```

## Package Scripts

### Build
```bash
# Build all packages
pnpm build

# Build specific package
pnpm build --filter=web-app
pnpm build --filter=@workspace/ui-components
```

### Testing
```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm test --filter=api-server

# Run tests with coverage
pnpm test:coverage
```

### Linting
```bash
# Lint all packages
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type checking
pnpm type-check
```

## Applications

### Web App (`apps/web-app`)
React application with:
- Modern React 18 features
- TypeScript
- Vite for fast development
- Tailwind CSS for styling
- Redux Toolkit for state management

```bash
cd apps/web-app
pnpm dev     # Start development server
pnpm build   # Build for production
pnpm preview # Preview production build
```

### Mobile App (`apps/mobile-app`)
React Native application with:
- Cross-platform iOS/Android support
- TypeScript
- Navigation with React Navigation
- State management with Zustand
- Native modules integration

```bash
cd apps/mobile-app
pnpm ios     # Run on iOS simulator
pnpm android # Run on Android emulator
pnpm build   # Build for production
```

### API Server (`apps/api-server`)
Node.js Express API with:
- TypeScript
- JWT authentication
- PostgreSQL integration
- OpenAPI documentation
- Comprehensive testing

```bash
cd apps/api-server
pnpm dev     # Start development server
pnpm build   # Build TypeScript
pnpm start   # Start production server
```

### Python Services
Microservices built with Python:

#### User Service (`apps/user-service`)
- FastAPI framework
- Async/await support
- Pydantic models
- PostgreSQL with SQLAlchemy

#### Notification Service (`apps/notification-service`)
- Flask framework
- Redis for queuing
- Email/SMS integration
- Background task processing

```bash
cd apps/user-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

cd apps/notification-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
flask run
```

## Shared Packages

### UI Components (`packages/ui-components`)
Shared React component library:
- Storybook documentation
- TypeScript definitions
- Styled with Tailwind CSS
- Comprehensive testing

### Shared Types (`packages/shared-types`)
TypeScript type definitions shared across applications:
- API response types
- Database models
- Common interfaces

### Utils (`packages/utils`)
Shared utility functions:
- Date/time helpers
- Validation functions
- API clients
- Common constants

## Development Workflow

### Adding New Packages
```bash
# Create new package
mkdir packages/new-package
cd packages/new-package
pnpm init

# Add to workspace
# Edit package.json to include workspace reference
```

### Dependency Management
```bash
# Add dependency to specific package
pnpm add lodash --filter=web-app

# Add dev dependency to root
pnpm add -D typescript --workspace-root

# Add dependency to all packages
pnpm add react --filter="./packages/*"
```

### Code Generation
```bash
# Generate API client from OpenAPI spec
pnpm generate:api

# Generate GraphQL types
pnpm generate:graphql

# Generate component templates
pnpm generate:component ComponentName
```

## CI/CD Pipeline

The monorepo uses GitHub Actions with:
- **Matrix builds** for different Node.js/Python versions
- **Selective builds** based on changed files
- **Parallel testing** across packages
- **Caching** for dependencies and build artifacts
- **Deployment** to different environments

### Build Optimization
- Only builds packages that have changed
- Caches node_modules and build outputs
- Runs tests in parallel
- Uses build matrix for multiple environments

## Deployment

### Staging
```bash
pnpm deploy:staging
```

### Production
```bash
pnpm deploy:prod
```

### Docker
```bash
# Build all services
docker-compose build

# Deploy with Docker Swarm
docker stack deploy -c docker-compose.prod.yml monorepo
```

### Kubernetes
```bash
# Deploy to Kubernetes
kubectl apply -f k8s/
```

## Monitoring

- **Health Checks**: All services expose `/health` endpoints
- **Metrics**: Prometheus metrics collection
- **Logging**: Structured logging with correlation IDs
- **Tracing**: Distributed tracing with Jaeger
- **Alerts**: PagerDuty integration for critical issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes in relevant packages
4. Add tests for new functionality
5. Run `pnpm lint` and `pnpm test`
6. Submit a pull request

### Commit Convention
We use Conventional Commits:
- `feat(web-app): add user dashboard`
- `fix(api): resolve authentication bug`
- `docs(readme): update installation guide`

## License

MIT License