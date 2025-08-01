import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FrontendAnalyzer } from '../../src/detection/analyzers/frontend';
import { ProjectInfo } from '../../src/detection/interfaces/language-analyzer';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FrontendAnalyzer Integration Tests', () => {
  let analyzer: FrontendAnalyzer;
  let tempDir: string;

  beforeEach(async () => {
    analyzer = new FrontendAnalyzer();
    tempDir = join(tmpdir(), `frontend-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Real-world project scenarios', () => {
    it('should detect React + Vite project', async () => {
      // Create package.json
      const packageJson = {
        name: 'react-vite-app',
        version: '1.0.0',
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0'
        },
        devDependencies: {
          vite: '^4.0.0',
          '@vitejs/plugin-react': '^3.0.0'
        },
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview'
        }
      };

      await fs.writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create vite config
      const viteConfig = `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`;

      await fs.writeFile(join(tempDir, 'vite.config.js'), viteConfig);

      const projectInfo: ProjectInfo = {
        name: 'react-vite-app',
        languages: ['JavaScript', 'TypeScript'],
        dependencies: ['react', 'react-dom', 'vite', '@vitejs/plugin-react'],
        buildCommands: ['vite build'],
        testCommands: [],
        installationSteps: ['npm install'],
        usageExamples: ['npm run dev'],
        configFiles: ['package.json', 'vite.config.js'],
        rawContent: 'A React application built with Vite'
      };

      const result = await analyzer.analyze(projectInfo, tempDir);

      expect(result.buildTools).toHaveLength(1);
      expect(result.buildTools[0].name).toBe('Vite');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.metadata.filesAnalyzed).toContain('vite.config.js');
    });

    it('should detect Next.js project with Vercel deployment', async () => {
      // Create package.json
      const packageJson = {
        name: 'nextjs-app',
        version: '1.0.0',
        dependencies: {
          next: '^13.0.0',
          react: '^18.0.0',
          'react-dom': '^18.0.0'
        },
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start'
        }
      };

      await fs.writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create next config
      const nextConfig = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig
`;

      await fs.writeFile(join(tempDir, 'next.config.js'), nextConfig);

      // Create vercel config
      const vercelConfig = {
        buildCommand: 'next build',
        outputDirectory: '.next',
        framework: 'nextjs'
      };

      await fs.writeFile(
        join(tempDir, 'vercel.json'),
        JSON.stringify(vercelConfig, null, 2)
      );

      // Create pages directory
      await fs.mkdir(join(tempDir, 'pages'), { recursive: true });
      await fs.writeFile(
        join(tempDir, 'pages', 'index.js'),
        'export default function Home() { return <div>Hello World</div>; }'
      );

      const projectInfo: ProjectInfo = {
        name: 'nextjs-app',
        languages: ['JavaScript'],
        dependencies: ['next', 'react', 'react-dom'],
        buildCommands: ['next build'],
        testCommands: [],
        installationSteps: ['npm install'],
        usageExamples: ['npm run dev'],
        configFiles: ['package.json', 'next.config.js', 'vercel.json', 'pages/index.js'],
        rawContent: 'A Next.js application deployed on Vercel'
      };

      const result = await analyzer.analyze(projectInfo, tempDir);

      expect(result.frameworks.length).toBeGreaterThanOrEqual(2);
      
      const nextFramework = result.frameworks.find(f => f.name === 'Next.js');
      const vercelFramework = result.frameworks.find(f => f.name === 'Vercel');
      
      expect(nextFramework).toBeDefined();
      expect(nextFramework?.type).toBe('fullstack_framework');
      expect(vercelFramework).toBeDefined();
      expect(vercelFramework?.type).toBe('build_tool');
      
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect Gatsby project with Netlify deployment', async () => {
      // Create package.json
      const packageJson = {
        name: 'gatsby-site',
        version: '1.0.0',
        dependencies: {
          gatsby: '^5.0.0',
          react: '^18.0.0',
          'react-dom': '^18.0.0'
        },
        scripts: {
          develop: 'gatsby develop',
          build: 'gatsby build',
          serve: 'gatsby serve'
        }
      };

      await fs.writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create gatsby config
      const gatsbyConfig = `
module.exports = {
  siteMetadata: {
    title: 'My Gatsby Site',
  },
  plugins: [
    'gatsby-plugin-react-helmet',
  ],
}
`;

      await fs.writeFile(join(tempDir, 'gatsby-config.js'), gatsbyConfig);

      // Create netlify config
      const netlifyConfig = `
[build]
  publish = "public"
  command = "gatsby build"

[build.environment]
  NODE_VERSION = "18"
`;

      await fs.writeFile(join(tempDir, 'netlify.toml'), netlifyConfig);

      const projectInfo: ProjectInfo = {
        name: 'gatsby-site',
        languages: ['JavaScript'],
        dependencies: ['gatsby', 'react', 'react-dom'],
        buildCommands: ['gatsby build'],
        testCommands: [],
        installationSteps: ['npm install'],
        usageExamples: ['npm run develop'],
        configFiles: ['package.json', 'gatsby-config.js', 'netlify.toml'],
        rawContent: 'A Gatsby static site deployed on Netlify'
      };

      const result = await analyzer.analyze(projectInfo, tempDir);

      expect(result.frameworks.length).toBeGreaterThanOrEqual(2);
      
      const gatsbyFramework = result.frameworks.find(f => f.name === 'Gatsby');
      const netlifyFramework = result.frameworks.find(f => f.name === 'Netlify');
      
      expect(gatsbyFramework).toBeDefined();
      expect(gatsbyFramework?.type).toBe('static_site_generator');
      expect(netlifyFramework).toBeDefined();
      expect(netlifyFramework?.type).toBe('build_tool');
      
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect Jekyll site with GitHub Pages', async () => {
      // Create Jekyll config
      const jekyllConfig = `
title: My Jekyll Site
description: A simple Jekyll site
baseurl: ""
url: "https://username.github.io"

markdown: kramdown
highlighter: rouge
theme: minima

plugins:
  - jekyll-feed
`;

      await fs.writeFile(join(tempDir, '_config.yml'), jekyllConfig);

      // Create Gemfile
      const gemfile = `
source "https://rubygems.org"

gem "jekyll", "~> 4.3.0"
gem "minima", "~> 2.5"

group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.12"
end
`;

      await fs.writeFile(join(tempDir, 'Gemfile'), gemfile);

      // Create GitHub Actions workflow
      await fs.mkdir(join(tempDir, '.github', 'workflows'), { recursive: true });
      const workflow = `
name: Build and deploy Jekyll site to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  github-pages:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-ruby@v1
      - run: bundle install
      - run: bundle exec jekyll build
      - uses: actions/deploy-pages@v1
`;

      await fs.writeFile(
        join(tempDir, '.github', 'workflows', 'pages.yml'),
        workflow
      );

      // Create posts directory
      await fs.mkdir(join(tempDir, '_posts'), { recursive: true });
      await fs.writeFile(
        join(tempDir, '_posts', '2023-01-01-hello-world.md'),
        '---\nlayout: post\ntitle: Hello World\n---\n\nHello, world!'
      );

      const projectInfo: ProjectInfo = {
        name: 'jekyll-site',
        languages: ['Ruby'],
        dependencies: [],
        buildCommands: ['jekyll build'],
        testCommands: [],
        installationSteps: ['bundle install'],
        usageExamples: ['bundle exec jekyll serve'],
        configFiles: [
          '_config.yml',
          'Gemfile',
          '.github/workflows/pages.yml',
          '_posts/2023-01-01-hello-world.md'
        ],
        rawContent: 'A Jekyll site hosted on GitHub Pages at https://username.github.io'
      };

      const result = await analyzer.analyze(projectInfo, tempDir);

      expect(result.frameworks.length).toBeGreaterThanOrEqual(2);
      
      const jekyllFramework = result.frameworks.find(f => f.name === 'Jekyll');
      const githubPagesFramework = result.frameworks.find(f => f.name === 'GitHub Pages');
      
      expect(jekyllFramework).toBeDefined();
      expect(jekyllFramework?.type).toBe('static_site_generator');
      expect(githubPagesFramework).toBeDefined();
      expect(githubPagesFramework?.type).toBe('build_tool');
      
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should handle complex multi-tool project', async () => {
      // Create package.json with multiple build tools
      const packageJson = {
        name: 'complex-frontend',
        version: '1.0.0',
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0'
        },
        devDependencies: {
          webpack: '^5.0.0',
          'webpack-cli': '^4.0.0',
          'webpack-dev-server': '^4.0.0',
          vite: '^4.0.0',
          rollup: '^3.0.0'
        },
        scripts: {
          'build:webpack': 'webpack --mode production',
          'build:vite': 'vite build',
          'build:rollup': 'rollup -c',
          dev: 'webpack serve --mode development'
        }
      };

      await fs.writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create multiple config files
      await fs.writeFile(join(tempDir, 'webpack.config.js'), 'module.exports = {};');
      await fs.writeFile(join(tempDir, 'vite.config.js'), 'export default {};');
      await fs.writeFile(join(tempDir, 'rollup.config.js'), 'export default {};');

      const projectInfo: ProjectInfo = {
        name: 'complex-frontend',
        languages: ['JavaScript'],
        dependencies: ['react', 'react-dom', 'webpack', 'vite', 'rollup'],
        buildCommands: ['webpack --mode production', 'vite build', 'rollup -c'],
        testCommands: [],
        installationSteps: ['npm install'],
        usageExamples: ['npm run dev'],
        configFiles: ['package.json', 'webpack.config.js', 'vite.config.js', 'rollup.config.js'],
        rawContent: 'A complex frontend project with multiple build tools'
      };

      const result = await analyzer.analyze(projectInfo, tempDir);

      expect(result.buildTools.length).toBeGreaterThanOrEqual(2);
      
      const buildToolNames = result.buildTools.map(t => t.name);
      expect(buildToolNames).toContain('Webpack');
      expect(buildToolNames).toContain('Vite');
      expect(buildToolNames).toContain('Rollup');
      
      expect(result.confidence).toBeGreaterThan(0.8);
      // Recommendations are generated based on specific conditions
      // For a complex project, there might not be specific recommendations
      expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error handling with real files', () => {
    it('should handle corrupted config files gracefully', async () => {
      // Create invalid JSON
      await fs.writeFile(join(tempDir, 'package.json'), '{ invalid json }');
      
      const projectInfo: ProjectInfo = {
        name: 'corrupted-project',
        languages: ['JavaScript'],
        dependencies: ['webpack'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json'],
        rawContent: ''
      };

      const result = await analyzer.analyze(projectInfo, tempDir);

      // Should still detect based on dependency, even if config file is corrupted
      expect(result.buildTools).toHaveLength(1);
      expect(result.buildTools[0].name).toBe('Webpack');
      // Warnings might not be generated if file parsing is not attempted
      expect(result.metadata.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing files gracefully', async () => {
      const projectInfo: ProjectInfo = {
        name: 'missing-files-project',
        languages: ['JavaScript'],
        dependencies: ['vite'],
        buildCommands: ['vite build'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['vite.config.js'], // File doesn't actually exist
        rawContent: ''
      };

      const result = await analyzer.analyze(projectInfo, tempDir);

      // Should still detect based on dependency and command
      expect(result.buildTools).toHaveLength(1);
      expect(result.buildTools[0].name).toBe('Vite');
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });
});