#!/usr/bin/env node

/**
 * Streaming generator for real-world project fixtures
 * Replaces static project fixtures with on-demand generation
 */

const { StreamingDataFactory } = require('../../../src/shared/streaming-test-data');

/**
 * Project templates for different types of applications
 */
const PROJECT_TEMPLATES = {
  'react-typescript-app': {
    type: 'frontend',
    framework: 'React',
    language: 'TypeScript',
    buildTool: 'Vite',
    packageManager: 'npm',
    features: ['TypeScript', 'ESLint', 'Prettier', 'Testing Library', 'Vitest']
  },
  'django-rest-api': {
    type: 'backend',
    framework: 'Django',
    language: 'Python',
    buildTool: 'pip',
    packageManager: 'pip',
    features: ['Django REST Framework', 'PostgreSQL', 'Celery', 'Redis', 'Docker']
  },
  'go-gin-microservice': {
    type: 'microservice',
    framework: 'Gin',
    language: 'Go',
    buildTool: 'go',
    packageManager: 'go mod',
    features: ['Gin', 'GORM', 'JWT', 'Docker', 'Kubernetes']
  },
  'rust-cli-tool': {
    type: 'cli',
    framework: 'Clap',
    language: 'Rust',
    buildTool: 'cargo',
    packageManager: 'cargo',
    features: ['Clap', 'Serde', 'Tokio', 'Anyhow', 'Tracing']
  },
  'java-spring-boot': {
    type: 'backend',
    framework: 'Spring Boot',
    language: 'Java',
    buildTool: 'Maven',
    packageManager: 'maven',
    features: ['Spring Boot', 'Spring Data JPA', 'Spring Security', 'H2', 'JUnit']
  },
  'fullstack-react-express': {
    type: 'fullstack',
    framework: 'React + Express',
    language: 'JavaScript',
    buildTool: 'npm',
    packageManager: 'npm',
    features: ['React', 'Express', 'MongoDB', 'JWT', 'Docker']
  },
  'monorepo-workspace': {
    type: 'monorepo',
    framework: 'Multiple',
    language: 'Multiple',
    buildTool: 'Lerna',
    packageManager: 'yarn',
    features: ['Lerna', 'React', 'Node.js', 'TypeScript', 'Jest']
  }
};

/**
 * Generate streaming README for a specific project type
 * @param {string} projectType - Type of project to generate
 * @param {string} size - Size category: 'small', 'medium', 'large'
 * @returns {Promise<{content: string, metadata: object}>}
 */
async function generateProjectReadme(projectType, size = 'medium') {
  const template = PROJECT_TEMPLATES[projectType];
  if (!template) {
    throw new Error(`Unknown project type: ${projectType}`);
  }

  const config = {
    type: 'readme',
    size: size,
    frameworks: [template.framework],
    languages: [template.language],
    patterns: template.features,
    maxMemoryUsage: getMemoryLimitForSize(size)
  };

  const { content, metrics } = await StreamingDataFactory.generateString(config);
  
  // Customize content for specific project type
  const customizedContent = customizeContentForProject(content, template);
  
  return {
    content: customizedContent,
    metadata: {
      projectType,
      template,
      metrics,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Customize generated content for specific project type
 * @param {string} content - Base generated content
 * @param {object} template - Project template
 * @returns {string} Customized content
 */
function customizeContentForProject(content, template) {
  let customized = content;
  
  // Replace generic title with project-specific title
  customized = customized.replace(
    /# Streaming README Test \([^)]+\)/,
    `# ${template.framework} ${template.type.charAt(0).toUpperCase() + template.type.slice(1)}`
  );
  
  // Add project-specific sections
  const projectSections = generateProjectSpecificSections(template);
  customized = customized.replace(
    /## Table of Contents/,
    `${projectSections}\n\n## Table of Contents`
  );
  
  return customized;
}

/**
 * Generate project-specific sections
 * @param {object} template - Project template
 * @returns {string} Project-specific content
 */
function generateProjectSpecificSections(template) {
  let sections = '';
  
  // Add tech stack section
  sections += `## Tech Stack\n\n`;
  sections += `- **Language**: ${template.language}\n`;
  sections += `- **Framework**: ${template.framework}\n`;
  sections += `- **Build Tool**: ${template.buildTool}\n`;
  sections += `- **Package Manager**: ${template.packageManager}\n\n`;
  
  // Add features section
  sections += `## Features\n\n`;
  template.features.forEach(feature => {
    sections += `- ✅ ${feature}\n`;
  });
  sections += '\n';
  
  // Add project type specific sections
  switch (template.type) {
    case 'frontend':
      sections += generateFrontendSections(template);
      break;
    case 'backend':
      sections += generateBackendSections(template);
      break;
    case 'microservice':
      sections += generateMicroserviceSections(template);
      break;
    case 'cli':
      sections += generateCliSections(template);
      break;
    case 'fullstack':
      sections += generateFullstackSections(template);
      break;
    case 'monorepo':
      sections += generateMonorepoSections(template);
      break;
  }
  
  return sections;
}

/**
 * Generate frontend-specific sections
 */
function generateFrontendSections(template) {
  return `## Development\n\n` +
         `\`\`\`bash\n` +
         `# Install dependencies\n${template.packageManager} install\n\n` +
         `# Start development server\n${template.packageManager} run dev\n\n` +
         `# Build for production\n${template.packageManager} run build\n\`\`\`\n\n`;
}

/**
 * Generate backend-specific sections
 */
function generateBackendSections(template) {
  return `## API Endpoints\n\n` +
         `- \`GET /api/health\` - Health check\n` +
         `- \`POST /api/auth/login\` - User authentication\n` +
         `- \`GET /api/users\` - List users\n\n` +
         `## Development\n\n` +
         `\`\`\`bash\n` +
         `# Install dependencies\n${template.packageManager} install\n\n` +
         `# Run development server\n${template.packageManager} run dev\n\`\`\`\n\n`;
}

/**
 * Generate microservice-specific sections
 */
function generateMicroserviceSections(template) {
  return `## Service Architecture\n\n` +
         `This microservice provides:\n` +
         `- RESTful API endpoints\n` +
         `- Health checks and metrics\n` +
         `- Container-ready deployment\n\n` +
         `## Docker\n\n` +
         `\`\`\`bash\n` +
         `# Build image\ndocker build -t ${template.framework.toLowerCase()}-service .\n\n` +
         `# Run container\ndocker run -p 8080:8080 ${template.framework.toLowerCase()}-service\n\`\`\`\n\n`;
}

/**
 * Generate CLI-specific sections
 */
function generateCliSections(template) {
  return `## Installation\n\n` +
         `\`\`\`bash\n` +
         `# Install from source\n${template.buildTool} install --path .\n\n` +
         `# Or install from registry\n${template.buildTool} install ${template.framework.toLowerCase()}-cli\n\`\`\`\n\n` +
         `## Usage\n\n` +
         `\`\`\`bash\n` +
         `# Basic usage\n${template.framework.toLowerCase()}-cli --help\n\n` +
         `# Run command\n${template.framework.toLowerCase()}-cli process --input file.txt\n\`\`\`\n\n`;
}

/**
 * Generate fullstack-specific sections
 */
function generateFullstackSections(template) {
  return `## Architecture\n\n` +
         `- **Frontend**: React with modern hooks\n` +
         `- **Backend**: Express.js REST API\n` +
         `- **Database**: MongoDB with Mongoose\n` +
         `- **Authentication**: JWT tokens\n\n` +
         `## Development\n\n` +
         `\`\`\`bash\n` +
         `# Install all dependencies\n${template.packageManager} run install:all\n\n` +
         `# Start development servers\n${template.packageManager} run dev\n\`\`\`\n\n`;
}

/**
 * Generate monorepo-specific sections
 */
function generateMonorepoSections(template) {
  return `## Workspace Structure\n\n` +
         `\`\`\`\n` +
         `packages/\n` +
         `├── frontend/     # React application\n` +
         `├── backend/      # Node.js API\n` +
         `├── shared/       # Shared utilities\n` +
         `└── mobile/       # React Native app\n\`\`\`\n\n` +
         `## Development\n\n` +
         `\`\`\`bash\n` +
         `# Install all dependencies\n${template.packageManager} install\n\n` +
         `# Build all packages\n${template.packageManager} run build\n\`\`\`\n\n`;
}

/**
 * Get memory limit for size category
 */
function getMemoryLimitForSize(size) {
  const limits = {
    small: 1024 * 1024,      // 1MB
    medium: 5 * 1024 * 1024, // 5MB
    large: 20 * 1024 * 1024  // 20MB
  };
  return limits[size] || limits.medium;
}

/**
 * Generate package.json content for a project type
 * @param {string} projectType - Type of project
 * @param {string} size - Size category
 * @returns {Promise<{content: string, metadata: object}>}
 */
async function generateProjectPackageJson(projectType, size = 'medium') {
  const template = PROJECT_TEMPLATES[projectType];
  if (!template) {
    throw new Error(`Unknown project type: ${projectType}`);
  }

  const config = {
    type: 'package-json',
    size: size,
    maxMemoryUsage: getMemoryLimitForSize(size)
  };

  const { content, metrics } = await StreamingDataFactory.generateString(config);
  
  // Customize package.json for specific project type
  const packageJson = JSON.parse(content);
  packageJson.name = `${projectType}-example`;
  packageJson.description = `Example ${template.framework} ${template.type} application`;
  
  // Add project-specific dependencies
  addProjectSpecificDependencies(packageJson, template);
  
  const customizedContent = JSON.stringify(packageJson, null, 2);
  
  return {
    content: customizedContent,
    metadata: {
      projectType,
      template,
      metrics,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Add project-specific dependencies to package.json
 */
function addProjectSpecificDependencies(packageJson, template) {
  // Add framework-specific dependencies
  switch (template.framework) {
    case 'React':
      packageJson.dependencies.react = '^18.0.0';
      packageJson.dependencies['react-dom'] = '^18.0.0';
      if (template.language === 'TypeScript') {
        packageJson.devDependencies['@types/react'] = '^18.0.0';
        packageJson.devDependencies['@types/react-dom'] = '^18.0.0';
      }
      break;
    case 'Express':
      packageJson.dependencies.express = '^4.18.0';
      packageJson.dependencies.cors = '^2.8.5';
      break;
    case 'Django':
      // Django uses requirements.txt, not package.json
      break;
  }
  
  // Add build tool specific scripts
  switch (template.buildTool) {
    case 'Vite':
      packageJson.scripts.dev = 'vite';
      packageJson.scripts.build = 'vite build';
      packageJson.scripts.preview = 'vite preview';
      break;
    case 'npm':
      packageJson.scripts.start = 'node server.js';
      packageJson.scripts.dev = 'nodemon server.js';
      break;
  }
}

/**
 * Generate all project files for a given project type
 * @param {string} projectType - Type of project
 * @param {string} size - Size category
 * @returns {Promise<{files: object, metadata: object}>}
 */
async function generateProjectFiles(projectType, size = 'medium') {
  const files = {};
  
  // Generate README
  const readmeResult = await generateProjectReadme(projectType, size);
  files['README.md'] = readmeResult.content;
  
  // Generate package.json for JavaScript/TypeScript projects
  const template = PROJECT_TEMPLATES[projectType];
  if (['JavaScript', 'TypeScript'].includes(template.language)) {
    const packageResult = await generateProjectPackageJson(projectType, size);
    files['package.json'] = packageResult.content;
  }
  
  // Generate other project-specific files
  const additionalFiles = generateAdditionalFiles(template);
  Object.assign(files, additionalFiles);
  
  return {
    files,
    metadata: {
      projectType,
      template,
      fileCount: Object.keys(files).length,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Generate additional project-specific files
 */
function generateAdditionalFiles(template) {
  const files = {};
  
  // Add Dockerfile for containerized projects
  if (template.features.includes('Docker')) {
    files['Dockerfile'] = generateDockerfile(template);
  }
  
  // Add CI configuration
  files['.github/workflows/ci.yml'] = generateCIWorkflow(template);
  
  // Add language-specific configuration files
  switch (template.language) {
    case 'TypeScript':
      files['tsconfig.json'] = generateTSConfig();
      break;
    case 'Python':
      files['requirements.txt'] = generateRequirementsTxt(template);
      break;
    case 'Go':
      files['go.mod'] = generateGoMod(template);
      break;
    case 'Rust':
      files['Cargo.toml'] = generateCargoToml(template);
      break;
    case 'Java':
      files['pom.xml'] = generatePomXml(template);
      break;
  }
  
  return files;
}

/**
 * Generate Dockerfile content
 */
function generateDockerfile(template) {
  const dockerfiles = {
    'Node.js': `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`,
    
    'Python': `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]`,
    
    'Go': `FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]`,
    
    'Rust': `FROM rust:1.70 AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/app /usr/local/bin/app
EXPOSE 8080
CMD ["app"]`
  };
  
  return dockerfiles[template.language] || dockerfiles['Node.js'];
}

/**
 * Generate CI workflow
 */
function generateCIWorkflow(template) {
  return `name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup ${template.language}
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: ${template.packageManager} install
      
    - name: Run tests
      run: ${template.packageManager} test
      
    - name: Build
      run: ${template.packageManager} run build`;
}

/**
 * Generate TypeScript configuration
 */
function generateTSConfig() {
  return JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "node",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist"]
  }, null, 2);
}

/**
 * Generate Python requirements.txt
 */
function generateRequirementsTxt(template) {
  const requirements = ['Django>=4.2.0', 'djangorestframework>=3.14.0'];
  if (template.features.includes('PostgreSQL')) {
    requirements.push('psycopg2-binary>=2.9.0');
  }
  return requirements.join('\n');
}

/**
 * Generate Go module file
 */
function generateGoMod(template) {
  return `module ${template.framework.toLowerCase()}-service

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    gorm.io/gorm v1.25.0
    gorm.io/driver/postgres v1.5.0
)`;
}

/**
 * Generate Cargo.toml
 */
function generateCargoToml(template) {
  return `[package]
name = "${template.framework.toLowerCase()}-cli"
version = "0.1.0"
edition = "2021"

[dependencies]
clap = { version = "4.0", features = ["derive"] }
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1.0", features = ["full"] }
anyhow = "1.0"`;
}

/**
 * Generate Maven POM
 */
function generatePomXml(template) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    
    <groupId>com.example</groupId>
    <artifactId>spring-boot-api</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <packaging>jar</packaging>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.1.0</version>
        <relativePath/>
    </parent>
    
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
    </dependencies>
</project>`;
}

// Export functions for use in tests
module.exports = {
  generateProjectReadme,
  generateProjectPackageJson,
  generateProjectFiles,
  PROJECT_TEMPLATES,
  
  // Convenience functions for specific project types
  generateReactApp: (size) => generateProjectFiles('react-typescript-app', size),
  generateDjangoAPI: (size) => generateProjectFiles('django-rest-api', size),
  generateGoService: (size) => generateProjectFiles('go-gin-microservice', size),
  generateRustCLI: (size) => generateProjectFiles('rust-cli-tool', size),
  generateSpringBootAPI: (size) => generateProjectFiles('java-spring-boot', size),
  generateFullstackApp: (size) => generateProjectFiles('fullstack-react-express', size),
  generateMonorepo: (size) => generateProjectFiles('monorepo-workspace', size)
};