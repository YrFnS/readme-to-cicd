# React TypeScript Application

A modern React application built with TypeScript, Vite, and comprehensive testing setup.

## Features

- ⚛️ React 18 with TypeScript
- 🏗️ Vite for fast development and building
- 🎨 Styled Components for styling
- 🔄 Redux Toolkit for state management
- 🧪 Vitest + Testing Library for testing
- 📏 ESLint + TypeScript ESLint for code quality
- 🚀 Hot Module Replacement (HMR)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run type-check
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── store/              # Redux store configuration
├── services/           # API services
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
└── __tests__/          # Test files
```

## Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm test` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Lint code with ESLint
- `npm run lint:fix` - Fix linting issues automatically
- `npm run type-check` - Run TypeScript type checking

## Technologies

### Core
- **React 18** - UI library with concurrent features
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server

### State Management
- **Redux Toolkit** - Modern Redux with less boilerplate
- **React Redux** - React bindings for Redux

### Styling
- **Styled Components** - CSS-in-JS styling solution

### Testing
- **Vitest** - Fast unit test framework
- **Testing Library** - Simple and complete testing utilities
- **jsdom** - DOM implementation for testing

### Code Quality
- **ESLint** - JavaScript/TypeScript linting
- **TypeScript ESLint** - TypeScript-specific linting rules

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Quality

```bash
# Check code style
npm run lint

# Fix code style issues
npm run lint:fix

# Check TypeScript types
npm run type-check
```

## Deployment

The application can be deployed to any static hosting service:

- **Vercel** - Zero-config deployment
- **Netlify** - Continuous deployment from Git
- **GitHub Pages** - Free hosting for public repositories
- **AWS S3** - Scalable cloud storage

Build the application and deploy the `dist` folder to your hosting service.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details