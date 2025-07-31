import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { FileSystemScanner, ProjectStructure } from '../../../src/detection/utils/file-scanner';

describe('FileSystemScanner', () => {
  let scanner: FileSystemScanner;
  let tempDir: string;

  beforeEach(async () => {
    scanner = new FileSystemScanner();
    tempDir = join(process.cwd(), 'test-temp-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('scanProjectFiles', () => {
    it('should scan and return configuration files', async () => {
      // Create test files
      await fs.writeFile(join(tempDir, 'package.json'), '{"name": "test"}');
      await fs.writeFile(join(tempDir, 'requirements.txt'), 'flask==2.0.0');
      await fs.writeFile(join(tempDir, 'Cargo.toml'), '[package]\nname = "test"');
      await fs.writeFile(join(tempDir, 'README.md'), '# Test Project');

      const files = await scanner.scanProjectFiles(tempDir);
      
      expect(files).toHaveLength(3);
      expect(files.some(f => f.endsWith('package.json'))).toBe(true);
      expect(files.some(f => f.endsWith('requirements.txt'))).toBe(true);
      expect(files.some(f => f.endsWith('Cargo.toml'))).toBe(true);
      expect(files.some(f => f.endsWith('README.md'))).toBe(false);
    });

    it('should skip node_modules and other ignored directories', async () => {
      // Create directories to skip
      await fs.mkdir(join(tempDir, 'node_modules'), { recursive: true });
      await fs.mkdir(join(tempDir, '.git'), { recursive: true });
      await fs.mkdir(join(tempDir, 'build'), { recursive: true });
      
      // Create config files in skipped directories
      await fs.writeFile(join(tempDir, 'node_modules', 'package.json'), '{}');
      await fs.writeFile(join(tempDir, '.git', 'config'), '');
      await fs.writeFile(join(tempDir, 'build', 'webpack.config.js'), '');
      
      // Create valid config file in root
      await fs.writeFile(join(tempDir, 'package.json'), '{"name": "test"}');

      const files = await scanner.scanProjectFiles(tempDir);
      
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/package\.json$/);
      expect(files[0]).not.toMatch(/node_modules/);
    });

    it('should handle nested directories up to max depth', async () => {
      // Create nested structure
      const nestedDir = join(tempDir, 'src', 'components', 'deep', 'very-deep');
      await fs.mkdir(nestedDir, { recursive: true });
      
      await fs.writeFile(join(tempDir, 'package.json'), '{}');
      await fs.writeFile(join(tempDir, 'src', 'webpack.config.js'), '');
      await fs.writeFile(join(nestedDir, 'vite.config.js'), '');

      const files = await scanner.scanProjectFiles(tempDir);
      
      expect(files.some(f => f.endsWith('package.json'))).toBe(true);
      expect(files.some(f => f.endsWith('webpack.config.js'))).toBe(true);
      // Very deep file should be excluded due to depth limit
      expect(files.some(f => f.includes('very-deep'))).toBe(false);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing files', async () => {
      await fs.writeFile(join(tempDir, 'test.json'), '{}');
      
      const exists = await scanner.fileExists(tempDir, 'test.json');
      expect(exists).toBe(true);
    });

    it('should return false for non-existing files', async () => {
      const exists = await scanner.fileExists(tempDir, 'nonexistent.json');
      expect(exists).toBe(false);
    });
  });

  describe('readConfigFile', () => {
    it('should parse JSON files correctly', async () => {
      const testData = { name: 'test-project', version: '1.0.0' };
      await fs.writeFile(join(tempDir, 'package.json'), JSON.stringify(testData));
      
      const result = await scanner.readConfigFile(join(tempDir, 'package.json'));
      expect(result).toEqual(testData);
    });

    it('should parse YAML files correctly', async () => {
      const yamlContent = `
name: test-project
version: 1.0.0
dependencies:
  - express
  - react
`;
      await fs.writeFile(join(tempDir, 'config.yaml'), yamlContent);
      
      const result = await scanner.readConfigFile(join(tempDir, 'config.yaml'));
      expect(result.name).toBe('test-project');
      expect(result.version).toBe('1.0.0');
      expect(result.dependencies).toEqual(['express', 'react']);
    });

    it('should handle TOML files with raw content', async () => {
      const tomlContent = `
[package]
name = "test-project"
version = "1.0.0"
`;
      await fs.writeFile(join(tempDir, 'Cargo.toml'), tomlContent);
      
      const result = await scanner.readConfigFile(join(tempDir, 'Cargo.toml'));
      expect(result._format).toBe('toml');
      expect(result._raw).toContain('name = "test-project"');
    });

    it('should return raw content for unknown file types', async () => {
      const content = 'This is plain text content';
      await fs.writeFile(join(tempDir, 'README.md'), content);
      
      const result = await scanner.readConfigFile(join(tempDir, 'README.md'));
      expect(result).toBe(content);
    });

    it('should throw error for invalid JSON', async () => {
      await fs.writeFile(join(tempDir, 'invalid.json'), '{ invalid json }');
      
      await expect(scanner.readConfigFile(join(tempDir, 'invalid.json')))
        .rejects.toThrow('Failed to read config file');
    });

    it('should throw error for non-existent files', async () => {
      await expect(scanner.readConfigFile(join(tempDir, 'nonexistent.json')))
        .rejects.toThrow('Failed to read config file');
    });
  });

  describe('getProjectStructure', () => {
    it('should analyze project structure correctly', async () => {
      // Create various file types
      await fs.writeFile(join(tempDir, 'package.json'), '{}');
      await fs.writeFile(join(tempDir, 'index.js'), 'console.log("hello");');
      await fs.writeFile(join(tempDir, 'index.test.js'), 'test("test", () => {});');
      await fs.writeFile(join(tempDir, 'README.md'), '# Project');
      await fs.mkdir(join(tempDir, 'src'));
      await fs.mkdir(join(tempDir, 'tests'));

      const structure = await scanner.getProjectStructure(tempDir);

      expect(structure.rootFiles).toContain('package.json');
      expect(structure.rootFiles).toContain('index.js');
      expect(structure.rootFiles).toContain('index.test.js');
      expect(structure.rootFiles).toContain('README.md');
      
      expect(structure.directories).toContain('src');
      expect(structure.directories).toContain('tests');
      
      expect(structure.configFiles).toContain('package.json');
      expect(structure.sourceFiles).toContain('index.js');
      expect(structure.testFiles).toContain('index.test.js');
    });

    it('should skip ignored directories', async () => {
      await fs.mkdir(join(tempDir, 'node_modules'));
      await fs.mkdir(join(tempDir, '.git'));
      await fs.mkdir(join(tempDir, 'src'));

      const structure = await scanner.getProjectStructure(tempDir);

      expect(structure.directories).toContain('src');
      expect(structure.directories).not.toContain('node_modules');
      expect(structure.directories).not.toContain('.git');
    });

    it('should categorize different file types correctly', async () => {
      const testFiles = [
        // Config files
        { name: 'package.json', category: 'config' },
        { name: 'webpack.config.js', category: 'config' },
        { name: 'requirements.txt', category: 'config' },
        
        // Source files
        { name: 'app.js', category: 'source' },
        { name: 'component.tsx', category: 'source' },
        { name: 'main.py', category: 'source' },
        { name: 'lib.rs', category: 'source' },
        
        // Test files
        { name: 'app.test.js', category: 'test' },
        { name: 'component.spec.ts', category: 'test' },
        { name: 'test_main.py', category: 'test' },
        
        // Other files
        { name: 'README.md', category: 'other' },
        { name: 'LICENSE', category: 'other' }
      ];

      for (const file of testFiles) {
        await fs.writeFile(join(tempDir, file.name), 'content');
      }

      const structure = await scanner.getProjectStructure(tempDir);

      // Check config files
      const configFiles = testFiles.filter(f => f.category === 'config');
      for (const file of configFiles) {
        expect(structure.configFiles).toContain(file.name);
      }

      // Check source files
      const sourceFiles = testFiles.filter(f => f.category === 'source');
      for (const file of sourceFiles) {
        expect(structure.sourceFiles).toContain(file.name);
      }

      // Check test files
      const testFilesList = testFiles.filter(f => f.category === 'test');
      for (const file of testFilesList) {
        expect(structure.testFiles).toContain(file.name);
      }
    });
  });

  describe('findConfigFiles', () => {
    it('should find existing config files from patterns', async () => {
      await fs.writeFile(join(tempDir, 'package.json'), '{}');
      await fs.writeFile(join(tempDir, 'webpack.config.js'), '');
      
      const patterns = ['package.json', 'webpack.config.js', 'nonexistent.json'];
      const found = await scanner.findConfigFiles(tempDir, patterns);

      expect(found).toContain('package.json');
      expect(found).toContain('webpack.config.js');
      expect(found).not.toContain('nonexistent.json');
      expect(found).toHaveLength(2);
    });

    it('should return empty array when no patterns match', async () => {
      const patterns = ['nonexistent1.json', 'nonexistent2.yaml'];
      const found = await scanner.findConfigFiles(tempDir, patterns);

      expect(found).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle permission errors gracefully', async () => {
      const nonExistentDir = join(tempDir, 'nonexistent');
      
      await expect(scanner.scanProjectFiles(nonExistentDir))
        .rejects.toThrow('Failed to scan project files');
    });

    it('should handle invalid YAML gracefully', async () => {
      const invalidYaml = `
name: test
  invalid: yaml: structure
    - item
`;
      await fs.writeFile(join(tempDir, 'invalid.yaml'), invalidYaml);
      
      await expect(scanner.readConfigFile(join(tempDir, 'invalid.yaml')))
        .rejects.toThrow('Failed to read config file');
    });
  });

  describe('configuration file detection', () => {
    it('should detect all supported configuration file types', async () => {
      const configFiles = [
        'package.json', 'package-lock.json', 'yarn.lock',
        'requirements.txt', 'setup.py', 'Pipfile', 'pyproject.toml',
        'Cargo.toml', 'Cargo.lock',
        'go.mod', 'go.sum',
        'pom.xml', 'build.gradle', 'build.gradle.kts',
        'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
        'webpack.config.js', 'vite.config.js', 'vite.config.ts',
        'next.config.js', 'nuxt.config.js', 'gatsby-config.js',
        'Chart.yaml', 'values.yaml'
      ];

      for (const file of configFiles) {
        await fs.writeFile(join(tempDir, file), 'content');
      }

      const scannedFiles = await scanner.scanProjectFiles(tempDir);
      
      expect(scannedFiles).toHaveLength(configFiles.length);
      for (const file of configFiles) {
        expect(scannedFiles.some(f => f.endsWith(file))).toBe(true);
      }
    });
  });
});