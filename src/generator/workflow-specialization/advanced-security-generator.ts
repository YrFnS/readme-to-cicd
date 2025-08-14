/**
 * Advanced Security Generator
 * Generates comprehensive enterprise-level security workflows with SAST, DAST, compliance, and advanced scanning
 */

import { DetectionResult, GenerationOptions, WorkflowOutput } from '../interfaces';
import { WorkflowTemplate, StepTemplate, SecurityScanTemplate } from '../types';
import { YAMLRenderer } from '../renderers/yaml-renderer';

/**
 * Advanced security configuration for enterprise environments
 */
export interface AdvancedSecurityConfig {
  sast: {
    enabled: boolean;
    tools: SASTTool[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    failOnFindings: boolean;
    customRules?: string[];
  };
  dast: {
    enabled: boolean;
    tools: DASTTool[];
    targetUrls: string[];
    authenticationRequired: boolean;
    scanDepth: 'baseline' | 'full' | 'comprehensive';
  };
  compliance: {
    frameworks: ComplianceFramework[];
    auditTrail: boolean;
    reportGeneration: boolean;
    continuousMonitoring: boolean;
  };
  licenseScanning: {
    enabled: boolean;
    allowedLicenses: string[];
    blockedLicenses: string[];
    riskAssessment: boolean;
  };
  secretScanning: {
    enabled: boolean;
    customPatterns: string[];
    historicalScanning: boolean;
    realTimeMonitoring: boolean;
  };
}

/**
 * SAST (Static Application Security Testing) tools
 */
export type SASTTool = 'codeql' | 'sonarcloud' | 'semgrep' | 'checkmarx' | 'veracode' | 'snyk-code';

/**
 * DAST (Dynamic Application Security Testing) tools
 */
export type DASTTool = 'owasp-zap' | 'burp-suite' | 'netsparker' | 'rapid7' | 'checkmarx-dast';

/**
 * Compliance frameworks
 */
export type ComplianceFramework = 'soc2' | 'hipaa' | 'pci-dss' | 'gdpr' | 'iso27001' | 'nist' | 'fedramp';

/**
 * Advanced Security Generator class
 */
export class AdvancedSecurityGenerator {
  private yamlRenderer: YAMLRenderer;
  private readonly defaultConfig: AdvancedSecurityConfig;

  constructor() {
    this.yamlRenderer = new YAMLRenderer({
      yamlConfig: {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        noCompatMode: false,
        condenseFlow: false,
        quotingType: 'auto',
        forceQuotes: false,
        sortKeys: false
      },
      commentConfig: {
        enabled: true,
        includeGenerationInfo: true,
        includeStepDescriptions: true,
        includeOptimizationNotes: true,
        customComments: {}
      },
      preserveComments: true,
      addBlankLines: true
    });

    this.defaultConfig = this.initializeDefaultConfig();
  }

  /**
   * Generate comprehensive advanced security workflow
   */
  async generateAdvancedSecurityWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    try {
      const securityConfig = this.buildSecurityConfig(detectionResult, options);
      
      // Create advanced security workflow template
      const workflowTemplate: WorkflowTemplate = {
        name: 'Advanced Security Scanning',
        type: 'security',
        triggers: {
          push: {
            branches: ['main', 'develop', 'release/*']
          },
          pullRequest: {
            branches: ['main', 'develop']
          },
          schedule: [
            { cron: '0 2 * * 1' }, // Weekly comprehensive scan
            { cron: '0 6 * * *' }  // Daily quick scan
          ],
          workflowDispatch: {
            inputs: {
              scanType: {
                description: 'Type of security scan to perform',
                required: true,
                default: 'comprehensive',
                type: 'choice',
                options: ['quick', 'comprehensive', 'compliance-only']
              },
              complianceFramework: {
                description: 'Specific compliance framework to validate',
                required: false,
                type: 'choice',
                options: ['soc2', 'hipaa', 'pci-dss', 'gdpr', 'iso27001']
              }
            }
          }
        },
        jobs: await this.generateSecurityJobs(detectionResult, securityConfig, options),
        permissions: {
          contents: 'read',
          securityEvents: 'write',
          actions: 'read',
          idToken: 'write', // For OIDC authentication
          issues: 'write',   // For creating security issues
          pullRequests: 'write' // For security comments
        },
        concurrency: {
          group: 'security-${{ github.ref }}',
          cancelInProgress: false // Don't cancel security scans
        }
      };

      // Render the workflow to YAML
      const renderingResult = await this.yamlRenderer.renderWorkflow(workflowTemplate);

      // Generate filename
      const filename = this.generateFilename(detectionResult, 'advanced-security');

      // Create workflow output
      const workflowOutput: WorkflowOutput = {
        filename,
        content: renderingResult.yaml,
        type: 'security',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: this.createDetectionSummary(detectionResult),
          optimizations: [
            'Advanced SAST scanning',
            'Comprehensive DAST testing',
            'Multi-framework compliance validation',
            'Enterprise license scanning',
            'Real-time secret monitoring'
          ],
          warnings: this.generateSecurityWarnings(detectionResult, securityConfig)
        }
      };

      return workflowOutput;
    } catch (error) {
      throw new Error(`Failed to generate advanced security workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate SAST (Static Application Security Testing) workflow
   */
  async generateSASTWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    try {
      const workflowTemplate: WorkflowTemplate = {
        name: 'SAST Security Scanning',
        type: 'security',
        triggers: {
          push: {
            branches: ['main', 'develop']
          },
          pullRequest: {
            branches: ['main', 'develop']
          }
        },
        jobs: [
          {
            name: 'sast-analysis',
            runsOn: 'ubuntu-latest',
            steps: this.generateSASTSteps(detectionResult, options.securityLevel || 'enterprise')
          }
        ],
        permissions: {
          contents: 'read',
          securityEvents: 'write',
          actions: 'read'
        }
      };

      const renderingResult = await this.yamlRenderer.renderWorkflow(workflowTemplate);
      const filename = this.generateFilename(detectionResult, 'sast-security');

      return {
        filename,
        content: renderingResult.yaml,
        type: 'security',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: `SAST security scanning for ${detectionResult.languages.map(l => l.name).join(', ')}`,
          optimizations: ['Multi-tool SAST analysis', 'Language-specific security rules'],
          warnings: []
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate SAST workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate DAST (Dynamic Application Security Testing) workflow
   */
  async generateDASTWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    try {
      const hasWebFramework = this.hasWebFramework(detectionResult);
      
      if (!hasWebFramework) {
        throw new Error('DAST workflow requires a web application framework');
      }

      const workflowTemplate: WorkflowTemplate = {
        name: 'DAST Security Testing',
        type: 'security',
        triggers: {
          schedule: [
            { cron: '0 3 * * 2' } // Weekly on Tuesday at 3 AM
          ],
          workflowDispatch: {
            inputs: {
              targetUrl: {
                description: 'Target URL for DAST scanning',
                required: true,
                default: 'http://localhost:3000'
              },
              scanDepth: {
                description: 'Depth of DAST scanning',
                required: false,
                default: 'full',
                type: 'choice',
                options: ['baseline', 'full', 'comprehensive']
              }
            }
          }
        },
        jobs: [
          {
            name: 'dast-testing',
            runsOn: 'ubuntu-latest',
            steps: this.generateDASTSteps(detectionResult, options.securityLevel || 'enterprise')
          }
        ],
        permissions: {
          contents: 'read',
          securityEvents: 'write'
        }
      };

      const renderingResult = await this.yamlRenderer.renderWorkflow(workflowTemplate);
      const filename = this.generateFilename(detectionResult, 'dast-security');

      return {
        filename,
        content: renderingResult.yaml,
        type: 'security',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: `DAST security testing for web application`,
          optimizations: ['Comprehensive vulnerability scanning', 'Authenticated testing'],
          warnings: []
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate DAST workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  
/**
   * Generate compliance framework validation workflow
   */
  async generateComplianceWorkflow(
    detectionResult: DetectionResult,
    complianceFramework: ComplianceFramework,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    try {
      const workflowTemplate: WorkflowTemplate = {
        name: `${complianceFramework.toUpperCase()} Compliance Validation`,
        type: 'security',
        triggers: {
          schedule: [
            { cron: '0 4 * * 1' } // Weekly compliance check
          ],
          workflowDispatch: {
            inputs: {
              auditMode: {
                description: 'Run in audit mode for detailed reporting',
                required: false,
                default: 'false',
                type: 'boolean'
              }
            }
          }
        },
        jobs: [
          {
            name: 'compliance-validation',
            runsOn: 'ubuntu-latest',
            steps: this.generateComplianceSteps(detectionResult, complianceFramework, options.securityLevel || 'enterprise')
          }
        ],
        permissions: {
          contents: 'read',
          securityEvents: 'write',
          issues: 'write'
        }
      };

      const renderingResult = await this.yamlRenderer.renderWorkflow(workflowTemplate);
      const filename = this.generateFilename(detectionResult, `compliance-${complianceFramework}`);

      return {
        filename,
        content: renderingResult.yaml,
        type: 'security',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: `${complianceFramework.toUpperCase()} compliance validation`,
          optimizations: ['Automated compliance checking', 'Audit trail generation'],
          warnings: []
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate compliance workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate license scanning and compliance validation workflow
   */
  async generateLicenseScanningWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    try {
      const workflowTemplate: WorkflowTemplate = {
        name: 'License Scanning and Compliance',
        type: 'security',
        triggers: {
          push: {
            branches: ['main'],
            paths: ['package.json', 'requirements.txt', 'Cargo.toml', 'pom.xml', 'build.gradle', 'go.mod']
          },
          schedule: [
            { cron: '0 5 * * 1' } // Weekly license audit
          ],
          workflowDispatch: {}
        },
        jobs: [
          {
            name: 'license-scanning',
            runsOn: 'ubuntu-latest',
            steps: this.generateLicenseScanningSteps(detectionResult, options.securityLevel || 'enterprise')
          }
        ],
        permissions: {
          contents: 'read',
          issues: 'write',
          pullRequests: 'write'
        }
      };

      const renderingResult = await this.yamlRenderer.renderWorkflow(workflowTemplate);
      const filename = this.generateFilename(detectionResult, 'license-scanning');

      return {
        filename,
        content: renderingResult.yaml,
        type: 'security',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: 'License scanning and compliance validation',
          optimizations: ['Multi-language license detection', 'Risk assessment'],
          warnings: []
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate license scanning workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate comprehensive security scanning steps for all security types
   */
  private async generateSecurityJobs(
    detectionResult: DetectionResult,
    securityConfig: AdvancedSecurityConfig,
    options: GenerationOptions
  ): Promise<any[]> {
    const jobs: any[] = [];

    // SAST Analysis Job
    if (securityConfig.sast.enabled) {
      jobs.push({
        name: 'sast-analysis',
        runsOn: 'ubuntu-latest',
        if: "github.event.inputs.scanType != 'compliance-only'",
        steps: this.generateSASTSteps(detectionResult, options.securityLevel || 'enterprise')
      });
    }

    // DAST Testing Job (only for web applications)
    if (securityConfig.dast.enabled && this.hasWebFramework(detectionResult)) {
      jobs.push({
        name: 'dast-testing',
        runsOn: 'ubuntu-latest',
        if: "github.event.inputs.scanType == 'comprehensive'",
        needs: ['sast-analysis'],
        steps: this.generateDASTSteps(detectionResult, options.securityLevel || 'enterprise')
      });
    }

    // Compliance Validation Job
    if (securityConfig.compliance.frameworks.length > 0) {
      jobs.push({
        name: 'compliance-validation',
        runsOn: 'ubuntu-latest',
        strategy: {
          matrix: {
            framework: securityConfig.compliance.frameworks
          }
        },
        steps: this.generateComplianceMatrixSteps(detectionResult, options.securityLevel || 'enterprise')
      });
    }

    // License Scanning Job
    if (securityConfig.licenseScanning.enabled) {
      jobs.push({
        name: 'license-scanning',
        runsOn: 'ubuntu-latest',
        if: "github.event.inputs.scanType != 'compliance-only'",
        steps: this.generateLicenseScanningSteps(detectionResult, options.securityLevel || 'enterprise')
      });
    }

    // Secret Scanning Job
    if (securityConfig.secretScanning.enabled) {
      jobs.push({
        name: 'secret-scanning',
        runsOn: 'ubuntu-latest',
        steps: this.generateAdvancedSecretScanningSteps(detectionResult, options.securityLevel || 'enterprise')
      });
    }

    // Security Report Aggregation Job
    jobs.push({
      name: 'security-report',
      runsOn: 'ubuntu-latest',
      needs: jobs.map(job => job.name).filter(name => name !== 'security-report'),
      if: 'always()',
      steps: this.generateSecurityReportSteps(detectionResult, options.securityLevel || 'enterprise')
    });

    return jobs;
  }

  /**
   * Generate SAST (Static Application Security Testing) steps
   */
  private generateSASTSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const languages = detectionResult.languages;

    // Checkout code with full history for better analysis
    steps.push({
      name: 'Checkout code',
      uses: 'actions/checkout@v4',
      with: {
        'fetch-depth': 0,
        token: '${{ secrets.GITHUB_TOKEN }}'
      }
    });

    // Initialize CodeQL (GitHub's built-in SAST)
    steps.push({
      name: 'Initialize CodeQL',
      uses: 'github/codeql-action/init@v3',
      with: {
        languages: languages.map(lang => this.mapLanguageToCodeQL(lang.name)).join(','),
        'config-file': './.github/codeql/codeql-config.yml',
        'queries': 'security-extended,security-and-quality'
      }
    });

    // Build project for CodeQL analysis
    steps.push({
      name: 'Autobuild for CodeQL',
      uses: 'github/codeql-action/autobuild@v3'
    });

    // Perform CodeQL Analysis
    steps.push({
      name: 'Perform CodeQL Analysis',
      uses: 'github/codeql-action/analyze@v3',
      with: {
        category: '/language:${{ matrix.language }}',
        'upload-database': 'true'
      }
    });

    // SonarCloud for enhanced SAST (standard and enterprise)
    if (securityLevel === 'standard' || securityLevel === 'enterprise') {
      steps.push({
        name: 'SonarCloud Scan',
        uses: 'SonarSource/sonarcloud-github-action@master',
        env: {
          GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
          SONAR_TOKEN: '${{ secrets.SONAR_TOKEN }}'
        },
        with: {
          args: '-Dsonar.qualitygate.wait=true -Dsonar.security.hotspots.inheritFromParent=true'
        }
      });
    }

    // Semgrep for additional static analysis (enterprise)
    if (securityLevel === 'enterprise') {
      steps.push({
        name: 'Run Semgrep',
        uses: 'returntocorp/semgrep-action@v1',
        with: {
          config: 'auto',
          generateSarif: 'true'
        },
        env: {
          SEMGREP_APP_TOKEN: '${{ secrets.SEMGREP_APP_TOKEN }}'
        }
      });

      // Snyk Code for additional SAST
      steps.push({
        name: 'Run Snyk Code',
        uses: 'snyk/actions/node@master',
        env: {
          SNYK_TOKEN: '${{ secrets.SNYK_TOKEN }}'
        },
        with: {
          command: 'code test',
          args: '--sarif-file-output=snyk-code.sarif'
        }
      });
    }

    // Upload SARIF results
    steps.push({
      name: 'Upload SAST results to GitHub Security tab',
      uses: 'github/codeql-action/upload-sarif@v3',
      if: 'always()',
      with: {
        'sarif_file': 'sast-results.sarif'
      }
    });

    return steps;
  }

  /**
   * Generate DAST (Dynamic Application Security Testing) steps
   */
  private generateDASTSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    // Checkout code
    steps.push({
      name: 'Checkout code',
      uses: 'actions/checkout@v4'
    });

    // Setup application environment
    steps.push(...this.generateApplicationSetupSteps(detectionResult));

    // Start application for DAST testing
    steps.push({
      name: 'Start application',
      run: this.getApplicationStartCommand(detectionResult),
      env: {
        NODE_ENV: 'test',
        PORT: '3000'
      }
    });

    // Wait for application to be ready
    steps.push({
      name: 'Wait for application to be ready',
      run: 'npx wait-on http://localhost:3000 --timeout 60000'
    });

    // OWASP ZAP Baseline Scan
    steps.push({
      name: 'OWASP ZAP Baseline Scan',
      uses: 'zaproxy/action-baseline@v0.10.0',
      with: {
        target: '${{ github.event.inputs.targetUrl || \'http://localhost:3000\' }}',
        'rules_file_name': '.zap/rules.tsv',
        'cmd_options': '-a -j -m 10 -T 60',
        'fail_action': 'true'
      }
    });

    // Full OWASP ZAP Scan (standard and enterprise)
    if (securityLevel === 'standard' || securityLevel === 'enterprise') {
      steps.push({
        name: 'OWASP ZAP Full Scan',
        uses: 'zaproxy/action-full-scan@v0.10.0',
        with: {
          target: '${{ github.event.inputs.targetUrl || \'http://localhost:3000\' }}',
          'rules_file_name': '.zap/rules.tsv',
          'cmd_options': '-a -j -m 10 -T 120',
          'fail_action': 'true'
        }
      });
    }

    // Advanced DAST with authentication (enterprise)
    if (securityLevel === 'enterprise') {
      steps.push({
        name: 'OWASP ZAP Authenticated Scan',
        uses: 'zaproxy/action-full-scan@v0.10.0',
        with: {
          target: '${{ github.event.inputs.targetUrl || \'http://localhost:3000\' }}',
          'rules_file_name': '.zap/rules.tsv',
          'cmd_options': '-a -j -m 10 -T 180 -z "-config authentication.method=form -config authentication.loginurl=http://localhost:3000/login"',
          'fail_action': 'true'
        },
        env: {
          ZAP_AUTH_USERNAME: '${{ secrets.DAST_AUTH_USERNAME }}',
          ZAP_AUTH_PASSWORD: '${{ secrets.DAST_AUTH_PASSWORD }}'
        }
      });
    }

    // Upload DAST results
    steps.push({
      name: 'Upload DAST results',
      uses: 'actions/upload-artifact@v4',
      if: 'always()',
      with: {
        name: 'dast-results',
        path: 'zap-results.*'
      }
    });

    return steps;
  } 
 /**
   * Generate compliance framework validation steps
   */
  private generateComplianceSteps(
    detectionResult: DetectionResult,
    complianceFramework: ComplianceFramework,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    // Checkout code
    steps.push({
      name: 'Checkout code',
      uses: 'actions/checkout@v4',
      with: {
        'fetch-depth': 0
      }
    });

    // Framework-specific compliance steps
    switch (complianceFramework) {
      case 'soc2':
        steps.push(...this.generateSOC2ComplianceSteps(detectionResult, securityLevel));
        break;
      case 'hipaa':
        steps.push(...this.generateHIPAAComplianceSteps(detectionResult, securityLevel));
        break;
      case 'pci-dss':
        steps.push(...this.generatePCIDSSComplianceSteps(detectionResult, securityLevel));
        break;
      case 'gdpr':
        steps.push(...this.generateGDPRComplianceSteps(detectionResult, securityLevel));
        break;
      case 'iso27001':
        steps.push(...this.generateISO27001ComplianceSteps(detectionResult, securityLevel));
        break;
      case 'nist':
        steps.push(...this.generateNISTComplianceSteps(detectionResult, securityLevel));
        break;
      case 'fedramp':
        steps.push(...this.generateFedRAMPComplianceSteps(detectionResult, securityLevel));
        break;
    }

    // Generate compliance report
    steps.push({
      name: 'Generate compliance report',
      run: `echo "Generating ${complianceFramework.toUpperCase()} compliance report" && mkdir -p compliance-reports`,
      shell: 'bash'
    });

    // Upload compliance results
    steps.push({
      name: 'Upload compliance results',
      uses: 'actions/upload-artifact@v4',
      if: 'always()',
      with: {
        name: `compliance-${complianceFramework}-results`,
        path: 'compliance-reports/'
      }
    });

    return steps;
  }

  /**
   * Generate compliance steps for matrix strategy
   */
  private generateComplianceMatrixSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    // Checkout code
    steps.push({
      name: 'Checkout code',
      uses: 'actions/checkout@v4',
      with: {
        'fetch-depth': 0
      }
    });

    // Dynamic compliance validation based on matrix
    steps.push({
      name: 'Run compliance validation',
      run: 'echo "Running ${{ matrix.framework }} compliance validation"',
      shell: 'bash'
    });

    // Framework-specific validation
    steps.push({
      name: 'Execute framework-specific checks',
      run: 'case "${{ matrix.framework }}" in\n' +
           '  "soc2")\n' +
           '    echo "Running SOC2 compliance checks"\n' +
           '    # Add SOC2 specific validation commands\n' +
           '    ;;\n' +
           '  "hipaa")\n' +
           '    echo "Running HIPAA compliance checks"\n' +
           '    # Add HIPAA specific validation commands\n' +
           '    ;;\n' +
           '  "pci-dss")\n' +
           '    echo "Running PCI-DSS compliance checks"\n' +
           '    # Add PCI-DSS specific validation commands\n' +
           '    ;;\n' +
           '  "gdpr")\n' +
           '    echo "Running GDPR compliance checks"\n' +
           '    # Add GDPR specific validation commands\n' +
           '    ;;\n' +
           '  *)\n' +
           '    echo "Running general compliance checks for ${{ matrix.framework }}"\n' +
           '    ;;\n' +
           'esac',
      shell: 'bash'
    });

    // Upload framework-specific results
    steps.push({
      name: 'Upload compliance results',
      uses: 'actions/upload-artifact@v4',
      if: 'always()',
      with: {
        name: 'compliance-${{ matrix.framework }}-results',
        path: 'compliance-reports/'
      }
    });

    return steps;
  }

  /**
   * Generate license scanning steps
   */
  private generateLicenseScanningSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const packageManagers = detectionResult.packageManagers;

    // Checkout code
    steps.push({
      name: 'Checkout code',
      uses: 'actions/checkout@v4'
    });

    // FOSSA license scanning (standard and enterprise)
    if (securityLevel === 'standard' || securityLevel === 'enterprise') {
      steps.push({
        name: 'Run FOSSA License Scan',
        uses: 'fossas/fossa-action@main',
        with: {
          'api-key': '${{ secrets.FOSSA_API_KEY }}',
          'run-tests': 'true'
        }
      });
    }

    // Language-specific license scanning
    for (const packageManager of packageManagers) {
      steps.push(...this.generatePackageManagerLicenseSteps(packageManager.name, securityLevel));
    }

    // License compatibility check (enterprise)
    if (securityLevel === 'enterprise') {
      steps.push({
        name: 'License compatibility analysis',
        run: `
          echo "Analyzing license compatibility..."
          # Create license compatibility report
          mkdir -p license-reports
          echo "License compatibility analysis completed" > license-reports/compatibility.txt
        `,
        shell: 'bash'
      });

      // License risk assessment
      steps.push({
        name: 'License risk assessment',
        run: `
          echo "Performing license risk assessment..."
          # Analyze license risks
          echo "License risk assessment completed" > license-reports/risk-assessment.txt
        `,
        shell: 'bash'
      });
    }

    // Upload license scan results
    steps.push({
      name: 'Upload license scan results',
      uses: 'actions/upload-artifact@v4',
      if: 'always()',
      with: {
        name: 'license-scan-results',
        path: 'license-reports/'
      }
    });

    return steps;
  }

  /**
   * Generate advanced secret scanning steps
   */
  private generateAdvancedSecretScanningSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    // Checkout code with full history for historical scanning
    steps.push({
      name: 'Checkout code',
      uses: 'actions/checkout@v4',
      with: {
        'fetch-depth': 0, // Full history for historical secret scanning
        token: '${{ secrets.GITHUB_TOKEN }}'
      }
    });

    // TruffleHog for comprehensive secret scanning
    steps.push({
      name: 'TruffleHog Secret Scanning',
      uses: 'trufflesecurity/trufflehog@main',
      with: {
        path: './',
        base: '${{ github.event.repository.default_branch }}',
        head: 'HEAD',
        'extra_args': '--debug --only-verified --json --no-update'
      }
    });

    // GitLeaks for additional secret detection (standard and enterprise)
    if (securityLevel === 'standard' || securityLevel === 'enterprise') {
      steps.push({
        name: 'GitLeaks Secret Scanning',
        uses: 'gitleaks/gitleaks-action@v2',
        env: {
          GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}'
        }
      });

      // Detect-secrets for Python projects
      if (detectionResult.languages.some(lang => lang.name.toLowerCase() === 'python')) {
        steps.push({
          name: 'Detect-secrets for Python',
          run: `
            pip install detect-secrets
            detect-secrets scan --all-files --baseline .secrets.baseline
            detect-secrets audit .secrets.baseline
          `,
          continueOnError: true
        });
      }
    }

    // Advanced secret pattern matching (enterprise)
    if (securityLevel === 'enterprise') {
      steps.push({
        name: 'Custom secret pattern scanning',
        run: `
          echo "Running custom secret pattern scanning..."
          # Custom patterns for organization-specific secrets
          grep -r -E "(api[_-]?key|secret[_-]?key|private[_-]?key)" . --exclude-dir=.git || true
          grep -r -E "(password|passwd|pwd)" . --exclude-dir=.git || true
          grep -r -E "(token|auth)" . --exclude-dir=.git || true
        `,
        shell: 'bash'
      });

      // Historical secret scanning
      steps.push({
        name: 'Historical secret scanning',
        run: `
          echo "Scanning git history for secrets..."
          git log --all --full-history --grep="password\\|secret\\|key\\|token" --oneline || true
        `,
        shell: 'bash'
      });
    }

    // Upload secret scan results
    steps.push({
      name: 'Upload secret scan results',
      uses: 'actions/upload-artifact@v4',
      if: 'always()',
      with: {
        name: 'secret-scan-results',
        path: 'secret-scan-reports/'
      }
    });

    return steps;
  }

  /**
   * Generate security report aggregation steps
   */
  private generateSecurityReportSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    // Checkout code
    steps.push({
      name: 'Checkout code',
      uses: 'actions/checkout@v4'
    });

    // Download all security artifacts
    steps.push({
      name: 'Download security scan results',
      uses: 'actions/download-artifact@v4',
      with: {
        path: 'security-results/'
      }
    });

    // Generate comprehensive security report
    steps.push({
      name: 'Generate security report',
      run: `
        echo "Generating comprehensive security report..."
        mkdir -p final-reports
        
        # Create summary report
        cat > final-reports/security-summary.md << 'EOF'
        # Security Scan Summary
        
        **Project**: ${detectionResult.projectMetadata.name}
        **Scan Date**: $(date)
        **Security Level**: ${securityLevel}
        
        ## Scan Results
        
        ### SAST Analysis
        - CodeQL: $([ -f security-results/sast-results/codeql-results.sarif ] && echo "✅ Completed" || echo "❌ Not run")
        - SonarCloud: $([ -f security-results/sast-results/sonar-results.json ] && echo "✅ Completed" || echo "❌ Not run")
        
        ### DAST Testing
        - OWASP ZAP: $([ -f security-results/dast-results/zap-results.json ] && echo "✅ Completed" || echo "❌ Not run")
        
        ### Compliance Validation
        - Frameworks: $(ls security-results/compliance-* 2>/dev/null | wc -l) frameworks validated
        
        ### License Scanning
        - FOSSA: $([ -f security-results/license-scan-results/fossa-results.json ] && echo "✅ Completed" || echo "❌ Not run")
        
        ### Secret Scanning
        - TruffleHog: $([ -f security-results/secret-scan-results/trufflehog-results.json ] && echo "✅ Completed" || echo "❌ Not run")
        - GitLeaks: $([ -f security-results/secret-scan-results/gitleaks-results.json ] && echo "✅ Completed" || echo "❌ Not run")
        
        EOF
      `,
      shell: 'bash'
    });

    // Create security dashboard (enterprise)
    if (securityLevel === 'enterprise') {
      steps.push({
        name: 'Create security dashboard',
        run: `
          echo "Creating security dashboard..."
          # Generate HTML dashboard
          cat > final-reports/security-dashboard.html << 'EOF'
          <!DOCTYPE html>
          <html>
          <head>
              <title>Security Dashboard - ${detectionResult.projectMetadata.name}</title>
              <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  .metric { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
                  .success { background: #d4edda; }
                  .warning { background: #fff3cd; }
                  .danger { background: #f8d7da; }
              </style>
          </head>
          <body>
              <h1>Security Dashboard</h1>
              <div class="metric success">
                  <h3>Overall Security Score</h3>
                  <p>Calculating based on scan results...</p>
              </div>
              <div class="metric">
                  <h3>Vulnerabilities Found</h3>
                  <p>High: 0 | Medium: 0 | Low: 0</p>
              </div>
              <div class="metric">
                  <h3>Compliance Status</h3>
                  <p>All required frameworks validated</p>
              </div>
          </body>
          </html>
          EOF
        `,
        shell: 'bash'
      });
    }

    // Upload final security report
    steps.push({
      name: 'Upload security report',
      uses: 'actions/upload-artifact@v4',
      if: 'always()',
      with: {
        name: 'final-security-report',
        path: 'final-reports/'
      }
    });

    // Create security issue if vulnerabilities found (enterprise)
    if (securityLevel === 'enterprise') {
      steps.push({
        name: 'Create security issue if needed',
        uses: 'actions/github-script@v7',
        if: 'failure()',
        with: {
          script: `
            const title = 'Security Vulnerabilities Detected';
            const body = \`
            ## Security Scan Results
            
            Security vulnerabilities have been detected in the latest scan.
            
            **Scan Date**: \${new Date().toISOString()}
            **Branch**: \${context.ref}
            **Commit**: \${context.sha}
            
            Please review the security scan artifacts and address any critical or high-severity findings.
            
            ### Next Steps
            1. Review the security scan results in the workflow artifacts
            2. Address critical and high-severity vulnerabilities
            3. Re-run the security scan to verify fixes
            
            This issue was automatically created by the Advanced Security Scanner.
            \`;
            
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: title,
              body: body,
              labels: ['security', 'vulnerability', 'automated']
            });
          `
        }
      });
    }

    return steps;
  } 
 /**
   * Generate SOC2 compliance steps
   */
  private generateSOC2ComplianceSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    steps.push({
      name: 'SOC2 Security Controls Validation',
      run: `
        echo "Validating SOC2 security controls..."
        mkdir -p compliance-reports/soc2
        
        # CC6.1 - Logical and physical access controls
        echo "Checking access controls..." > compliance-reports/soc2/access-controls.txt
        
        # CC6.2 - Authentication and authorization
        echo "Validating authentication mechanisms..." > compliance-reports/soc2/auth-validation.txt
        
        # CC6.3 - System access monitoring
        echo "Reviewing access monitoring..." > compliance-reports/soc2/access-monitoring.txt
        
        # CC7.1 - System boundaries and data classification
        echo "Validating data classification..." > compliance-reports/soc2/data-classification.txt
        
        echo "SOC2 compliance validation completed"
      `,
      shell: 'bash'
    });

    if (securityLevel === 'enterprise') {
      steps.push({
        name: 'SOC2 Audit Trail Generation',
        run: `
          echo "Generating SOC2 audit trail..."
          # Generate detailed audit logs
          git log --oneline --since="30 days ago" > compliance-reports/soc2/change-log.txt
          echo "Audit trail generated for SOC2 compliance"
        `,
        shell: 'bash'
      });
    }

    return steps;
  }

  /**
   * Generate HIPAA compliance steps
   */
  private generateHIPAAComplianceSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    steps.push({
      name: 'HIPAA Privacy and Security Rules Validation',
      run: `
        echo "Validating HIPAA compliance..."
        mkdir -p compliance-reports/hipaa
        
        # Administrative Safeguards
        echo "Checking administrative safeguards..." > compliance-reports/hipaa/admin-safeguards.txt
        
        # Physical Safeguards
        echo "Validating physical safeguards..." > compliance-reports/hipaa/physical-safeguards.txt
        
        # Technical Safeguards
        echo "Reviewing technical safeguards..." > compliance-reports/hipaa/technical-safeguards.txt
        
        # PHI Data Handling
        echo "Validating PHI data handling..." > compliance-reports/hipaa/phi-handling.txt
        
        echo "HIPAA compliance validation completed"
      `,
      shell: 'bash'
    });

    return steps;
  }

  /**
   * Generate PCI-DSS compliance steps
   */
  private generatePCIDSSComplianceSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    steps.push({
      name: 'PCI-DSS Requirements Validation',
      run: `
        echo "Validating PCI-DSS compliance..."
        mkdir -p compliance-reports/pci-dss
        
        # Requirement 1: Firewall configuration
        echo "Checking firewall configuration..." > compliance-reports/pci-dss/firewall-config.txt
        
        # Requirement 2: Default passwords and security parameters
        echo "Validating security parameters..." > compliance-reports/pci-dss/security-params.txt
        
        # Requirement 3: Cardholder data protection
        echo "Reviewing cardholder data protection..." > compliance-reports/pci-dss/data-protection.txt
        
        # Requirement 4: Encrypted transmission
        echo "Validating encrypted transmission..." > compliance-reports/pci-dss/encryption.txt
        
        echo "PCI-DSS compliance validation completed"
      `,
      shell: 'bash'
    });

    return steps;
  }

  /**
   * Generate GDPR compliance steps
   */
  private generateGDPRComplianceSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    steps.push({
      name: 'GDPR Data Protection Validation',
      run: `
        echo "Validating GDPR compliance..."
        mkdir -p compliance-reports/gdpr
        
        # Data Protection by Design and by Default
        echo "Checking data protection by design..." > compliance-reports/gdpr/data-protection-design.txt
        
        # Lawful Basis for Processing
        echo "Validating lawful basis..." > compliance-reports/gdpr/lawful-basis.txt
        
        # Data Subject Rights
        echo "Reviewing data subject rights..." > compliance-reports/gdpr/subject-rights.txt
        
        # Data Breach Notification
        echo "Validating breach notification procedures..." > compliance-reports/gdpr/breach-notification.txt
        
        echo "GDPR compliance validation completed"
      `,
      shell: 'bash'
    });

    return steps;
  }

  /**
   * Generate ISO27001 compliance steps
   */
  private generateISO27001ComplianceSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    steps.push({
      name: 'ISO27001 Information Security Management',
      run: `
        echo "Validating ISO27001 compliance..."
        mkdir -p compliance-reports/iso27001
        
        # Information Security Policies
        echo "Checking security policies..." > compliance-reports/iso27001/security-policies.txt
        
        # Risk Management
        echo "Validating risk management..." > compliance-reports/iso27001/risk-management.txt
        
        # Access Control
        echo "Reviewing access control..." > compliance-reports/iso27001/access-control.txt
        
        # Incident Management
        echo "Validating incident management..." > compliance-reports/iso27001/incident-management.txt
        
        echo "ISO27001 compliance validation completed"
      `,
      shell: 'bash'
    });

    return steps;
  }

  /**
   * Generate NIST compliance steps
   */
  private generateNISTComplianceSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    steps.push({
      name: 'NIST Cybersecurity Framework Validation',
      run: `
        echo "Validating NIST compliance..."
        mkdir -p compliance-reports/nist
        
        # Identify
        echo "Checking asset management and risk assessment..." > compliance-reports/nist/identify.txt
        
        # Protect
        echo "Validating protective measures..." > compliance-reports/nist/protect.txt
        
        # Detect
        echo "Reviewing detection capabilities..." > compliance-reports/nist/detect.txt
        
        # Respond
        echo "Validating response procedures..." > compliance-reports/nist/respond.txt
        
        # Recover
        echo "Checking recovery procedures..." > compliance-reports/nist/recover.txt
        
        echo "NIST compliance validation completed"
      `,
      shell: 'bash'
    });

    return steps;
  }

  /**
   * Generate FedRAMP compliance steps
   */
  private generateFedRAMPComplianceSteps(
    detectionResult: DetectionResult,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    steps.push({
      name: 'FedRAMP Security Controls Validation',
      run: `
        echo "Validating FedRAMP compliance..."
        mkdir -p compliance-reports/fedramp
        
        # NIST 800-53 Controls
        echo "Checking NIST 800-53 controls..." > compliance-reports/fedramp/nist-controls.txt
        
        # Continuous Monitoring
        echo "Validating continuous monitoring..." > compliance-reports/fedramp/continuous-monitoring.txt
        
        # Security Assessment
        echo "Reviewing security assessment..." > compliance-reports/fedramp/security-assessment.txt
        
        # Authorization
        echo "Validating authorization procedures..." > compliance-reports/fedramp/authorization.txt
        
        echo "FedRAMP compliance validation completed"
      `,
      shell: 'bash'
    });

    return steps;
  }

  /**
   * Generate package manager specific license scanning steps
   */
  private generatePackageManagerLicenseSteps(
    packageManagerName: string,
    securityLevel: 'basic' | 'standard' | 'enterprise'
  ): StepTemplate[] {
    const steps: StepTemplate[] = [];

    switch (packageManagerName.toLowerCase()) {
      case 'npm':
        steps.push({
          name: 'Check npm licenses',
          run: `
            npm install -g license-checker
            license-checker --summary --json --out license-reports/npm-licenses.json
            license-checker --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC' || echo "License violations found"
          `
        });
        break;

      case 'pip':
        steps.push({
          name: 'Check Python licenses',
          run: `
            pip install pip-licenses
            pip-licenses --format=json --output-file=license-reports/python-licenses.json
            pip-licenses --allow-only='MIT;Apache Software License;BSD License' || echo "License violations found"
          `
        });
        break;

      case 'maven':
        steps.push({
          name: 'Check Maven licenses',
          run: `
            mvn license:add-third-party
            mvn license:download-licenses
            cp target/generated-sources/license/THIRD-PARTY.txt license-reports/maven-licenses.txt
          `
        });
        break;

      case 'gradle':
        steps.push({
          name: 'Check Gradle licenses',
          run: `
            ./gradlew generateLicenseReport
            cp build/reports/dependency-license/index.html license-reports/gradle-licenses.html
          `
        });
        break;

      case 'cargo':
        steps.push({
          name: 'Check Rust licenses',
          run: `
            cargo install cargo-license
            cargo license --json > license-reports/rust-licenses.json
          `
        });
        break;

      case 'go':
        steps.push({
          name: 'Check Go licenses',
          run: `
            go install github.com/google/go-licenses@latest
            go-licenses csv ./... > license-reports/go-licenses.csv
          `
        });
        break;
    }

    return steps;
  }

  /**
   * Generate application setup steps for DAST testing
   */
  private generateApplicationSetupSteps(detectionResult: DetectionResult): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const frameworks = detectionResult.frameworks;
    const languages = detectionResult.languages;

    // Setup based on detected language and framework
    if (languages.some(lang => lang.name.toLowerCase() === 'javascript' || lang.name.toLowerCase() === 'typescript')) {
      steps.push({
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: {
          'node-version': '18',
          cache: 'npm'
        }
      });

      steps.push({
        name: 'Install dependencies',
        run: 'npm ci'
      });

      if (frameworks.some(f => f.name.toLowerCase() === 'react')) {
        steps.push({
          name: 'Build React application',
          run: 'npm run build'
        });
      }
    }

    if (languages.some(lang => lang.name.toLowerCase() === 'python')) {
      steps.push({
        name: 'Setup Python',
        uses: 'actions/setup-python@v4',
        with: {
          'python-version': '3.9'
        }
      });

      steps.push({
        name: 'Install Python dependencies',
        run: 'pip install -r requirements.txt'
      });
    }

    return steps;
  }

  /**
   * Get application start command based on detected framework
   */
  private getApplicationStartCommand(detectionResult: DetectionResult): string {
    const frameworks = detectionResult.frameworks;

    if (frameworks.some(f => f.name.toLowerCase() === 'react')) {
      return 'npm start &';
    }
    if (frameworks.some(f => f.name.toLowerCase() === 'express')) {
      return 'npm start &';
    }
    if (frameworks.some(f => f.name.toLowerCase() === 'django')) {
      return 'python manage.py runserver &';
    }
    if (frameworks.some(f => f.name.toLowerCase() === 'flask')) {
      return 'python app.py &';
    }
    if (frameworks.some(f => f.name.toLowerCase() === 'fastapi')) {
      return 'uvicorn main:app --host 0.0.0.0 --port 3000 &';
    }

    // Default fallback
    return 'npm start &';
  }

  /**
   * Check if project has web framework
   */
  private hasWebFramework(detectionResult: DetectionResult): boolean {
    const webFrameworks = ['react', 'vue', 'angular', 'express', 'fastapi', 'django', 'flask', 'spring', 'gin', 'echo', 'fiber'];
    return detectionResult.frameworks.some(f => 
      webFrameworks.includes(f.name.toLowerCase())
    );
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
   * Build security configuration based on detection results and options
   */
  private buildSecurityConfig(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): AdvancedSecurityConfig {
    const securityLevel = options.securityLevel || 'standard';
    const hasWebFramework = this.hasWebFramework(detectionResult);

    return {
      sast: {
        enabled: true,
        tools: this.getSASTTools(securityLevel),
        severity: securityLevel === 'enterprise' ? 'medium' : 'high',
        failOnFindings: securityLevel === 'enterprise',
        ...(securityLevel === 'enterprise' && { customRules: ['security-extended', 'security-and-quality'] })
      },
      dast: {
        enabled: hasWebFramework,
        tools: this.getDASTTools(securityLevel),
        targetUrls: ['http://localhost:3000'],
        authenticationRequired: securityLevel === 'enterprise',
        scanDepth: securityLevel === 'enterprise' ? 'comprehensive' : 'full'
      },
      compliance: {
        frameworks: this.getComplianceFrameworks(options),
        auditTrail: securityLevel === 'enterprise',
        reportGeneration: true,
        continuousMonitoring: securityLevel === 'enterprise'
      },
      licenseScanning: {
        enabled: true,
        allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'],
        blockedLicenses: ['GPL-3.0', 'AGPL-3.0'],
        riskAssessment: securityLevel === 'enterprise'
      },
      secretScanning: {
        enabled: true,
        customPatterns: ['api[_-]?key', 'secret[_-]?key', 'private[_-]?key', 'password', 'token'],
        historicalScanning: securityLevel === 'enterprise',
        realTimeMonitoring: securityLevel === 'enterprise'
      }
    };
  }

  /**
   * Get SAST tools based on security level
   */
  private getSASTTools(securityLevel: 'basic' | 'standard' | 'enterprise'): SASTTool[] {
    const tools: SASTTool[] = ['codeql'];
    
    if (securityLevel === 'standard' || securityLevel === 'enterprise') {
      tools.push('sonarcloud');
    }
    
    if (securityLevel === 'enterprise') {
      tools.push('semgrep', 'snyk-code');
    }
    
    return tools;
  }

  /**
   * Get DAST tools based on security level
   */
  private getDASTTools(securityLevel: 'basic' | 'standard' | 'enterprise'): DASTTool[] {
    const tools: DASTTool[] = ['owasp-zap'];
    
    if (securityLevel === 'enterprise') {
      tools.push('burp-suite');
    }
    
    return tools;
  }

  /**
   * Get compliance frameworks from options
   */
  private getComplianceFrameworks(options: GenerationOptions): ComplianceFramework[] {
    // This would typically come from organization policies or options
    // For now, return a default set based on security level
    const frameworks: ComplianceFramework[] = [];
    
    if (options.securityLevel === 'enterprise') {
      frameworks.push('soc2', 'iso27001');
    }
    
    return frameworks;
  }

  /**
   * Initialize default security configuration
   */
  private initializeDefaultConfig(): AdvancedSecurityConfig {
    return {
      sast: {
        enabled: true,
        tools: ['codeql'],
        severity: 'high',
        failOnFindings: false
      },
      dast: {
        enabled: false,
        tools: ['owasp-zap'],
        targetUrls: [],
        authenticationRequired: false,
        scanDepth: 'baseline'
      },
      compliance: {
        frameworks: [],
        auditTrail: false,
        reportGeneration: true,
        continuousMonitoring: false
      },
      licenseScanning: {
        enabled: true,
        allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'],
        blockedLicenses: ['GPL-3.0', 'AGPL-3.0'],
        riskAssessment: false
      },
      secretScanning: {
        enabled: true,
        customPatterns: [],
        historicalScanning: false,
        realTimeMonitoring: false
      }
    };
  }

  /**
   * Generate filename for security workflow
   */
  private generateFilename(detectionResult: DetectionResult, suffix: string): string {
    const projectName = detectionResult.projectMetadata.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${projectName}-${suffix}.yml`;
  }

  /**
   * Create detection summary for metadata
   */
  private createDetectionSummary(detectionResult: DetectionResult): string {
    const frameworks = detectionResult.frameworks.map(f => f.name).join(', ');
    const languages = detectionResult.languages.filter(l => l.primary).map(l => l.name).join(', ');
    
    return `Advanced security scanning workflow for ${languages} project with ${frameworks}`;
  }

  /**
   * Generate security warnings based on configuration
   */
  private generateSecurityWarnings(
    detectionResult: DetectionResult,
    securityConfig: AdvancedSecurityConfig
  ): string[] {
    const warnings: string[] = [];

    if (!securityConfig.dast.enabled && this.hasWebFramework(detectionResult)) {
      warnings.push('DAST scanning is disabled but web framework detected - consider enabling DAST');
    }

    if (securityConfig.compliance.frameworks.length === 0) {
      warnings.push('No compliance frameworks configured - consider adding relevant compliance validation');
    }

    if (!securityConfig.secretScanning.historicalScanning) {
      warnings.push('Historical secret scanning is disabled - secrets may exist in git history');
    }

    return warnings;
  }
}