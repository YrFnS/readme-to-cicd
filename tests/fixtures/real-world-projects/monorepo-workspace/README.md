# Monorepo Workspace

A modern monorepo workspace using Turborepo, featuring multiple applications and shared packages with different frameworks and technologies.

## Architecture

```
├── apps/
│   ├── web/           # Next.js web application
│   ├── mobile/        # React Native mobile app
│   ├── api/           # Express.js API server
│   └── docs/          # Documentation site
├── packages/
│   ├── ui/            # Shared UI components
│   ├── shared/        # Shared utilities and types
│   ├── eslint-config/ # Shared ESLint configuration
│   └── typescript-config/ # Shared TypeScript configuration
├── tools/
│   ├── build/         # Build tools and scripts
│   └── deploy/        # Deployment scripts
└── turbo.json         # Turborepo configuration
```

## Features

### Applications
- 🌐 **Web App** - Next.js with React 18
- 📱 **Mobile App** - React Native with navigation
- 🚀 **API Server** - Express.js with TypeScript
- 📚 **Documentation** - Docusaurus documentation site

### Shared Packages
- 🎨 **UI Components** - Reusable React components
- 🔧 **Shared Utilities** - Common functions and types
- 📏 **ESLint Config** - Consistent code style
- 📝 **TypeScript Config** - Shared TypeScript settings

### Development Tools
- ⚡ **Turborepo** - High-performance build system
- 🔄 **Changesets** - Version management and publishing
- 🧪 **Jest** - Testing framework
- 📦 **npm Workspaces** - Package management

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/example/monorepo-workspace.git
cd monorepo-workspace

# Install dependencies for all packages
npm install

# Build all packages
npm run build

# Start development servers
npm run dev
```

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start all apps in development mode
npm run dev:web      # Start only web app
npm run dev:mobile   # Start only mobile app
npm run dev:api      # Start only API server

# Building
npm run build        # Build all packages
npm run build:web    # Build only web app
npm run build:api    # Build only API server

# Testing
npm run test         # Run tests for all packages
npm run test:web     # Run tests for web app
npm run test:mobile  # Run tests for mobile app

# Code Quality
npm run lint         # Lint all packages
npm run format       # Format all code
npm run type-check   # Type check all packages

# Utilities
npm run clean        # Clean all build artifacts
npm run changeset    # Create a changeset for versioning
```

### Workspace Commands

```bash
# Run command in specific workspace
npm run build --workspace=@repo/web
npm run test --workspace=@repo/ui

# Add dependency to specific workspace
npm install react --workspace=@repo/web
npm install -D jest --workspace=@repo/shared

# Run command in all workspaces
npm run lint --workspaces
npm run build --workspaces
```

### Turborepo Commands

```bash
# Run tasks with Turbo
npx turbo run build
npx turbo run test --parallel
npx turbo run lint --filter=@repo/web

# Cache management
npx turbo run build --force  # Skip cache
npx turbo prune --scope=@repo/web  # Prune workspace
```

## Applications

### Web App (Next.js)

```bash
cd apps/web

# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Features
- Server-side rendering
- Static site generation
- API routes
- Shared UI components
```

### Mobile App (React Native)

```bash
cd apps/mobile

# Development
npm run android      # Run on Android
npm run ios          # Run on iOS
npm start           # Start Metro bundler

# Features
- Cross-platform mobile app
- Navigation with React Navigation
- Shared business logic
- Native performance
```

### API Server (Express.js)

```bash
cd apps/api

# Development
npm run dev          # Start with hot reload
npm run build        # Build TypeScript
npm start           # Start production server

# Features
- RESTful API
- TypeScript
- Authentication
- Database integration
```

### Documentation (Docusaurus)

```bash
cd apps/docs

# Development
npm run dev          # Start development server
npm run build        # Build static site
npm run serve        # Serve built site

# Features
- Documentation site
- API documentation
- Component showcase
- Search functionality
```

## Shared Packages

### UI Components (@repo/ui)

```bash
cd packages/ui

# Development
npm run dev          # Start Storybook
npm run build        # Build components
npm run test         # Run component tests

# Features
- Reusable React components
- TypeScript support
- Storybook documentation
- Jest testing
```

### Shared Utilities (@repo/shared)

```bash
cd packages/shared

# Development
npm run build        # Build utilities
npm run test         # Run tests
npm run type-check   # Type checking

# Features
- Common utilities
- Shared types
- Business logic
- Validation schemas
```

## Configuration Packages

### ESLint Config (@repo/eslint-config)

Shared ESLint configuration for all packages:

- Base configuration for JavaScript/TypeScript
- React-specific rules
- Next.js specific rules
- React Native specific rules

### TypeScript Config (@repo/typescript-config)

Shared TypeScript configurations:

- Base configuration
- React configuration
- Node.js configuration
- Strict configuration

## Deployment

### Individual Apps

```bash
# Web app (Vercel)
cd apps/web
vercel deploy

# API server (Railway)
cd apps/api
railway deploy

# Documentation (Netlify)
cd apps/docs
netlify deploy
```

### Monorepo Deployment

```bash
# Build all packages
npm run build

# Deploy with Turborepo
npx turbo run deploy

# Or use deployment scripts
npm run deploy:web
npm run deploy:api
npm run deploy:docs
```

## Version Management

### Using Changesets

```bash
# Create a changeset
npm run changeset

# Version packages
npm run version-packages

# Publish packages
npm run release
```

### Changeset Workflow

1. Make changes to packages
2. Run `npm run changeset` to document changes
3. Commit changeset files
4. Run `npm run version-packages` to update versions
5. Run `npm run release` to publish

## Testing

### Running Tests

```bash
# All tests
npm run test

# Specific package tests
npm run test --workspace=@repo/ui
npm run test --workspace=@repo/shared

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Structure

- **Unit Tests**: Individual functions and components
- **Integration Tests**: Package interactions
- **E2E Tests**: Full application workflows

## Performance

### Build Performance

- **Turborepo**: Parallel builds and intelligent caching
- **Incremental Builds**: Only rebuild changed packages
- **Remote Caching**: Share cache across team and CI

### Runtime Performance

- **Code Splitting**: Automatic code splitting in Next.js
- **Tree Shaking**: Remove unused code
- **Bundle Analysis**: Analyze bundle sizes

## Monitoring

### Development

- Build times and cache hit rates
- Test coverage across packages
- Bundle size tracking

### Production

- Application performance monitoring
- Error tracking with Sentry
- Analytics and user behavior

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes in the appropriate package
4. Add tests for new functionality
5. Run `npm run lint` and `npm run test`
6. Create a changeset with `npm run changeset`
7. Commit your changes
8. Push to your branch
9. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.