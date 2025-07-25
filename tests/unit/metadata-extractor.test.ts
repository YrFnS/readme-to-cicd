/**
 * Unit tests for MetadataExtractor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataExtractor } from '../../src/parser/analyzers/metadata-extractor';
import { MarkdownParser } from '../../src/parser/utils/markdown-parser';
import { ProjectMetadata, EnvironmentVariable } from '../../src/parser/types';

describe('MetadataExtractor', () => {
  let extractor: MetadataExtractor;
  let markdownParser: MarkdownParser;

  beforeEach(() => {
    extractor = new MetadataExtractor();
    markdownParser = new MarkdownParser();
  });

  describe('Project Name Extraction', () => {
    it('should extract project name from h1 header', async () => {
      const content = `
# My Awesome Project

This is a great project that does amazing things.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      expect(result.confidence).toBeGreaterThan(0);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.name).toBe('My Awesome Project');
    });

    it('should extract project name from h2 header when no h1 exists', async () => {
      const content = `
## React Dashboard

A modern dashboard built with React and TypeScript.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.name).toBe('React Dashboard');
    });

    it('should extract project name from package.json reference', async () => {
      const content = `
# Installation

Install the dependencies:

\`\`\`json
{
  "name": "my-node-app",
  "version": "1.0.0"
}
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.name).toBe('my-node-app');
    });

    it('should extract project name from GitHub URL', async () => {
      const content = `
# Project

Clone from: https://github.com/user/awesome-project

This project is hosted on GitHub.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.name).toBe('awesome-project');
    });

    it('should clean markdown formatting from project name', async () => {
      const content = `
# **My _Awesome_ Project**

This is a project with formatted title.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.name).toBe('My Awesome Project');
    });

    it('should reject invalid project names', async () => {
      const content = `
# README

This is just a readme file.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.name).toBeUndefined();
    });
  });

  describe('Description Extraction', () => {
    it('should extract description from first paragraph after h1', async () => {
      const content = `
# My Project

This is a comprehensive project that demonstrates modern web development practices.

## Installation

Run npm install to get started.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.description).toBe('This is a comprehensive project that demonstrates modern web development practices.');
    });

    it('should extract description from blockquote', async () => {
      const content = `
# My Project

> A modern web application built with React and Node.js for managing tasks efficiently.

## Features
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.description).toBe('A modern web application built with React and Node.js for managing tasks efficiently.');
    });

    it('should extract description from package.json reference', async () => {
      const content = `
# My App

\`\`\`json
{
  "name": "my-app",
  "description": "A powerful task management application."
}
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.description).toBe('A powerful task management application.');
    });

    it('should extract description from "This project" pattern', async () => {
      const content = `
# My Project

This project provides a simple API for managing user authentication.

## Setup
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.description).toBe('This project provides a simple API for managing user authentication.');
    });

    it('should reject invalid descriptions', async () => {
      const content = `
# My Project

Short.

## Installation
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.description).toBeUndefined();
    });
  });

  describe('Directory Structure Extraction', () => {
    it('should extract structure from code blocks', async () => {
      const content = `
# My Project

## Project Structure

\`\`\`
src/
├── components/
├── pages/
├── utils/
└── index.ts
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.structure).toBeDefined();
      expect(metadata.structure).toContain('src/');
      expect(metadata.structure).toContain('components/');
      expect(metadata.structure).toContain('pages/');
      expect(metadata.structure).toContain('utils/');
      expect(metadata.structure).toContain('index.ts');
    });

    it('should extract structure from tree format', async () => {
      const content = `
# Project

Directory structure:

\`\`\`tree
project/
│   README.md
│   package.json
└───src/
    │   app.ts
    └───controllers/
            user.controller.ts
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.structure).toBeDefined();
      expect(metadata.structure).toContain('project/');
      expect(metadata.structure).toContain('README.md');
      expect(metadata.structure).toContain('package.json');
      expect(metadata.structure).toContain('src/');
    });

    it('should extract common file patterns from text', async () => {
      const content = `
# My Project

The main application is in src/app.ts and components are in src/components/.
Configuration is handled by package.json and tsconfig.json.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.structure).toBeDefined();
      expect(metadata.structure).toContain('src/app.ts');
      expect(metadata.structure).toContain('src/components/');
      expect(metadata.structure).toContain('package.json');
      expect(metadata.structure).toContain('tsconfig.json');
    });
  });

  describe('Environment Variables Extraction', () => {
    it('should extract environment variables from patterns', async () => {
      const content = `
# Configuration

Set the following environment variables:

- NODE_ENV=production
- PORT=3000
- DATABASE_URL=postgresql://localhost/mydb
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.environment).toBeDefined();
      
      const envVars = metadata.environment!;
      const nodeEnv = envVars.find(env => env.name === 'NODE_ENV');
      const port = envVars.find(env => env.name === 'PORT');
      const dbUrl = envVars.find(env => env.name === 'DATABASE_URL');
      
      expect(nodeEnv).toBeDefined();
      expect(nodeEnv!.defaultValue).toBe('production');
      expect(nodeEnv!.required).toBe(false);
      
      expect(port).toBeDefined();
      expect(port!.defaultValue).toBe('3000');
      
      expect(dbUrl).toBeDefined();
      expect(dbUrl!.defaultValue).toBe('postgresql://localhost/mydb');
    });

    it('should extract environment variables from .env file examples', async () => {
      const content = `
# Environment Setup

Create a .env file:

\`\`\`
NODE_ENV=development
API_KEY=your_api_key_here
SECRET_KEY=
DEBUG=true
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.environment).toBeDefined();
      
      const envVars = metadata.environment!;
      const apiKey = envVars.find(env => env.name === 'API_KEY');
      const secretKey = envVars.find(env => env.name === 'SECRET_KEY');
      const debug = envVars.find(env => env.name === 'DEBUG');
      
      expect(apiKey).toBeDefined();
      expect(apiKey!.defaultValue).toBe('your_api_key_here');
      
      expect(secretKey).toBeDefined();
      expect(secretKey!.required).toBe(true); // Empty value means required
      
      expect(debug).toBeDefined();
      expect(debug!.defaultValue).toBe('true');
    });

    it('should extract environment variables from code examples', async () => {
      const content = `
# Usage

\`\`\`javascript
const port = process.env.PORT || 3000;
const dbUrl = process.env.DATABASE_URL;
const apiKey = \${API_KEY};
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.environment).toBeDefined();
      
      const envVars = metadata.environment!;
      const portVar = envVars.find(env => env.name === 'PORT');
      const dbVar = envVars.find(env => env.name === 'DATABASE_URL');
      const apiVar = envVars.find(env => env.name === 'API_KEY');
      
      expect(portVar).toBeDefined();
      expect(dbVar).toBeDefined();
      expect(apiVar).toBeDefined();
    });

    it('should generate descriptions for common environment variables', async () => {
      const content = `
# Configuration

Set NODE_ENV and DATABASE_URL environment variables.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.environment).toBeDefined();
      
      const envVars = metadata.environment!;
      const nodeEnv = envVars.find(env => env.name === 'NODE_ENV');
      const dbUrl = envVars.find(env => env.name === 'DATABASE_URL');
      
      expect(nodeEnv).toBeDefined();
      expect(nodeEnv!.description).toBe('Node.js environment (development, production, test)');
      
      expect(dbUrl).toBeDefined();
      expect(dbUrl!.description).toBe('Database connection URL');
    });

    it('should reject invalid environment variable names', async () => {
      const content = `
# Configuration

Set lowercase_var=value and 123INVALID=value
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      // Should not extract invalid env var names
      if (metadata.environment) {
        const invalidVars = metadata.environment.filter(env => 
          env.name === 'lowercase_var' || env.name === '123INVALID'
        );
        expect(invalidVars).toHaveLength(0);
      }
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate high confidence with complete metadata', async () => {
      const content = `
# My Awesome Project

This is a comprehensive web application that manages user tasks efficiently.

## Project Structure

\`\`\`
src/
├── components/
└── pages/
\`\`\`

## Environment Variables

- NODE_ENV=production
- PORT=3000
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should calculate medium confidence with partial metadata', async () => {
      const content = `
# My Project

This is a simple application.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.confidence).toBeLessThan(0.9);
    });

    it('should calculate low confidence with minimal metadata', async () => {
      const content = `
# Installation

Run npm install to get started.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Sources Tracking', () => {
    it('should track sources for extracted metadata', async () => {
      const content = `
# My Project

This is a great application that does amazing things.

## Structure

\`\`\`
src/
└── app.ts
\`\`\`

Set NODE_ENV=production
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      expect(result.sources).toContain('title-extraction');
      expect(result.sources).toContain('description-extraction');
      expect(result.sources).toContain('structure-parsing');
      expect(result.sources).toContain('environment-detection');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed content gracefully', async () => {
      const content = `
# 

Invalid content with empty header
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.data).toBeDefined();
    });

    it('should return empty metadata for content without extractable information', async () => {
      const content = `
Some random text without any structure or meaningful headers.
Just plain text that doesn't contain project information.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.name).toBeUndefined();
      expect(metadata.description).toBeUndefined();
      expect(result.confidence).toBeLessThan(0.1);
    });
  });

  describe('Real-world README Patterns', () => {
    it('should handle typical Node.js project README', async () => {
      const content = `
# Express API Server

A RESTful API server built with Express.js and TypeScript for managing user accounts.

## Project Structure

\`\`\`
src/
├── controllers/
├── models/
├── routes/
├── middleware/
└── app.ts
\`\`\`

## Environment Variables

Create a \`.env\` file:

\`\`\`
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/myapp
JWT_SECRET=your-secret-key
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.name).toBe('Express API Server');
      expect(metadata.description).toContain('RESTful API server');
      expect(metadata.structure).toContain('src/');
      expect(metadata.structure).toContain('controllers/');
      expect(metadata.environment).toBeDefined();
      
      const envVars = metadata.environment!;
      expect(envVars.find(env => env.name === 'NODE_ENV')).toBeDefined();
      expect(envVars.find(env => env.name === 'PORT')).toBeDefined();
      expect(envVars.find(env => env.name === 'DATABASE_URL')).toBeDefined();
      expect(envVars.find(env => env.name === 'JWT_SECRET')).toBeDefined();
      
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should handle React project README', async () => {
      const content = `
# React Dashboard

> A modern dashboard application built with React, TypeScript, and Material-UI.

## Getting Started

The project structure follows standard React conventions:

- \`src/components/\` - Reusable UI components
- \`src/pages/\` - Page components
- \`src/hooks/\` - Custom React hooks
- \`public/\` - Static assets

## Configuration

Set these environment variables:

- \`REACT_APP_API_URL\` - Backend API URL
- \`REACT_APP_ENV\` - Environment (development/production)
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      
      const metadata = result.data as ProjectMetadata;
      expect(metadata.name).toBe('React Dashboard');
      expect(metadata.description).toContain('modern dashboard application');
      expect(metadata.structure).toContain('src/components/');
      expect(metadata.structure).toContain('src/pages/');
      expect(metadata.structure).toContain('src/hooks/');
      expect(metadata.structure).toContain('public/');
      
      const envVars = metadata.environment!;
      expect(envVars.find(env => env.name === 'REACT_APP_API_URL')).toBeDefined();
      expect(envVars.find(env => env.name === 'REACT_APP_ENV')).toBeDefined();
    });
  });
});