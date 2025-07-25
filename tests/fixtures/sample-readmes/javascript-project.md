# My JavaScript Project

This is a modern JavaScript project built with Node.js and Express.

## Installation

```bash
npm install
```

## Usage

```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Project Structure

- `src/app.js` - Main application file
- `src/routes/` - API routes
- `package.json` - Dependencies
- `package-lock.json` - Lock file

## Scripts

Run the development server:
```bash
npm run dev
```

Run tests:
```bash
npm test
```

Build for production:
```bash
npm run build
```