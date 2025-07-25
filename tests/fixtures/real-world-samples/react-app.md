# React Todo App

A modern todo application built with React, TypeScript, and Tailwind CSS.

## Features

- ✅ Add, edit, and delete todos
- 🎨 Beautiful UI with Tailwind CSS
- 📱 Responsive design
- 💾 Local storage persistence
- 🔍 Search and filter functionality

## Tech Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS, Headless UI
- **State Management**: Zustand
- **Testing**: Jest, React Testing Library
- **Build Tool**: Vite
- **Linting**: ESLint, Prettier

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/example/react-todo-app.git
cd react-todo-app

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript compiler
```

## Project Structure

```
src/
├── components/          # React components
│   ├── TodoItem.tsx
│   ├── TodoList.tsx
│   └── AddTodo.tsx
├── hooks/              # Custom React hooks
│   └── useTodos.ts
├── store/              # Zustand store
│   └── todoStore.ts
├── types/              # TypeScript types
│   └── todo.ts
├── utils/              # Utility functions
│   └── storage.ts
└── App.tsx             # Main App component
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3001
VITE_APP_TITLE=React Todo App
```

## Deployment

### Vercel

```bash
npm run build
npx vercel --prod
```

### Netlify

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.