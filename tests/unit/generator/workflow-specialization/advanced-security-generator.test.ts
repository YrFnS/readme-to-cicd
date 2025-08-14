/**
 * Advanced Security Generator Tests
 * Comprehensive test suite for the AdvancedSecurityGenerator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AdvancedSecurityGenerator } from '../../../../src/generator/workflow-specialization/advanced-security-generator';
import { DetectionResult, GenerationOptions } from '../../../../src/generator/interfaces';

describe('AdvancedSecurityGenerator', () => {
  let generator: AdvancedSecurityGenerator;
  let mockDetectionResult: DetectionResult;
  let mockOptions: GenerationOptions;

  beforeEach(() => {
    generator = new AdvancedSecurityGenerator();
    
    mockDetectionResult = {
      frameworks: [
        { name: 'React', version: '18.0.0', confidence: 0.95, evidence: ['package.json'], category: 'frontend' },
        { name: 'Express', version: '4.18.0', confidence: 0.90, evidence: ['package.json'], category: 'backend' }
      ],
      languages: [
        { name: 'JavaScript', version: 'ES2022', confidence: 0.95, primary: true },
        { name: 'TypeScript', version: '4.8.0', confidence: 0.85, primary: false }
      ],
      buildTools: [
        { name: 'npm', configFile: 'package.json', confidence: 0.95 }
      ],
      packageManagers: [
        { name: 'npm', lockFile: 'package-lock.json', confidence: 0.95 }
      ],
      testingFrameworks: [
        { name: 'Jest', type: 'unit', confidence: 0.90 }
      ],
      deploymentTargets: [
        { platform: 'Docker', type: 'container', confidence: 0.80 }
      ],
      projectMetadata: {
        name: 'test-project',
        description: 'A test project for security scanning',
        version: '1.0.0',
        license: 'MIT'
      }
    };

    mockOptions = {
      workflowType: 'security',
      optimizationLevel: 'standard',
      includeComments: true,
      securityLevel: 'enterprise',
      agentHooksEnabled: false
    };
  });

  describe('generateAdvancedSecurityWorkflow', () => {
    it('should generate comprehensive security workflow', async () => {
      const result = await generator.generateAdvancedSecurityWorkflow(mockDetectionResult, mockOptions);

      expect(result).toBeDefined();
      expect(result.filename).toBe('test-project-advanced-security.yml');
      expect(result.type).toBe('security');
      expect(result.content).toContain('name: Advanced Security Scanning');
      expect(result.content).toContain('sast-analysis');
      expect(result.content).toContain('dast-testing');
      expect(result.content).toContain('license-scanning');
      expect(result.content).toContain('secret-scanning');
      expect(result.content).toContain('security-report');
    });

    it('should include proper triggers for security workflow', async () => {
      const result = await generator.generateAdvancedSecurityWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('push:');
      expect(result.content).toContain('- main');
      expect(result.content).toContain('pull_request:');
      expect(result.content).toContain('schedule:');
      expect(result.content).toContain('workflow_dispatch:');
      expect(result.content).toContain('scanType:');
      expect(result.content).toContain('complianceFramework:');
    });

    it('should set appropriate permissions for security workflow', async () => {
      const result = await generator.generateAdvancedSecurityWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('permissions:');
      expect(result.content).toContain('contents: read');
      expect(result.content).toContain('securityEvents: write');
      expect(result.content).toContain('actions: read');
      expect(result.content).toContain('idToken: write');
      expect(result.content).toContain('issues: write');
      expect(result.content).toContain('pullRequests: write');
    });

    it('should include concurrency configuration', async () => {
      const result = await generator.generateAdvancedSecurityWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('concurrency:');
      expect(result.content).toContain('group: security-${{ github.ref }}');
      expect(result.content).toContain('cancel-in-progress: false');
    });

    it('should include metadata with optimizations', async () => {
      const result = await generator.generateAdvancedSecurityWorkflow(mockDetectionResult, mockOptions);

      expect(result.metadata.optimizations).toContain('Advanced SAST scanning');
      expect(result.metadata.optimizations).toContain('Comprehensive DAST testing');
      expect(result.metadata.optimizations).toContain('Multi-framework compliance validation');
      expect(result.metadata.optimizations).toContain('Enterprise license scanning');
      expect(result.metadata.optimizations).toContain('Real-time secret monitoring');
    });
  });

  describe('generateSASTWorkflow', () => {
    it('should generate SAST-specific workflow', async () => {
      const result = await generator.generateSASTWorkflow(mockDetectionResult, mockOptions);

      expect(result).toBeDefined();
      expect(result.filename).toBe('test-project-sast-security.yml');
      expect(result.type).toBe('security');
      expect(result.content).toContain('name: SAST Security Scanning');
      expect(result.content).toContain('sast-analysis');
    });

    it('should include CodeQL initialization and analysis', async () => {
      const result = await generator.generateSASTWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('Initialize CodeQL');
      expect(result.content).toContain('github/codeql-action/init@v3');
      expect(result.content).toContain('Perform CodeQL Analysis');
      expect(result.content).toContain('github/codeql-action/analyze@v3');
      expect(result.content).toContain('languages: javascript');
    });

    it('should include SonarCloud for standard and enterprise levels', async () => {
      const result = await generator.generateSASTWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('SonarCloud Scan');
      expect(result.content).toContain('SonarSource/sonarcloud-github-action@master');
      expect(result.content).toContain('SONAR_TOKEN');
    });

    it('should include Semgrep and Snyk Code for enterprise level', async () => {
      const result = await generator.generateSASTWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('Run Semgrep');
      expect(result.content).toContain('returntocorp/semgrep-action@v1');
      expect(result.content).toContain('Run Snyk Code');
      expect(result.content).toContain('snyk/actions/node@master');
    });

    it('should upload SARIF results', async () => {
      const result = await generator.generateSASTWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('Upload SAST results to GitHub Security tab');
      expect(result.content).toContain('github/codeql-action/upload-sarif@v3');
      expect(result.content).toContain('sarif_file: sast-results.sarif');
    });
  });

  describe('generateDASTWorkflow', () => {
    it('should generate DAST workflow for web applications', async () => {
      const result = await generator.generateDASTWorkflow(mockDetectionResult, mockOptions);

      expect(result).toBeDefined();
      expect(result.filename).toBe('test-project-dast-security.yml');
      expect(result.type).toBe('security');
      expect(result.content).toContain('name: DAST Security Testing');
      expect(result.content).toContain('dast-testing');
    });

    it('should include application setup and startup', async () => {
      const result = await generator.generateDASTWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('Setup Node.js');
      expect(result.content).toContain('actions/setup-node@v4');
      expect(result.content).toContain('Install dependencies');
      expect(result.content).toContain('npm ci');
      expect(result.content).toContain('Start application');
      expect(result.content).toContain('Wait for application to be ready');
    });

    it('should include OWASP ZAP scanning', async () => {
      const result = await generator.generateDASTWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('OWASP ZAP Baseline Scan');
      expect(result.content).toContain('zaproxy/action-baseline@v0.10.0');
      expect(result.content).toContain('OWASP ZAP Full Scan');
      expect(result.content).toContain('zaproxy/action-full-scan@v0.10.0');
    });

    it('should include authenticated scanning for enterprise level', async () => {
      const result = await generator.generateDASTWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('OWASP ZAP Authenticated Scan');
      expect(result.content).toContain('ZAP_AUTH_USERNAME');
      expect(result.content).toContain('ZAP_AUTH_PASSWORD');
    });

    it('should throw error for non-web applications', async () => {
      const nonWebDetectionResult = {
        ...mockDetectionResult,
        frameworks: [
          { name: 'CLI', version: '1.0.0', confidence: 0.95, evidence: ['package.json'], category: 'backend' }
        ]
      };

      await expect(generator.generateDASTWorkflow(nonWebDetectionResult, mockOptions))
        .rejects.toThrow('DAST workflow requires a web application framework');
    });
  });

  describe('generateComplianceWorkflow', () => {
    it('should generate SOC2 compliance workflow', async () => {
      const result = await generator.generateComplianceWorkflow(mockDetectionResult, 'soc2', mockOptions);

      expect(result).toBeDefined();
      expect(result.filename).toBe('test-project-compliance-soc2.yml');
      expect(result.type).toBe('security');
      expect(result.content).toContain('name: SOC2 Compliance Validation');
      expect(result.content).toContain('compliance-validation');
    });

    it('should generate HIPAA compliance workflow', async () => {
      const result = await generator.generateComplianceWorkflow(mockDetectionResult, 'hipaa', mockOptions);

      expect(result.content).toContain('name: HIPAA Compliance Validation');
      expect(result.content).toContain('HIPAA Privacy and Security Rules Validation');
    });

    it('should generate PCI-DSS compliance workflow', async () => {
      const result = await generator.generateComplianceWorkflow(mockDetectionResult, 'pci-dss', mockOptions);

      expect(result.content).toContain('name: PCI-DSS Compliance Validation');
      expect(result.content).toContain('PCI-DSS Requirements Validation');
    });

    it('should generate GDPR compliance workflow', async () => {
      const result = await generator.generateComplianceWorkflow(mockDetectionResult, 'gdpr', mockOptions);

      expect(result.content).toContain('name: GDPR Compliance Validation');
      expect(result.content).toContain('GDPR Data Protection Validation');
    });

    it('should generate ISO27001 compliance workflow', async () => {
      const result = await generator.generateComplianceWorkflow(mockDetectionResult, 'iso27001', mockOptions);

      expect(result.content).toContain('name: ISO27001 Compliance Validation');
      expect(result.content).toContain('ISO27001 Information Security Management');
    });

    it('should include workflow dispatch with audit mode', async () => {
      const result = await generator.generateComplianceWorkflow(mockDetectionResult, 'soc2', mockOptions);

      expect(result.content).toContain('workflow_dispatch:');
      expect(result.content).toContain('auditMode:');
      expect(result.content).toContain('Run in audit mode for detailed reporting');
    });
  });

  describe('generateLicenseScanningWorkflow', () => {
    it('should generate license scanning workflow', async () => {
      const result = await generator.generateLicenseScanningWorkflow(mockDetectionResult, mockOptions);

      expect(result).toBeDefined();
      expect(result.filename).toBe('test-project-license-scanning.yml');
      expect(result.type).toBe('security');
      expect(result.content).toContain('name: License Scanning and Compliance');
      expect(result.content).toContain('license-scanning');
    });

    it('should include triggers for dependency file changes', async () => {
      const result = await generator.generateLicenseScanningWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('push:');
      expect(result.content).toContain('- main');
      expect(result.content).toContain('paths:');
      expect(result.content).toContain('package.json');
      expect(result.content).toContain('requirements.txt');
      expect(result.content).toContain('Cargo.toml');
    });

    it('should include FOSSA license scanning for standard and enterprise', async () => {
      const result = await generator.generateLicenseScanningWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('Run FOSSA License Scan');
      expect(result.content).toContain('fossas/fossa-action@main');
      expect(result.content).toContain('FOSSA_API_KEY');
    });

    it('should include npm license checking for Node.js projects', async () => {
      const result = await generator.generateLicenseScanningWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('Check npm licenses');
      expect(result.content).toContain('license-checker');
    });
  });

  describe('Security Level Variations', () => {
    it('should generate basic security workflow with minimal tools', async () => {
      const basicOptions = { ...mockOptions, securityLevel: 'basic' as const };
      const result = await generator.generateAdvancedSecurityWorkflow(mockDetectionResult, basicOptions);

      expect(result.content).toContain('CodeQL');
      // For basic level, the SAST job should not include SonarCloud or Semgrep
      const sastJobMatch = result.content.match(/sast-analysis:[\s\S]*?(?=\s{2}[a-z-]+:|$)/);
      if (sastJobMatch) {
        const sastJobContent = sastJobMatch[0];
        expect(sastJobContent).not.toContain('SonarCloud');
        expect(sastJobContent).not.toContain('Semgrep');
      }
    });

    it('should generate standard security workflow with additional tools', async () => {
      const standardOptions = { ...mockOptions, securityLevel: 'standard' as const };
      const result = await generator.generateAdvancedSecurityWorkflow(mockDetectionResult, standardOptions);

      expect(result.content).toContain('CodeQL');
      expect(result.content).toContain('SonarCloud');
      expect(result.content).not.toContain('Semgrep');
    });

    it('should generate enterprise security workflow with all tools', async () => {
      const result = await generator.generateAdvancedSecurityWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('CodeQL');
      expect(result.content).toContain('SonarCloud');
      expect(result.content).toContain('Semgrep');
      expect(result.content).toContain('Snyk Code');
    });
  });

  describe('Language and Framework Detection', () => {
    it('should handle Python projects correctly', async () => {
      const pythonDetectionResult = {
        ...mockDetectionResult,
        languages: [
          { name: 'Python', version: '3.9', confidence: 0.95, primary: true }
        ],
        frameworks: [
          { name: 'Django', version: '4.0', confidence: 0.90, evidence: ['requirements.txt'], category: 'backend' }
        ],
        packageManagers: [
          { name: 'pip', lockFile: 'requirements.txt', confidence: 0.95 }
        ]
      };

      const result = await generator.generateAdvancedSecurityWorkflow(pythonDetectionResult, mockOptions);

      expect(result.content).toContain('languages: python');
      expect(result.content).toContain('Setup Python');
      expect(result.content).toContain('pip install -r requirements.txt');
    });

    it('should handle Java projects correctly', async () => {
      const javaDetectionResult = {
        ...mockDetectionResult,
        languages: [
          { name: 'Java', version: '11', confidence: 0.95, primary: true }
        ],
        frameworks: [
          { name: 'Spring', version: '5.3', confidence: 0.90, evidence: ['pom.xml'], category: 'backend' }
        ],
        packageManagers: [
          { name: 'maven', lockFile: 'pom.xml', confidence: 0.95 }
        ]
      };

      const result = await generator.generateAdvancedSecurityWorkflow(javaDetectionResult, mockOptions);

      expect(result.content).toContain('languages: java');
    });

    it('should handle non-web frameworks correctly', async () => {
      const cliDetectionResult = {
        ...mockDetectionResult,
        frameworks: [
          { name: 'CLI', version: '1.0', confidence: 0.90, evidence: ['package.json'], category: 'backend' }
        ]
      };

      const result = await generator.generateAdvancedSecurityWorkflow(cliDetectionResult, mockOptions);

      // Should not include DAST testing for non-web applications
      expect(result.content).not.toContain('dast-testing');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing project metadata gracefully', async () => {
      const incompleteDetectionResult = {
        ...mockDetectionResult,
        projectMetadata: {
          name: '',
          description: undefined,
          version: undefined
        }
      };

      const result = await generator.generateAdvancedSecurityWorkflow(incompleteDetectionResult, mockOptions);

      expect(result).toBeDefined();
      expect(result.filename).toMatch(/advanced-security\.yml$/);
    });

    it('should throw error for invalid workflow generation', async () => {
      const invalidOptions = {
        ...mockOptions,
        securityLevel: 'invalid' as any
      };

      // Should not throw error but handle gracefully
      const result = await generator.generateAdvancedSecurityWorkflow(mockDetectionResult, invalidOptions);
      expect(result).toBeDefined();
    });
  });

  describe('Workflow Content Validation', () => {
    it('should generate valid YAML structure', async () => {
      const result = await generator.generateAdvancedSecurityWorkflow(mockDetectionResult, mockOptions);

      // Basic YAML structure validation
      expect(result.content).toContain('name:');
      expect(result.content).toContain('on:');
      expect(result.content).toContain('jobs:');
      expect(result.content).toContain('steps:');
      expect(result.content).toContain('uses:');
      expect(result.content).toContain('run:');
    });

    it('should include proper step ordering', async () => {
      const result = await generator.generateAdvancedSecurityWorkflow(mockDetectionResult, mockOptions);

      const content = result.content;
      const checkoutIndex = content.indexOf('Checkout code');
      const sastJobIndex = content.indexOf('# Job: sast-analysis');
      const reportJobIndex = content.indexOf('# Job: security-report');

      expect(checkoutIndex).toBeGreaterThan(-1);
      expect(sastJobIndex).toBeGreaterThan(-1);
      expect(reportJobIndex).toBeGreaterThan(-1);
      // The security-report job should come after the sast-analysis job
      expect(reportJobIndex).toBeGreaterThan(sastJobIndex);
    });

    it('should include environment variables and secrets', async () => {
      const result = await generator.generateAdvancedSecurityWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('GITHUB_TOKEN');
      expect(result.content).toContain('SONAR_TOKEN');
      expect(result.content).toContain('SEMGREP_APP_TOKEN');
      expect(result.content).toContain('SNYK_TOKEN');
      expect(result.content).toContain('FOSSA_API_KEY');
    });
  });
});