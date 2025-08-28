/**
 * Secret Detector
 * Advanced secret detection system for identifying hardcoded credentials,
 * API keys, tokens, and other sensitive information in code and configuration files
 */

import { logger } from '../../shared/logging/central-logger';

export interface SecretPattern {
  name: string;
  pattern: RegExp;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'api-key' | 'password' | 'token' | 'certificate' | 'database' | 'generic';
}

export interface SecretMatch {
  pattern: SecretPattern;
  match: string;
  file: string;
  line: number;
  column: number;
  context: string;
  confidence: number;
}

export interface SecretScanResult {
  scanId: string;
  timestamp: Date;
  filesScanned: number;
  secretsFound: SecretMatch[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
}

export class SecretDetector {
  private patterns: SecretPattern[] = [];
  private initialized: boolean = false;

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    this.patterns = [
      // API Keys
      {
        name: 'AWS Access Key',
        pattern: /AKIA[0-9A-Z]{16}/g,
        description: 'AWS Access Key ID',
        severity: 'critical',
        category: 'api-key'
      },
      {
        name: 'AWS Secret Key',
        pattern: /[0-9a-zA-Z/+]{40}/g,
        description: 'AWS Secret Access Key',
        severity: 'critical',
        category: 'api-key'
      },
      {
        name: 'GitHub Token',
        pattern: /ghp_[0-9a-zA-Z]{36}/g,
        description: 'GitHub Personal Access Token',
        severity: 'critical',
        category: 'token'
      },
      {
        name: 'Google API Key',
        pattern: /AIza[0-9A-Za-z\\-_]{35}/g,
        description: 'Google API Key',
        severity: 'high',
        category: 'api-key'
      },
      {
        name: 'Slack Token',
        pattern: /xox[baprs]-([0-9a-zA-Z]{10,48})/g,
        description: 'Slack API Token',
        severity: 'high',
        category: 'token'
      },
      {
        name: 'JWT Token',
        pattern: /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9._-]*|eyJ[A-Za-z0-9_\/+-]*\.[A-Za-z0-9._\/+-]*/g,
        description: 'JSON Web Token',
        severity: 'medium',
        category: 'token'
      },
      
      // Database Credentials
      {
        name: 'Database URL',
        pattern: /(mongodb|mysql|postgresql|postgres):\/\/[^\s'"]+/gi,
        description: 'Database connection string',
        severity: 'critical',
        category: 'database'
      },
      {
        name: 'Connection String',
        pattern: /(?:password|pwd|pass)\s*[=:]\s*['"]*[^\s'"]+/gi,
        description: 'Database password in connection string',
        severity: 'critical',
        category: 'password'
      },
      
      // Generic Secrets
      {
        name: 'Private Key',
        pattern: /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g,
        description: 'Private key certificate',
        severity: 'critical',
        category: 'certificate'
      },
      {
        name: 'API Key Pattern',
        pattern: /(?:api[_-]?key|apikey|secret[_-]?key|secretkey)\s*[=:]\s*['"]*[a-zA-Z0-9_-]{16,}/gi,
        description: 'Generic API key pattern',
        severity: 'high',
        category: 'api-key'
      },
      {
        name: 'Password Pattern',
        pattern: /(?:password|passwd|pwd)\s*[=:]\s*['"]*[^\s'"]{8,}/gi,
        description: 'Hardcoded password',
        severity: 'high',
        category: 'password'
      },
      {
        name: 'Bearer Token',
        pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g,
        description: 'Bearer authentication token',
        severity: 'medium',
        category: 'token'
      },
      
      // Cloud Provider Keys
      {
        name: 'Azure Storage Key',
        pattern: /DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]+/g,
        description: 'Azure Storage Account Key',
        severity: 'critical',
        category: 'api-key'
      },
      {
        name: 'Heroku API Key',
        pattern: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
        description: 'Heroku API Key',
        severity: 'high',
        category: 'api-key'
      }
    ];

    this.initialized = true;
    logger.info('SecretDetector initialized with patterns', { patternCount: this.patterns.length });
  }

  async scanText(text: string, filename: string = 'unknown'): Promise<SecretMatch[]> {
    if (!this.initialized) {
      throw new Error('SecretDetector not initialized');
    }

    const matches: SecretMatch[] = [];
    const lines = text.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      for (const pattern of this.patterns) {
        const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
        let match;

        while ((match = regex.exec(line)) !== null) {
          const confidence = this.calculateConfidence(match[0], pattern, line);
          
          // Skip low confidence matches to reduce false positives
          if (confidence < 0.3) {
            continue;
          }

          matches.push({
            pattern,
            match: match[0],
            file: filename,
            line: lineIndex + 1,
            column: match.index + 1,
            context: this.getContext(lines, lineIndex),
            confidence
          });
        }
      }
    }

    return matches;
  }

  async scanFile(filePath: string): Promise<SecretMatch[]> {
    try {
      const fs = await import('fs');
      const content = fs.readFileSync(filePath, 'utf-8');
      return await this.scanText(content, filePath);
    } catch (error) {
      logger.error('Failed to scan file for secrets', { filePath, error });
      return [];
    }
  }

  async scanDirectory(directoryPath: string, extensions: string[] = ['.js', '.ts', '.json', '.env', '.yml', '.yaml']): Promise<SecretScanResult> {
    const scanId = this.generateScanId();
    const timestamp = new Date();
    let filesScanned = 0;
    const allMatches: SecretMatch[] = [];

    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const scanRecursive = async (dir: string): Promise<void> => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            // Skip common directories that shouldn't contain secrets
            if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
              await scanRecursive(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext) || entry.name.startsWith('.env')) {
              const matches = await this.scanFile(fullPath);
              allMatches.push(...matches);
              filesScanned++;
            }
          }
        }
      };

      await scanRecursive(directoryPath);

      const summary = this.generateSummary(allMatches);

      logger.info('Secret scan completed', {
        scanId,
        filesScanned,
        secretsFound: allMatches.length,
        summary
      });

      return {
        scanId,
        timestamp,
        filesScanned,
        secretsFound: allMatches,
        summary
      };

    } catch (error) {
      logger.error('Failed to scan directory for secrets', { directoryPath, error });
      throw error;
    }
  }

  private calculateConfidence(match: string, pattern: SecretPattern, context: string): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence for longer matches
    if (match.length > 20) confidence += 0.2;
    if (match.length > 40) confidence += 0.1;

    // Increase confidence for specific patterns
    if (pattern.category === 'api-key' && match.length >= 32) confidence += 0.2;
    if (pattern.category === 'token' && match.includes('-')) confidence += 0.1;

    // Decrease confidence for common false positives
    if (match.toLowerCase().includes('example')) confidence -= 0.3;
    if (match.toLowerCase().includes('test')) confidence -= 0.2;
    if (match.toLowerCase().includes('dummy')) confidence -= 0.3;
    if (match.toLowerCase().includes('placeholder')) confidence -= 0.3;

    // Context analysis
    if (context.toLowerCase().includes('secret')) confidence += 0.1;
    if (context.toLowerCase().includes('key')) confidence += 0.1;
    if (context.toLowerCase().includes('token')) confidence += 0.1;
    if (context.toLowerCase().includes('password')) confidence += 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  private getContext(lines: string[], lineIndex: number, contextLines: number = 2): string {
    const start = Math.max(0, lineIndex - contextLines);
    const end = Math.min(lines.length, lineIndex + contextLines + 1);
    return lines.slice(start, end).join('\n');
  }

  private generateSummary(matches: SecretMatch[]): { critical: number; high: number; medium: number; low: number; total: number } {
    const summary = { critical: 0, high: 0, medium: 0, low: 0, total: matches.length };
    
    for (const match of matches) {
      summary[match.pattern.severity]++;
    }

    return summary;
  }

  private generateScanId(): string {
    return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getPatterns(): SecretPattern[] {
    return [...this.patterns];
  }

  addCustomPattern(pattern: SecretPattern): void {
    this.patterns.push(pattern);
    logger.info('Added custom secret detection pattern', { name: pattern.name });
  }

  removePattern(name: string): boolean {
    const index = this.patterns.findIndex(p => p.name === name);
    if (index !== -1) {
      this.patterns.splice(index, 1);
      logger.info('Removed secret detection pattern', { name });
      return true;
    }
    return false;
  }
}