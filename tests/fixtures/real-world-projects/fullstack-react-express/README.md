# Full-Stack React + Express Application

A modern full-stack web application with React frontend and Express.js backend, featuring authentication, real-time updates, and comprehensive testing.

## Architecture

```
├── frontend/          # React TypeScript application
├── backend/           # Express.js TypeScript API
├── shared/            # Shared types and utilities
├── docker-compose.yml # Development environment
└── README.md          # This file
```

## Features

### Frontend (React)
- ⚛️ React 18 with TypeScript
- 🏗️ Vite for fast development
- 🔄 React Query for data fetching
- 📝 React Hook Form for form handling
- 🎨 Modern UI components
- 🧪 Component testing

### Backend (Express.js)
- 🚀 Express.js with TypeScript
- 🔐 JWT authentication
- 🗄️ MongoDB with Mongoose
- 🛡️ Security middleware (Helmet, CORS)
- 📊 Request logging with Morgan
- 🧪 API testing with Jest + Supertest

### Shared
- 📦 Shared TypeScript types
- 🔧 Common utilities
- 📋 API contract definitions

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 5+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/example/fullstack-react-express.git
cd fullstack-react-express

# Install dependencies for all packages
npm run install:all

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with your configuration

# Start development servers
npm run dev
```

### Development Scripts

```bash
# Install dependencies for all packages
npm run install:all

# Start both frontend and backend in development mode
npm run dev

# Start only frontend
npm run dev:frontend

# Start only backend
npm run dev:backend

# Build all packages
npm run build

# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Lint all packages
npm run lint

# Format all code
npm run format
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/account` - Delete user account

### Posts
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post
- `GET /api/posts/:id` - Get post by ID
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

## Frontend Development

### Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API services
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript types
│   └── __tests__/      # Test files
├── public/             # Static assets
└── package.json        # Dependencies and scripts
```

### Available Scripts

```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Key Technologies

- **React 18** - UI library with concurrent features
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **React Query** - Data fetching and caching
- **React Router** - Client-side routing
- **React Hook Form** - Form handling
- **Axios** - HTTP client

## Backend Development

### Project Structure

```
backend/
├── src/
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Express middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── __tests__/      # Test files
├── dist/               # Compiled JavaScript
└── package.json        # Dependencies and scripts
```

### Available Scripts

```bash
cd backend

# Start development server with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

### Key Technologies

- **Express.js** - Web application framework
- **TypeScript** - Type-safe JavaScript
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **Jest** - Testing framework
- **Supertest** - HTTP assertion library

## Environment Variables

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=Full-Stack App
```

### Backend (.env)

```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/fullstack-app
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

## Testing

### Frontend Testing

```bash
cd frontend

# Run component tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Backend Testing

```bash
cd backend

# Run API tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.ts
```

### Integration Testing

```bash
# Run full integration tests
npm run test:integration

# Test API endpoints
npm run test:api

# Test database operations
npm run test:db
```

## Deployment

### Docker Development

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment

```bash
# Build all packages
npm run build

# Start production servers
npm run start:prod

# Or deploy to cloud platforms:
# - Vercel (frontend)
# - Railway/Heroku (backend)
# - MongoDB Atlas (database)
```

### Environment Setup

1. **Frontend**: Deploy to Vercel, Netlify, or similar
2. **Backend**: Deploy to Railway, Heroku, or AWS
3. **Database**: Use MongoDB Atlas or self-hosted MongoDB
4. **Environment Variables**: Set production values in deployment platform

## Monitoring and Logging

### Development

- Frontend: Browser DevTools + React DevTools
- Backend: Morgan logging + console output
- Database: MongoDB Compass

### Production

- Application monitoring: Sentry, LogRocket
- Server monitoring: New Relic, DataDog
- Database monitoring: MongoDB Atlas monitoring
- Uptime monitoring: Pingdom, UptimeRobot

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm run test`)
6. Run linting (`npm run lint`)
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.