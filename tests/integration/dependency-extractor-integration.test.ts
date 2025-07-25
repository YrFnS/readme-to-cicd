/**
 * Integration tests for DependencyExtractor with real README files
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DependencyExtractor } from '../../src/parser/analyzers/dependency-extractor';
import { MarkdownParser } from '../../src/parser/utils/markdown-parser';
import { DependencyInfo } from '../../src/parser/types';

describe('DependencyExtractor Integration Tests', () => {
  let extractor: DependencyExtractor;
  let markdownParser: MarkdownParser;

  beforeEach(() => {
    extractor = new DependencyExtractor();
    markdownParser = new MarkdownParser();
  });

  const readSampleReadme = (filename: string): string => {
    const filePath = join(__dirname, '../fixtures/sample-readmes', filename);
    return readFileSync(filePath, 'utf-8');
  };

  describe('JavaScript Project Dependencies', () => {
    it('should accurately extract JavaScript project dependencies', async () => {
      const content = readSampleReadme('javascript-project.md');
      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      expect(result.confidence).toBeGreaterThan(0.5);
      
      const dependencyInfo = result.data as DependencyInfo;
      
      // Should detect package.json
      const packageJson = dependencyInfo.packageFiles.find(file => file.name === 'package.json');
      expect(packageJson).toBeDefined();
      expect(packageJson!.type).toBe('npm');
      
      // Should detect npm install commands
      const npmInstall = dependencyInfo.installCommands.find(cmd => cmd.command.includes('npm install'));
      expect(npmInstall).toBeDefined();
      
      // Should extract some packages
      expect(dependencyInfo.packages.length).toBeGreaterThan(0);
      
      // Should have multiple sources
      expect(result.sources).toContain('package-files');
      expect(result.sources).toContain('install-commands');
    });
  });

  describe('Python Project Dependencies', () => {
    it('should accurately extract Python project dependencies', async () => {
      const content = readSampleReadme('python-project.md');
      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      expect(result.confidence).toBeGreaterThan(0.5);
      
      const dependencyInfo = result.data as DependencyInfo;
      
      // Should detect requirements.txt
      const requirementsTxt = dependencyInfo.packageFiles.find(file => file.name === 'requirements.txt');
      expect(requirementsTxt).toBeDefined();
      expect(requirementsTxt!.type).toBe('pip');
      
      // Should detect pip install commands
      const pipInstall = dependencyInfo.installCommands.find(cmd => cmd.command.includes('pip install'));
      expect(pipInstall).toBeDefined();
    });
  });

  describe('Multi-language Project Dependencies', () => {
    it('should handle projects with multiple package managers', async () => {
      const content = `
# Multi-language Project

## Frontend (Node.js)
Dependencies managed with package.json:
\`\`\`bash
npm install
npm install react vue
\`\`\`

## Backend (Python)
Dependencies in requirements.txt:
\`\`\`bash
pip install -r requirements.txt
pip install flask django
\`\`\`

## Build Tools (Rust)
Cargo.toml for Rust dependencies:
\`\`\`bash
cargo build
cargo add serde tokio
\`\`\`

Files: package.json, requirements.txt, Cargo.toml
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      expect(result.confidence).toBeGreaterThan(0.7);
      
      const dependencyInfo = result.data as DependencyInfo;
      
      // Should detect all package managers
      const packageManagers = new Set(dependencyInfo.packageFiles.map(f => f.type));
      expect(packageManagers.has('npm')).toBe(true);
      expect(packageManagers.has('pip')).toBe(true);
      expect(packageManagers.has('cargo')).toBe(true);
      
      // Should extract packages for each manager
      const packages = dependencyInfo.packages;
      const npmPackages = packages.filter(pkg => pkg.manager === 'npm');
      const pipPackages = packages.filter(pkg => pkg.manager === 'pip');
      const cargoPackages = packages.filter(pkg => pkg.manager === 'cargo');
      
      expect(npmPackages.length).toBeGreaterThan(0);
      expect(pipPackages.length).toBeGreaterThan(0);
      expect(cargoPackages.length).toBeGreaterThan(0);
      
      // Should have all sources
      expect(result.sources).toContain('package-files');
      expect(result.sources).toContain('install-commands');
      expect(result.sources).toContain('package-mentions');
    });
  });

  describe('Edge Cases', () => {
    it('should handle README with no dependencies gracefully', async () => {
      const content = `
# Simple Project

This is a simple project with no dependencies.

## Usage

Just run the code directly.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      expect(result.confidence).toBe(0);
      
      const dependencyInfo = result.data as DependencyInfo;
      expect(dependencyInfo.packageFiles).toEqual([]);
      expect(dependencyInfo.installCommands).toEqual([]);
      expect(dependencyInfo.packages).toEqual([]);
    });

    it('should handle malformed commands without crashing', async () => {
      const content = `
# Project with Malformed Commands

\`\`\`bash
npm install
pip install
cargo
go get
incomplete command
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      expect(result.confidence).toBeGreaterThan(0);
      
      const dependencyInfo = result.data as DependencyInfo;
      expect(dependencyInfo.installCommands.length).toBeGreaterThan(0);
      
      // Should not crash and should extract valid commands
      const validCommands = dependencyInfo.installCommands.filter(cmd => 
        cmd.command.includes('npm') || cmd.command.includes('pip') || cmd.command.includes('cargo') || cmd.command.includes('go')
      );
      expect(validCommands.length).toBeGreaterThan(0);
    });
  });
});