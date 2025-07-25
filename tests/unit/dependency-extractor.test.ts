/**
 * Unit tests for DependencyExtractor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyExtractor } from '../../src/parser/analyzers/dependency-extractor';
import { MarkdownParser } from '../../src/parser/utils/markdown-parser';
import { DependencyInfo, PackageFile, Command, Package } from '../../src/parser/types';

describe('DependencyExtractor', () => {
  let extractor: DependencyExtractor;
  let markdownParser: MarkdownParser;

  beforeEach(() => {
    extractor = new DependencyExtractor();
    markdownParser = new MarkdownParser();
  });

  describe('Package File Detection', () => {
    it('should detect npm package files', async () => {
      const content = `
# My Node.js Project

This project uses \`package.json\` for dependency management.
You'll also find a \`package-lock.json\` file for version locking.

## Installation

Make sure you have the required files:
- package.json
- package-lock.json
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      expect(result.confidence).toBeGreaterThan(0);
      
      const dependencyInfo = result.data as DependencyInfo;
      const packageFiles = dependencyInfo.packageFiles;
      
      expect(packageFiles.length).toBeGreaterThan(0);
      
      const packageJson = packageFiles.find(file => file.name === 'package.json');
      expect(packageJson).toBeDefined();
      expect(packageJson!.type).toBe('npm');
      expect(packageJson!.mentioned).toBe(true);
      expect(packageJson!.confidence).toBeGreaterThan(0.8);
    });

    it('should detect Python package files', async () => {
      const content = `
# Python Project

Dependencies are managed through:
- requirements.txt
- setup.py
- pyproject.toml

For development dependencies, see requirements-dev.txt
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const packageFiles = dependencyInfo.packageFiles;
      
      const requirementsTxt = packageFiles.find(file => file.name === 'requirements.txt');
      const setupPy = packageFiles.find(file => file.name === 'setup.py');
      const pyprojectToml = packageFiles.find(file => file.name === 'pyproject.toml');
      
      expect(requirementsTxt).toBeDefined();
      expect(requirementsTxt!.type).toBe('pip');
      expect(setupPy).toBeDefined();
      expect(setupPy!.type).toBe('pip');
      expect(pyprojectToml).toBeDefined();
      expect(pyprojectToml!.type).toBe('pip');
    });

    it('should detect Rust package files', async () => {
      const content = `
# Rust Project

This project uses Cargo for dependency management:
- Cargo.toml - Main configuration
- Cargo.lock - Version locking
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const packageFiles = dependencyInfo.packageFiles;
      
      const cargoToml = packageFiles.find(file => file.name === 'Cargo.toml');
      expect(cargoToml).toBeDefined();
      expect(cargoToml!.type).toBe('cargo');
      expect(cargoToml!.confidence).toBeGreaterThan(0.8);
    });

    it('should detect Go module files', async () => {
      const content = `
# Go Project

Module management:
- go.mod
- go.sum
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const packageFiles = dependencyInfo.packageFiles;
      
      const goMod = packageFiles.find(file => file.name === 'go.mod');
      expect(goMod).toBeDefined();
      expect(goMod!.type).toBe('go');
    });

    it('should detect Java package files', async () => {
      const content = `
# Java Project

Build configuration:
- pom.xml (Maven)
- build.gradle (Gradle)
- settings.gradle
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const packageFiles = dependencyInfo.packageFiles;
      
      const pomXml = packageFiles.find(file => file.name === 'pom.xml');
      const buildGradle = packageFiles.find(file => file.name === 'build.gradle');
      
      expect(pomXml).toBeDefined();
      expect(pomXml!.type).toBe('maven');
      expect(buildGradle).toBeDefined();
      expect(buildGradle!.type).toBe('gradle');
    });

    it('should detect PHP and Ruby package files', async () => {
      const content = `
# Multi-language Project

PHP dependencies: composer.json, composer.lock
Ruby dependencies: Gemfile, Gemfile.lock
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const packageFiles = dependencyInfo.packageFiles;
      
      const composerJson = packageFiles.find(file => file.name === 'composer.json');
      const gemfile = packageFiles.find(file => file.name === 'Gemfile');
      
      expect(composerJson).toBeDefined();
      expect(composerJson!.type).toBe('composer');
      expect(gemfile).toBeDefined();
      expect(gemfile!.type).toBe('gem');
    });
  });

  describe('Installation Command Detection', () => {
    it('should extract npm install commands from code blocks', async () => {
      const content = `
# Installation

\`\`\`bash
npm install
npm install express
npm i lodash
npm ci
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const installCommands = dependencyInfo.installCommands;
      

      
      expect(installCommands.length).toBeGreaterThan(0);
      
      const npmInstall = installCommands.find(cmd => cmd.command === 'npm install');
      const npmInstallExpress = installCommands.find(cmd => cmd.command === 'npm install express');
      const npmI = installCommands.find(cmd => cmd.command === 'npm i lodash');
      const npmCi = installCommands.find(cmd => cmd.command === 'npm ci');
      
      expect(npmInstall).toBeDefined();
      expect(npmInstallExpress).toBeDefined();
      expect(npmI).toBeDefined();
      expect(npmCi).toBeDefined();
      
      expect(npmInstall!.confidence).toBeGreaterThan(0.8);
      expect(npmInstall!.context).toBe('code-block');
    });

    it('should extract pip install commands', async () => {
      const content = `
# Python Setup

\`\`\`bash
pip install -r requirements.txt
pip3 install numpy pandas
python -m pip install flask
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const installCommands = dependencyInfo.installCommands;
      
      const pipInstall = installCommands.find(cmd => cmd.command.includes('pip install -r requirements.txt'));
      const pip3Install = installCommands.find(cmd => cmd.command.includes('pip3 install numpy pandas'));
      const pythonPip = installCommands.find(cmd => cmd.command.includes('python -m pip install flask'));
      
      expect(pipInstall).toBeDefined();
      expect(pip3Install).toBeDefined();
      expect(pythonPip).toBeDefined();
    });

    it('should extract cargo commands', async () => {
      const content = `
# Rust Setup

\`\`\`bash
cargo build
cargo install serde
cargo add tokio
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const installCommands = dependencyInfo.installCommands;
      
      const cargoBuild = installCommands.find(cmd => cmd.command === 'cargo build');
      const cargoInstall = installCommands.find(cmd => cmd.command === 'cargo install serde');
      const cargoAdd = installCommands.find(cmd => cmd.command === 'cargo add tokio');
      
      expect(cargoBuild).toBeDefined();
      expect(cargoInstall).toBeDefined();
      expect(cargoAdd).toBeDefined();
    });

    it('should extract go commands', async () => {
      const content = `
# Go Setup

\`\`\`bash
go get github.com/gin-gonic/gin
go mod download
go install example.com/tool
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const installCommands = dependencyInfo.installCommands;
      
      const goGet = installCommands.find(cmd => cmd.command.includes('go get github.com/gin-gonic/gin'));
      const goMod = installCommands.find(cmd => cmd.command === 'go mod download');
      const goInstall = installCommands.find(cmd => cmd.command.includes('go install example.com/tool'));
      
      expect(goGet).toBeDefined();
      expect(goMod).toBeDefined();
      expect(goInstall).toBeDefined();
    });

    it('should extract yarn commands', async () => {
      const content = `
# Yarn Setup

\`\`\`bash
yarn install
yarn add react
yarn
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const installCommands = dependencyInfo.installCommands;
      
      const yarnInstall = installCommands.find(cmd => cmd.command === 'yarn install');
      const yarnAdd = installCommands.find(cmd => cmd.command === 'yarn add react');
      
      expect(yarnInstall).toBeDefined();
      expect(yarnAdd).toBeDefined();
    });

    it('should extract Java build commands', async () => {
      const content = `
# Java Build

\`\`\`bash
mvn install
mvn compile
gradle build
./gradlew build
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const installCommands = dependencyInfo.installCommands;
      
      const mvnInstall = installCommands.find(cmd => cmd.command === 'mvn install');
      const mvnCompile = installCommands.find(cmd => cmd.command === 'mvn compile');
      const gradleBuild = installCommands.find(cmd => cmd.command === 'gradle build');
      const gradlewBuild = installCommands.find(cmd => cmd.command === './gradlew build');
      
      expect(mvnInstall).toBeDefined();
      expect(mvnCompile).toBeDefined();
      expect(gradleBuild).toBeDefined();
      expect(gradlewBuild).toBeDefined();
    });

    it('should extract PHP and Ruby commands', async () => {
      const content = `
# PHP & Ruby Setup

\`\`\`bash
composer install
composer require symfony/console
gem install rails
bundle install
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const installCommands = dependencyInfo.installCommands;
      
      const composerInstall = installCommands.find(cmd => cmd.command === 'composer install');
      const composerRequire = installCommands.find(cmd => cmd.command.includes('composer require symfony/console'));
      const gemInstall = installCommands.find(cmd => cmd.command === 'gem install rails');
      const bundleInstall = installCommands.find(cmd => cmd.command === 'bundle install');
      
      expect(composerInstall).toBeDefined();
      expect(composerRequire).toBeDefined();
      expect(gemInstall).toBeDefined();
      expect(bundleInstall).toBeDefined();
    });
  });

  describe('Package Extraction from Commands', () => {
    it('should extract packages from npm install commands', async () => {
      const content = `
# Installation

\`\`\`bash
npm install express lodash
npm i react vue
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const packages = dependencyInfo.packages;
      
      const express = packages.find(pkg => pkg.name === 'express');
      const lodash = packages.find(pkg => pkg.name === 'lodash');
      const react = packages.find(pkg => pkg.name === 'react');
      const vue = packages.find(pkg => pkg.name === 'vue');
      
      expect(express).toBeDefined();
      expect(express!.manager).toBe('npm');
      expect(lodash).toBeDefined();
      expect(react).toBeDefined();
      expect(vue).toBeDefined();
    });

    it('should extract packages from pip install commands', async () => {
      const content = `
# Python Dependencies

\`\`\`bash
pip install numpy pandas matplotlib
pip3 install flask django
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const packages = dependencyInfo.packages;
      
      const numpy = packages.find(pkg => pkg.name === 'numpy');
      const pandas = packages.find(pkg => pkg.name === 'pandas');
      const flask = packages.find(pkg => pkg.name === 'flask');
      
      expect(numpy).toBeDefined();
      expect(numpy!.manager).toBe('pip');
      expect(pandas).toBeDefined();
      expect(flask).toBeDefined();
    });

    it('should extract packages from cargo commands', async () => {
      const content = `
# Rust Dependencies

\`\`\`bash
cargo install serde tokio
cargo add clap
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const packages = dependencyInfo.packages;
      
      const serde = packages.find(pkg => pkg.name === 'serde');
      const tokio = packages.find(pkg => pkg.name === 'tokio');
      const clap = packages.find(pkg => pkg.name === 'clap');
      
      expect(serde).toBeDefined();
      expect(serde!.manager).toBe('cargo');
      expect(tokio).toBeDefined();
      expect(clap).toBeDefined();
    });

    it('should extract packages from go get commands', async () => {
      const content = `
# Go Dependencies

\`\`\`bash
go get github.com/gin-gonic/gin
go install github.com/gorilla/mux
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const packages = dependencyInfo.packages;
      
      const gin = packages.find(pkg => pkg.name === 'github.com/gin-gonic/gin');
      const mux = packages.find(pkg => pkg.name === 'github.com/gorilla/mux');
      
      expect(gin).toBeDefined();
      expect(gin!.manager).toBe('go');
      expect(mux).toBeDefined();
    });
  });

  describe('Package Deduplication', () => {
    it('should deduplicate packages with same name and manager', async () => {
      const content = `
# Installation

\`\`\`bash
npm install express
npm i express
\`\`\`

Also mentioned: express package
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const packages = dependencyInfo.packages;
      
      const expressPackages = packages.filter(pkg => pkg.name === 'express' && pkg.manager === 'npm');
      expect(expressPackages.length).toBe(1);
      expect(expressPackages[0].confidence).toBeGreaterThan(0);
    });

    it('should keep highest confidence when deduplicating', async () => {
      const content = `
# Installation

\`\`\`bash
npm install lodash
\`\`\`

The lodash library is mentioned here too.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const packages = dependencyInfo.packages;
      
      const lodashPackages = packages.filter(pkg => pkg.name === 'lodash');
      expect(lodashPackages.length).toBe(1);
      // Should keep the higher confidence from the install command
      expect(lodashPackages[0].confidence).toBeGreaterThan(0.6);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty content gracefully', async () => {
      const content = '# Empty Project\n\nNo dependencies here.';

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      
      expect(dependencyInfo.packageFiles).toEqual([]);
      expect(dependencyInfo.installCommands).toEqual([]);
      expect(dependencyInfo.packages).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('should handle malformed commands gracefully', async () => {
      const content = `
# Installation

\`\`\`bash
npm install
pip install
cargo
go get
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      expect(result.confidence).toBeGreaterThan(0);
      
      const dependencyInfo = result.data as DependencyInfo;
      expect(dependencyInfo.installCommands.length).toBeGreaterThan(0);
    });

    it('should filter out common false positives in package names', async () => {
      const content = `
# Installation

\`\`\`bash
npm install install build test
pip install requirements setup
\`\`\`
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      const packages = dependencyInfo.packages;
      
      // Should not include common false positives
      const falsePositives = packages.filter(pkg => 
        ['install', 'build', 'test', 'requirements', 'setup'].includes(pkg.name)
      );
      expect(falsePositives.length).toBe(0);
    });

    it('should handle mixed package managers correctly', async () => {
      const content = `
# Multi-language Project

## Node.js
\`\`\`bash
npm install express
\`\`\`

## Python
\`\`\`bash
pip install flask
\`\`\`

## Rust
\`\`\`bash
cargo add serde
\`\`\`

Files: package.json, requirements.txt, Cargo.toml
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const dependencyInfo = result.data as DependencyInfo;
      
      // Should detect all package managers
      const packageManagers = new Set(dependencyInfo.packageFiles.map(f => f.type));
      expect(packageManagers.has('npm')).toBe(true);
      expect(packageManagers.has('pip')).toBe(true);
      expect(packageManagers.has('cargo')).toBe(true);
      
      // Should extract packages for each manager
      const packages = dependencyInfo.packages;
      const express = packages.find(pkg => pkg.name === 'express' && pkg.manager === 'npm');
      const flask = packages.find(pkg => pkg.name === 'flask' && pkg.manager === 'pip');
      const serde = packages.find(pkg => pkg.name === 'serde' && pkg.manager === 'cargo');
      
      expect(express).toBeDefined();
      expect(flask).toBeDefined();
      expect(serde).toBeDefined();
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate higher confidence with multiple sources', async () => {
      const content = `
# Project with Multiple Dependency Indicators

Files: package.json, package-lock.json

\`\`\`bash
npm install
npm install express lodash
\`\`\`

Dependencies include express and lodash packages.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      expect(result.confidence).toBeGreaterThan(0.7);
      
      const sources = result.sources;
      expect(sources).toContain('package-files');
      expect(sources).toContain('install-commands');
      expect(sources).toContain('package-mentions');
    });

    it('should calculate lower confidence with minimal information', async () => {
      const content = `
# Simple Project

This project might use some dependencies.
      `;

      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      expect(result.confidence).toBe(0);
    });
  });
});