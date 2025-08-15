/**
 * CI Workflow Generator - Specialized for Continuous Integration workflows
 * Focuses on build and test optimization
 */

import { DetectionResult, GenerationOptions, WorkflowOutput } from '../interfaces';
import { WorkflowTemplate, JobTemplate, StepTemplate, TriggerConfig, MatrixStrategy } from '../types';

export class CIWorkflowGenerator {
  /**
   * Generate CI-focused workflow optimized for build and test steps
   */
  async generateCIWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    const workflow = this.createCIWorkflowTemplate(detectionResult, options);
    const content = await this.renderWorkflow(workflow);
    
    return {
      filename: 'ci.yml',
      content,
      type: 'ci',
      metadata: {
        generatedAt: new Date(),
        generatorVersion: '1.0.0',
        detectionSummary: this.createDetectionSummary(detectionResult),
        optimizations: this.getAppliedOptimizations(detectionResult, options),
        warnings: this.getWarnings(detectionResult)
      }
    };
  }

  /**
   * Create CI workflow template with build and test focus
   */
  private createCIWorkflowTemplate(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): WorkflowTemplate {
    return {
      name: 'Continuous Integration',
      type: 'ci',
      triggers: this.createCITriggers(),
      jobs: this.createCIJobs(detectionResult, options),
      permissions: {
        contents: 'read',
        checks: 'write',
        pullRequests: 'write'
      },
      concurrency: {
        group: 'ci-${{ github.ref }}',
        cancelInProgress: true
      }
    };
  }

  /**
   * Create CI-specific triggers (push, PR, schedule for dependency checks)
   */
  private createCITriggers(): TriggerConfig {
    return {
      push: {
        branches: ['main', 'develop', 'master'],
        pathsIgnore: ['docs/**', '*.md', '.gitignore']
      },
      pullRequest: {
        branches: ['main', 'develop', 'master'],
        types: ['opened', 'synchronize', 'reopened']
      },
      schedule: [
        {
          cron: '0 2 * * 1' // Weekly dependency check on Mondays at 2 AM
        }
      ]
    };
  }

  /**
   * Create CI jobs focused on build and test optimization
   */
  private createCIJobs(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate[] {
    const jobs: JobTemplate[] = [];

    // Add lint job for code quality
    jobs.push(this.createLintJob(detectionResult));

    // Add build job with matrix strategy if multiple versions detected
    jobs.push(this.createBuildJob(detectionResult, options));

    // Add test jobs with parallel execution
    jobs.push(...this.createTestJobs(detectionResult, options));

    // Add security scanning job
    if (options.securityLevel !== 'basic') {
      jobs.push(this.createSecurityScanJob(detectionResult));
    }

    return jobs;
  }

  /**
   * Create lint job for code quality checks
   */
  private createLintJob(detectionResult: DetectionResult): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      }
    ];

    // Add language-specific setup and lint steps
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    if (primaryLanguage) {
      steps.push(...this.createLanguageSetupSteps(primaryLanguage.name, detectionResult));
      steps.push(...this.createLintSteps(primaryLanguage.name, detectionResult));
    }

    return {
      name: 'lint',
      runsOn: 'ubuntu-latest',
      steps,
      if: "github.event_name != 'schedule'"
    };
  }

  /**
   * Create build job with matrix strategy for multiple versions
   */
  private createBuildJob(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate {
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    const strategy = this.createMatrixStrategy(primaryLanguage, options);
    
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      }
    ];

    if (primaryLanguage) {
      steps.push(...this.createLanguageSetupSteps(primaryLanguage.name, detectionResult, true));
      steps.push(...this.createBuildSteps(primaryLanguage.name, detectionResult));
    }

    // Add artifact upload for build outputs
    steps.push({
      name: 'Upload build artifacts',
      uses: 'actions/upload-artifact@v4',
      with: {
        name: 'build-artifacts-${{ matrix.version || \'default\' }}',
        path: this.getBuildArtifactPaths(detectionResult),
        'retention-days': 7
      },
      if: 'success()'
    });

    const job: JobTemplate = {
      name: 'build',
      runsOn: 'ubuntu-latest',
      steps,
      needs: ['lint']
    };

    if (strategy) {
      job.strategy = strategy;
    }

    return job;
  }

  /**
   * Create test jobs with parallel execution
   */
  private createTestJobs(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate[] {
    const jobs: JobTemplate[] = [];
    const testingFrameworks = detectionResult.testingFrameworks;

    // Unit tests job
    if (testingFrameworks.some(tf => tf.type === 'unit')) {
      jobs.push(this.createUnitTestJob(detectionResult, options));
    }

    // Integration tests job (if detected)
    if (testingFrameworks.some(tf => tf.type === 'integration')) {
      jobs.push(this.createIntegrationTestJob(detectionResult, options));
    }

    // E2E tests job (if detected and enabled)
    if (testingFrameworks.some(tf => tf.type === 'e2e') && options.testingStrategy?.e2eTests) {
      jobs.push(this.createE2ETestJob(detectionResult, options));
    }

    return jobs;
  }

  /**
   * Create unit test job
   */
  private createUnitTestJob(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate {
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    const strategy = this.createMatrixStrategy(primaryLanguage, options);
    
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      }
    ];

    if (primaryLanguage) {
      steps.push(...this.createLanguageSetupSteps(primaryLanguage.name, detectionResult, true));
      steps.push(...this.createTestSteps(primaryLanguage.name, detectionResult, 'unit'));
    }

    // Add test results upload
    steps.push({
      name: 'Upload test results',
      uses: 'actions/upload-artifact@v4',
      with: {
        name: 'test-results-${{ matrix.version || \'default\' }}',
        path: this.getTestResultPaths(detectionResult),
        'retention-days': 30
      },
      if: 'always()'
    });

    const job: JobTemplate = {
      name: 'unit-tests',
      runsOn: 'ubuntu-latest',
      steps,
      needs: ['build']
    };

    if (strategy) {
      job.strategy = strategy;
    }

    return job;
  }

  /**
   * Create integration test job
   */
  private createIntegrationTestJob(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate {
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      }
    ];

    // Add service dependencies if needed
    const services = this.detectRequiredServices(detectionResult);
    
    if (primaryLanguage) {
      steps.push(...this.createLanguageSetupSteps(primaryLanguage.name, detectionResult, true));
      
      // Add service setup steps
      if (services.length > 0) {
        steps.push(...this.createServiceSetupSteps(services));
      }
      
      steps.push(...this.createTestSteps(primaryLanguage.name, detectionResult, 'integration'));
    }

    return {
      name: 'integration-tests',
      runsOn: 'ubuntu-latest',
      steps,
      needs: ['build'],
      if: "github.event_name != 'schedule'"
    };
  }

  /**
   * Create E2E test job
   */
  private createE2ETestJob(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): JobTemplate {
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      }
    ];

    if (primaryLanguage) {
      steps.push(...this.createLanguageSetupSteps(primaryLanguage.name, detectionResult, true));
      
      // Add browser setup for E2E tests
      steps.push({
        name: 'Setup browsers',
        run: 'npx playwright install --with-deps',
        if: "contains(github.event.head_commit.message, '[e2e]') || github.event_name == 'workflow_dispatch'"
      });
      
      steps.push(...this.createTestSteps(primaryLanguage.name, detectionResult, 'e2e'));
    }

    return {
      name: 'e2e-tests',
      runsOn: 'ubuntu-latest',
      steps,
      needs: ['build'],
      if: "contains(github.event.head_commit.message, '[e2e]') || github.event_name == 'workflow_dispatch'"
    };
  }

  /**
   * Create security scanning job
   */
  private createSecurityScanJob(detectionResult: DetectionResult): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      },
      {
        name: 'Run dependency vulnerability scan',
        uses: 'github/dependency-review-action@v4',
        if: "github.event_name == 'pull_request'"
      },
      {
        name: 'Run CodeQL analysis',
        uses: 'github/codeql-action/init@v3',
        with: {
          languages: this.getCodeQLLanguages(detectionResult)
        }
      },
      {
        name: 'Perform CodeQL analysis',
        uses: 'github/codeql-action/analyze@v3'
      }
    ];

    return {
      name: 'security-scan',
      runsOn: 'ubuntu-latest',
      steps,
      permissions: {
        contents: 'read',
        securityEvents: 'write'
      }
    };
  }

  // Helper methods for language-specific implementations
  private createLanguageSetupSteps(
    language: string,
    detectionResult: DetectionResult,
    withCache: boolean = false
  ): StepTemplate[] {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return this.createNodeJSSetupSteps(detectionResult, withCache);
      case 'python':
        return this.createPythonSetupSteps(detectionResult, withCache);
      case 'java':
        return this.createJavaSetupSteps(detectionResult, withCache);
      case 'rust':
        return this.createRustSetupSteps(detectionResult, withCache);
      case 'go':
        return this.createGoSetupSteps(detectionResult, withCache);
      default:
        return [];
    }
  }

  private createNodeJSSetupSteps(
    detectionResult: DetectionResult,
    withCache: boolean
  ): StepTemplate[] {
    const packageManager = detectionResult.packageManagers.find(pm => 
      ['npm', 'yarn', 'pnpm'].includes(pm.name)
    )?.name || 'npm';

    const steps: StepTemplate[] = [
      {
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: {
          'node-version': '${{ matrix.node-version || \'18\' }}',
          cache: withCache ? packageManager : undefined
        }
      }
    ];

    // Add package manager specific installation
    switch (packageManager) {
      case 'yarn':
        steps.push({
          name: 'Install dependencies',
          run: 'yarn install --frozen-lockfile'
        });
        break;
      case 'pnpm':
        steps.push({
          name: 'Setup pnpm',
          uses: 'pnpm/action-setup@v2',
          with: {
            version: 'latest'
          }
        });
        steps.push({
          name: 'Install dependencies',
          run: 'pnpm install --frozen-lockfile'
        });
        break;
      default:
        steps.push({
          name: 'Install dependencies',
          run: 'npm ci'
        });
    }

    return steps;
  }

  private createPythonSetupSteps(
    detectionResult: DetectionResult,
    withCache: boolean
  ): StepTemplate[] {
    const packageManager = detectionResult.packageManagers.find(pm => 
      ['pip', 'poetry', 'pipenv'].includes(pm.name)
    )?.name || 'pip';

    const steps: StepTemplate[] = [
      {
        name: 'Setup Python',
        uses: 'actions/setup-python@v5',
        with: {
          'python-version': '${{ matrix.python-version || \'3.11\' }}',
          cache: withCache ? packageManager : undefined
        }
      }
    ];

    // Add package manager specific installation
    switch (packageManager) {
      case 'poetry':
        steps.push({
          name: 'Install Poetry',
          uses: 'snok/install-poetry@v1'
        });
        steps.push({
          name: 'Install dependencies',
          run: 'poetry install'
        });
        break;
      case 'pipenv':
        steps.push({
          name: 'Install pipenv',
          run: 'pip install pipenv'
        });
        steps.push({
          name: 'Install dependencies',
          run: 'pipenv install --dev'
        });
        break;
      default:
        steps.push({
          name: 'Install dependencies',
          run: 'pip install -r requirements.txt'
        });
    }

    return steps;
  }

  private createJavaSetupSteps(
    detectionResult: DetectionResult,
    withCache: boolean
  ): StepTemplate[] {
    const buildTool = detectionResult.buildTools.find(bt => 
      ['maven', 'gradle'].includes(bt.name)
    )?.name || 'maven';

    return [
      {
        name: 'Setup JDK',
        uses: 'actions/setup-java@v4',
        with: {
          'java-version': '${{ matrix.java-version || \'17\' }}',
          distribution: 'temurin',
          cache: withCache ? buildTool : undefined
        }
      }
    ];
  }

  private createRustSetupSteps(
    detectionResult: DetectionResult,
    withCache: boolean
  ): StepTemplate[] {
    const steps: StepTemplate[] = [
      {
        name: 'Setup Rust',
        uses: 'dtolnay/rust-toolchain@stable',
        with: {
          toolchain: '${{ matrix.rust-version || \'stable\' }}'
        }
      }
    ];

    if (withCache) {
      steps.push({
        name: 'Cache Rust dependencies',
        uses: 'actions/cache@v4',
        with: {
          path: '~/.cargo\ntarget/',
          key: '${{ runner.os }}-cargo-${{ hashFiles(\'**/Cargo.lock\') }}'
        }
      });
    }

    return steps;
  }

  private createGoSetupSteps(
    detectionResult: DetectionResult,
    withCache: boolean
  ): StepTemplate[] {
    return [
      {
        name: 'Setup Go',
        uses: 'actions/setup-go@v5',
        with: {
          'go-version': '${{ matrix.go-version || \'1.21\' }}',
          cache: withCache
        }
      }
    ];
  }

  private createLintSteps(language: string, detectionResult: DetectionResult): StepTemplate[] {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return [
          {
            name: 'Run ESLint',
            run: 'npm run lint',
            continueOnError: true
          }
        ];
      case 'python':
        return [
          {
            name: 'Run flake8',
            run: 'flake8 .',
            continueOnError: true
          },
          {
            name: 'Run black check',
            run: 'black --check .',
            continueOnError: true
          }
        ];
      case 'rust':
        return [
          {
            name: 'Run clippy',
            run: 'cargo clippy -- -D warnings'
          },
          {
            name: 'Check formatting',
            run: 'cargo fmt --check'
          }
        ];
      case 'go':
        return [
          {
            name: 'Run go vet',
            run: 'go vet ./...'
          },
          {
            name: 'Run golangci-lint',
            uses: 'golangci/golangci-lint-action@v4'
          }
        ];
      default:
        return [];
    }
  }

  private createBuildSteps(language: string, detectionResult: DetectionResult): StepTemplate[] {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return [
          {
            name: 'Build project',
            run: 'npm run build'
          }
        ];
      case 'python':
        return [
          {
            name: 'Build package',
            run: 'python -m build'
          }
        ];
      case 'java':
        const buildTool = detectionResult.buildTools.find(bt => 
          ['maven', 'gradle'].includes(bt.name)
        )?.name || 'maven';
        return [
          {
            name: 'Build with ' + buildTool,
            run: buildTool === 'maven' ? 'mvn compile' : './gradlew build -x test'
          }
        ];
      case 'rust':
        return [
          {
            name: 'Build with Cargo',
            run: 'cargo build --release'
          }
        ];
      case 'go':
        return [
          {
            name: 'Build Go application',
            run: 'go build -v ./...'
          }
        ];
      default:
        return [];
    }
  }

  private createTestSteps(
    language: string,
    detectionResult: DetectionResult,
    testType: 'unit' | 'integration' | 'e2e'
  ): StepTemplate[] {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return this.createNodeJSTestSteps(testType);
      case 'python':
        return this.createPythonTestSteps(testType);
      case 'java':
        return this.createJavaTestSteps(detectionResult, testType);
      case 'rust':
        return this.createRustTestSteps(testType);
      case 'go':
        return this.createGoTestSteps(testType);
      default:
        return [];
    }
  }

  private createNodeJSTestSteps(testType: 'unit' | 'integration' | 'e2e'): StepTemplate[] {
    switch (testType) {
      case 'unit':
        return [
          {
            name: 'Run unit tests',
            run: 'npm test -- --coverage'
          }
        ];
      case 'integration':
        return [
          {
            name: 'Run integration tests',
            run: 'npm run test:integration'
          }
        ];
      case 'e2e':
        return [
          {
            name: 'Run E2E tests',
            run: 'npm run test:e2e'
          }
        ];
    }
  }

  private createPythonTestSteps(testType: 'unit' | 'integration' | 'e2e'): StepTemplate[] {
    switch (testType) {
      case 'unit':
        return [
          {
            name: 'Run unit tests',
            run: 'pytest tests/unit/ --cov=src --cov-report=xml'
          }
        ];
      case 'integration':
        return [
          {
            name: 'Run integration tests',
            run: 'pytest tests/integration/'
          }
        ];
      case 'e2e':
        return [
          {
            name: 'Run E2E tests',
            run: 'pytest tests/e2e/'
          }
        ];
    }
  }

  private createJavaTestSteps(
    detectionResult: DetectionResult,
    testType: 'unit' | 'integration' | 'e2e'
  ): StepTemplate[] {
    const buildTool = detectionResult.buildTools.find(bt => 
      ['maven', 'gradle'].includes(bt.name)
    )?.name || 'maven';

    switch (testType) {
      case 'unit':
        return [
          {
            name: 'Run unit tests',
            run: buildTool === 'maven' ? 'mvn test' : './gradlew test'
          }
        ];
      case 'integration':
        return [
          {
            name: 'Run integration tests',
            run: buildTool === 'maven' ? 'mvn verify -Dskip.unit.tests=true' : './gradlew integrationTest'
          }
        ];
      case 'e2e':
        return [
          {
            name: 'Run E2E tests',
            run: buildTool === 'maven' ? 'mvn verify -Dskip.unit.tests=true -Dskip.integration.tests=true' : './gradlew e2eTest'
          }
        ];
    }
  }

  private createRustTestSteps(testType: 'unit' | 'integration' | 'e2e'): StepTemplate[] {
    switch (testType) {
      case 'unit':
        return [
          {
            name: 'Run unit tests',
            run: 'cargo test --lib'
          }
        ];
      case 'integration':
        return [
          {
            name: 'Run integration tests',
            run: 'cargo test --test "*"'
          }
        ];
      case 'e2e':
        return [
          {
            name: 'Run E2E tests',
            run: 'cargo test --test e2e'
          }
        ];
    }
  }

  private createGoTestSteps(testType: 'unit' | 'integration' | 'e2e'): StepTemplate[] {
    switch (testType) {
      case 'unit':
        return [
          {
            name: 'Run unit tests',
            run: 'go test -v -race -coverprofile=coverage.out ./...'
          }
        ];
      case 'integration':
        return [
          {
            name: 'Run integration tests',
            run: 'go test -v -tags=integration ./...'
          }
        ];
      case 'e2e':
        return [
          {
            name: 'Run E2E tests',
            run: 'go test -v -tags=e2e ./...'
          }
        ];
    }
  }

  private createMatrixStrategy(
    primaryLanguage: any,
    options: GenerationOptions
  ): MatrixStrategy | undefined {
    if (!primaryLanguage || options.optimizationLevel === 'basic') {
      return undefined;
    }

    switch (primaryLanguage.name.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return {
          matrix: {
            'node-version': ['18', '20', '21']
          },
          failFast: false
        };
      case 'python':
        return {
          matrix: {
            'python-version': ['3.9', '3.10', '3.11', '3.12']
          },
          failFast: false
        };
      case 'java':
        return {
          matrix: {
            'java-version': ['11', '17', '21']
          },
          failFast: false
        };
      case 'rust':
        return {
          matrix: {
            'rust-version': ['stable', 'beta']
          },
          failFast: false
        };
      case 'go':
        return {
          matrix: {
            'go-version': ['1.20', '1.21', '1.22']
          },
          failFast: false
        };
      default:
        return undefined;
    }
  }

  private createServiceSetupSteps(services: string[]): StepTemplate[] {
    const steps: StepTemplate[] = [];
    
    if (services.includes('postgres')) {
      steps.push({
        name: 'Start PostgreSQL',
        run: 'docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=test postgres:13'
      });
    }
    
    if (services.includes('redis')) {
      steps.push({
        name: 'Start Redis',
        run: 'docker run -d -p 6379:6379 redis:7'
      });
    }
    
    if (services.includes('mongodb')) {
      steps.push({
        name: 'Start MongoDB',
        run: 'docker run -d -p 27017:27017 mongo:6'
      });
    }

    return steps;
  }

  private detectRequiredServices(detectionResult: DetectionResult): string[] {
    const services: string[] = [];
    
    // Simple heuristic based on detected frameworks and dependencies
    const frameworks = detectionResult.frameworks.map(f => f.name.toLowerCase());
    
    if (frameworks.some(f => f.includes('postgres') || f.includes('pg'))) {
      services.push('postgres');
    }
    
    if (frameworks.some(f => f.includes('redis'))) {
      services.push('redis');
    }
    
    if (frameworks.some(f => f.includes('mongo'))) {
      services.push('mongodb');
    }

    return services;
  }

  private getBuildArtifactPaths(detectionResult: DetectionResult): string {
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    
    switch (primaryLanguage?.name.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return 'dist/\nbuild/';
      case 'python':
        return 'dist/\nbuild/';
      case 'java':
        return 'target/\nbuild/libs/';
      case 'rust':
        return 'target/release/';
      case 'go':
        return 'bin/';
      default:
        return 'build/\ndist/';
    }
  }

  private getTestResultPaths(detectionResult: DetectionResult): string {
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    
    switch (primaryLanguage?.name.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return 'coverage/\ntest-results.xml';
      case 'python':
        return 'coverage.xml\npytest-results.xml';
      case 'java':
        return 'target/surefire-reports/\ntarget/site/jacoco/';
      case 'rust':
        return 'target/coverage/';
      case 'go':
        return 'coverage.out';
      default:
        return 'test-results/';
    }
  }

  private getCodeQLLanguages(detectionResult: DetectionResult): string[] {
    const languages: string[] = [];
    
    detectionResult.languages.forEach(lang => {
      switch (lang.name.toLowerCase()) {
        case 'javascript':
        case 'typescript':
          languages.push('javascript');
          break;
        case 'python':
          languages.push('python');
          break;
        case 'java':
          languages.push('java');
          break;
        case 'go':
          languages.push('go');
          break;
        case 'csharp':
          languages.push('csharp');
          break;
        case 'cpp':
        case 'c/c++':
        case 'c++':
          languages.push('cpp');
          break;
      }
    });

    return languages;
  }

  private createDetectionSummary(detectionResult: DetectionResult): string {
    const languages = detectionResult.languages.map(l => l.name).join(', ');
    const frameworks = detectionResult.frameworks.map(f => f.name).join(', ');
    return `Languages: ${languages}; Frameworks: ${frameworks}`;
  }

  private getAppliedOptimizations(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): string[] {
    const optimizations: string[] = [];
    
    if (options.optimizationLevel !== 'basic') {
      optimizations.push('Matrix strategy for multiple versions');
    }
    
    optimizations.push('Dependency caching enabled');
    optimizations.push('Parallel test execution');
    optimizations.push('Conditional job execution');
    
    if (options.securityLevel !== 'basic') {
      optimizations.push('Security scanning integrated');
    }

    return optimizations;
  }

  private getWarnings(detectionResult: DetectionResult): string[] {
    const warnings: string[] = [];
    
    if (detectionResult.languages.length === 0) {
      warnings.push('No languages detected - using generic workflow');
    }
    
    if (detectionResult.testingFrameworks.length === 0) {
      warnings.push('No testing frameworks detected - basic test commands used');
    }

    return warnings;
  }

  private async renderWorkflow(workflow: WorkflowTemplate): Promise<string> {
    // This would use the YAML renderer to convert the workflow template to YAML
    // For now, returning a placeholder
    return `# Generated CI Workflow\n# ${workflow.name}\n# Generated at: ${new Date().toISOString()}`;
  }
}