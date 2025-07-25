/**
 * Tests for CommandExtractor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommandExtractor } from '../../src/parser/analyzers/command-extractor';
import { MarkdownParser } from '../../src/parser/utils/markdown-parser';
import { CommandInfo, Command } from '../../src/parser/types';

describe('CommandExtractor', () => {
  let extractor: CommandExtractor;
  let parser: MarkdownParser;

  beforeEach(() => {
    extractor = new CommandExtractor();
    parser = new MarkdownParser();
  });

  describe('Build Command Detection', () => {
    it('should extract npm build commands from code blocks', async () => {
      const content = `
# Build Instructions

\`\`\`bash
npm run build
npm run build:prod
yarn build
yarn run build
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      expect(parseResult.success).toBe(true);

      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const buildCommands = commandInfo.build;

      expect(buildCommands.length).toBeGreaterThan(0);
      
      const npmBuild = buildCommands.find(cmd => cmd.command === 'npm run build');
      const npmBuildProd = buildCommands.find(cmd => cmd.command === 'npm run build:prod');
      const yarnBuild = buildCommands.find(cmd => cmd.command === 'yarn build');
      const yarnRunBuild = buildCommands.find(cmd => cmd.command === 'yarn run build');

      expect(npmBuild).toBeDefined();
      expect(npmBuild?.language).toBe('JavaScript');
      expect(npmBuild?.confidence).toBeGreaterThan(0.8);

      expect(npmBuildProd).toBeDefined();
      expect(yarnBuild).toBeDefined();
      expect(yarnRunBuild).toBeDefined();
    });

    it('should extract cargo build commands', async () => {
      const content = `
# Rust Build

\`\`\`bash
cargo build
cargo build --release
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const buildCommands = commandInfo.build;

      const cargoBuild = buildCommands.find(cmd => cmd.command === 'cargo build');
      const cargoRelease = buildCommands.find(cmd => cmd.command === 'cargo build --release');

      expect(cargoBuild).toBeDefined();
      expect(cargoBuild?.language).toBe('Rust');
      expect(cargoRelease).toBeDefined();
    });

    it('should extract go build commands', async () => {
      const content = `
# Go Build

\`\`\`bash
go build
go build -o myapp
go install
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const buildCommands = commandInfo.build;

      const goBuild = buildCommands.find(cmd => cmd.command === 'go build');
      const goBuildOutput = buildCommands.find(cmd => cmd.command === 'go build -o myapp');
      const goInstall = buildCommands.find(cmd => cmd.command === 'go install');

      expect(goBuild).toBeDefined();
      expect(goBuild?.language).toBe('Go');
      expect(goBuildOutput).toBeDefined();
      expect(goInstall).toBeDefined();
    });

    it('should extract maven build commands', async () => {
      const content = `
# Java Build with Maven

\`\`\`bash
mvn compile
mvn package
mvn install
maven compile
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const buildCommands = commandInfo.build;

      const mvnCompile = buildCommands.find(cmd => cmd.command === 'mvn compile');
      const mvnPackage = buildCommands.find(cmd => cmd.command === 'mvn package');
      const mvnInstall = buildCommands.find(cmd => cmd.command === 'mvn install');
      const mavenCompile = buildCommands.find(cmd => cmd.command === 'maven compile');

      expect(mvnCompile).toBeDefined();
      expect(mvnCompile?.language).toBe('Java');
      expect(mvnPackage).toBeDefined();
      expect(mvnInstall).toBeDefined();
      expect(mavenCompile).toBeDefined();
    });

    it('should extract gradle build commands', async () => {
      const content = `
# Java Build with Gradle

\`\`\`bash
gradle build
./gradlew build
gradlew build
gradle assemble
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const buildCommands = commandInfo.build;

      const gradleBuild = buildCommands.find(cmd => cmd.command === 'gradle build');
      const gradlewBuild = buildCommands.find(cmd => cmd.command === './gradlew build');
      const gradlewBuildWin = buildCommands.find(cmd => cmd.command === 'gradlew build');
      const gradleAssemble = buildCommands.find(cmd => cmd.command === 'gradle assemble');

      expect(gradleBuild).toBeDefined();
      expect(gradleBuild?.language).toBe('Java');
      expect(gradlewBuild).toBeDefined();
      expect(gradlewBuildWin).toBeDefined();
      expect(gradleAssemble).toBeDefined();
    });

    it('should extract make build commands', async () => {
      const content = `
# C/C++ Build

\`\`\`bash
make
make all
make build
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const buildCommands = commandInfo.build;

      const make = buildCommands.find(cmd => cmd.command === 'make');
      const makeAll = buildCommands.find(cmd => cmd.command === 'make all');
      const makeBuild = buildCommands.find(cmd => cmd.command === 'make build');

      expect(make).toBeDefined();
      expect(make?.language).toBe('C/C++');
      expect(makeAll).toBeDefined();
      expect(makeBuild).toBeDefined();
    });

    it('should extract cmake build commands', async () => {
      const content = `
# CMake Build

\`\`\`bash
cmake --build .
cmake . -DCMAKE_BUILD_TYPE=Release
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const buildCommands = commandInfo.build;

      const cmakeBuild = buildCommands.find(cmd => cmd.command === 'cmake --build .');
      const cmakeConfig = buildCommands.find(cmd => cmd.command === 'cmake . -DCMAKE_BUILD_TYPE=Release');

      expect(cmakeBuild).toBeDefined();
      expect(cmakeBuild?.language).toBe('C/C++');
      expect(cmakeConfig).toBeDefined();
    });

    it('should extract python build commands', async () => {
      const content = `
# Python Build

\`\`\`bash
python setup.py build
python -m build
pip install .
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const buildCommands = commandInfo.build;

      const setupBuild = buildCommands.find(cmd => cmd.command === 'python setup.py build');
      const pythonBuild = buildCommands.find(cmd => cmd.command === 'python -m build');
      const pipInstall = buildCommands.find(cmd => cmd.command === 'pip install .');

      expect(setupBuild).toBeDefined();
      expect(setupBuild?.language).toBe('Python');
      expect(pythonBuild).toBeDefined();
      expect(pipInstall).toBeDefined();
    });
  });

  describe('Test Command Detection', () => {
    it('should extract npm test commands', async () => {
      const content = `
# Testing

\`\`\`bash
npm test
npm run test
yarn test
yarn run test
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const testCommands = commandInfo.test;

      const npmTest = testCommands.find(cmd => cmd.command === 'npm test');
      const npmRunTest = testCommands.find(cmd => cmd.command === 'npm run test');
      const yarnTest = testCommands.find(cmd => cmd.command === 'yarn test');
      const yarnRunTest = testCommands.find(cmd => cmd.command === 'yarn run test');

      expect(npmTest).toBeDefined();
      expect(npmTest?.language).toBe('JavaScript');
      expect(npmRunTest).toBeDefined();
      expect(yarnTest).toBeDefined();
      expect(yarnRunTest).toBeDefined();
    });

    it('should extract cargo test commands', async () => {
      const content = `
# Rust Testing

\`\`\`bash
cargo test
cargo test --release
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const testCommands = commandInfo.test;

      const cargoTest = testCommands.find(cmd => cmd.command === 'cargo test');
      const cargoTestRelease = testCommands.find(cmd => cmd.command === 'cargo test --release');

      expect(cargoTest).toBeDefined();
      expect(cargoTest?.language).toBe('Rust');
      expect(cargoTestRelease).toBeDefined();
    });

    it('should extract go test commands', async () => {
      const content = `
# Go Testing

\`\`\`bash
go test
go test ./...
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const testCommands = commandInfo.test;

      const goTest = testCommands.find(cmd => cmd.command === 'go test');
      const goTestAll = testCommands.find(cmd => cmd.command === 'go test ./...');

      expect(goTest).toBeDefined();
      expect(goTest?.language).toBe('Go');
      expect(goTestAll).toBeDefined();
    });

    it('should extract python test commands', async () => {
      const content = `
# Python Testing

\`\`\`bash
pytest
python -m pytest
python -m unittest
python test
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const testCommands = commandInfo.test;

      const pytest = testCommands.find(cmd => cmd.command === 'pytest');
      const pytestModule = testCommands.find(cmd => cmd.command === 'python -m pytest');
      const unittest = testCommands.find(cmd => cmd.command === 'python -m unittest');
      const pythonTest = testCommands.find(cmd => cmd.command === 'python test');

      expect(pytest).toBeDefined();
      expect(pytest?.language).toBe('Python');
      expect(pytestModule).toBeDefined();
      expect(unittest).toBeDefined();
      expect(pythonTest).toBeDefined();
    });

    it('should extract maven test commands', async () => {
      const content = `
# Java Testing with Maven

\`\`\`bash
mvn test
maven test
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const testCommands = commandInfo.test;

      const mvnTest = testCommands.find(cmd => cmd.command === 'mvn test');
      const mavenTest = testCommands.find(cmd => cmd.command === 'maven test');

      expect(mvnTest).toBeDefined();
      expect(mvnTest?.language).toBe('Java');
      expect(mavenTest).toBeDefined();
    });

    it('should extract gradle test commands', async () => {
      const content = `
# Java Testing with Gradle

\`\`\`bash
gradle test
./gradlew test
gradlew test
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const testCommands = commandInfo.test;

      const gradleTest = testCommands.find(cmd => cmd.command === 'gradle test');
      const gradlewTest = testCommands.find(cmd => cmd.command === './gradlew test');
      const gradlewTestWin = testCommands.find(cmd => cmd.command === 'gradlew test');

      expect(gradleTest).toBeDefined();
      expect(gradleTest?.language).toBe('Java');
      expect(gradlewTest).toBeDefined();
      expect(gradlewTestWin).toBeDefined();
    });

    it('should extract make test commands', async () => {
      const content = `
# C/C++ Testing

\`\`\`bash
make test
make check
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const testCommands = commandInfo.test;

      const makeTest = testCommands.find(cmd => cmd.command === 'make test');
      const makeCheck = testCommands.find(cmd => cmd.command === 'make check');

      expect(makeTest).toBeDefined();
      expect(makeTest?.language).toBe('C/C++');
      expect(makeCheck).toBeDefined();
    });

    it('should extract ruby test commands', async () => {
      const content = `
# Ruby Testing

\`\`\`bash
bundle exec rspec
rspec
rake test
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const testCommands = commandInfo.test;

      const bundleRspec = testCommands.find(cmd => cmd.command === 'bundle exec rspec');
      const rspec = testCommands.find(cmd => cmd.command === 'rspec');
      const rakeTest = testCommands.find(cmd => cmd.command === 'rake test');

      expect(bundleRspec).toBeDefined();
      expect(bundleRspec?.language).toBe('Ruby');
      expect(rspec).toBeDefined();
      expect(rakeTest).toBeDefined();
    });
  });

  describe('Run Command Detection', () => {
    it('should extract npm run commands', async () => {
      const content = `
# Running the Application

\`\`\`bash
npm start
npm run start
npm run dev
yarn start
yarn dev
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const runCommands = commandInfo.run;

      const npmStart = runCommands.find(cmd => cmd.command === 'npm start');
      const npmRunStart = runCommands.find(cmd => cmd.command === 'npm run start');
      const npmRunDev = runCommands.find(cmd => cmd.command === 'npm run dev');
      const yarnStart = runCommands.find(cmd => cmd.command === 'yarn start');
      const yarnDev = runCommands.find(cmd => cmd.command === 'yarn dev');

      expect(npmStart).toBeDefined();
      expect(npmStart?.language).toBe('JavaScript');
      expect(npmRunStart).toBeDefined();
      expect(npmRunDev).toBeDefined();
      expect(yarnStart).toBeDefined();
      expect(yarnDev).toBeDefined();
    });

    it('should extract cargo run commands', async () => {
      const content = `
# Running Rust Application

\`\`\`bash
cargo run
cargo run --release
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const runCommands = commandInfo.run;

      const cargoRun = runCommands.find(cmd => cmd.command === 'cargo run');
      const cargoRunRelease = runCommands.find(cmd => cmd.command === 'cargo run --release');

      expect(cargoRun).toBeDefined();
      expect(cargoRun?.language).toBe('Rust');
      expect(cargoRunRelease).toBeDefined();
    });

    it('should extract go run commands', async () => {
      const content = `
# Running Go Application

\`\`\`bash
go run main.go
go run .
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const runCommands = commandInfo.run;

      const goRunMain = runCommands.find(cmd => cmd.command === 'go run main.go');
      const goRunDot = runCommands.find(cmd => cmd.command === 'go run .');

      expect(goRunMain).toBeDefined();
      expect(goRunMain?.language).toBe('Go');
      expect(goRunDot).toBeDefined();
    });

    it('should extract python run commands', async () => {
      const content = `
# Running Python Application

\`\`\`bash
python app.py
python3 main.py
python -m mymodule
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const runCommands = commandInfo.run;

      const pythonApp = runCommands.find(cmd => cmd.command === 'python app.py');
      const python3Main = runCommands.find(cmd => cmd.command === 'python3 main.py');
      const pythonModule = runCommands.find(cmd => cmd.command === 'python -m mymodule');

      expect(pythonApp).toBeDefined();
      expect(pythonApp?.language).toBe('Python');
      expect(python3Main).toBeDefined();
      expect(pythonModule).toBeDefined();
    });

    it('should extract java run commands', async () => {
      const content = `
# Running Java Application

\`\`\`bash
java -jar myapp.jar
java MyClass
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const runCommands = commandInfo.run;

      const javaJar = runCommands.find(cmd => cmd.command === 'java -jar myapp.jar');
      const javaClass = runCommands.find(cmd => cmd.command === 'java MyClass');

      expect(javaJar).toBeDefined();
      expect(javaJar?.language).toBe('Java');
      expect(javaClass).toBeDefined();
    });

    it('should extract executable run commands', async () => {
      const content = `
# Running Executable

\`\`\`bash
./myapp
./build/myapp --config config.json
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const runCommands = commandInfo.run;

      const executable = runCommands.find(cmd => cmd.command === './myapp');
      const executableWithArgs = runCommands.find(cmd => cmd.command === './build/myapp --config config.json');

      expect(executable).toBeDefined();
      expect(executableWithArgs).toBeDefined();
    });
  });

  describe('Install Command Detection', () => {
    it('should extract npm install commands', async () => {
      const content = `
# Installation

\`\`\`bash
npm install
npm i
yarn install
yarn add express
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const installCommands = commandInfo.install;

      const npmInstall = installCommands.find(cmd => cmd.command === 'npm install');
      const npmI = installCommands.find(cmd => cmd.command === 'npm i');
      const yarnInstall = installCommands.find(cmd => cmd.command === 'yarn install');
      const yarnAdd = installCommands.find(cmd => cmd.command === 'yarn add express');

      expect(npmInstall).toBeDefined();
      expect(npmInstall?.language).toBe('JavaScript');
      expect(npmI).toBeDefined();
      expect(yarnInstall).toBeDefined();
      expect(yarnAdd).toBeDefined();
    });

    it('should extract python install commands', async () => {
      const content = `
# Python Installation

\`\`\`bash
pip install -r requirements.txt
pip3 install numpy
python -m pip install flask
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const installCommands = commandInfo.install;

      const pipInstall = installCommands.find(cmd => cmd.command === 'pip install -r requirements.txt');
      const pip3Install = installCommands.find(cmd => cmd.command === 'pip3 install numpy');
      const pythonPip = installCommands.find(cmd => cmd.command === 'python -m pip install flask');

      expect(pipInstall).toBeDefined();
      expect(pipInstall?.language).toBe('Python');
      expect(pip3Install).toBeDefined();
      expect(pythonPip).toBeDefined();
    });
  });

  describe('Other Command Detection', () => {
    it('should extract docker commands', async () => {
      const content = `
# Docker Commands

\`\`\`bash
docker build -t myapp .
docker run -p 3000:3000 myapp
docker-compose up
docker-compose build
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const otherCommands = commandInfo.other;

      const dockerBuild = otherCommands.find(cmd => cmd.command === 'docker build -t myapp .');
      const dockerRun = otherCommands.find(cmd => cmd.command === 'docker run -p 3000:3000 myapp');
      const dockerComposeUp = otherCommands.find(cmd => cmd.command === 'docker-compose up');
      const dockerComposeBuild = otherCommands.find(cmd => cmd.command === 'docker-compose build');

      expect(dockerBuild).toBeDefined();
      expect(dockerRun).toBeDefined();
      expect(dockerComposeUp).toBeDefined();
      expect(dockerComposeBuild).toBeDefined();
    });

    it('should extract git commands', async () => {
      const content = `
# Git Commands

\`\`\`bash
git clone https://github.com/user/repo.git
git pull origin main
git push origin main
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const otherCommands = commandInfo.other;

      const gitClone = otherCommands.find(cmd => cmd.command === 'git clone https://github.com/user/repo.git');
      const gitPull = otherCommands.find(cmd => cmd.command === 'git pull origin main');
      const gitPush = otherCommands.find(cmd => cmd.command === 'git push origin main');

      expect(gitClone).toBeDefined();
      expect(gitPull).toBeDefined();
      expect(gitPush).toBeDefined();
    });
  });

  describe('Inline Code Detection', () => {
    it('should extract commands from inline code', async () => {
      const content = `
# Quick Start

Run \`npm install\` to install dependencies, then \`npm start\` to start the application.

For testing, use \`npm test\` or \`yarn test\`.
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;

      const installCommands = commandInfo.install;
      const runCommands = commandInfo.run;
      const testCommands = commandInfo.test;

      expect(installCommands.some(cmd => cmd.command === 'npm install')).toBe(true);
      expect(runCommands.some(cmd => cmd.command === 'npm start')).toBe(true);
      expect(testCommands.some(cmd => cmd.command === 'npm test')).toBe(true);
      expect(testCommands.some(cmd => cmd.command === 'yarn test')).toBe(true);
    });
  });

  describe('Command Categorization', () => {
    it('should categorize commands correctly', async () => {
      const content = `
# Full Workflow

\`\`\`bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start the application
npm start
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;

      expect(commandInfo.install.length).toBeGreaterThan(0);
      expect(commandInfo.build.length).toBeGreaterThan(0);
      expect(commandInfo.test.length).toBeGreaterThan(0);
      expect(commandInfo.run.length).toBeGreaterThan(0);

      // Verify commands are in correct categories
      expect(commandInfo.install.some(cmd => cmd.command === 'npm install')).toBe(true);
      expect(commandInfo.build.some(cmd => cmd.command === 'npm run build')).toBe(true);
      expect(commandInfo.test.some(cmd => cmd.command === 'npm test')).toBe(true);
      expect(commandInfo.run.some(cmd => cmd.command === 'npm start')).toBe(true);
    });
  });

  describe('Parameter Preservation', () => {
    it('should preserve command parameters and flags', async () => {
      const content = `
# Commands with Parameters

\`\`\`bash
npm run build --production
cargo build --release --target x86_64-unknown-linux-gnu
go test -v -race ./...
python -m pytest -v --cov=src tests/
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;

      const npmBuildProd = commandInfo.build.find(cmd => cmd.command === 'npm run build --production');
      const cargoBuildTarget = commandInfo.build.find(cmd => cmd.command === 'cargo build --release --target x86_64-unknown-linux-gnu');
      const goTestVerbose = commandInfo.test.find(cmd => cmd.command === 'go test -v -race ./...');
      const pytestCov = commandInfo.test.find(cmd => cmd.command === 'python -m pytest -v --cov=src tests/');

      expect(npmBuildProd).toBeDefined();
      expect(cargoBuildTarget).toBeDefined();
      expect(goTestVerbose).toBeDefined();
      expect(pytestCov).toBeDefined();
    });
  });

  describe('Confidence Scoring', () => {
    it('should assign higher confidence to code block commands', async () => {
      const content = `
# Mixed Context

\`\`\`bash
npm run build
\`\`\`

You can also run \`npm run build\` from the command line.
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const buildCommands = commandInfo.build;

      // Should have one command (deduplicated) with higher confidence from code block
      expect(buildCommands.length).toBe(1);
      expect(buildCommands[0].confidence).toBeGreaterThan(0.8);
    });

    it('should calculate overall confidence correctly', async () => {
      const content = `
# Commands

\`\`\`bash
npm install
npm run build
npm test
npm start
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);

      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.sources).toContain('code-block');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content gracefully', async () => {
      const content = '';

      const parseResult = await parser.parseContent(content);
      
      // Handle case where empty content might not parse successfully
      if (!parseResult.success || !parseResult.data) {
        // Create empty AST for empty content
        const result = await extractor.analyze([], content);
        const commandInfo = result.data as CommandInfo;

        expect(commandInfo.build).toHaveLength(0);
        expect(commandInfo.test).toHaveLength(0);
        expect(commandInfo.run).toHaveLength(0);
        expect(commandInfo.install).toHaveLength(0);
        expect(commandInfo.other).toHaveLength(0);
        expect(result.confidence).toBe(0);
        return;
      }
      
      const result = await extractor.analyze(parseResult.data.ast, content);
      const commandInfo = result.data as CommandInfo;

      expect(commandInfo.build).toHaveLength(0);
      expect(commandInfo.test).toHaveLength(0);
      expect(commandInfo.run).toHaveLength(0);
      expect(commandInfo.install).toHaveLength(0);
      expect(commandInfo.other).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });

    it('should handle malformed commands', async () => {
      const content = `
# Malformed Commands

\`\`\`bash
npm
build
test
-v
--help
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;

      // Should not extract invalid commands
      const allCommands = [
        ...commandInfo.build,
        ...commandInfo.test,
        ...commandInfo.run,
        ...commandInfo.install,
        ...commandInfo.other
      ];

      // Should filter out invalid commands like single words or flags
      expect(allCommands.every(cmd => cmd.command.length > 3)).toBe(true);
      expect(allCommands.every(cmd => !cmd.command.startsWith('-'))).toBe(true);
    });

    it('should deduplicate identical commands', async () => {
      const content = `
# Duplicate Commands

\`\`\`bash
npm test
npm test
npm test
\`\`\`

Run \`npm test\` to test the application.
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;

      // Should have only one npm test command after deduplication
      const testCommands = commandInfo.test.filter(cmd => cmd.command === 'npm test');
      expect(testCommands).toHaveLength(1);
    });
  });

  describe('Language Context Matching', () => {
    it('should boost confidence when language context matches', async () => {
      const content = `
# JavaScript Project

\`\`\`javascript
// Some JavaScript code
function hello() {
  console.log('Hello');
}
\`\`\`

\`\`\`bash
npm run build
\`\`\`
      `;

      const parseResult = await parser.parseContent(content);
      const result = await extractor.analyze(parseResult.data!.ast, content);
      const commandInfo = result.data as CommandInfo;
      const buildCommands = commandInfo.build;

      const npmBuild = buildCommands.find(cmd => cmd.command === 'npm run build');
      expect(npmBuild).toBeDefined();
      expect(npmBuild?.language).toBe('JavaScript');
      expect(npmBuild?.confidence).toBeGreaterThan(0.8);
    });
  });
});