# React TypeScript Todo App

A modern todo application built with React, TypeScript, and Vite.

## Features

- ✅ Add, edit, and delete todos
- 🎨 Modern UI with Tailwind CSS
- 📱 Responsive design
- 🔒 TypeScript for type safety
- ⚡ Fast development with Vite

## Tech Stack

- **Frontend**: React 18, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Testing**: Vitest, React Testing Library
- **Linting**: ESLint, Prettier

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Building

```bash
npm run build
```

### Testing

```bash
npm test
npm run test:coverage
```

### Linting

```bash
npm run lint
npm run format
```

## Project Structure

```
src/
├── components/
│   ├── TodoItem.tsx
│   ├── TodoList.tsx
│   └── AddTodo.tsx
├── hooks/
│   └── useTodos.ts
├── types/
│   └── todo.ts
├── utils/
│   └── storage.ts
├── App.tsx
└── main.tsx
```

## Deployment

This app can be deployed to:
- Vercel
- Netlify
- GitHub Pages

### Deploy to Vercel

```bash
npm run build
vercel --prod
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License