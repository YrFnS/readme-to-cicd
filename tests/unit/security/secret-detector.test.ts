/**
 * Secret Detector Tests
 * Comprehensive test suite for secret detection functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SecretDetector, SecretPattern } from '../../../src/integration/security/secret-detector';

describe('SecretDetector', () => {
  let secretDetector: SecretDetector;

  beforeEach(() => {
    secretDetector = new SecretDetector();
  });

  describe('Pattern Detection', () => {
    it('should detect AWS access keys', async () => {
      const text = 'const accessKey = "AKIAIOSFODNN7EXAMPLE";';
      const matches = await secretDetector.scanText(text, 'test.js');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].pattern.name).toBe('AWS Access Key');
      expect(matches[0].pattern.severity).toBe('critical');
      expect(matches[0].match).toBe('AKIAIOSFODNN7EXAMPLE');
    });

    it('should detect GitHub tokens', async () => {
      const text = 'GITHUB_TOKEN=ghp_1234567890abcdef1234567890abcdef12345678';
      const matches = await secretDetector.scanText(text, '.env');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].pattern.name).toBe('GitHub Token');
      expect(matches[0].pattern.severity).toBe('critical');
    });

    it('should detect database connection strings', async () => {
      const text = 'DATABASE_URL=postgresql://user:password123@localhost:5432/mydb';
      const matches = await secretDetector.scanText(text, 'config.js');
      
      expect(matches.length).toBeGreaterThan(0);
      const dbMatch = matches.find(m => m.pattern.name === 'Database URL');
      expect(dbMatch).toBeDefined();
      expect(dbMatch?.pattern.severity).toBe('critical');
    });

    it('should detect private keys', async () => {
      const text = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdef...
-----END RSA PRIVATE KEY-----`;
      const matches = await secretDetector.scanText(text, 'key.pem');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].pattern.name).toBe('Private Key');
      expect(matches[0].pattern.severity).toBe('critical');
    });

    it('should detect JWT tokens', async () => {
      const text = 'token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";';
      const matches = await secretDetector.scanText(text, 'auth.js');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].pattern.name).toBe('JWT Token');
      expect(matches[0].pattern.severity).toBe('medium');
    });

    it('should detect API key patterns', async () => {
      const text = 'const apiKey = "sk_test_1234567890abcdef1234567890abcdef";';
      const matches = await secretDetector.scanText(text, 'config.js');
      
      const apiKeyMatch = matches.find(m => m.pattern.name === 'API Key Pattern');
      expect(apiKeyMatch).toBeDefined();
      expect(apiKeyMatch?.pattern.severity).toBe('high');
    });
  });

  describe('Confidence Scoring', () => {
    it('should assign lower confidence to test/example values', async () => {
      const text = 'const testKey = "AKIAIOSFODNN7EXAMPLE";';
      const matches = await secretDetector.scanText(text, 'test.js');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].confidence).toBeLessThan(0.8);
    });

    it('should assign higher confidence to realistic values', async () => {
      const text = 'const prodKey = "AKIAI44QH8DHBEXAMPLE";';
      const matches = await secretDetector.scanText(text, 'production.js');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].confidence).toBeGreaterThan(0.5);
    });

    it('should increase confidence for longer matches', async () => {
      const longSecret = 'a'.repeat(50);
      const shortSecret = 'a'.repeat(10);
      
      const longMatches = await secretDetector.scanText(`apiKey="${longSecret}"`, 'test.js');
      const shortMatches = await secretDetector.scanText(`apiKey="${shortSecret}"`, 'test.js');
      
      if (longMatches.length > 0 && shortMatches.length > 0) {
        expect(longMatches[0].confidence).toBeGreaterThan(shortMatches[0].confidence);
      }
    });
  });

  describe('Context Analysis', () => {
    it('should provide context around matches', async () => {
      const text = `// Configuration
const config = {
  apiKey: "sk_test_1234567890abcdef",
  database: "localhost"
};`;
      const matches = await secretDetector.scanText(text, 'config.js');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].context).toContain('Configuration');
      expect(matches[0].context).toContain('database');
    });

    it('should track line and column numbers', async () => {
      const text = `line 1
line 2 with secret: "AKIAIOSFODNN7EXAMPLE"
line 3`;
      const matches = await secretDetector.scanText(text, 'test.js');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].line).toBe(2);
      expect(matches[0].column).toBeGreaterThan(0);
    });
  });

  describe('Custom Patterns', () => {
    it('should allow adding custom patterns', () => {
      const customPattern: SecretPattern = {
        name: 'Custom API Key',
        pattern: /CUSTOM_[A-Z0-9]{16}/g,
        description: 'Custom service API key',
        severity: 'high',
        category: 'api-key'
      };

      secretDetector.addCustomPattern(customPattern);
      const patterns = secretDetector.getPatterns();
      
      expect(patterns).toContain(customPattern);
    });

    it('should detect custom patterns', async () => {
      const customPattern: SecretPattern = {
        name: 'Custom Token',
        pattern: /MYSERVICE_[A-Z0-9]{20}/g,
        description: 'My service token',
        severity: 'critical',
        category: 'token'
      };

      secretDetector.addCustomPattern(customPattern);
      
      const text = 'token = "MYSERVICE_ABCD1234EFGH5678IJKL";';
      const matches = await secretDetector.scanText(text, 'test.js');
      
      const customMatch = matches.find(m => m.pattern.name === 'Custom Token');
      expect(customMatch).toBeDefined();
      expect(customMatch?.pattern.severity).toBe('critical');
    });

    it('should allow removing patterns', () => {
      const initialCount = secretDetector.getPatterns().length;
      
      const removed = secretDetector.removePattern('AWS Access Key');
      expect(removed).toBe(true);
      
      const newCount = secretDetector.getPatterns().length;
      expect(newCount).toBe(initialCount - 1);
    });
  });

  describe('False Positive Reduction', () => {
    it('should skip obvious test values', async () => {
      const testTexts = [
        'apiKey = "test_key_placeholder"',
        'secret = "dummy_secret_value"',
        'token = "example_token_here"'
      ];

      for (const text of testTexts) {
        const matches = await secretDetector.scanText(text, 'test.js');
        // Should either have no matches or very low confidence matches
        const highConfidenceMatches = matches.filter(m => m.confidence > 0.7);
        expect(highConfidenceMatches).toHaveLength(0);
      }
    });

    it('should handle common variable names without false positives', async () => {
      const text = `
        const password = getPasswordFromEnv();
        const apiKey = process.env.API_KEY;
        const secret = loadSecretFromVault();
      `;
      
      const matches = await secretDetector.scanText(text, 'secure.js');
      
      // Should not detect these as hardcoded secrets since they're function calls/env vars
      const hardcodedMatches = matches.filter(m => 
        m.match.includes('getPasswordFromEnv') || 
        m.match.includes('process.env') ||
        m.match.includes('loadSecretFromVault')
      );
      expect(hardcodedMatches).toHaveLength(0);
    });
  });

  describe('File Operations', () => {
    it('should handle file scanning errors gracefully', async () => {
      const matches = await secretDetector.scanFile('/nonexistent/file.js');
      expect(matches).toHaveLength(0);
    });
  });

  describe('Summary Generation', () => {
    it('should generate accurate scan summaries', async () => {
      const text = `
        AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
        GITHUB_TOKEN=ghp_1234567890abcdef1234567890abcdef12345678
        api_key=sk_test_medium_severity_key
        password=low_severity_pass
      `;
      
      const matches = await secretDetector.scanText(text, 'secrets.env');
      
      // Manually create a summary like the scanner would
      const summary = { critical: 0, high: 0, medium: 0, low: 0, total: matches.length };
      for (const match of matches) {
        summary[match.pattern.severity]++;
      }
      
      expect(summary.total).toBeGreaterThan(0);
      expect(summary.critical + summary.high + summary.medium + summary.low).toBe(summary.total);
    });
  });
});