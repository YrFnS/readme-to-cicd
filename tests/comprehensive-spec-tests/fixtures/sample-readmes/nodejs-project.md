# Node.js Express API

A RESTful API built with Node.js and Express.js for managing user data and authentication.

## Features

- User authentication with JWT
- RESTful API endpoints
- MongoDB database integration
- Input validation and sanitization
- Comprehensive error handling
- API documentation with Swagger

## Installation

```bash
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

## Building

Build the application for production:

```bash
npm run build
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Environment Variables

Create a `.env` file with the following variables:

```
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/myapp
JWT_SECRET=your-secret-key
```

## API Endpoints

- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Dependencies

- express: Web framework
- mongoose: MongoDB ODM
- jsonwebtoken: JWT implementation
- bcryptjs: Password hashing
- joi: Input validation
- helmet: Security middleware

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run build` - Build application
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier