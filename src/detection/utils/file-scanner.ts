import { promises as fs } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

/**
 * File system scanner for project analysis
 */
export class FileSystemScanner {
  /**
   * Scan project directory for configuration files
   */
  async scanProjectFiles(projectPath: string): Promise<string[]> {
    try {
      const files = await this.readDirectoryRecursive(projectPath);
      return files.filter(file => this.isConfigurationFile(file));
    } catch (error) {
      throw new Error(`Failed to scan project files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if file exists in project
   */
  async fileExists(projectPath: string, fileName: string): Promise<boolean> {
    try {
      await fs.access(join(projectPath, fileName));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read and parse configuration file
   */
  async readConfigFile(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      if (filePath.endsWith('.json')) {
        return JSON.parse(content);
      } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
        return yaml.load(content);
      } else if (filePath.endsWith('.toml')) {
        // TOML parsing not implemented - return raw content for now
        // Can be added later if needed for specific frameworks
        return { _raw: content, _format: 'toml' };
      }
      
      return content;
    } catch (error) {
      throw new Error(`Failed to read config file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Recursively read directory contents
   */
  private async readDirectoryRecursive(dirPath: string, maxDepth: number = 3): Promise<string[]> {
    if (maxDepth <= 0) return [];
    
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          try {
            const subFiles = await this.readDirectoryRecursive(fullPath, maxDepth - 1);
            files.push(...subFiles);
          } catch (error) {
            // Skip subdirectories that can't be read (permission issues)
          }
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Re-throw the error for the root directory - this is what the test expects
      throw error;
    }
    
    return files;
  }

  /**
   * Check if file is a configuration file
   */
  private isConfigurationFile(filePath: string): boolean {
    const fileName = filePath.split(/[\\\\/]/).pop() || '';
    
    const configPatterns = [
      // Package managers
      'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
      'requirements.txt', 'setup.py', 'Pipfile', 'pyproject.toml', 'poetry.lock',
      'Cargo.toml', 'Cargo.lock',
      'go.mod', 'go.sum',
      'pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle',
      'composer.json', 'composer.lock',
      
      // Build tools
      'Makefile', 'CMakeLists.txt', 'meson.build',
      'webpack.config.js', 'webpack.config.ts',
      'vite.config.js', 'vite.config.ts',
      'rollup.config.js', 'rollup.config.ts',
      'next.config.js', 'nuxt.config.js', 'gatsby-config.js',
      'vue.config.js', 'angular.json',
      
      // Testing
      'jest.config.js', 'jest.config.ts', 'jest.config.json',
      'vitest.config.js', 'vitest.config.ts',
      'karma.conf.js', 'protractor.conf.js',
      'cypress.config.js', 'cypress.config.ts',
      'playwright.config.js', 'playwright.config.ts',
      'testng.xml', 'phpunit.xml',
      
      // Containers
      'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
      'Containerfile', 'podman-compose.yml',
      
      // CI/CD
      '.travis.yml', '.circleci/config.yml', 'appveyor.yml',
      'azure-pipelines.yml', 'buildkite.yml',
      
      // Kubernetes
      'Chart.yaml', 'values.yaml', 'kustomization.yaml',
      
      // Linting/Formatting
      '.eslintrc.js', '.eslintrc.json', '.eslintrc.yaml',
      '.prettierrc', '.prettierrc.json', '.prettierrc.yaml',
      'tslint.json', 'stylelint.config.js',
      
      // Other
      'tsconfig.json', 'jsconfig.json',
      'babel.config.js', 'babel.config.json',
      '.babelrc', '.babelrc.json'
    ];
    
    return configPatterns.includes(fileName) || 
           fileName.endsWith('.config.js') ||
           fileName.endsWith('.config.ts') ||
           fileName.endsWith('.config.json') ||
           fileName.endsWith('.config.yaml') ||
           fileName.endsWith('.config.yml');
  }

  /**
   * Get project directory structure for analysis
   */
  async getProjectStructure(projectPath: string): Promise<ProjectStructure> {
    const structure: ProjectStructure = {
      rootFiles: [],
      directories: [],
      configFiles: [],
      sourceFiles: [],
      testFiles: []
    };

    try {
      const entries = await fs.readdir(projectPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(projectPath, entry.name);
        
        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          structure.directories.push(entry.name);
        } else if (entry.isFile()) {
          structure.rootFiles.push(entry.name);
          
          if (this.isConfigurationFile(entry.name)) {
            structure.configFiles.push(entry.name);
          }
          
          if (this.isSourceFile(entry.name)) {
            structure.sourceFiles.push(entry.name);
          }
          
          if (this.isTestFile(entry.name)) {
            structure.testFiles.push(entry.name);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to analyze project structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return structure;
  }

  /**
   * Find specific configuration files in project
   */
  async findConfigFiles(projectPath: string, patterns: string[]): Promise<string[]> {
    const foundFiles: string[] = [];
    
    for (const pattern of patterns) {
      if (await this.fileExists(projectPath, pattern)) {
        foundFiles.push(pattern);
      }
    }
    
    return foundFiles;
  }

  /**
   * Check if file is a source code file
   */
  private isSourceFile(fileName: string): boolean {
    const sourceExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.vue',
      '.py', '.pyx', '.pyi',
      '.rs',
      '.go',
      '.java', '.kt', '.scala',
      '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp',
      '.cs', '.fs', '.vb',
      '.rb', '.php', '.swift'
    ];
    
    return sourceExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * Check if file is a test file
   */
  private isTestFile(fileName: string): boolean {
    const testPatterns = [
      '.test.', '.spec.', '_test.', '_spec.',
      'test_', 'spec_'
    ];
    
    return testPatterns.some(pattern => fileName.includes(pattern)) ||
           fileName.startsWith('test') ||
           fileName.startsWith('spec');
  }

  /**
   * Check if directory should be skipped during scanning
   */
  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
      'node_modules', '.git', '.svn', '.hg',
      'target', 'build', 'dist', 'out',
      '__pycache__', '.pytest_cache',
      '.venv', 'venv', 'env'
    ];
    
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }
}

/**
 * Project directory structure information
 */
export interface ProjectStructure {
  rootFiles: string[];
  directories: string[];
  configFiles: string[];
  sourceFiles: string[];
  testFiles: string[];
}