import { CIStep, CIPipeline, CacheStrategy, StepCategory } from '../interfaces/ci-pipeline';
import { FrameworkInfo, ContainerInfo } from '../interfaces/framework-info';
import { DetectionResult } from '../interfaces/detection-result';
import { CITemplateRegistry } from './ci-templates';
import { TemplateManager } from './template-manager';
import { CITemplate, CIStepTemplate } from '../interfaces/detection-rules';

/**
 * CI step generation from framework detection results
 */
export class CIStepGenerator {
  private templateRegistry: CITemplateRegistry;
  private templateManager: TemplateManager;

  constructor() {
    this.templateRegistry = new CITemplateRegistry();
    this.templateManager = new TemplateManager();
  }

  /**
   * Generate complete CI pipeline from detection results
   */
  async generatePipeline(detectionResult: DetectionResult): Promise<CIPipeline> {
    const setup: CIStep[] = [];
    const build: CIStep[] = [];
    const test: CIStep[] = [];
    const security: CIStep[] = [];
    const deploy: CIStep[] = [];

    // Generate steps for each detected framework
    for (const framework of detectionResult.frameworks) {
      const frameworkSteps = this.generateFrameworkSteps(framework);
      
      setup.push(...frameworkSteps.setup);
      build.push(...frameworkSteps.build);
      test.push(...frameworkSteps.test);
      security.push(...frameworkSteps.security);
      deploy.push(...frameworkSteps.deploy);
    }

    // Add container steps if containers are detected
    if (detectionResult.containers.length > 0) {
      const containerSteps = this.generateContainerSteps(detectionResult.containers);
      build.push(...containerSteps.build);
      deploy.push(...containerSteps.deploy);
      
      // Add container security scanning to security steps
      for (const container of detectionResult.containers) {
        if (container.type === 'docker') {
          const containerVars = this.generateContainerVariables(container);
          security.push({
            id: 'container-scan',
            name: 'Scan Docker image for vulnerabilities',
            uses: 'aquasecurity/trivy-action@master',
            with: {
              'image-ref': `${containerVars.imageName}:${containerVars.imageTag}`,
              'format': 'sarif',
              'output': 'trivy-results.sarif'
            },
            category: 'security'
          });
        }
      }
    }

    // Add basic security steps if no framework-specific security steps were added
    if (security.length === 0) {
      security.push(...this.generateBasicSecuritySteps());
    }

    // Generate caching strategies
    const cacheStrategies = this.generateCacheStrategies(detectionResult);

    return {
      setup: this.deduplicateSteps(setup),
      build: this.deduplicateSteps(build),
      test: this.deduplicateSteps(test),
      security: this.deduplicateSteps(security),
      deploy: this.deduplicateSteps(deploy),
      cache: cacheStrategies,
      metadata: {
        name: 'Generated CI Pipeline',
        description: 'Automatically generated from framework detection',
        triggers: [
          { type: 'push', branches: ['main', 'master'] },
          { type: 'pull_request', branches: ['main', 'master'] }
        ],
        environments: ['development', 'staging', 'production'],
        secrets: this.extractRequiredSecrets(detectionResult),
        variables: this.generateEnvironmentVariables(detectionResult)
      }
    };
  }

  /**
   * Generate basic security steps for any project
   */
  private generateBasicSecuritySteps(): CIStep[] {
    return [
      {
        id: 'dependency-scan',
        name: 'Scan dependencies for vulnerabilities',
        uses: 'github/dependency-review-action@v3',
        category: 'security'
      },
      {
        id: 'codeql-analysis',
        name: 'Run CodeQL analysis',
        uses: 'github/codeql-action/analyze@v2',
        category: 'security'
      }
    ];
  }

  /**
   * Generate caching strategies based on detected frameworks
   */
  private generateCacheStrategies(detectionResult: DetectionResult): CacheStrategy[] {
    const cacheStrategies: CacheStrategy[] = [];
    
    for (const framework of detectionResult.frameworks) {
      switch (framework.ecosystem) {
        case 'nodejs':
          cacheStrategies.push({
            id: 'node-modules',
            name: 'Node.js dependencies',
            paths: ['node_modules', '~/.npm'],
            key: 'node-${{ runner.os }}-${{ hashFiles(\'**/package-lock.json\', \'**/yarn.lock\', \'**/pnpm-lock.yaml\') }}',
            restoreKeys: ['node-${{ runner.os }}-'],
            scope: 'branch'
          });
          break;
          
        case 'python':
          cacheStrategies.push({
            id: 'pip-cache',
            name: 'Python dependencies',
            paths: ['~/.cache/pip', '__pycache__'],
            key: 'pip-${{ runner.os }}-${{ hashFiles(\'**/requirements.txt\', \'**/pyproject.toml\') }}',
            restoreKeys: ['pip-${{ runner.os }}-'],
            scope: 'branch'
          });
          break;
          
        case 'rust':
          cacheStrategies.push({
            id: 'cargo-cache',
            name: 'Rust dependencies',
            paths: ['~/.cargo/registry', '~/.cargo/git', 'target'],
            key: 'cargo-${{ runner.os }}-${{ hashFiles(\'**/Cargo.lock\') }}',
            restoreKeys: ['cargo-${{ runner.os }}-'],
            scope: 'branch'
          });
          break;
          
        case 'go':
          cacheStrategies.push({
            id: 'go-cache',
            name: 'Go modules',
            paths: ['~/go/pkg/mod'],
            key: 'go-${{ runner.os }}-${{ hashFiles(\'**/go.sum\') }}',
            restoreKeys: ['go-${{ runner.os }}-'],
            scope: 'branch'
          });
          break;
          
        case 'java':
          if (framework.buildTool === 'maven') {
            cacheStrategies.push({
              id: 'maven-cache',
              name: 'Maven dependencies',
              paths: ['~/.m2/repository'],
              key: 'maven-${{ runner.os }}-${{ hashFiles(\'**/pom.xml\') }}',
              restoreKeys: ['maven-${{ runner.os }}-'],
              scope: 'branch'
            });
          } else if (framework.buildTool === 'gradle') {
            cacheStrategies.push({
              id: 'gradle-cache',
              name: 'Gradle dependencies',
              paths: ['~/.gradle/caches', '~/.gradle/wrapper'],
              key: 'gradle-${{ runner.os }}-${{ hashFiles(\'**/*.gradle*\', \'**/gradle-wrapper.properties\') }}',
              restoreKeys: ['gradle-${{ runner.os }}-'],
              scope: 'branch'
            });
          }
          break;
      }
    }
    
    return cacheStrategies;
  }

  /**
   * Generate environment variables for the pipeline
   */
  private generateEnvironmentVariables(detectionResult: DetectionResult): Record<string, string> {
    const variables: Record<string, string> = {};
    
    // Add framework-specific environment variables
    for (const framework of detectionResult.frameworks) {
      switch (framework.ecosystem) {
        case 'nodejs':
          variables.NODE_ENV = 'test';
          break;
        case 'python':
          variables.PYTHONPATH = '.';
          break;
        case 'rust':
          variables.CARGO_TERM_COLOR = 'always';
          break;
        case 'go':
          variables.CGO_ENABLED = '0';
          break;
      }
    }
    
    return variables;
  }

  /**
   * Generate steps for a specific framework
   */
  private generateFrameworkSteps(framework: FrameworkInfo): {
    setup: CIStep[];
    build: CIStep[];
    test: CIStep[];
    security: CIStep[];
    deploy: CIStep[];
  } {
    const template = this.getFrameworkTemplate(framework);
    if (!template) {
      return {
        setup: [],
        build: [],
        test: [],
        security: [],
        deploy: []
      };
    }

    // Generate template variables based on framework info
    const variables = this.generateTemplateVariables(framework);
    
    // Render template with variables
    const renderedTemplate = this.templateManager.renderTemplate(template, variables);
    
    // Convert template steps to CI steps
    const setup = renderedTemplate.setup.map(step => this.convertToCIStep(step, 'setup'));
    const build = renderedTemplate.build.map(step => this.convertToCIStep(step, 'build'));
    const test = renderedTemplate.test.map(step => this.convertToCIStep(step, 'test'));
    const deploy = (renderedTemplate.deploy || []).map(step => this.convertToCIStep(step, 'deploy'));
    
    // Generate security steps based on framework
    const security = this.generateSecuritySteps(framework);

    return {
      setup,
      build,
      test,
      security,
      deploy
    };
  }

  /**
   * Get appropriate template for framework
   */
  private getFrameworkTemplate(framework: FrameworkInfo): CITemplate | undefined {
    // Try exact framework name first
    let template = this.templateRegistry.getTemplate(framework.name.toLowerCase());
    
    if (!template) {
      // Try ecosystem fallback
      template = this.templateRegistry.getTemplate(framework.ecosystem);
    }
    
    if (!template) {
      // Try build tool fallback
      if (framework.buildTool) {
        template = this.templateRegistry.getTemplate(framework.buildTool.toLowerCase());
      }
    }
    
    return template;
  }

  /**
   * Generate template variables from framework info
   */
  private generateTemplateVariables(framework: FrameworkInfo): Record<string, string> {
    const variables: Record<string, string> = {};
    
    // Common variables
    variables.frameworkName = framework.name;
    variables.frameworkVersion = framework.version || 'latest';
    variables.ecosystem = framework.ecosystem;
    
    // Ecosystem-specific variables
    switch (framework.ecosystem) {
      case 'nodejs':
        variables.nodeVersion = this.extractNodeVersion(framework) || '18';
        variables.packageManager = this.detectPackageManager(framework) || 'npm';
        variables.hasBuildScript = this.hasScript(framework, 'build') ? 'true' : 'false';
        variables.hasTestScript = this.hasScript(framework, 'test') ? 'true' : 'false';
        variables.hasLintScript = this.hasScript(framework, 'lint') ? 'true' : 'false';
        break;
        
      case 'python':
        variables.pythonVersion = this.extractPythonVersion(framework) || '3.9';
        variables.packageName = this.extractPackageName(framework) || 'app';
        variables.hasRequirementsTxt = this.hasFile(framework, 'requirements.txt') ? 'true' : 'false';
        variables.hasPoetry = this.hasFile(framework, 'pyproject.toml') ? 'true' : 'false';
        variables.hasPytest = this.hasDependency(framework, 'pytest') ? 'true' : 'false';
        variables.hasUnittest = 'true'; // Default assumption
        break;
        
      case 'rust':
        variables.rustVersion = this.extractRustVersion(framework) || 'stable';
        variables.buildRelease = 'true';
        break;
        
      case 'go':
        variables.goVersion = this.extractGoVersion(framework) || '1.21';
        break;
        
      case 'java':
        variables.javaVersion = this.extractJavaVersion(framework) || '17';
        break;
    }
    
    // Framework-specific variables
    if (framework.name.toLowerCase() === 'next.js') {
      variables.deployToVercel = 'false'; // Default to false, can be overridden
    }
    
    if (framework.name.toLowerCase() === 'react') {
      variables.isStaticSite = 'true';
    }
    
    if (framework.name.toLowerCase() === 'django') {
      variables.settingsModule = 'myproject.settings';
    }

    return variables;
  }

  /**
   * Convert template step to CI step
   */
  private convertToCIStep(stepTemplate: CIStepTemplate, category: StepCategory): CIStep {
    const step: CIStep = {
      id: stepTemplate.id,
      name: stepTemplate.name,
      category,
      ...(stepTemplate.command && { command: stepTemplate.command }),
      ...(stepTemplate.uses && { uses: stepTemplate.uses }),
      ...(stepTemplate.with && { with: stepTemplate.with }),
      ...(stepTemplate.env && { env: stepTemplate.env }),
      ...(stepTemplate.condition && { condition: stepTemplate.condition })
    };
    
    return step;
  }

  /**
   * Generate security scanning steps based on framework
   */
  private generateSecuritySteps(framework: FrameworkInfo): CIStep[] {
    const securitySteps: CIStep[] = [];
    
    // Dependency scanning for all frameworks
    securitySteps.push({
      id: 'dependency-scan',
      name: 'Scan dependencies for vulnerabilities',
      uses: 'github/dependency-review-action@v3',
      category: 'security'
    });
    
    // Ecosystem-specific security steps
    switch (framework.ecosystem) {
      case 'nodejs':
        securitySteps.push({
          id: 'npm-audit',
          name: 'Run npm audit',
          command: 'npm audit --audit-level=moderate',
          category: 'security',
          continueOnError: true
        });
        break;
        
      case 'python':
        securitySteps.push({
          id: 'safety-check',
          name: 'Check Python dependencies with Safety',
          command: 'pip install safety && safety check',
          category: 'security',
          continueOnError: true
        });
        break;
        
      case 'rust':
        securitySteps.push({
          id: 'cargo-audit',
          name: 'Audit Rust dependencies',
          command: 'cargo install cargo-audit && cargo audit',
          category: 'security',
          continueOnError: true
        });
        break;
        
      case 'go':
        securitySteps.push({
          id: 'govulncheck',
          name: 'Check for Go vulnerabilities',
          command: 'go install golang.org/x/vuln/cmd/govulncheck@latest && govulncheck ./...',
          category: 'security',
          continueOnError: true
        });
        break;
    }
    
    // Code scanning with CodeQL
    securitySteps.push({
      id: 'codeql-analysis',
      name: 'Run CodeQL analysis',
      uses: 'github/codeql-action/analyze@v2',
      category: 'security'
    });
    
    return securitySteps;
  }

  /**
   * Generate container-related steps
   */
  private generateContainerSteps(containers: ContainerInfo[]): {
    build: CIStep[];
    deploy: CIStep[];
  } {
    const buildSteps: CIStep[] = [];
    const deploySteps: CIStep[] = [];
    
    for (const container of containers) {
      if (container.type === 'docker') {
        const template = this.templateRegistry.getTemplate('docker');
        if (template) {
          const variables = this.generateContainerVariables(container);
          const renderedTemplate = this.templateManager.renderTemplate(template, variables);
          
          buildSteps.push(...renderedTemplate.build.map(step => this.convertToCIStep(step, 'build')));
          if (renderedTemplate.deploy) {
            deploySteps.push(...renderedTemplate.deploy.map(step => this.convertToCIStep(step, 'deploy')));
          }
        }
        

      }
    }
    
    return { build: buildSteps, deploy: deploySteps };
  }

  /**
   * Generate variables for container templates
   */
  private generateContainerVariables(container: ContainerInfo): Record<string, string> {
    return {
      imageName: 'myapp', // Default, should be extracted from project
      imageTag: 'latest',
      hasTestCommand: 'false'
    };
  }

  /**
   * Remove duplicate steps based on ID
   */
  private deduplicateSteps(steps: CIStep[]): CIStep[] {
    const stepMap = new Map<string, CIStep>();
    
    steps.forEach(step => {
      if (!stepMap.has(step.id)) {
        stepMap.set(step.id, step);
      }
    });
    
    return Array.from(stepMap.values());
  }

  /**
   * Extract required secrets from detection results
   */
  private extractRequiredSecrets(detectionResult: DetectionResult): string[] {
    const secrets: string[] = [];
    
    // Add framework-specific secrets
    for (const framework of detectionResult.frameworks) {
      const template = this.getFrameworkTemplate(framework);
      if (template?.metadata.requiredSecrets) {
        secrets.push(...template.metadata.requiredSecrets);
      }
    }
    
    // Add container secrets
    if (detectionResult.containers.length > 0) {
      secrets.push('DOCKER_USERNAME', 'DOCKER_PASSWORD');
    }
    
    return Array.from(new Set(secrets));
  }

  // Helper methods for extracting framework information
  
  /**
   * Extract Node.js version from framework metadata
   */
  private extractNodeVersion(framework: FrameworkInfo): string | undefined {
    return framework.metadata?.nodeVersion || framework.version;
  }

  /**
   * Extract Python version from framework metadata
   */
  private extractPythonVersion(framework: FrameworkInfo): string | undefined {
    return framework.metadata?.pythonVersion || framework.version;
  }

  /**
   * Extract Rust version from framework metadata
   */
  private extractRustVersion(framework: FrameworkInfo): string | undefined {
    return framework.metadata?.rustVersion || framework.version;
  }

  /**
   * Extract Go version from framework metadata
   */
  private extractGoVersion(framework: FrameworkInfo): string | undefined {
    return framework.metadata?.goVersion || framework.version;
  }

  /**
   * Extract Java version from framework metadata
   */
  private extractJavaVersion(framework: FrameworkInfo): string | undefined {
    return framework.metadata?.javaVersion || framework.version;
  }

  /**
   * Detect package manager from framework evidence
   */
  private detectPackageManager(framework: FrameworkInfo): string | undefined {
    const evidence = framework.evidence;
    
    for (const e of evidence) {
      if (e.source.includes('yarn.lock')) return 'yarn';
      if (e.source.includes('pnpm-lock.yaml')) return 'pnpm';
      if (e.source.includes('package-lock.json')) return 'npm';
    }
    
    return 'npm'; // Default fallback
  }

  /**
   * Extract package name from framework metadata
   */
  private extractPackageName(framework: FrameworkInfo): string | undefined {
    return framework.metadata?.packageName;
  }

  /**
   * Check if framework has a specific script
   */
  private hasScript(framework: FrameworkInfo, scriptName: string): boolean {
    return framework.metadata?.scripts?.[scriptName] !== undefined;
  }

  /**
   * Check if framework has a specific file
   */
  private hasFile(framework: FrameworkInfo, fileName: string): boolean {
    return framework.evidence.some(e => e.source.includes(fileName));
  }

  /**
   * Check if framework has a specific dependency
   */
  private hasDependency(framework: FrameworkInfo, dependencyName: string): boolean {
    return framework.evidence.some(e => 
      e.type === 'dependency' && e.value.includes(dependencyName)
    );
  }
}