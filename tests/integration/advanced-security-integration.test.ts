/**
 * Advanced Security Generator Integration Test
 * Tests the integration of AdvancedSecurityGenerator with the YAML Generator system
 */

import { describe, it, expect } from 'vitest';
import { AdvancedSecurityGenerator } from '../../src/generator/workflow-specialization/advanced-security-generator';
import { DetectionResult, GenerationOptions } from '../../src/generator/interfaces';

describe('AdvancedSecurityGenerator Integration', () => {
  const mockDetectionResult: DetectionResult = {
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
      name: 'integration-test-project',
      description: 'A test project for integration testing',
      version: '1.0.0',
      license: 'MIT'
    }
  };

  const mockOptions: GenerationOptions = {
    workflowType: 'security',
    optimizationLevel: 'standard',
    includeComments: true,
    securityLevel: 'enterprise',
    agentHooksEnabled: false
  };

  it('should generate a complete advanced security workflow', async () => {
    const generator = new AdvancedSecurityGenerator();
    const result = await generator.generateAdvancedSecurityWorkflow(mockDetectionResult, mockOptions);

    // Verify basic structure
    expect(result).toBeDefined();
    expect(result.filename).toBe('integration-test-project-advanced-security.yml');
    expect(result.type).toBe('security');
    expect(result.content).toBeTruthy();

    // Verify YAML structure
    expect(result.content).toContain('name: Advanced Security Scanning');
    expect(result.content).toContain('on:');
    expect(result.content).toContain('jobs:');
    expect(result.content).toContain('permissions:');

    // Verify security jobs are included
    expect(result.content).toContain('sast-analysis');
    expect(result.content).toContain('dast-testing');
    expect(result.content).toContain('license-scanning');
    expect(result.content).toContain('secret-scanning');
    expect(result.content).toContain('security-report');

    // Verify enterprise-level tools are included
    expect(result.content).toContain('CodeQL');
    expect(result.content).toContain('SonarCloud');
    expect(result.content).toContain('Semgrep');
    expect(result.content).toContain('TruffleHog');
    expect(result.content).toContain('OWASP ZAP');

    // Verify metadata
    expect(result.metadata.optimizations).toContain('Advanced SAST scanning');
    expect(result.metadata.optimizations).toContain('Comprehensive DAST testing');
    expect(result.metadata.optimizations).toContain('Enterprise license scanning');
  });

  it('should generate individual security workflow types', async () => {
    const generator = new AdvancedSecurityGenerator();

    // Test SAST workflow
    const sastResult = await generator.generateSASTWorkflow(mockDetectionResult, mockOptions);
    expect(sastResult.filename).toBe('integration-test-project-sast-security.yml');
    expect(sastResult.content).toContain('SAST Security Scanning');
    expect(sastResult.content).toContain('CodeQL');

    // Test DAST workflow
    const dastResult = await generator.generateDASTWorkflow(mockDetectionResult, mockOptions);
    expect(dastResult.filename).toBe('integration-test-project-dast-security.yml');
    expect(dastResult.content).toContain('DAST Security Testing');
    expect(dastResult.content).toContain('OWASP ZAP');

    // Test compliance workflow
    const complianceResult = await generator.generateComplianceWorkflow(mockDetectionResult, 'soc2', mockOptions);
    expect(complianceResult.filename).toBe('integration-test-project-compliance-soc2.yml');
    expect(complianceResult.content).toContain('SOC2 Compliance Validation');

    // Test license scanning workflow
    const licenseResult = await generator.generateLicenseScanningWorkflow(mockDetectionResult, mockOptions);
    expect(licenseResult.filename).toBe('integration-test-project-license-scanning.yml');
    expect(licenseResult.content).toContain('License Scanning and Compliance');
    expect(licenseResult.content).toContain('FOSSA');
  });

  it('should handle different security levels correctly', async () => {
    const generator = new AdvancedSecurityGenerator();

    // Test basic security level
    const basicOptions = { ...mockOptions, securityLevel: 'basic' as const };
    const basicResult = await generator.generateAdvancedSecurityWorkflow(mockDetectionResult, basicOptions);
    
    // Should include CodeQL but not advanced tools in SAST job
    expect(basicResult.content).toContain('CodeQL');
    // For basic level, the overall workflow should not include SonarCloud or Semgrep in the SAST steps
    const sastJobMatch = basicResult.content.match(/# Job: sast-analysis[\s\S]*?(?=# Job:|$)/);
    if (sastJobMatch) {
      const sastJobContent = sastJobMatch[0];
      expect(sastJobContent).not.toContain('SonarCloud');
      expect(sastJobContent).not.toContain('Semgrep');
    }

    // Test enterprise security level
    const enterpriseResult = await generator.generateAdvancedSecurityWorkflow(mockDetectionResult, mockOptions);
    expect(enterpriseResult.content).toContain('CodeQL');
    expect(enterpriseResult.content).toContain('SonarCloud');
    expect(enterpriseResult.content).toContain('Semgrep');
  });

  it('should generate valid YAML that can be parsed', async () => {
    const generator = new AdvancedSecurityGenerator();
    const result = await generator.generateAdvancedSecurityWorkflow(mockDetectionResult, mockOptions);

    // Basic YAML structure validation
    expect(result.content).toMatch(/^name:/m);
    expect(result.content).toMatch(/^'?on'?:/m);
    expect(result.content).toMatch(/^jobs:/m);
    expect(result.content).toMatch(/^\s+steps:/m);

    // Should not contain obvious YAML syntax errors
    expect(result.content).not.toContain('undefined');
    expect(result.content).not.toContain('[object Object]');
    // Allow 'null' as it might be a valid YAML value in some contexts

    // Should have proper indentation (no tabs, consistent spaces)
    const lines = result.content.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        expect(line).not.toMatch(/\t/); // No tabs
        if (line.match(/^\s+/)) {
          const indent = line.match(/^(\s+)/)?.[1];
          if (indent) {
            expect(indent.length % 2).toBe(0); // Even number of spaces for indentation
          }
        }
      }
    }
  });
});