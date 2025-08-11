/**
 * Integration tests for SecurityStepGenerator across different frameworks
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityStepGenerator } from '../../../src/generator/templates/security-step-generator';
import { DetectionResult, GenerationOptions } from '../../../src/generator/interfaces';

describe('SecurityStepGenerator Integration Tests', () => {
  let generator: SecurityStepGenerator;

  beforeEach(() => {
    generator = new SecurityStepGenerator();
  });

  describe('Multi-framework projects', () => {
    it('should handle React + Express full-stack application', () => {
      const fullStackDetection: DetectionResult = {
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
          { name: 'jest', type: 'unit', confidence: 0.8 },
          { name: 'cypress', type: 'e2e', confidence: 0.7 }
        ],
        deploymentTargets: [
          { platform: 'docker', type: 'container', confidence: 0.9 }
        ],
        projectMetadata: {
          name: 'fullstack-app',
          description: 'Full-stack React + Express application'
        }
      };

      const options: GenerationOptions = {
        workflowType: 'ci',
        securityLevel: 'enterprise',
        optimizationLevel: 'aggressive',
        includeComments: true
      };

      const template = generator.generateSecurityScanTemplate(fullStackDetection, options);

      // Should include comprehensive security for full-stack app
      expect(template.dependencyScanning.length).toBeGreaterThan(0);
      expect(template.sast.length).toBeGreaterThan(0);
      expect(template.dast.length).toBeGreaterThan(0); // Web framework detected
      expect(template.containerScanning.length).toBeGreaterThan(0); // Docker detected
      expect(template.complianceChecks.length).toBeGreaterThan(0); // Enterprise level
      expect(template.licenseScanning.length).toBeGreaterThan(0);

      // Verify specific security tools are included
      const dependabotStep = template.dependencyScanning.find(step => step.name.includes('Dependabot'));
      const codeqlStep = template.sast.find(step => step.name.includes('CodeQL'));
      const zapStep = template.dast.find(step => step.name.includes('OWASP ZAP'));
      const trivyStep = template.containerScanning.find(step => step.name.includes('Trivy'));

      expect(dependabotStep).toBeDefined();
      expect(codeqlStep).toBeDefined();
      expect(zapStep).toBeDefined();
      expect(trivyStep).toBeDefined();
    });

    it('should handle Python Django + PostgreSQL application', () => {
      const djangoDetection: DetectionResult = {
        frameworks: [
          { name: 'django', version: '4.1.0', confidence: 0.9, evidence: ['requirements.txt'], category: 'backend' }
        ],
        languages: [
          { name: 'python', version: '3.10', confidence: 0.9, primary: true }
        ],
        buildTools: [
          { name: 'docker', configFile: 'Dockerfile', confidence: 0.8 }
        ],
        packageManagers: [
          { name: 'pip', lockFile: 'requirements.txt', confidence: 0.9 }
        ],
        testingFrameworks: [
          { name: 'pytest', type: 'unit', confidence: 0.8 }
        ],
        deploymentTargets: [
          { platform: 'heroku', type: 'traditional', confidence: 0.7 }
        ],
        projectMetadata: {
          name: 'django-app',
          description: 'Django web application'
        }
      };

      const template = generator.generateSecurityScanTemplate(djangoDetection, {
        workflowType: 'ci',
        securityLevel: 'standard',
        optimizationLevel: 'standard',
        includeComments: true
      });

      // Should include Python-specific security checks
      const safetyStep = template.dependencyScanning.find(step => step.run?.includes('safety check'));
      const banditStep = template.dependencyScanning.find(step => step.run?.includes('bandit'));
      const zapStep = template.dast.find(step => step.name.includes('OWASP ZAP'));
      const pipLicenseStep = template.licenseScanning.find(step => step.run?.includes('pip-licenses'));

      expect(safetyStep).toBeDefined();
      expect(banditStep).toBeDefined();
      expect(zapStep).toBeDefined(); // Django is a web framework
      expect(pipLicenseStep).toBeDefined();
    });

    it('should handle Java Spring Boot microservices', () => {
      const springDetection: DetectionResult = {
        frameworks: [
          { name: 'spring', version: '2.7.0', confidence: 0.9, evidence: ['pom.xml'], category: 'backend' }
        ],
        languages: [
          { name: 'java', version: '17', confidence: 0.9, primary: true }
        ],
        buildTools: [
          { name: 'maven', configFile: 'pom.xml', confidence: 0.9 },
          { name: 'docker', configFile: 'Dockerfile', confidence: 0.8 }
        ],
        packageManagers: [
          { name: 'maven', lockFile: 'pom.xml', confidence: 0.9 }
        ],
        testingFrameworks: [
          { name: 'junit', type: 'unit', confidence: 0.9 }
        ],
        deploymentTargets: [
          { platform: 'kubernetes', type: 'container', confidence: 0.8 }
        ],
        projectMetadata: {
          name: 'spring-microservice',
          description: 'Spring Boot microservice'
        }
      };

      const template = generator.generateSecurityScanTemplate(springDetection, {
        workflowType: 'ci',
        securityLevel: 'enterprise',
        optimizationLevel: 'aggressive',
        includeComments: true
      });

      // Should include Java-specific security checks
      const owaspStep = template.dependencyScanning.find(step => step.run?.includes('dependency-check-maven'));
      
      // Get code quality steps separately since they're not in SAST
      const codeQualitySteps = generator.generateCodeQualitySteps(springDetection, 'enterprise');
      const checkstyleStep = codeQualitySteps.find(step => step.run?.includes('checkstyle'));
      const spotbugsStep = codeQualitySteps.find(step => step.run?.includes('spotbugs'));

      expect(owaspStep).toBeDefined();
      expect(checkstyleStep).toBeDefined();
      expect(spotbugsStep).toBeDefined();
    });
  });

  describe('Security job generation', () => {
    it('should generate complete security workflow for complex project', () => {
      const complexDetection: DetectionResult = {
        frameworks: [
          { name: 'react', version: '18.0.0', confidence: 0.9, evidence: ['package.json'], category: 'frontend' },
          { name: 'nodejs', version: '18.0.0', confidence: 0.8, evidence: ['package.json'], category: 'backend' }
        ],
        languages: [
          { name: 'typescript', version: '4.8.0', confidence: 0.9, primary: true },
          { name: 'javascript', version: 'ES2022', confidence: 0.8, primary: false }
        ],
        buildTools: [
          { name: 'webpack', configFile: 'webpack.config.js', confidence: 0.8 },
          { name: 'docker', configFile: 'Dockerfile', confidence: 0.9 }
        ],
        packageManagers: [
          { name: 'npm', lockFile: 'package-lock.json', confidence: 0.9 }
        ],
        testingFrameworks: [
          { name: 'jest', type: 'unit', confidence: 0.8 },
          { name: 'playwright', type: 'e2e', confidence: 0.7 }
        ],
        deploymentTargets: [
          { platform: 'aws', type: 'container', confidence: 0.8 }
        ],
        projectMetadata: {
          name: 'complex-app',
          description: 'Complex TypeScript application with multiple frameworks'
        }
      };

      const securityJob = generator.generateSecurityJob(complexDetection, {
        workflowType: 'ci',
        securityLevel: 'enterprise',
        optimizationLevel: 'aggressive',
        includeComments: true
      });

      // Should have proper job structure
      expect(securityJob.length).toBeGreaterThan(10); // Multiple security steps
      
      // First step should be checkout
      expect(securityJob[0].name).toBe('Checkout code');
      expect(securityJob[0].uses).toBe('actions/checkout@v4');
      
      // Last step should be upload results
      const lastStep = securityJob[securityJob.length - 1];
      expect(lastStep.name).toBe('Upload security scan results');
      expect(lastStep.uses).toBe('github/codeql-action/upload-sarif@v3');

      // Should include various security scanning steps
      const stepNames = securityJob.map(step => step.name);
      expect(stepNames.some(name => name.includes('Dependabot'))).toBe(true);
      expect(stepNames.some(name => name.includes('CodeQL'))).toBe(true);
      expect(stepNames.some(name => name.includes('Trivy'))).toBe(true);
      expect(stepNames.some(name => name.includes('TruffleHog'))).toBe(true);
    });
  });

  describe('Framework-specific security adaptations', () => {
    it('should adapt security scanning for Go projects', () => {
      const goDetection: DetectionResult = {
        frameworks: [
          { name: 'gin', version: '1.8.0', confidence: 0.8, evidence: ['go.mod'], category: 'backend' }
        ],
        languages: [
          { name: 'go', version: '1.19', confidence: 0.9, primary: true }
        ],
        buildTools: [
          { name: 'go', configFile: 'go.mod', confidence: 0.9 }
        ],
        packageManagers: [
          { name: 'go', lockFile: 'go.sum', confidence: 0.9 }
        ],
        testingFrameworks: [
          { name: 'testing', type: 'unit', confidence: 0.9 }
        ],
        deploymentTargets: [
          { platform: 'gcp', type: 'container', confidence: 0.7 }
        ],
        projectMetadata: {
          name: 'go-api',
          description: 'Go REST API with Gin framework'
        }
      };

      const template = generator.generateSecurityScanTemplate(goDetection);

      // Should include Go-specific security checks
      const govulnStep = template.dependencyScanning.find(step => step.run?.includes('govulncheck'));
      expect(govulnStep).toBeDefined();
    });

    it('should adapt security scanning for Rust projects', () => {
      const rustDetection: DetectionResult = {
        frameworks: [
          { name: 'actix-web', version: '4.0.0', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' }
        ],
        languages: [
          { name: 'rust', version: '1.65', confidence: 0.9, primary: true }
        ],
        buildTools: [
          { name: 'cargo', configFile: 'Cargo.toml', confidence: 0.9 }
        ],
        packageManagers: [
          { name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }
        ],
        testingFrameworks: [
          { name: 'cargo-test', type: 'unit', confidence: 0.9 }
        ],
        deploymentTargets: [
          { platform: 'docker', type: 'container', confidence: 0.8 }
        ],
        projectMetadata: {
          name: 'rust-api',
          description: 'Rust web API with Actix framework'
        }
      };

      const template = generator.generateSecurityScanTemplate(rustDetection);

      // Should include Rust-specific security checks
      const cargoAuditStep = template.dependencyScanning.find(step => step.run?.includes('cargo audit'));
      expect(cargoAuditStep).toBeDefined();
    });
  });

  describe('Security level progression', () => {
    const baseDetection: DetectionResult = {
      frameworks: [
        { name: 'express', version: '4.18.0', confidence: 0.8, evidence: ['package.json'], category: 'backend' }
      ],
      languages: [
        { name: 'javascript', version: 'ES2022', confidence: 0.9, primary: true }
      ],
      buildTools: [
        { name: 'docker', configFile: 'Dockerfile', confidence: 0.8 }
      ],
      packageManagers: [
        { name: 'npm', lockFile: 'package-lock.json', confidence: 0.9 }
      ],
      testingFrameworks: [
        { name: 'mocha', type: 'unit', confidence: 0.8 }
      ],
      deploymentTargets: [
        { platform: 'heroku', type: 'traditional', confidence: 0.7 }
      ],
      projectMetadata: {
        name: 'express-api',
        description: 'Express.js REST API'
      }
    };

    it('should show security progression from basic to enterprise', () => {
      const basicTemplate = generator.generateSecurityScanTemplate(baseDetection, {
        workflowType: 'ci',
        securityLevel: 'basic',
        optimizationLevel: 'basic',
        includeComments: true
      });

      const standardTemplate = generator.generateSecurityScanTemplate(baseDetection, {
        workflowType: 'ci',
        securityLevel: 'standard',
        optimizationLevel: 'standard',
        includeComments: true
      });

      const enterpriseTemplate = generator.generateSecurityScanTemplate(baseDetection, {
        workflowType: 'ci',
        securityLevel: 'enterprise',
        optimizationLevel: 'aggressive',
        includeComments: true
      });

      // Basic should have minimal security
      expect(basicTemplate.complianceChecks.length).toBe(0);
      expect(basicTemplate.licenseScanning.length).toBe(0);

      // Standard should have more security features
      expect(standardTemplate.licenseScanning.length).toBeGreaterThan(0);
      expect(standardTemplate.complianceChecks.length).toBe(0); // Still no compliance

      // Enterprise should have comprehensive security
      expect(enterpriseTemplate.complianceChecks.length).toBeGreaterThan(0);
      expect(enterpriseTemplate.licenseScanning.length).toBeGreaterThan(0);
      
      // Enterprise should have more steps overall
      const basicStepCount = Object.values(basicTemplate).flat().length;
      const enterpriseStepCount = Object.values(enterpriseTemplate).flat().length;
      expect(enterpriseStepCount).toBeGreaterThan(basicStepCount);
    });
  });
});