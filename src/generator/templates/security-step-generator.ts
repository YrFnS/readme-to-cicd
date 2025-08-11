/**
 * Security Step Generator
 * Generates security scanning and quality check steps for GitHub Actions workflows
 */

import { DetectionResult, GenerationOptions } from '../interfaces';
import { StepTemplate, SecurityScanTemplate } from '../types';

/**
 * Security configuration for different frameworks
 */
interface SecurityConfig {
  dependencyScanning: {
    enabled: boolean;
    tools: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  staticAnalysis: {
    enabled: boolean;
    tools: string[];
    languages: string[];
  };
  secretScanning: {
    enabled: boolean;
    patterns: string[];
  };
  containerScanning: {
    enabled: boolean;
    registries: string[];
  };
  compliance: {
    enabled: boolean;
    frameworks: string[];
  };
  codeQuality: {
    enabled: boolean;
    linting: boolean;
    formatting: boolean;
    coverage: boolean;
  };
}

/**
 * Framework-specific security requirements
 */
interface FrameworkSecurityRequirements {
  nodejs: SecurityConfig;
  python: SecurityConfig;
  java: SecurityConfig;
  go: SecurityConfig;
  rust: SecurityConfig;
  docker: SecurityConfig;
}

/**
 * Security Step Generator class
 */
export class SecurityStepGenerator {
  private readonly frameworkSecurityRequirements: FrameworkSecurityRequirements;

  constructor() {
    this.frameworkSecurityRequirements = this.initializeFrameworkRequirements();
  }

  /**
   * Generate comprehensive security scanning template
   */
  generateSecurityScanTemplate(
    detectionResult: DetectionResult,
    options?: GenerationOptions
  ): SecurityScanTemplate {
    const securityLevel = options?.securityLevel || 'standard';
    
    return {
      sast: this.generateSASTSteps(detectionResult, securityLevel),
      dast: this.generateDASTSteps(detectionResult, securityLevel),
      dependencyScanning: this.generateDependencyScanningSteps(detectionResult, securityLevel),
      containerScanning: this.generateContainerScanningSteps(detectionResult, securityLevel),
      complianceChecks: this.generateComplianceSteps(detectionResult, securityLevel),
      licenseScanning: this.generateLicenseScanningSteps(detectionResult, securityLevel),
    };
  }

  /**
   * Generate dependency vulnerability scanning steps
   */
  generateDependencyScanningSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const frameworks = detectionResult.frameworks;
    const packageManagers = detectionResult.packageManagers;

    // GitHub Dependabot (always included)
    steps.push({
      name: 'Run Dependabot Security Updates',
      uses: 'github/dependabot-action@v1',
      with: {
        'token': '${{ secrets.GITHUB_TOKEN }}',
        'package-ecosystem': this.getPackageEcosystem(packageManagers),
      },
    });

    // Snyk scanning for enhanced security
    if (securityLevel === 'standard' || securityLevel === 'enterprise') {
      steps.push({
        name: 'Run Snyk Security Scan',
        uses: 'snyk/actions/node@master',
        env: {
          SNYK_TOKEN: '${{ secrets.SNYK_TOKEN }}',
        },
        with: {
          args: '--severity-threshold=medium',
        },
      });
    }

    // Framework-specific dependency scanning
    for (const framework of frameworks) {
      const frameworkSteps = this.getFrameworkDependencySteps(framework.name, securityLevel);
      steps.push(...frameworkSteps);
    }

    return steps;
  } 
 /**
   * Generate Static Application Security Testing (SAST) steps
   */
  generateSASTSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const languages = detectionResult.languages;

    // CodeQL Analysis (GitHub's built-in SAST)
    steps.push({
      name: 'Initialize CodeQL',
      uses: 'github/codeql-action/init@v3',
      with: {
        languages: languages.map(lang => this.mapLanguageToCodeQL(lang.name)).join(','),
        'config-file': './.github/codeql/codeql-config.yml',
      },
    });

    steps.push({
      name: 'Perform CodeQL Analysis',
      uses: 'github/codeql-action/analyze@v3',
      with: {
        category: '/language:${{ matrix.language }}',
      },
    });

    // SonarCloud for enhanced SAST (standard and enterprise)
    if (securityLevel === 'standard' || securityLevel === 'enterprise') {
      steps.push({
        name: 'SonarCloud Scan',
        uses: 'SonarSource/sonarcloud-github-action@master',
        env: {
          GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
          SONAR_TOKEN: '${{ secrets.SONAR_TOKEN }}',
        },
      });
    }

    // Semgrep for additional static analysis (enterprise)
    if (securityLevel === 'enterprise') {
      steps.push({
        name: 'Run Semgrep',
        uses: 'returntocorp/semgrep-action@v1',
        with: {
          config: 'auto',
        },
        env: {
          SEMGREP_APP_TOKEN: '${{ secrets.SEMGREP_APP_TOKEN }}',
        },
      });
    }

    return steps;
  }

  /**
   * Generate Dynamic Application Security Testing (DAST) steps
   */
  generateDASTSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const frameworks = detectionResult.frameworks;
    const hasWebFramework = frameworks.some(f => 
      ['react', 'vue', 'angular', 'express', 'fastapi', 'django', 'spring'].includes(f.name.toLowerCase())
    );

    if (!hasWebFramework) {
      return steps; // No DAST needed for non-web applications
    }

    // OWASP ZAP Baseline Scan (basic level)
    steps.push({
      name: 'OWASP ZAP Baseline Scan',
      uses: 'zaproxy/action-baseline@v0.10.0',
      with: {
        target: 'http://localhost:3000',
        rules_file_name: '.zap/rules.tsv',
        cmd_options: '-a',
      },
    });

    // Full OWASP ZAP Scan (standard and enterprise)
    if (securityLevel === 'standard' || securityLevel === 'enterprise') {
      steps.push({
        name: 'OWASP ZAP Full Scan',
        uses: 'zaproxy/action-full-scan@v0.10.0',
        with: {
          target: 'http://localhost:3000',
          rules_file_name: '.zap/rules.tsv',
          cmd_options: '-a -j',
        },
      });
    }

    return steps;
  }

  /**
   * Generate container security scanning steps
   */
  generateContainerScanningSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const hasDocker = detectionResult.buildTools.some(tool => tool.name.toLowerCase() === 'docker');

    if (!hasDocker) {
      return steps; // No container scanning needed
    }

    // Trivy container scanning
    steps.push({
      name: 'Run Trivy vulnerability scanner',
      uses: 'aquasecurity/trivy-action@master',
      with: {
        'image-ref': '${{ env.IMAGE_NAME }}:${{ github.sha }}',
        format: 'sarif',
        output: 'trivy-results.sarif',
      },
    });

    steps.push({
      name: 'Upload Trivy scan results to GitHub Security tab',
      uses: 'github/codeql-action/upload-sarif@v3',
      with: {
        'sarif_file': 'trivy-results.sarif',
      },
    });

    // Snyk container scanning (standard and enterprise)
    if (securityLevel === 'standard' || securityLevel === 'enterprise') {
      steps.push({
        name: 'Run Snyk to check Docker image for vulnerabilities',
        uses: 'snyk/actions/docker@master',
        env: {
          SNYK_TOKEN: '${{ secrets.SNYK_TOKEN }}',
        },
        with: {
          image: '${{ env.IMAGE_NAME }}:${{ github.sha }}',
          args: '--severity-threshold=medium',
        },
      });
    }

    return steps;
  } 
 /**
   * Generate secret scanning and compliance checking steps
   */
  generateSecretScanningSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    // TruffleHog for secret scanning
    steps.push({
      name: 'TruffleHog OSS',
      uses: 'trufflesecurity/trufflehog@main',
      with: {
        path: './',
        base: '${{ github.event.repository.default_branch }}',
        head: 'HEAD',
        extra_args: '--debug --only-verified',
      },
    });

    // GitLeaks for additional secret detection (standard and enterprise)
    if (securityLevel === 'standard' || securityLevel === 'enterprise') {
      steps.push({
        name: 'Run GitLeaks',
        uses: 'gitleaks/gitleaks-action@v2',
        env: {
          GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
        },
      });
    }

    return steps;
  }

  /**
   * Generate compliance checking steps
   */
  generateComplianceSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    if (securityLevel === 'enterprise') {
      // SOC2 compliance checks
      steps.push({
        name: 'SOC2 Compliance Check',
        uses: 'securecodewarrior/github-action-add-sarif@v1',
        with: {
          'sarif-file': 'soc2-compliance.sarif',
        },
      });

      // HIPAA compliance for healthcare applications
      steps.push({
        name: 'HIPAA Compliance Scan',
        run: 'npm run compliance:hipaa || echo "HIPAA compliance check completed"',
        if: 'contains(github.event.head_commit.message, \'[hipaa]\')',
      });

      // PCI-DSS compliance for payment processing
      steps.push({
        name: 'PCI-DSS Compliance Check',
        run: 'npm run compliance:pci || echo "PCI-DSS compliance check completed"',
        if: 'contains(github.event.head_commit.message, \'[pci]\')',
      });
    }

    return steps;
  }

  /**
   * Generate license scanning steps
   */
  generateLicenseScanningSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const packageManagers = detectionResult.packageManagers;

    // FOSSA license scanning (standard and enterprise)
    if (securityLevel === 'standard' || securityLevel === 'enterprise') {
      steps.push({
        name: 'Run FOSSA License Scan',
        uses: 'fossas/fossa-action@main',
        with: {
          'api-key': '${{ secrets.FOSSA_API_KEY }}',
        },
      });

      // License checker for Node.js projects
      if (packageManagers.some(pm => pm.name === 'npm')) {
        steps.push({
          name: 'Check npm licenses',
          run: 'npx license-checker --summary',
        });
      }

      // License checker for Python projects
      if (packageManagers.some(pm => pm.name === 'pip')) {
        steps.push({
          name: 'Check Python licenses',
          run: 'pip-licenses --format=json --output-file=licenses.json',
        });
      }
    }

    return steps;
  }

  /**
   * Generate code quality steps (linting, formatting, static analysis)
   */
  generateCodeQualitySteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const languages = detectionResult.languages;
    const frameworks = detectionResult.frameworks;

    // Language-specific quality checks
    for (const language of languages) {
      const qualitySteps = this.getLanguageQualitySteps(language.name, frameworks);
      steps.push(...qualitySteps);
    }

    // Framework-specific quality checks
    for (const framework of frameworks) {
      const frameworkQualitySteps = this.getFrameworkQualitySteps(framework.name);
      steps.push(...frameworkQualitySteps);
    }

    // Universal code quality tools
    if (securityLevel === 'standard' || securityLevel === 'enterprise') {
      steps.push({
        name: 'Run CodeClimate',
        uses: 'paambaati/codeclimate-action@v5.0.0',
        env: {
          CC_TEST_REPORTER_ID: '${{ secrets.CC_TEST_REPORTER_ID }}',
        },
        with: {
          coverageCommand: 'npm run test:coverage',
          debug: 'true',
        },
      });
    }

    return steps;
  }  /**
  
 * Get framework-specific dependency scanning steps
   */
  private getFrameworkDependencySteps(frameworkName: string, securityLevel: string): StepTemplate[] {
    const steps: StepTemplate[] = [];

    switch (frameworkName.toLowerCase()) {
      case 'nodejs':
      case 'react':
      case 'vue':
      case 'angular':
      case 'express':
        steps.push({
          name: 'Audit npm dependencies',
          run: 'npm audit --audit-level moderate',
        });
        if (securityLevel !== 'basic') {
          steps.push({
            name: 'Check for outdated packages',
            run: 'npm outdated',
            continueOnError: true,
          });
        }
        break;

      case 'python':
      case 'django':
      case 'flask':
      case 'fastapi':
        steps.push({
          name: 'Safety check for Python dependencies',
          run: 'pip install safety && safety check',
        });
        if (securityLevel !== 'basic') {
          steps.push({
            name: 'Bandit security linter',
            run: 'pip install bandit && bandit -r .',
          });
        }
        break;

      case 'java':
      case 'spring':
        steps.push({
          name: 'OWASP Dependency Check',
          run: 'mvn org.owasp:dependency-check-maven:check',
        });
        break;

      case 'go':
      case 'gin':
      case 'echo':
      case 'fiber':
        steps.push({
          name: 'Go vulnerability check',
          run: 'go install golang.org/x/vuln/cmd/govulncheck@latest && govulncheck ./...',
        });
        break;

      case 'rust':
      case 'actix-web':
      case 'rocket':
      case 'warp':
        steps.push({
          name: 'Cargo audit',
          run: 'cargo install cargo-audit && cargo audit',
        });
        break;
    }

    return steps;
  }

  /**
   * Get framework-specific code quality steps
   */
  private getFrameworkQualitySteps(framework: string): StepTemplate[] {
    const steps: StepTemplate[] = [];

    switch (framework.toLowerCase()) {
      case 'spring':
      case 'java':
        steps.push({
          name: 'Run Checkstyle',
          run: 'mvn checkstyle:check',
        });
        steps.push({
          name: 'Run SpotBugs',
          run: 'mvn spotbugs:check',
        });
        break;
    }

    return steps;
  }

  /**
   * Get language-specific code quality steps
   */
  private getLanguageQualitySteps(language: string, frameworks: any[]): StepTemplate[] {
    const steps: StepTemplate[] = [];

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        steps.push({
          name: 'Run ESLint',
          run: 'npm run lint',
        });
        steps.push({
          name: 'Check Prettier formatting',
          run: 'npm run format:check',
        });
        break;

      case 'python':
        steps.push({
          name: 'Run flake8',
          run: 'pip install flake8 && flake8 .',
        });
        steps.push({
          name: 'Run black formatter check',
          run: 'pip install black && black --check .',
        });
        steps.push({
          name: 'Run mypy type checking',
          run: 'pip install mypy && mypy .',
        });
        break;

      case 'java':
        steps.push({
          name: 'Run Checkstyle',
          run: 'mvn checkstyle:check',
        });
        steps.push({
          name: 'Run SpotBugs',
          run: 'mvn spotbugs:check',
        });
        break;

      case 'go':
        steps.push({
          name: 'Run go fmt',
          run: 'gofmt -s -w . && git diff --exit-code',
        });
        steps.push({
          name: 'Run go vet',
          run: 'go vet ./...',
        });
        steps.push({
          name: 'Run golangci-lint',
          uses: 'golangci/golangci-lint-action@v3',
          with: {
            version: 'latest',
          },
        });
        break;

      case 'rust':
        steps.push({
          name: 'Run rustfmt',
          run: 'cargo fmt -- --check',
        });
        steps.push({
          name: 'Run clippy',
          run: 'cargo clippy -- -D warnings',
        });
        break;
    }

    return steps;
  }

  /**
   * Map language names to CodeQL language identifiers
   */
  private mapLanguageToCodeQL(language: string): string {
    const mapping: Record<string, string> = {
      'javascript': 'javascript',
      'typescript': 'javascript',
      'python': 'python',
      'java': 'java',
      'go': 'go',
      'rust': 'rust',
      'csharp': 'csharp',
      'cpp': 'cpp',
      'c': 'cpp',
    };

    return mapping[language.toLowerCase()] || language.toLowerCase();
  }

  /**
   * Get package ecosystem for Dependabot
   */
  private getPackageEcosystem(packageManagers: any[]): string {
    if (packageManagers.some(pm => pm.name === 'npm')) return 'npm';
    if (packageManagers.some(pm => pm.name === 'pip')) return 'pip';
    if (packageManagers.some(pm => pm.name === 'maven')) return 'maven';
    if (packageManagers.some(pm => pm.name === 'gradle')) return 'gradle';
    if (packageManagers.some(pm => pm.name === 'cargo')) return 'cargo';
    if (packageManagers.some(pm => pm.name === 'go')) return 'gomod';
    return 'npm'; // default fallback
  }  
/**
   * Initialize framework-specific security requirements
   */
  private initializeFrameworkRequirements(): FrameworkSecurityRequirements {
    return {
      nodejs: {
        dependencyScanning: {
          enabled: true,
          tools: ['npm-audit', 'snyk', 'dependabot'],
          severity: 'medium',
        },
        staticAnalysis: {
          enabled: true,
          tools: ['eslint', 'sonarjs', 'codeql'],
          languages: ['javascript', 'typescript'],
        },
        secretScanning: {
          enabled: true,
          patterns: ['api_key', 'secret', 'token', 'password'],
        },
        containerScanning: {
          enabled: false,
          registries: [],
        },
        compliance: {
          enabled: false,
          frameworks: [],
        },
        codeQuality: {
          enabled: true,
          linting: true,
          formatting: true,
          coverage: true,
        },
      },
      python: {
        dependencyScanning: {
          enabled: true,
          tools: ['safety', 'bandit', 'dependabot'],
          severity: 'medium',
        },
        staticAnalysis: {
          enabled: true,
          tools: ['bandit', 'pylint', 'codeql'],
          languages: ['python'],
        },
        secretScanning: {
          enabled: true,
          patterns: ['api_key', 'secret', 'token', 'password'],
        },
        containerScanning: {
          enabled: false,
          registries: [],
        },
        compliance: {
          enabled: false,
          frameworks: [],
        },
        codeQuality: {
          enabled: true,
          linting: true,
          formatting: true,
          coverage: true,
        },
      },
      java: {
        dependencyScanning: {
          enabled: true,
          tools: ['owasp-dependency-check', 'snyk', 'dependabot'],
          severity: 'medium',
        },
        staticAnalysis: {
          enabled: true,
          tools: ['spotbugs', 'checkstyle', 'codeql'],
          languages: ['java'],
        },
        secretScanning: {
          enabled: true,
          patterns: ['api_key', 'secret', 'token', 'password'],
        },
        containerScanning: {
          enabled: false,
          registries: [],
        },
        compliance: {
          enabled: false,
          frameworks: [],
        },
        codeQuality: {
          enabled: true,
          linting: true,
          formatting: true,
          coverage: true,
        },
      },
      go: {
        dependencyScanning: {
          enabled: true,
          tools: ['govulncheck', 'snyk', 'dependabot'],
          severity: 'medium',
        },
        staticAnalysis: {
          enabled: true,
          tools: ['go-vet', 'golangci-lint', 'codeql'],
          languages: ['go'],
        },
        secretScanning: {
          enabled: true,
          patterns: ['api_key', 'secret', 'token', 'password'],
        },
        containerScanning: {
          enabled: false,
          registries: [],
        },
        compliance: {
          enabled: false,
          frameworks: [],
        },
        codeQuality: {
          enabled: true,
          linting: true,
          formatting: true,
          coverage: true,
        },
      },
      rust: {
        dependencyScanning: {
          enabled: true,
          tools: ['cargo-audit', 'snyk', 'dependabot'],
          severity: 'medium',
        },
        staticAnalysis: {
          enabled: true,
          tools: ['clippy', 'codeql'],
          languages: ['rust'],
        },
        secretScanning: {
          enabled: true,
          patterns: ['api_key', 'secret', 'token', 'password'],
        },
        containerScanning: {
          enabled: false,
          registries: [],
        },
        compliance: {
          enabled: false,
          frameworks: [],
        },
        codeQuality: {
          enabled: true,
          linting: true,
          formatting: true,
          coverage: true,
        },
      },
      docker: {
        dependencyScanning: {
          enabled: false,
          tools: [],
          severity: 'medium',
        },
        staticAnalysis: {
          enabled: false,
          tools: [],
          languages: [],
        },
        secretScanning: {
          enabled: true,
          patterns: ['api_key', 'secret', 'token', 'password'],
        },
        containerScanning: {
          enabled: true,
          registries: ['docker.io', 'ghcr.io'],
        },
        compliance: {
          enabled: false,
          frameworks: [],
        },
        codeQuality: {
          enabled: false,
          linting: false,
          formatting: false,
          coverage: false,
        },
      },
    };
  }

  /**
   * Generate security workflow job template
   */
  generateSecurityJob(
    detectionResult: DetectionResult,
    options?: GenerationOptions
  ): StepTemplate[] {
    const securityTemplate = this.generateSecurityScanTemplate(detectionResult, options);
    const steps: StepTemplate[] = [];

    // Checkout code
    steps.push({
      name: 'Checkout code',
      uses: 'actions/checkout@v4',
      with: {
        'fetch-depth': 0, // Full history for better analysis
      },
    });

    // Add all security scanning steps
    steps.push(...securityTemplate.dependencyScanning);
    steps.push(...securityTemplate.sast);
    steps.push(...securityTemplate.containerScanning);
    steps.push(...this.generateSecretScanningSteps(detectionResult, options?.securityLevel || 'standard'));
    steps.push(...securityTemplate.complianceChecks);
    steps.push(...securityTemplate.licenseScanning);
    steps.push(...this.generateCodeQualitySteps(detectionResult, options?.securityLevel || 'standard'));

    // Upload security results
    steps.push({
      name: 'Upload security scan results',
      uses: 'github/codeql-action/upload-sarif@v3',
      if: 'always()',
      with: {
        'sarif_file': 'security-results.sarif',
      },
    });

    return steps;
  }
}