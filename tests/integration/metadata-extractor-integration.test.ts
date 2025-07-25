/**
 * Integration tests for MetadataExtractor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataExtractor } from '../../src/parser/analyzers/metadata-extractor';
import { MarkdownParser } from '../../src/parser/utils/markdown-parser';
import { FileReader } from '../../src/parser/utils/file-reader';
import { ProjectMetadata } from '../../src/parser/types';
import { join } from 'path';

describe('MetadataExtractor Integration', () => {
  let extractor: MetadataExtractor;
  let markdownParser: MarkdownParser;
  let fileReader: FileReader;

  beforeEach(() => {
    extractor = new MetadataExtractor();
    markdownParser = new MarkdownParser();
    fileReader = new FileReader();
  });

  describe('End-to-End Metadata Extraction', () => {
    it('should extract metadata from complete README workflow', async () => {
      const content = `
# Task Manager API

A comprehensive REST API for managing tasks and user accounts, built with Node.js, Express, and PostgreSQL.

## Features

- User authentication and authorization
- Task CRUD operations
- Real-time notifications
- Data persistence with PostgreSQL

## Project Structure

\`\`\`
src/
├── controllers/
│   ├── auth.controller.ts
│   ├── task.controller.ts
│   └── user.controller.ts
├── models/
│   ├── User.ts
│   └── Task.ts
├── routes/
│   ├── auth.routes.ts
│   ├── task.routes.ts
│   └── user.routes.ts
├── middleware/
│   ├── auth.middleware.ts
│   └── validation.middleware.ts
├── utils/
│   ├── database.ts
│   └── logger.ts
├── types/
│   └── index.ts
└── app.ts
tests/
├── unit/
└── integration/
package.json
tsconfig.json
.env.example
\`\`\`

## Environment Configuration

Create a \`.env\` file with the following variables:

\`\`\`env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/taskmanager
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskmanager
DB_USER=username
DB_PASSWORD=password

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# External Services
REDIS_URL=redis://localhost:6379
EMAIL_SERVICE_API_KEY=your-email-service-key
NOTIFICATION_WEBHOOK_URL=https://api.notifications.com/webhook

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn
METRICS_ENABLED=true
\`\`\`

## Installation

1. Clone the repository
2. Install dependencies: \`npm install\`
3. Set up environment variables
4. Run database migrations: \`npm run migrate\`
5. Start the server: \`npm run dev\`

## API Endpoints

- \`POST /api/auth/login\` - User login
- \`POST /api/auth/register\` - User registration
- \`GET /api/tasks\` - Get user tasks
- \`POST /api/tasks\` - Create new task
- \`PUT /api/tasks/:id\` - Update task
- \`DELETE /api/tasks/:id\` - Delete task

## Development

The application uses TypeScript for type safety and follows clean architecture principles.

### Required Environment Variables

The following environment variables are required for the application to run:

- \`DATABASE_URL\` - PostgreSQL connection string
- \`JWT_SECRET\` - Secret key for JWT token signing
- \`NODE_ENV\` - Application environment (development, production, test)

### Optional Environment Variables

- \`PORT\` - Server port (defaults to 3000)
- \`LOG_LEVEL\` - Logging level (defaults to 'info')
- \`REDIS_URL\` - Redis connection for caching (optional)
      `;

      // Parse the content
      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      // Extract metadata
      const result = await extractor.analyze(parseResult.data!.ast, content);
      expect(result.confidence).toBeGreaterThan(0.8);

      const metadata = result.data as ProjectMetadata;

      // Verify project name extraction
      expect(metadata.name).toBe('Task Manager API');

      // Verify description extraction
      expect(metadata.description).toBeDefined();
      expect(metadata.description).toContain('comprehensive REST API');
      expect(metadata.description).toContain('Node.js, Express, and PostgreSQL');

      // Verify structure extraction
      expect(metadata.structure).toBeDefined();
      expect(metadata.structure!.length).toBeGreaterThan(10);
      expect(metadata.structure).toContain('src/');
      expect(metadata.structure).toContain('controllers/');
      expect(metadata.structure).toContain('auth.controller.ts');
      expect(metadata.structure).toContain('models/');
      expect(metadata.structure).toContain('User.ts');
      expect(metadata.structure).toContain('Task.ts');
      expect(metadata.structure).toContain('package.json');
      expect(metadata.structure).toContain('tsconfig.json');

      // Verify environment variables extraction
      expect(metadata.environment).toBeDefined();
      expect(metadata.environment!.length).toBeGreaterThan(10);

      const envVars = metadata.environment!;
      
      // Check required environment variables
      const nodeEnv = envVars.find(env => env.name === 'NODE_ENV');
      expect(nodeEnv).toBeDefined();
      expect(nodeEnv!.defaultValue).toBe('development');
      expect(nodeEnv!.description).toBe('Node.js environment (development, production, test)');

      const port = envVars.find(env => env.name === 'PORT');
      expect(port).toBeDefined();
      expect(port!.defaultValue).toBe('3000');

      const dbUrl = envVars.find(env => env.name === 'DATABASE_URL');
      expect(dbUrl).toBeDefined();
      expect(dbUrl!.defaultValue).toContain('postgresql://');
      expect(dbUrl!.description).toBe('Database connection URL');

      const jwtSecret = envVars.find(env => env.name === 'JWT_SECRET');
      expect(jwtSecret).toBeDefined();
      expect(jwtSecret!.defaultValue).toContain('jwt-key');

      // Check additional environment variables
      const redisUrl = envVars.find(env => env.name === 'REDIS_URL');
      expect(redisUrl).toBeDefined();
      expect(redisUrl!.defaultValue).toContain('redis://');

      const logLevel = envVars.find(env => env.name === 'LOG_LEVEL');
      expect(logLevel).toBeDefined();
      expect(logLevel!.defaultValue).toBe('info');
      expect(logLevel!.description).toBe('Logging level (debug, info, warn, error)');

      // Verify sources are tracked
      expect(result.sources).toContain('title-extraction');
      expect(result.sources).toContain('description-extraction');
      expect(result.sources).toContain('structure-parsing');
      expect(result.sources).toContain('environment-detection');
    });

    it('should handle minimal README with basic metadata', async () => {
      const content = `
# Simple App

A basic web application.

## Setup

Set NODE_ENV and run \`npm start\`.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);

      const metadata = result.data as ProjectMetadata;
      expect(metadata.name).toBe('Simple App');
      expect(metadata.description).toBe('A basic web application.');
      
      expect(metadata.environment).toBeDefined();
      const nodeEnv = metadata.environment!.find(env => env.name === 'NODE_ENV');
      expect(nodeEnv).toBeDefined();

      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should extract metadata from Python project README', async () => {
      const content = `
# Data Analysis Tool

A Python application for analyzing CSV data and generating reports.

## Project Structure

\`\`\`
src/
├── analyzers/
│   ├── __init__.py
│   ├── csv_analyzer.py
│   └── report_generator.py
├── utils/
│   ├── __init__.py
│   └── helpers.py
├── tests/
│   ├── test_analyzer.py
│   └── test_utils.py
├── main.py
└── requirements.txt
\`\`\`

## Configuration

Set these environment variables:

\`\`\`bash
export PYTHON_ENV=production
export DATA_PATH=/path/to/data
export OUTPUT_DIR=/path/to/output
export LOG_LEVEL=INFO
export DATABASE_URL=sqlite:///data.db
\`\`\`

## Usage

Run the analyzer:

\`\`\`python
python main.py --input data.csv --output report.html
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);

      const metadata = result.data as ProjectMetadata;
      expect(metadata.name).toBe('Data Analysis Tool');
      expect(metadata.description).toContain('Python application');
      expect(metadata.description).toContain('analyzing CSV data');

      expect(metadata.structure).toContain('src/');
      expect(metadata.structure).toContain('analyzers/');
      expect(metadata.structure).toContain('csv_analyzer.py');
      expect(metadata.structure).toContain('requirements.txt');
      expect(metadata.structure).toContain('main.py');

      const envVars = metadata.environment!;
      expect(envVars.find(env => env.name === 'PYTHON_ENV')).toBeDefined();
      expect(envVars.find(env => env.name === 'DATA_PATH')).toBeDefined();
      expect(envVars.find(env => env.name === 'OUTPUT_DIR')).toBeDefined();
      expect(envVars.find(env => env.name === 'LOG_LEVEL')).toBeDefined();
      expect(envVars.find(env => env.name === 'DATABASE_URL')).toBeDefined();

      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should handle README with mixed content and extract relevant metadata', async () => {
      const content = `
# 🚀 Modern Web App

> A cutting-edge web application built with the latest technologies for maximum performance and user experience.

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)

## ✨ Features

- **Fast**: Built with Vite for lightning-fast development
- **Modern**: Uses React 18 with TypeScript
- **Responsive**: Mobile-first design approach
- **Secure**: JWT authentication and HTTPS

## 📁 Project Organization

The codebase follows a clean architecture pattern:

\`\`\`
├── 📂 src/
│   ├── 📂 components/
│   │   ├── 📄 Header.tsx
│   │   ├── 📄 Footer.tsx
│   │   └── 📂 ui/
│   │       ├── 📄 Button.tsx
│   │       └── 📄 Modal.tsx
│   ├── 📂 pages/
│   │   ├── 📄 Home.tsx
│   │   ├── 📄 About.tsx
│   │   └── 📄 Contact.tsx
│   ├── 📂 hooks/
│   │   ├── 📄 useAuth.ts
│   │   └── 📄 useApi.ts
│   ├── 📂 utils/
│   │   ├── 📄 api.ts
│   │   └── 📄 helpers.ts
│   ├── 📄 App.tsx
│   └── 📄 main.tsx
├── 📂 public/
│   ├── 📄 index.html
│   └── 📄 favicon.ico
├── 📄 package.json
├── 📄 vite.config.ts
├── 📄 tsconfig.json
└── 📄 .env.example
\`\`\`

## ⚙️ Environment Setup

Copy \`.env.example\` to \`.env\` and configure:

\`\`\`env
# Application
VITE_APP_TITLE=Modern Web App
VITE_APP_VERSION=1.0.0
VITE_API_BASE_URL=https://api.example.com

# Authentication
VITE_AUTH_DOMAIN=auth.example.com
VITE_CLIENT_ID=your_client_id
VITE_CLIENT_SECRET=your_client_secret

# Features
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=false

# Development
VITE_DEV_MODE=true
VITE_LOG_LEVEL=debug
\`\`\`

## 🚀 Getting Started

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/user/modern-web-app.git
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configure environment**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

4. **Start development server**
   \`\`\`bash
   npm run dev
   \`\`\`

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);

      const metadata = result.data as ProjectMetadata;
      
      // Should extract clean project name without emojis
      expect(metadata.name).toBe('Modern Web App');
      
      // Should extract description from blockquote
      expect(metadata.description).toBeDefined();
      expect(metadata.description).toContain('cutting-edge web application');
      
      // Should extract structure without emojis
      expect(metadata.structure).toBeDefined();
      expect(metadata.structure).toContain('src/');
      expect(metadata.structure).toContain('components/');
      expect(metadata.structure).toContain('Header.tsx');
      expect(metadata.structure).toContain('pages/');
      expect(metadata.structure).toContain('hooks/');
      expect(metadata.structure).toContain('package.json');
      expect(metadata.structure).toContain('vite.config.ts');
      
      // Should extract Vite-specific environment variables
      const envVars = metadata.environment!;
      expect(envVars.find(env => env.name === 'VITE_APP_TITLE')).toBeDefined();
      expect(envVars.find(env => env.name === 'VITE_API_BASE_URL')).toBeDefined();
      expect(envVars.find(env => env.name === 'VITE_CLIENT_ID')).toBeDefined();
      expect(envVars.find(env => env.name === 'VITE_ENABLE_ANALYTICS')).toBeDefined();
      
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle README with malformed structure sections', async () => {
      const content = `
# My Project

This project has some structure information.

## Structure

\`\`\`
src/
├── broken structure
│   incomplete
└── but some valid paths
    ├── components/
    └── utils/
\`\`\`

Set NODE_ENV=production
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);

      const metadata = result.data as ProjectMetadata;
      expect(metadata.name).toBe('My Project');
      
      // Should extract valid parts of structure
      expect(metadata.structure).toContain('src/');
      expect(metadata.structure).toContain('components/');
      expect(metadata.structure).toContain('utils/');
      
      // Should still extract environment variables
      expect(metadata.environment).toBeDefined();
      expect(metadata.environment!.find(env => env.name === 'NODE_ENV')).toBeDefined();
      
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle README with no extractable metadata gracefully', async () => {
      const content = `
This is just some random text without any meaningful structure.
No headers, no project information, no environment variables.
Just plain text that doesn't follow README conventions.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);

      const metadata = result.data as ProjectMetadata;
      expect(metadata.name).toBeUndefined();
      expect(metadata.description).toBeUndefined();
      expect(metadata.structure).toBeUndefined();
      expect(metadata.environment).toBeUndefined();
      
      expect(result.confidence).toBeLessThan(0.1);
      expect(result.sources).toHaveLength(0);
    });
  });
});