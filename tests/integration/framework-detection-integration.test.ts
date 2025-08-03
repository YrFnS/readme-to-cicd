/**
 * Integration tests for Framework Detection with README Parser
 * 
 * These tests verify the complete workflow from README parsing to framework detection
 * and CI pipeline generation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReadmeParserIntegration, createIntegration, processReadmeContent } from '../../src/detection/integration/readme-parser-integration';
import { FrameworkDetectorImpl } from '../../src/detection/framework-detector';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';
import { DetectionResult } from '../../src/detection/interfaces/detection-result';
import { CIPipeline } from '../../src/detection/interfaces/ci-pipeline';

describe('Framework Detection Integration', () => {
  let integration: ReadmeParserIntegration;

  beforeEach(() => {
    integration = createIntegration({
      enableLogging: false, // Disable logging for tests
      detectionTimeout: 10000, // 10 second timeout for tests
      enableFileSystemAnalysis: false // Disable file system analysis for unit tests
    });
  });

  afterEach(() => {
    integration.clearCaches();
  });

  describe('Node.js Project Integration', () => {
    it('should detect React framework from README content', async () => {
      const readmeContent = `
# My React App

A modern React application built with TypeScript.

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm start
npm run build
npm test
\`\`\`

## Dependencies

- React 18.2.0
- TypeScript 4.9.0
- Webpack 5.0.0

## Scripts

- \`npm start\` - Start development server
- \`npm run build\` - Build for production
- \`npm test\` - Run tests
`;

      const result = await integration.processReadmeContent(readmeContent);

      expect(result.detectionResult.success).toBe(true);
      expect(result.detectionResult.frameworks).toHaveLength(1);
      expect(result.detectionResult.frameworks[0].name).toBe('React');
      expect(result.detectionResult.frameworks[0].ecosystem).toBe('nodejs');
      expect(result.detectionResult.confidence.score).toBeGreaterThan(0.5);
      
      // Verify metadata
      expect(result.metadata.conversionSuccess).toBe(true);
      expect(result.metadata.parsingTime).toBeGreaterThan(0);
      expect(result.metadata.detectionTime).toBeGreaterThan(0);
      expect(result.metadata.totalTime).toBeGreaterThan(0);
    });

    it('should detect Next.js framework with high confidence', async () => {
      const readmeContent = `
# Next.js Application

This is a Next.js project bootstrapped with create-next-app.

## Getting Started

\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

## Build

\`\`\`bash
npm run build
npm start
\`\`\`

## Dependencies

- Next.js 13.0.0
- React 18.0.0
- TypeScript

## Features

- Server-side rendering
- Static site generation
- API routes
`;

      const result = await integration.processReadmeContent(readmeContent);

      expect(result.detectionResult.success).toBe(true);
      
      const nextFramework = result.detectionResult.frameworks.find(f => f.name === 'Next.js');
      expect(nextFramework).toBeDefined();
      expect(nextFramework?.confidence).toBeGreaterThan(0.7);
      expect(nextFramework?.type).toBe('fullstack_framework');
    });

    it('should detect multiple Node.js frameworks', async () => {
      const readmeContent = `
# Full Stack Application

A full-stack application with React frontend and Express backend.

## Frontend

Built with React and TypeScript.

\`\`\`bash
cd frontend
npm install
npm start
\`\`\`

## Backend

Express.js API server.

\`\`\`bash
cd backend
npm install
npm run dev
\`\`\`

## Dependencies

### Frontend
- React 18.0.0
- TypeScript 4.9.0

### Backend
- Express 4.18.0
- Node.js 18.0.0
`;

      const result = await integration.processReadmeContent(readmeContent);

      expect(result.detectionResult.success).toBe(true);
      expect(result.detectionResult.frameworks.length).toBeGreaterThanOrEqual(2);
      
      const frameworkNames = result.detectionResult.frameworks.map(f => f.name);
      expect(frameworkNames).toContain('React');
      expect(frameworkNames).toContain('Express');
    });
  });

  describe('Python Project Integration', () => {
    it('should detect Django framework', async () => {
      const readmeContent = `
# Django Web Application

A Django web application for managing tasks.

## Setup

\`\`\`bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
\`\`\`

## Testing

\`\`\`bash
python manage.py test
\`\`\`

## Dependencies

- Django 4.2.0
- Python 3.9+
- PostgreSQL

## Project Structure

- \`manage.py\` - Django management script
- \`settings.py\` - Django settings
- \`requirements.txt\` - Python dependencies
`;

      const result = await integration.processReadmeContent(readmeContent);

      expect(result.detectionResult.success).toBe(true);
      
      const djangoFramework = result.detectionResult.frameworks.find(f => f.name === 'Django');
      expect(djangoFramework).toBeDefined();
      expect(djangoFramework?.ecosystem).toBe('python');
      expect(djangoFramework?.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Flask framework', async () => {
      const readmeContent = `
# Flask API

A simple Flask REST API.

## Installation

\`\`\`bash
pip install flask
pip install -r requirements.txt
\`\`\`

## Running

\`\`\`bash
python app.py
\`\`\`

## Dependencies

- Flask 2.3.0
- Python 3.8+

## API Endpoints

- GET /api/users
- POST /api/users
`;

      const result = await integration.processReadmeContent(readmeContent);

      expect(result.detectionResult.success).toBe(true);
      
      const flaskFramework = result.detectionResult.frameworks.find(f => f.name === 'Flask');
      expect(flaskFramework).toBeDefined();
      expect(flaskFramework?.ecosystem).toBe('python');
    });
  });

  describe('Multi-Language Project Integration', () => {
    it('should detect frameworks from multiple languages', async () => {
      const readmeContent = `
# Microservices Application

A microservices application with multiple technologies.

## Frontend (React)

\`\`\`bash
cd frontend
npm install
npm start
\`\`\`

## API Gateway (Go)

\`\`\`bash
cd gateway
go mod download
go run main.go
\`\`\`

## User Service (Python/Django)

\`\`\`bash
cd user-service
pip install -r requirements.txt
python manage.py runserver
\`\`\`

## Order Service (Rust)

\`\`\`bash
cd order-service
cargo build
cargo run
\`\`\`

## Dependencies

- React 18.0.0
- Go 1.21
- Django 4.2.0
- Rust 1.70.0
`;

      const result = await integration.processReadmeContent(readmeContent);

      expect(result.detectionResult.success).toBe(true);
      expect(result.detectionResult.frameworks.length).toBeGreaterThanOrEqual(3);
      
      const ecosystems = result.detectionResult.frameworks.map(f => f.ecosystem);
      expect(ecosystems).toContain('nodejs');
      expect(ecosystems).toContain('python');
      expect(ecosystems).toContain('go');
      expect(ecosystems).toContain('rust');
    });
  });

  describe('Container Integration', () => {
    it('should detect Docker containerization', async () => {
      const readmeContent = `
# Containerized Application

A Node.js application running in Docker.

## Docker Setup

\`\`\`bash
docker build -t myapp .
docker run -p 3000:3000 myapp
\`\`\`

## Docker Compose

\`\`\`bash
docker-compose up -d
\`\`\`

## Files

- \`Dockerfile\` - Container configuration
- \`docker-compose.yml\` - Multi-container setup
- \`package.json\` - Node.js dependencies

## Dependencies

- Node.js 18.0.0
- Express 4.18.0
- Docker
`;

      const result = await integration.processReadmeContent(readmeContent);

      expect(result.detectionResult.success).toBe(true);
      expect(result.detectionResult.containers.length).toBeGreaterThan(0);
      
      const dockerContainer = result.detectionResult.containers.find(c => c.type === 'docker');
      expect(dockerContainer).toBeDefined();
    });
  });

  describe('CI Pipeline Generation Integration', () => {
    it('should generate CI pipeline for detected frameworks', async () => {
      const readmeContent = `
# React TypeScript App

A React application with TypeScript and testing.

## Development

\`\`\`bash
npm install
npm start
npm run build
npm test
npm run lint
\`\`\`

## Dependencies

- React 18.0.0
- TypeScript 4.9.0
- Jest 29.0.0
- ESLint 8.0.0
`;

      const result = await integration.processReadmeContent(readmeContent);
      
      expect(result.detectionResult.success).toBe(true);
      
      // Generate CI pipeline from detection results
      const frameworkDetector = new FrameworkDetectorImpl();
      const pipeline = await frameworkDetector.suggestCISteps(result.detectionResult);

      expect(pipeline).toBeDefined();
      expect(pipeline.setup.length).toBeGreaterThan(0);
      expect(pipeline.build.length).toBeGreaterThan(0);
      expect(pipeline.test.length).toBeGreaterThan(0);
      
      // Verify Node.js setup step exists
      const nodeSetup = pipeline.setup.find(step => step.name.includes('Node'));
      expect(nodeSetup).toBeDefined();
      
      // Verify npm/yarn install step exists
      const installStep = pipeline.build.find(step => 
        step.command?.includes('npm install') || step.command?.includes('yarn install')
      );
      expect(installStep).toBeDefined();
      
      // Verify test step exists
      const testStep = pipeline.test.find(step => 
        step.command?.includes('npm test') || step.command?.includes('yarn test')
      );
      expect(testStep).toBeDefined();
    });

    it('should generate appropriate cache strategies', async () => {
      const readmeContent = `
# Multi-Language Project

## Node.js Frontend

\`\`\`bash
npm install
npm run build
\`\`\`

## Python Backend

\`\`\`bash
pip install -r requirements.txt
python manage.py runserver
\`\`\`

## Dependencies

- React 18.0.0
- Django 4.2.0
`;

      const result = await integration.processReadmeContent(readmeContent);
      
      const frameworkDetector = new FrameworkDetectorImpl();
      const pipeline = await frameworkDetector.suggestCISteps(result.detectionResult);

      expect(pipeline.cache.length).toBeGreaterThan(0);
      
      // Should have Node.js cache strategy
      const nodeCache = pipeline.cache.find(cache => cache.id.includes('node'));
      expect(nodeCache).toBeDefined();
      
      // Should have Python cache strategy
      const pythonCache = pipeline.cache.find(cache => cache.id.includes('pip'));
      expect(pythonCache).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle empty README content gracefully', async () => {
      const result = await integration.processReadmeContent('');

      expect(result.detectionResult.success).toBe(false);
      expect(result.detectionResult.warnings.length).toBeGreaterThan(0);
      expect(result.metadata.warnings.length).toBeGreaterThan(0);
    });

    it('should handle malformed README content', async () => {
      const malformedContent = `
# Incomplete README

This README has some issues...

\`\`\`bash
npm install
# Missing closing backticks

## Dependencies

- React (no version)
- 
`;

      const result = await integration.processReadmeContent(malformedContent);

      // Should still succeed but with warnings
      expect(result.detectionResult.success).toBe(true);
      expect(result.metadata.conversionSuccess).toBe(true);
      
      // May have warnings about incomplete information
      if (result.metadata.warnings.length > 0) {
        expect(result.metadata.warnings.some(w => w.includes('incomplete') || w.includes('malformed'))).toBe(true);
      }
    });

    it('should handle README with no framework information', async () => {
      const readmeContent = `
# Generic Project

This is a generic project with no specific framework information.

## Description

Just a simple project.

## Usage

Run the application.
`;

      const result = await integration.processReadmeContent(readmeContent);

      expect(result.detectionResult.success).toBe(true);
      expect(result.detectionResult.frameworks.length).toBe(0);
      expect(result.detectionResult.confidence.score).toBeLessThan(0.3);
    });
  });

  describe('Performance Integration', () => {
    it('should complete integration within reasonable time', async () => {
      const readmeContent = `
# Performance Test Project

A project to test integration performance.

## Technologies

- React 18.0.0
- TypeScript 4.9.0
- Express 4.18.0
- Django 4.2.0
- Go 1.21
- Rust 1.70.0

## Commands

\`\`\`bash
npm install
npm start
npm run build
npm test
pip install -r requirements.txt
python manage.py runserver
go mod download
go run main.go
cargo build
cargo run
\`\`\`
`;

      const startTime = Date.now();
      const result = await integration.processReadmeContent(readmeContent);
      const endTime = Date.now();

      expect(result.detectionResult.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify performance metadata
      expect(result.metadata.totalTime).toBeGreaterThan(0);
      expect(result.metadata.parsingTime).toBeGreaterThan(0);
      expect(result.metadata.detectionTime).toBeGreaterThan(0);
      expect(result.performance.memoryBefore).toBeGreaterThan(0);
      expect(result.performance.memoryAfter).toBeGreaterThan(0);
    });
  });

  describe('Integration Statistics', () => {
    it('should provide integration statistics', async () => {
      const stats = integration.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.readmeParserStats).toBeDefined();
      expect(stats.frameworkDetectorStats).toBeDefined();
    });
  });

  describe('Convenience Functions', () => {
    it('should work with processReadmeContent convenience function', async () => {
      const readmeContent = `
# Test Project

A simple React project.

## Setup

\`\`\`bash
npm install
npm start
\`\`\`

## Dependencies

- React 18.0.0
`;

      const result = await processReadmeContent(readmeContent);

      expect(result.detectionResult.success).toBe(true);
      expect(result.detectionResult.frameworks.length).toBeGreaterThan(0);
      expect(result.detectionResult.frameworks[0].name).toBe('React');
    });
  });
});

describe('End-to-End Integration Workflow', () => {
  it('should complete full workflow: README → Parse → Detect → Generate CI', async () => {
    const readmeContent = `
# Full Stack E-commerce Application

A modern e-commerce platform built with React and Node.js.

## Frontend

Built with React, TypeScript, and Tailwind CSS.

\`\`\`bash
cd frontend
npm install
npm start
npm run build
npm test
\`\`\`

## Backend

Express.js API with MongoDB.

\`\`\`bash
cd backend
npm install
npm run dev
npm test
\`\`\`

## Docker

\`\`\`bash
docker-compose up -d
\`\`\`

## Dependencies

### Frontend
- React 18.2.0
- TypeScript 4.9.0
- Tailwind CSS 3.0.0
- Jest 29.0.0

### Backend
- Express 4.18.0
- MongoDB 5.0.0
- Node.js 18.0.0

## Files

- \`package.json\` - Node.js dependencies
- \`Dockerfile\` - Container configuration
- \`docker-compose.yml\` - Multi-container setup
`;

    // Step 1: Process README
    const integration = createIntegration();
    const result = await integration.processReadmeContent(readmeContent);

    // Verify parsing and detection
    expect(result.detectionResult.success).toBe(true);
    expect(result.detectionResult.frameworks.length).toBeGreaterThanOrEqual(2);
    
    const frameworkNames = result.detectionResult.frameworks.map(f => f.name);
    expect(frameworkNames).toContain('React');
    expect(frameworkNames).toContain('Express');

    // Step 2: Generate CI Pipeline
    const frameworkDetector = new FrameworkDetectorImpl();
    const pipeline = await frameworkDetector.suggestCISteps(result.detectionResult);

    // Verify CI pipeline
    expect(pipeline).toBeDefined();
    expect(pipeline.setup.length).toBeGreaterThan(0);
    expect(pipeline.build.length).toBeGreaterThan(0);
    expect(pipeline.test.length).toBeGreaterThan(0);
    expect(pipeline.security.length).toBeGreaterThan(0);

    // Verify Node.js specific steps
    const nodeSetup = pipeline.setup.find(step => step.uses?.includes('setup-node'));
    expect(nodeSetup).toBeDefined();

    // Verify caching
    expect(pipeline.cache.length).toBeGreaterThan(0);
    const nodeCache = pipeline.cache.find(cache => cache.id.includes('node'));
    expect(nodeCache).toBeDefined();

    // Verify security steps
    const securitySteps = pipeline.security;
    expect(securitySteps.some(step => step.name.includes('audit'))).toBe(true);

    // Verify metadata
    expect(pipeline.metadata.name).toBeDefined();
    expect(pipeline.metadata.triggers.length).toBeGreaterThan(0);
    expect(pipeline.metadata.environments.length).toBeGreaterThan(0);

    // Clean up
    integration.clearCaches();
  });
});