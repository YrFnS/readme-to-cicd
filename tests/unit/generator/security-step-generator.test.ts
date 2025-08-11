/**
 * Tests for SecurityStepGenerator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityStepGenerator } from '../../../src/generator/templates/security-step-generator';
import { DetectionResult, GenerationOptions } from '../../../src/generator/interfaces';

describe('SecurityStepGenerator', () => {
  let generator: SecurityStepGenerator;
  let mockDetectionResult: DetectionResult;

  beforeEach(() => {
    generator = new SecurityStepGenerator();
    
    mockDetectionResult = {
      frameworks: [
        { name: 'react', version: '18.0.0', confidence: 0.9, evidence: ['package.json'], category: 'frontend' },
        { name: 'express', version: '4.18.0', confidence: 0.8, evidence: ['package.json'], category: 'backend' }
      ],
      languages: [
        { name: 'javascript', version: 'ES2022', confidence: 0.9, primary: true },
        { name: 'typescript', version: '4.8.0', confidence: 0.8, primary: false }
      ],
      buildTools: [
        { name: 'webpack', configFile: 'webpack.config.js', confidence: 0.8 },
        { name: 'docker', configFile: 'Dockerfile', confidence: 0.9 }
      ],
      packageManagers: [
        { name: 'npm', lockFile: 'package-lock.json', confidence: 0.9 }
      ],
      testingFrameworks: [
        { name: 'jest', type: 'unit', confidence: 0.8 }
      ],
      deploymentTargets: [
        { platform: 'vercel', type: 'static', confidence: 0.7 }
      ],
      projectMetadata: {
        name: 'test-project',
        description: 'A test project',
        version: '1.0.0'
      }
    };
  });

  describe('generateSecurityScanTemplate', () => {
    it('should generate comprehensive security scan template', () => {
      const options: GenerationOptions = {
        workflowType: 'ci',
        securityLevel: 'standard',
        optimizationLevel: 'standard',
        includeComments: true
      };

      const template = generator.generateSecurityScanTemplate(mockDetectionResult, options);

      expect(template).toHaveProperty('sast');
      expect(template).toHaveProperty('dast');
      expect(template).toHaveProperty('dependencyScanning');
      expect(template).toHaveProperty('containerScanning');
      expect(template).toHaveProperty('complianceChecks');
      expect(template).toHaveProperty('licenseScanning');
      
      expect(Array.isArray(template.sast)).toBe(true);
      expect(Array.isArray(template.dast)).toBe(true);
      expect(Array.isArray(template.dependencyScanning)).toBe(true);
      expect(Array.isArray(template.containerScanning)).toBe(true);
      expect(Array.isArray(template.complianceChecks)).toBe(true);
      expect(Array.isArray(template.licenseScanning)).toBe(true);
    });

    it('should adapt security level based on options', () => {
      const basicOptions: GenerationOptions = {
        workflowType: 'ci',
        securityLevel: 'basic',
        optimizationLevel: 'basic',
        includeComments: true
      };

      const enterpriseOptions: GenerationOptions = {
        workflowType: 'ci',
        securityLevel: 'enterprise',
        optimizationLevel: 'aggressive',
        includeComments: true
      };

      const basicTemplate = generator.generateSecurityScanTemplate(mockDetectionResult, basicOptions);
      const enterpriseTemplate = generator.generateSecurityScanTemplate(mockDetectionResult, enterpriseOptions);

      // Enterprise should have more security steps than basic
      expect(enterpriseTemplate.sast.length).toBeGreaterThanOrEqual(basicTemplate.sast.length);
      expect(enterpriseTemplate.dependencyScanning.length).toBeGreaterThanOrEqual(basicTemplate.dependencyScanning.length);
    });
  });

  describe('generateDependencyScanningSteps', () => {
    it('should include Dependabot for all security levels', () => {
      const steps = generator.generateDependencyScanningSteps(mockDetectionResult, 'basic');
      
      const dependabotStep = steps.find(step => step.name.includes('Dependabot'));
      expect(dependabotStep).toBeDefined();
      expect(dependabotStep?.uses).toBe('github/dependabot-action@v1');
    });

    it('should include Snyk for standard and enterprise levels', () => {
      const basicSteps = generator.generateDependencyScanningSteps(mockDetectionResult, 'basic');
      const standardSteps = generator.generateDependencyScanningSteps(mockDetectionResult, 'standard');
      
      const basicSnyk = basicSteps.find(step => step.name.includes('Snyk'));
      const standardSnyk = standardSteps.find(step => step.name.includes('Snyk'));
      
      expect(basicSnyk).toBeUndefined();
      expect(standardSnyk).toBeDefined();
      expect(standardSnyk?.uses).toBe('snyk/actions/node@master');
    });

    it('should include framework-specific dependency checks', () => {
      const steps = generator.generateDependencyScanningSteps(mockDetectionResult, 'standard');
      
      const npmAuditStep = steps.find(step => step.run?.includes('npm audit'));
      expect(npmAuditStep).toBeDefined();
    });
  });

  describe('generateSASTSteps', () => {
    it('should include CodeQL analysis for all levels', () => {
      const steps = generator.generateSASTSteps(mockDetectionResult, 'basic');
      
      const codeqlInit = steps.find(step => step.name.includes('Initialize CodeQL'));
      const codeqlAnalyze = steps.find(step => step.name.includes('Perform CodeQL Analysis'));
      
      expect(codeqlInit).toBeDefined();
      expect(codeqlAnalyze).toBeDefined();
      expect(codeqlInit?.uses).toBe('github/codeql-action/init@v3');
      expect(codeqlAnalyze?.uses).toBe('github/codeql-action/analyze@v3');
    });

    it('should include SonarCloud for standard and enterprise levels', () => {
      const basicSteps = generator.generateSASTSteps(mockDetectionResult, 'basic');
      const standardSteps = generator.generateSASTSteps(mockDetectionResult, 'standard');
      
      const basicSonar = basicSteps.find(step => step.name.includes('SonarCloud'));
      const standardSonar = standardSteps.find(step => step.name.includes('SonarCloud'));
      
      expect(basicSonar).toBeUndefined();
      expect(standardSonar).toBeDefined();
    });

    it('should include Semgrep for enterprise level', () => {
      const standardSteps = generator.generateSASTSteps(mockDetectionResult, 'standard');
      const enterpriseSteps = generator.generateSASTSteps(mockDetectionResult, 'enterprise');
      
      const standardSemgrep = standardSteps.find(step => step.name.includes('Semgrep'));
      const enterpriseSemgrep = enterpriseSteps.find(step => step.name.includes('Semgrep'));
      
      expect(standardSemgrep).toBeUndefined();
      expect(enterpriseSemgrep).toBeDefined();
      expect(enterpriseSemgrep?.uses).toBe('returntocorp/semgrep-action@v1');
    });
  });  describe(
'generateDASTSteps', () => {
    it('should generate DAST steps for web frameworks', () => {
      const steps = generator.generateDASTSteps(mockDetectionResult, 'standard');
      
      expect(steps.length).toBeGreaterThan(0);
      
      const zapBaseline = steps.find(step => step.name.includes('OWASP ZAP Baseline'));
      expect(zapBaseline).toBeDefined();
      expect(zapBaseline?.uses).toBe('zaproxy/action-baseline@v0.10.0');
    });

    it('should not generate DAST steps for non-web frameworks', () => {
      const nonWebDetection: DetectionResult = {
        ...mockDetectionResult,
        frameworks: [
          { name: 'numpy', version: '1.21.0', confidence: 0.9, evidence: ['requirements.txt'], category: 'backend' }
        ]
      };

      const steps = generator.generateDASTSteps(nonWebDetection, 'standard');
      expect(steps.length).toBe(0);
    });

    it('should include full ZAP scan for standard and enterprise levels', () => {
      const basicSteps = generator.generateDASTSteps(mockDetectionResult, 'basic');
      const standardSteps = generator.generateDASTSteps(mockDetectionResult, 'standard');
      
      const basicFullScan = basicSteps.find(step => step.name.includes('Full Scan'));
      const standardFullScan = standardSteps.find(step => step.name.includes('Full Scan'));
      
      expect(basicFullScan).toBeUndefined();
      expect(standardFullScan).toBeDefined();
    });
  });

  describe('generateContainerScanningSteps', () => {
    it('should generate container scanning steps when Docker is detected', () => {
      const steps = generator.generateContainerScanningSteps(mockDetectionResult, 'standard');
      
      expect(steps.length).toBeGreaterThan(0);
      
      const trivyStep = steps.find(step => step.name.includes('Trivy'));
      expect(trivyStep).toBeDefined();
      expect(trivyStep?.uses).toBe('aquasecurity/trivy-action@master');
    });

    it('should not generate container scanning steps when Docker is not detected', () => {
      const nonDockerDetection: DetectionResult = {
        ...mockDetectionResult,
        buildTools: [
          { name: 'webpack', configFile: 'webpack.config.js', confidence: 0.8 }
        ]
      };

      const steps = generator.generateContainerScanningSteps(nonDockerDetection, 'standard');
      expect(steps.length).toBe(0);
    });

    it('should include Snyk container scanning for standard and enterprise levels', () => {
      const basicSteps = generator.generateContainerScanningSteps(mockDetectionResult, 'basic');
      const standardSteps = generator.generateContainerScanningSteps(mockDetectionResult, 'standard');
      
      const basicSnyk = basicSteps.find(step => step.name.includes('Snyk') && step.uses?.includes('docker'));
      const standardSnyk = standardSteps.find(step => step.name.includes('Snyk') && step.uses?.includes('docker'));
      
      expect(basicSnyk).toBeUndefined();
      expect(standardSnyk).toBeDefined();
    });
  });

  describe('generateSecretScanningSteps', () => {
    it('should include TruffleHog for all security levels', () => {
      const steps = generator.generateSecretScanningSteps(mockDetectionResult, 'basic');
      
      const truffleHogStep = steps.find(step => step.name.includes('TruffleHog'));
      expect(truffleHogStep).toBeDefined();
      expect(truffleHogStep?.uses).toBe('trufflesecurity/trufflehog@main');
    });

    it('should include GitLeaks for standard and enterprise levels', () => {
      const basicSteps = generator.generateSecretScanningSteps(mockDetectionResult, 'basic');
      const standardSteps = generator.generateSecretScanningSteps(mockDetectionResult, 'standard');
      
      const basicGitLeaks = basicSteps.find(step => step.name.includes('GitLeaks'));
      const standardGitLeaks = standardSteps.find(step => step.name.includes('GitLeaks'));
      
      expect(basicGitLeaks).toBeUndefined();
      expect(standardGitLeaks).toBeDefined();
      expect(standardGitLeaks?.uses).toBe('gitleaks/gitleaks-action@v2');
    });
  });

  describe('generateComplianceSteps', () => {
    it('should generate compliance steps only for enterprise level', () => {
      const basicSteps = generator.generateComplianceSteps(mockDetectionResult, 'basic');
      const standardSteps = generator.generateComplianceSteps(mockDetectionResult, 'standard');
      const enterpriseSteps = generator.generateComplianceSteps(mockDetectionResult, 'enterprise');
      
      expect(basicSteps.length).toBe(0);
      expect(standardSteps.length).toBe(0);
      expect(enterpriseSteps.length).toBeGreaterThan(0);
    });

    it('should include SOC2, HIPAA, and PCI-DSS compliance checks for enterprise', () => {
      const steps = generator.generateComplianceSteps(mockDetectionResult, 'enterprise');
      
      const soc2Step = steps.find(step => step.name.includes('SOC2'));
      const hipaaStep = steps.find(step => step.name.includes('HIPAA'));
      const pciStep = steps.find(step => step.name.includes('PCI-DSS'));
      
      expect(soc2Step).toBeDefined();
      expect(hipaaStep).toBeDefined();
      expect(pciStep).toBeDefined();
    });
  });

  describe('generateLicenseScanningSteps', () => {
    it('should include FOSSA for standard and enterprise levels', () => {
      const basicSteps = generator.generateLicenseScanningSteps(mockDetectionResult, 'basic');
      const standardSteps = generator.generateLicenseScanningSteps(mockDetectionResult, 'standard');
      
      const basicFossa = basicSteps.find(step => step.name.includes('FOSSA'));
      const standardFossa = standardSteps.find(step => step.name.includes('FOSSA'));
      
      expect(basicFossa).toBeUndefined();
      expect(standardFossa).toBeDefined();
      expect(standardFossa?.uses).toBe('fossas/fossa-action@main');
    });

    it('should include package manager specific license checks', () => {
      const steps = generator.generateLicenseScanningSteps(mockDetectionResult, 'standard');
      
      const npmLicenseStep = steps.find(step => step.run?.includes('license-checker'));
      expect(npmLicenseStep).toBeDefined();
    });

    it('should include Python license checks when pip is detected', () => {
      const pythonDetection: DetectionResult = {
        ...mockDetectionResult,
        packageManagers: [
          { name: 'pip', lockFile: 'requirements.txt', confidence: 0.9 }
        ]
      };

      const steps = generator.generateLicenseScanningSteps(pythonDetection, 'standard');
      
      const pipLicenseStep = steps.find(step => step.run?.includes('pip-licenses'));
      expect(pipLicenseStep).toBeDefined();
    });
  });  describe(
'generateCodeQualitySteps', () => {
    it('should generate language-specific quality steps', () => {
      const steps = generator.generateCodeQualitySteps(mockDetectionResult, 'standard');
      
      expect(steps.length).toBeGreaterThan(0);
      
      // Should include JavaScript/TypeScript quality checks
      const eslintStep = steps.find(step => step.run?.includes('npm run lint'));
      const prettierStep = steps.find(step => step.run?.includes('format:check'));
      
      expect(eslintStep).toBeDefined();
      expect(prettierStep).toBeDefined();
    });

    it('should include CodeClimate for standard and enterprise levels', () => {
      const basicSteps = generator.generateCodeQualitySteps(mockDetectionResult, 'basic');
      const standardSteps = generator.generateCodeQualitySteps(mockDetectionResult, 'standard');
      
      const basicCodeClimate = basicSteps.find(step => step.name.includes('CodeClimate'));
      const standardCodeClimate = standardSteps.find(step => step.name.includes('CodeClimate'));
      
      expect(basicCodeClimate).toBeUndefined();
      expect(standardCodeClimate).toBeDefined();
      expect(standardCodeClimate?.uses).toBe('paambaati/codeclimate-action@v5.0.0');
    });

    it('should generate Python quality steps for Python projects', () => {
      const pythonDetection: DetectionResult = {
        ...mockDetectionResult,
        languages: [
          { name: 'python', version: '3.9', confidence: 0.9, primary: true }
        ]
      };

      const steps = generator.generateCodeQualitySteps(pythonDetection, 'standard');
      
      const flake8Step = steps.find(step => step.run?.includes('flake8'));
      const blackStep = steps.find(step => step.run?.includes('black'));
      const mypyStep = steps.find(step => step.run?.includes('mypy'));
      
      expect(flake8Step).toBeDefined();
      expect(blackStep).toBeDefined();
      expect(mypyStep).toBeDefined();
    });

    it('should generate Go quality steps for Go projects', () => {
      const goDetection: DetectionResult = {
        ...mockDetectionResult,
        languages: [
          { name: 'go', version: '1.19', confidence: 0.9, primary: true }
        ]
      };

      const steps = generator.generateCodeQualitySteps(goDetection, 'standard');
      
      const gofmtStep = steps.find(step => step.run?.includes('gofmt'));
      const govetStep = steps.find(step => step.run?.includes('go vet'));
      const golangciStep = steps.find(step => step.uses?.includes('golangci-lint-action'));
      
      expect(gofmtStep).toBeDefined();
      expect(govetStep).toBeDefined();
      expect(golangciStep).toBeDefined();
    });
  });

  describe('generateSecurityJob', () => {
    it('should generate complete security job with all steps', () => {
      const options: GenerationOptions = {
        workflowType: 'ci',
        securityLevel: 'standard',
        optimizationLevel: 'standard',
        includeComments: true
      };

      const steps = generator.generateSecurityJob(mockDetectionResult, options);
      
      expect(steps.length).toBeGreaterThan(0);
      
      // Should start with checkout
      expect(steps[0].name).toBe('Checkout code');
      expect(steps[0].uses).toBe('actions/checkout@v4');
      
      // Should end with upload results
      const lastStep = steps[steps.length - 1];
      expect(lastStep.name).toBe('Upload security scan results');
      expect(lastStep.uses).toBe('github/codeql-action/upload-sarif@v3');
    });

    it('should include full history checkout for better analysis', () => {
      const steps = generator.generateSecurityJob(mockDetectionResult);
      
      const checkoutStep = steps.find(step => step.uses === 'actions/checkout@v4');
      expect(checkoutStep?.with?.['fetch-depth']).toBe(0);
    });
  });

  describe('Framework-specific security requirements', () => {
    it('should handle Node.js framework security requirements', () => {
      const nodeDetection: DetectionResult = {
        ...mockDetectionResult,
        frameworks: [
          { name: 'nodejs', version: '18.0.0', confidence: 0.9, evidence: ['package.json'], category: 'backend' }
        ]
      };

      const template = generator.generateSecurityScanTemplate(nodeDetection);
      
      expect(template.dependencyScanning.length).toBeGreaterThan(0);
      expect(template.sast.length).toBeGreaterThan(0);
      
      // Should include npm audit
      const npmAuditStep = template.dependencyScanning.find(step => step.run?.includes('npm audit'));
      expect(npmAuditStep).toBeDefined();
    });

    it('should handle Python framework security requirements', () => {
      const pythonDetection: DetectionResult = {
        ...mockDetectionResult,
        frameworks: [
          { name: 'python', version: '3.9', confidence: 0.9, evidence: ['requirements.txt'], category: 'backend' }
        ],
        languages: [
          { name: 'python', version: '3.9', confidence: 0.9, primary: true }
        ]
      };

      const template = generator.generateSecurityScanTemplate(pythonDetection);
      
      expect(template.dependencyScanning.length).toBeGreaterThan(0);
      expect(template.sast.length).toBeGreaterThan(0);
      
      // Should include safety check
      const safetyStep = template.dependencyScanning.find(step => step.run?.includes('safety check'));
      expect(safetyStep).toBeDefined();
    });

    it('should handle Java framework security requirements', () => {
      const javaDetection: DetectionResult = {
        ...mockDetectionResult,
        frameworks: [
          { name: 'spring', version: '2.7.0', confidence: 0.9, evidence: ['pom.xml'], category: 'backend' }
        ],
        languages: [
          { name: 'java', version: '17', confidence: 0.9, primary: true }
        ]
      };

      const template = generator.generateSecurityScanTemplate(javaDetection);
      
      expect(template.dependencyScanning.length).toBeGreaterThan(0);
      
      // Should include OWASP dependency check
      const owaspStep = template.dependencyScanning.find(step => step.run?.includes('dependency-check-maven'));
      expect(owaspStep).toBeDefined();
    });
  });

  describe('Security level adaptation', () => {
    it('should provide minimal security for basic level', () => {
      const basicTemplate = generator.generateSecurityScanTemplate(mockDetectionResult, {
        workflowType: 'ci',
        securityLevel: 'basic',
        optimizationLevel: 'basic',
        includeComments: true
      });

      // Basic should have essential security checks
      expect(basicTemplate.dependencyScanning.length).toBeGreaterThan(0);
      expect(basicTemplate.sast.length).toBeGreaterThan(0);
      expect(basicTemplate.complianceChecks.length).toBe(0); // No compliance for basic
    });

    it('should provide comprehensive security for enterprise level', () => {
      const enterpriseTemplate = generator.generateSecurityScanTemplate(mockDetectionResult, {
        workflowType: 'ci',
        securityLevel: 'enterprise',
        optimizationLevel: 'aggressive',
        includeComments: true
      });

      // Enterprise should have all security checks
      expect(enterpriseTemplate.dependencyScanning.length).toBeGreaterThan(0);
      expect(enterpriseTemplate.sast.length).toBeGreaterThan(0);
      expect(enterpriseTemplate.complianceChecks.length).toBeGreaterThan(0);
      expect(enterpriseTemplate.licenseScanning.length).toBeGreaterThan(0);
    });
  });
});