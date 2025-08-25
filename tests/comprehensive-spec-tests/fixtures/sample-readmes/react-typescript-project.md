# React TypeScript Application

A modern React application built with TypeScript, featuring a responsive UI, state management, and comprehensive testing.

## Features

- React 18 with TypeScript
- Redux Toolkit for state management
- React Router for navigation
- Material-UI components
- Jest and React Testing Library
- ESLint and Prettier configuration
- Husky pre-commit hooks

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Available Scripts

### `npm start`

Runs the app in development mode.

### `npm test`

Launches the test runner in interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

### `npm run lint`

Runs ESLint to check for code quality issues.

### `npm run format`

Formats code using Prettier.

## Testing

Run all tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm test -- --coverage
```

## Building for Production

Create an optimized production build:

```bash
npm run build
```

The build folder will contain the optimized files ready for deployment.

## Deployment

This project can be deployed to various platforms:

- **Netlify**: Connect your GitHub repository
- **Vercel**: Deploy with zero configuration
- **GitHub Pages**: Use `npm run deploy` (requires gh-pages package)
- **Docker**: Use the included Dockerfile

## Environment Variables

Create a `.env` file in the root directory:

```
REACT_APP_API_URL=https://api.example.com
REACT_APP_ENVIRONMENT=development
```

## Project Structure

```
src/
  components/     # Reusable UI components
  pages/         # Page components
  hooks/         # Custom React hooks
  store/         # Redux store configuration
  services/      # API service functions
  utils/         # Utility functions
  types/         # TypeScript type definitions
```

## Dependencies

Key dependencies include:

- react: UI library
- typescript: Type checking
- @reduxjs/toolkit: State management
- react-router-dom: Routing
- @mui/material: UI components
- axios: HTTP client