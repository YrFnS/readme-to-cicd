/**
 * Generic detection rules for fallback scenarios
 */

export interface GenericRule {
  name: string;
  pattern: string | RegExp;
  confidence: number;
  ecosystem: string;
}

/**
 * Generic rules for common patterns
 */
export const genericRules: GenericRule[] = [
  {
    name: 'package.json',
    pattern: /package\.json$/,
    confidence: 0.8,
    ecosystem: 'nodejs'
  },
  {
    name: 'requirements.txt',
    pattern: /requirements\.txt$/,
    confidence: 0.8,
    ecosystem: 'python'
  },
  {
    name: 'Cargo.toml',
    pattern: /Cargo\.toml$/,
    confidence: 0.8,
    ecosystem: 'rust'
  },
  {
    name: 'go.mod',
    pattern: /go\.mod$/,
    confidence: 0.8,
    ecosystem: 'go'
  },
  {
    name: 'pom.xml',
    pattern: /pom\.xml$/,
    confidence: 0.8,
    ecosystem: 'java'
  }
];

export default genericRules;