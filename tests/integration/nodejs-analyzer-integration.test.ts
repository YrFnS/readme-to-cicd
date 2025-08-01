import { describe, it, expect, beforeEach } from 'vitest';
import { NodeJSAnalyzer } from '../../src/detection/analyzers/nodejs';
import { ProjectInfo } from '../../src/detection/interfaces/language-analyzer';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('NodeJSAnalyzer Integration Tests', () => {
  let analyzer: NodeJSAnalyzer;
  const fixturesPath = join(__dirname, '../fixtures/nodejs');

  beforeEach(() => {
    analyzer = new NodeJSAnalyzer();
  });

  describe('Real package.json analysis', () => {
    it('should correctly analyze React project from fixture', async () => {
      const packageJsonPath = join(fixturesPath, 'react-package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      const projectInfo: ProjectInfo = {
        name: 'react-test-app',
        languages: ['JavaScript'],
        dependencies: ['react', 'react-dom', 'react-scripts'],
        buildCommands: ['npm run build'],
        testCommands: ['npm test'],
        installationSteps: ['npm install'],
        usageExamples: ['npm start'],
        configFiles: ['package.json'],
        rawContent: 'A React application for testing'
      };

      // Create a temporary directory structure for testing
      const tempDir = join(__dirname, '../temp/react-test');
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      try {
        const result = await analyzer.analyze(projectInfo, tempDir);

        expect(result.frameworks).toHaveLength(1);
        expect(result.frameworks[0].name).toBe('React');
        expect(result.frameworks[0].type).toBe('frontend_framework');
        expect(result.frameworks[0].version).toBe('^18.2.0');
        expect(result.frameworks[0].confidence).toBeGreaterThan(0.7);

        expect(result.buildTools).toHaveLength(1);
        expect(result.buildTools[0].name).toBe('npm');

        expect(result.confidence).toBeGreaterThan(0.7);
        expect(result.metadata.filesAnalyzed).toContain('package.json');
      } finally {
        // Cleanup
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should correctly analyze Vue.js project from fixture', async () => {
      const packageJsonPath = join(fixturesPath, 'vue-package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      const projectInfo: ProjectInfo = {
        name: 'vue-test-app',
        languages: ['JavaScript'],
        dependencies: ['vue', '@vue/cli-service'],
        buildCommands: ['npm run build'],
        testCommands: ['npm run test:unit'],
        installationSteps: ['npm install'],
        usageExamples: ['npm run serve'],
        configFiles: ['package.json'],
        rawContent: 'A Vue.js application for testing'
      };

      const tempDir = join(__dirname, '../temp/vue-test');
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      await fs.writeFile(join(tempDir, 'vue.config.js'), 'module.exports = {}');

      try {
        const result = await analyzer.analyze(projectInfo, tempDir);

        expect(result.frameworks).toHaveLength(1);
        expect(result.frameworks[0].name).toBe('Vue.js');
        expect(result.frameworks[0].type).toBe('frontend_framework');
        expect(result.frameworks[0].version).toBe('^3.2.13');
        expect(result.frameworks[0].confidence).toBeGreaterThan(0.7);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should correctly analyze Angular project from fixture', async () => {
      const packageJsonPath = join(fixturesPath, 'angular-package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      const projectInfo: ProjectInfo = {
        name: 'angular-test-app',
        languages: ['TypeScript'],
        dependencies: ['@angular/core', '@angular/common'],
        buildCommands: ['ng build'],
        testCommands: ['ng test'],
        installationSteps: ['npm install'],
        usageExamples: ['ng serve'],
        configFiles: ['package.json', 'angular.json'],
        rawContent: 'An Angular application for testing'
      };

      const tempDir = join(__dirname, '../temp/angular-test');
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      await fs.writeFile(join(tempDir, 'angular.json'), '{}');

      try {
        const result = await analyzer.analyze(projectInfo, tempDir);

        expect(result.frameworks).toHaveLength(1);
        expect(result.frameworks[0].name).toBe('Angular');
        expect(result.frameworks[0].type).toBe('frontend_framework');
        expect(result.frameworks[0].version).toBe('^15.2.0');
        expect(result.frameworks[0].confidence).toBeGreaterThan(0.8);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should correctly analyze Next.js project from fixture', async () => {
      const packageJsonPath = join(fixturesPath, 'nextjs-package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      const projectInfo: ProjectInfo = {
        name: 'nextjs-test-app',
        languages: ['JavaScript', 'TypeScript'],
        dependencies: ['next', 'react', 'react-dom'],
        buildCommands: ['next build'],
        testCommands: [],
        installationSteps: ['npm install'],
        usageExamples: ['npm run dev'],
        configFiles: ['package.json'],
        rawContent: 'A Next.js application for testing'
      };

      const tempDir = join(__dirname, '../temp/nextjs-test');
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      await fs.writeFile(join(tempDir, 'next.config.js'), 'module.exports = {}');

      try {
        const result = await analyzer.analyze(projectInfo, tempDir);

        expect(result.frameworks.length).toBeGreaterThanOrEqual(2); // Next.js and React
        const nextFramework = result.frameworks.find(f => f.name === 'Next.js');
        const reactFramework = result.frameworks.find(f => f.name === 'React');

        expect(nextFramework).toBeDefined();
        expect(nextFramework?.type).toBe('fullstack_framework');
        expect(nextFramework?.version).toBe('13.4.2');

        expect(reactFramework).toBeDefined();
        expect(reactFramework?.type).toBe('frontend_framework');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should correctly analyze Express project from fixture', async () => {
      const packageJsonPath = join(fixturesPath, 'express-package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      const projectInfo: ProjectInfo = {
        name: 'express-test-api',
        languages: ['JavaScript'],
        dependencies: ['express'],
        buildCommands: [],
        testCommands: ['npm test'],
        installationSteps: ['npm install'],
        usageExamples: ['npm start'],
        configFiles: ['package.json'],
        rawContent: 'An Express.js API for testing'
      };

      const tempDir = join(__dirname, '../temp/express-test');
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      try {
        const result = await analyzer.analyze(projectInfo, tempDir);

        expect(result.frameworks).toHaveLength(1);
        expect(result.frameworks[0].name).toBe('Express');
        expect(result.frameworks[0].type).toBe('backend_framework');
        expect(result.frameworks[0].version).toBe('^4.18.2');
        expect(result.frameworks[0].confidence).toBeGreaterThan(0.6);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should correctly analyze NestJS project from fixture', async () => {
      const packageJsonPath = join(fixturesPath, 'nestjs-package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      const projectInfo: ProjectInfo = {
        name: 'nestjs-test-app',
        languages: ['TypeScript'],
        dependencies: ['@nestjs/core', '@nestjs/common'],
        buildCommands: ['nest build'],
        testCommands: ['npm test'],
        installationSteps: ['npm install'],
        usageExamples: ['npm run start:dev'],
        configFiles: ['package.json'],
        rawContent: 'A NestJS application for testing'
      };

      const tempDir = join(__dirname, '../temp/nestjs-test');
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      try {
        const result = await analyzer.analyze(projectInfo, tempDir);

        expect(result.frameworks).toHaveLength(1);
        expect(result.frameworks[0].name).toBe('NestJS');
        expect(result.frameworks[0].type).toBe('backend_framework');
        expect(result.frameworks[0].version).toBe('^9.0.0');
        expect(result.frameworks[0].confidence).toBeGreaterThan(0.7);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should handle complex monorepo with multiple frameworks', async () => {
      const monorepoPackageJson = {
        name: 'fullstack-monorepo',
        version: '1.0.0',
        private: true,
        workspaces: ['packages/*'],
        dependencies: {
          'next': '^13.4.2',
          'react': '^18.2.0',
          'react-dom': '^18.2.0',
          'express': '^4.18.2',
          '@nestjs/core': '^9.0.0',
          '@nestjs/common': '^9.0.0'
        },
        scripts: {
          'build:frontend': 'next build',
          'build:api': 'nest build',
          'dev:frontend': 'next dev',
          'dev:api': 'nest start --watch'
        }
      };

      const projectInfo: ProjectInfo = {
        name: 'fullstack-monorepo',
        languages: ['JavaScript', 'TypeScript'],
        dependencies: ['next', 'react', 'express', '@nestjs/core'],
        buildCommands: ['npm run build:frontend', 'npm run build:api'],
        testCommands: ['npm test'],
        installationSteps: ['npm install'],
        usageExamples: ['npm run dev:frontend', 'npm run dev:api'],
        configFiles: ['package.json'],
        rawContent: 'A full-stack monorepo with Next.js frontend and NestJS API'
      };

      const tempDir = join(__dirname, '../temp/monorepo-test');
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(join(tempDir, 'package.json'), JSON.stringify(monorepoPackageJson, null, 2));

      try {
        const result = await analyzer.analyze(projectInfo, tempDir);

        expect(result.frameworks.length).toBeGreaterThanOrEqual(3);
        const frameworkNames = result.frameworks.map(f => f.name);
        
        expect(frameworkNames).toContain('Next.js');
        expect(frameworkNames).toContain('React');
        expect(frameworkNames).toContain('Express');
        expect(frameworkNames).toContain('NestJS');

        expect(result.confidence).toBeGreaterThan(0.7);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('Package manager detection', () => {
    it('should detect yarn from lock file', async () => {
      const projectInfo: ProjectInfo = {
        name: 'yarn-project',
        languages: ['JavaScript'],
        dependencies: ['react'],
        buildCommands: ['yarn build'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json'],
        rawContent: ''
      };

      const tempDir = join(__dirname, '../temp/yarn-test');
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(join(tempDir, 'package.json'), '{"dependencies": {"react": "^18.0.0"}}');
      await fs.writeFile(join(tempDir, 'yarn.lock'), '# Yarn lock file');

      try {
        const result = await analyzer.analyze(projectInfo, tempDir);

        expect(result.buildTools).toHaveLength(1);
        expect(result.buildTools[0].name).toBe('yarn');
        expect(result.buildTools[0].configFile).toBe('yarn.lock');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should detect pnpm from lock file', async () => {
      const projectInfo: ProjectInfo = {
        name: 'pnpm-project',
        languages: ['JavaScript'],
        dependencies: ['vue'],
        buildCommands: ['pnpm build'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json'],
        rawContent: ''
      };

      const tempDir = join(__dirname, '../temp/pnpm-test');
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(join(tempDir, 'package.json'), '{"dependencies": {"vue": "^3.0.0"}}');
      await fs.writeFile(join(tempDir, 'pnpm-lock.yaml'), 'lockfileVersion: 5.4');

      try {
        const result = await analyzer.analyze(projectInfo, tempDir);

        expect(result.buildTools).toHaveLength(1);
        expect(result.buildTools[0].name).toBe('pnpm');
        expect(result.buildTools[0].configFile).toBe('pnpm-lock.yaml');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});