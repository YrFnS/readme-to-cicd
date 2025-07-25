/**
 * MetadataExtractor - Analyzes README content to extract project metadata
 */

import { BaseAnalyzer } from './base-analyzer';
import { AnalysisResult, ProjectMetadata, EnvironmentVariable, MarkdownAST } from '../types';

/**
 * Environment variable detection result
 */
interface EnvVarMatch {
  name: string;
  description?: string;
  required: boolean;
  defaultValue?: string;
  context: string;
}

/**
 * MetadataExtractor analyzes README content to extract comprehensive project metadata.
 * 
 * Extracts four types of metadata:
 * - Project name (from headers, GitHub URLs, package.json)
 * - Project description (from introduction paragraphs, blockquotes)
 * - Directory structure (from code blocks, file listings)
 * - Environment variables (from .env examples, configuration sections)
 * 
 * Uses intelligent prioritization to select the best available information source.
 * 
 * @example
 * ```typescript
 * const extractor = new MetadataExtractor();
 * const result = await extractor.analyze(ast, content);
 * 
 * console.log('Project name:', result.data.name);
 * console.log('Description:', result.data.description);
 * console.log('Structure:', result.data.structure);
 * console.log('Environment vars:', result.data.environment);
 * ```
 */
export class MetadataExtractor extends BaseAnalyzer {
  readonly name = 'MetadataExtractor';

  // Patterns for environment variable detection
  private readonly envVarPatterns = [
    // Standard environment variable patterns
    /\b([A-Z][A-Z0-9_]*)\s*=\s*["']?([^"'\s]+)["']?/g,
    /\$\{?([A-Z][A-Z0-9_]*)\}?/g,
    /process\.env\.([A-Z][A-Z0-9_]*)/g,
    /os\.environ\[["']([A-Z][A-Z0-9_]*)["']\]/g,
    /std::env::var\(["']([A-Z][A-Z0-9_]*)["']\)/g,
    /System\.getenv\(["']([A-Z][A-Z0-9_]*)["']\)/g,
  ];

  // Common environment variable names to look for
  private readonly commonEnvVars = [
    'NODE_ENV', 'PORT', 'HOST', 'DATABASE_URL', 'API_KEY', 'SECRET_KEY',
    'JWT_SECRET', 'REDIS_URL', 'MONGODB_URI', 'POSTGRES_URL', 'MYSQL_URL',
    'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION',
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GITHUB_TOKEN',
    'DEBUG', 'LOG_LEVEL', 'ENVIRONMENT', 'APP_ENV', 'CONFIG_PATH',
    'REACT_APP_API_URL', 'REACT_APP_ENV', 'REACT_APP_BASE_URL',
    'VITE_API_URL', 'VITE_APP_ENV', 'NEXT_PUBLIC_API_URL'
  ];

  // Directory structure patterns
  private readonly directoryPatterns = [
    /```\s*(?:tree|directory|structure|files?)\s*\n([\s\S]*?)\n```/gi,
    /(?:directory|folder|file)\s+structure[:\s]*\n((?:[-│├└\s]*[^\n]+\n?)+)/gi,
    /(?:project|file)\s+organization[:\s]*\n((?:[-│├└\s]*[^\n]+\n?)+)/gi,
  ];

  /**
   * Analyze markdown content to extract project metadata
   */
  async analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult> {
    try {
      const metadata: ProjectMetadata = {};
      const errors: any[] = [];

      // Extract project name
      const projectName = this.extractProjectName(ast, rawContent);
      if (projectName) {
        metadata.name = projectName;
      }

      // Extract project description
      const description = this.extractDescription(ast, rawContent);
      if (description) {
        metadata.description = description;
      }

      // Extract directory structure
      const structure = this.extractDirectoryStructure(rawContent);
      if (structure.length > 0) {
        metadata.structure = structure;
      }

      // Extract environment variables
      const envVars = this.extractEnvironmentVariables(rawContent);
      if (envVars.length > 0) {
        metadata.environment = envVars;
      }

      // Calculate confidence based on extracted information
      const confidence = this.calculateConfidence(metadata);

      return this.createResult(metadata, confidence, this.getSources(metadata), errors);

    } catch (error) {
      const parseError = this.createError(
        'METADATA_EXTRACTION_ERROR',
        `Failed to extract metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: error instanceof Error ? error.message : error }
      );

      return this.createResult({}, 0, [], [parseError]);
    }
  }

  /**
   * Extract project name from README titles and headers
   */
  private extractProjectName(ast: MarkdownAST, rawContent: string): string | undefined {
    // Strategy 1: Look for h1 headers (most common for project titles) - but skip generic names
    const h1Headers = ast.filter(token => token.type === 'heading' && (token as any).depth === 1);
    
    for (const header of h1Headers) {
      const headerToken = header as any;
      const text = headerToken.text || '';
      const cleanName = this.cleanProjectName(text);
      if (cleanName && this.isValidProjectName(cleanName) && !this.isGenericName(cleanName)) {
        return cleanName;
      }
    }

    // Strategy 2: Look for GitHub repository patterns
    const repoMatch = rawContent.match(/github\.com\/[^\/]+\/([^\/\s)]+)/i);
    if (repoMatch) {
      const repoName = repoMatch[1]?.replace(/\.git$/, '');
      if (this.isValidProjectName(repoName)) {
        // Keep original format for GitHub URLs (they're usually kebab-case by convention)
        return repoName;
      }
    }

    // Strategy 3: Look for package.json name references
    const packageNameMatch = rawContent.match(/"name"\s*:\s*"([^"]+)"/);
    if (packageNameMatch) {
      const packageName = packageNameMatch[1];
      if (packageName && this.isValidProjectName(packageName)) {
        // Keep original format for package names (they're usually kebab-case by convention)
        return packageName;
      }
    }

    // Strategy 4: Look for h2 headers if no h1 found
    const h2Headers = ast.filter(token => token.type === 'heading' && (token as any).depth === 2);
    
    for (const header of h2Headers) {
      const headerToken = header as any;
      const text = headerToken.text || '';
      const cleanName = this.cleanProjectName(text);
      if (cleanName && this.isValidProjectName(cleanName) && !this.isGenericName(cleanName)) {
        return cleanName;
      }
    }

    return undefined;
  }

  /**
   * Extract project description from introduction sections
   */
  private extractDescription(ast: MarkdownAST, rawContent: string): string | undefined {
    // Strategy 1: Look for blockquotes which often contain descriptions (prioritize this)
    for (const token of ast) {
      if (token.type === 'blockquote') {
        const blockquoteToken = token as any;
        if (blockquoteToken.tokens) {
          for (const subToken of blockquoteToken.tokens) {
            if (subToken.type === 'paragraph') {
              const text = subToken.text || '';
              const cleanDescription = this.cleanDescription(text);
              if (cleanDescription && this.isValidDescription(cleanDescription)) {
                return cleanDescription;
              }
            }
          }
        }
      }
    }

    // Strategy 2: Look for the first paragraph after the main heading
    let foundMainHeading = false;
    
    for (const token of ast) {
      if (token.type === 'heading' && (token as any).depth === 1) {
        foundMainHeading = true;
        continue;
      }
      
      if (foundMainHeading && token.type === 'paragraph') {
        const paragraphToken = token as any;
        const text = paragraphToken.text || '';
        const cleanDescription = this.cleanDescription(text);
        if (cleanDescription && this.isValidDescription(cleanDescription)) {
          return cleanDescription;
        }
      }
    }

    // Strategy 3: Look for common description patterns
    const descriptionPatterns = [
      /(?:description|about|overview)[:\s]*\n\s*([^\n]+(?:\n[^\n#]+)*)/gi,
      /^>\s*([^\n]+(?:\n>[^\n]*)*)/gm, // Blockquotes often contain descriptions
      /(?:this\s+(?:project|application|tool|library|package))\s+([^.!?]+[.!?])/gi,
    ];

    for (const pattern of descriptionPatterns) {
      const match = rawContent.match(pattern);
      if (match) {
        const description = match[1].replace(/^>\s*/gm, '').trim();
        const cleanDescription = this.cleanDescription(description);
        if (cleanDescription && this.isValidDescription(cleanDescription)) {
          return cleanDescription;
        }
      }
    }

    // Strategy 4: Look for package.json description
    const packageDescMatch = rawContent.match(/"description"\s*:\s*"([^"]+)"/);
    if (packageDescMatch) {
      const description = packageDescMatch[1];
      if (this.isValidDescription(description)) {
        return description;
      }
    }

    return undefined;
  }

  /**
   * Extract directory structure from mentioned file organization
   */
  private extractDirectoryStructure(rawContent: string): string[] {
    const structure: string[] = [];

    // Extract from code blocks in raw content - improved pattern
    const codeBlockPattern = /```[^`]*?\n([\s\S]*?)\n```/g;
    const codeMatches = rawContent.matchAll(codeBlockPattern);
    
    for (const match of codeMatches) {
      const codeContent = match[1];
      const lines = codeContent.split('\n')
        .filter(line => line.length > 0 && !line.startsWith('//') && !line.startsWith('#'));
      
      for (const line of lines) {
        const cleanLine = this.cleanStructureLine(line);
        if (cleanLine && this.isValidStructureLine(cleanLine)) {
          structure.push(cleanLine);
        }
      }
    }

    // Also use the original patterns for other structure mentions
    for (const pattern of this.directoryPatterns) {
      const matches = rawContent.matchAll(pattern);
      
      for (const match of matches) {
        const structureText = match[1];
        const lines = structureText.split('\n')
          .filter(line => line.length > 0 && !line.startsWith('//') && !line.startsWith('#'));
        
        for (const line of lines) {
          const cleanLine = this.cleanStructureLine(line);
          if (cleanLine && this.isValidStructureLine(cleanLine)) {
            structure.push(cleanLine);
          }
        }
      }
    }

    // Look for common file/directory mentions in text
    const filePatterns = [
      // Directory patterns with trailing slash - more comprehensive
      /\b(?:src|source|lib|app|components?|pages?|routes?|controllers?|models?|views?|utils?|helpers?|services?|tests?|spec|docs?|public|assets?|static|build|dist|out|target|analyzers?)\/(?:[^\s`'")\]]+\/?)*/gi,
      // Specific file patterns
      /\b(?:package\.json|tsconfig\.json|webpack\.config\.js|babel\.config\.js|jest\.config\.js|\.env|\.gitignore|README\.md|LICENSE|Dockerfile|docker-compose\.yml)\b/gi,
      // File paths with extensions - more comprehensive
      /\b(?:src|app|lib|analyzers?)\/[^\s`'")\]]*\.[a-zA-Z0-9]+/gi,
      // Python specific patterns
      /\b[a-zA-Z_][a-zA-Z0-9_]*\.py\b/gi,
      // TypeScript/JavaScript specific patterns
      /\b[a-zA-Z_][a-zA-Z0-9_]*\.(?:ts|tsx|js|jsx)\b/gi,
    ];

    for (const pattern of filePatterns) {
      const matches = rawContent.match(pattern);
      if (matches) {
        for (const match of matches) {
          let cleanMatch = match.trim()
            .replace(/[`'"]/g, '') // Remove quotes and backticks
            .replace(/\.$/, ''); // Remove trailing period
          
          // Ensure directories end with slash
          if (cleanMatch.match(/^(?:src|app|lib|components?|pages?|routes?|controllers?|models?|views?|utils?|helpers?|services?|tests?|spec|docs?|public|assets?|static|build|dist|out|target|analyzers?)\/[^.]*$/) && !cleanMatch.endsWith('/')) {
            cleanMatch += '/';
          }
          
          if (this.isValidStructureLine(cleanMatch) && !structure.includes(cleanMatch)) {
            structure.push(cleanMatch);
          }
        }
      }
    }

    return Array.from(new Set(structure)).slice(0, 30); // Increased limit to capture more structure
  }

  /**
   * Extract environment variables from configuration sections
   */
  private extractEnvironmentVariables(rawContent: string): EnvironmentVariable[] {
    const envVars: Map<string, EnvVarMatch> = new Map();

    // Only extract if there are clear environment variable sections (avoid false positives)
    const hasEnvSection = /(?:environment|env|config).*(?:variable|setting|configuration)/gi.test(rawContent) ||
                         /\.env(?:\.example|\.local)?/gi.test(rawContent) ||
                         /```\s*(?:env|bash|shell)\s*\n[\s\S]*?[A-Z][A-Z0-9_]*\s*=/gi.test(rawContent) ||
                         /```\s*\n[\s\S]*?(?:[A-Z][A-Z0-9_]*\s*=[\s\S]*?){2,}[\s\S]*?```/gi.test(rawContent) ||
                         /set\s+[A-Z][A-Z0-9_]*(?:\s*=|\s+and)/gi.test(rawContent) ||
                         /export\s+[A-Z][A-Z0-9_]*\s*=/gi.test(rawContent) ||
                         /\b[A-Z][A-Z0-9_]*\s+(?:and\s+)?[A-Z][A-Z0-9_]*\s+environment\s+variables/gi.test(rawContent);

    // Additional check: avoid false positives from negative statements
    const hasNegativeEnvMention = /\bno\s+environment\s+variables/gi.test(rawContent) ||
                                 /without\s+environment/gi.test(rawContent);

    if (!hasEnvSection || hasNegativeEnvMention) {
      return []; // Don't extract env vars if no clear env section exists or negative mentions
    }

    // Extract from patterns - only in code blocks or explicit env sections
    for (const pattern of this.envVarPatterns) {
      const matches = rawContent.matchAll(pattern);
      
      for (const match of matches) {
        const varName = match[1];
        const defaultValue = match[2];
        
        if (this.isValidEnvVarName(varName)) {
          envVars.set(varName, {
            name: varName,
            required: !defaultValue,
            defaultValue: defaultValue || undefined,
            context: match[0]
          });
        }
      }
    }

    // Look for .env file mentions and extract variables
    const envFilePattern = /\.env(?:\.example|\.local|\.development|\.production)?[:\s]*\n((?:[A-Z][A-Z0-9_]*\s*=.*\n?)+)/gi;
    const envFileMatches = rawContent.matchAll(envFilePattern);
    
    for (const match of envFileMatches) {
      const envContent = match[1];
      const lines = envContent.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const varMatch = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
        if (varMatch) {
          const [, varName, value] = varMatch;
          if (this.isValidEnvVarName(varName)) {
            const trimmedValue = value ? value.trim() : '';
            const isEmpty = trimmedValue === '' || trimmedValue === '""' || trimmedValue === "''";
            envVars.set(varName, {
              name: varName,
              required: isEmpty,
              defaultValue: !isEmpty ? trimmedValue : undefined,
              context: line
            });
          }
        }
      }
    }

    // Look for environment variables in code blocks with env/bash/shell language or generic code blocks with env vars
    const envCodeBlockPattern = /```\s*(?:env|bash|shell|sh)?\s*\n([\s\S]*?)\n```/gi;
    const envCodeMatches = rawContent.matchAll(envCodeBlockPattern);
    
    for (const match of envCodeMatches) {
      const codeContent = match[1];
      if (!codeContent) continue;
      const lines = codeContent.split('\n').filter(line => line.trim());
      
      // For generic code blocks (no language specified), only process if they contain clear env var patterns
      const hasLanguage = match[0].match(/```\s*(?:env|bash|shell|sh)\s*\n/);
      const hasEnvVarPattern = lines.some(line => /^(?:export\s+)?[A-Z][A-Z0-9_]*\s*=/.test(line));
      
      if (hasLanguage || hasEnvVarPattern) {
        for (const line of lines) {
          const varMatch = line.match(/^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
          if (varMatch) {
            const [, varName, value] = varMatch;
            if (this.isValidEnvVarName(varName)) {
              const trimmedValue = value ? value.trim() : '';
              const isEmpty = trimmedValue === '' || trimmedValue === '""' || trimmedValue === "''";
              envVars.set(varName, {
                name: varName,
                required: isEmpty,
                defaultValue: !isEmpty ? trimmedValue : undefined,
                context: line
              });
            }
          }
        }
      }
    }

    // Look for common environment variables only in very specific contexts
    for (const envVar of this.commonEnvVars) {
      // Only look for env vars in very specific contexts - avoid false positives
      const strictContextPatterns = [
        new RegExp(`(?:set|export)\\s+${envVar}\\b`, 'gi'),
        new RegExp(`process\\.env\\.${envVar}`, 'gi'),
        new RegExp(`\\$\\{?${envVar}\\}?`, 'gi'),
        new RegExp(`-\\s*\`${envVar}\`\\s*-`, 'gi'), // Environment variables in list items
        new RegExp(`${envVar}\\s*=`, 'gi'), // Direct assignment
        new RegExp(`\\b${envVar}\\b.*(?:and run|then run)`, 'gi'), // "Set NODE_ENV and run"
        new RegExp(`\\b${envVar}\\b.*(?:environment|variable)`, 'gi'), // "NODE_ENV environment variable"
        new RegExp(`(?:set|configure).*\\b${envVar}\\b`, 'gi'), // "Set NODE_ENV and DATABASE_URL"
      ];
      
      let foundInStrictContext = false;
      let contextText = '';
      
      for (const pattern of strictContextPatterns) {
        const matches = rawContent.match(pattern);
        if (matches && !envVars.has(envVar)) {
          // Additional check: make sure it's not just the word "ENVIRONMENT" in random text
          if (envVar === 'ENVIRONMENT' && !matches[0].includes('=') && !matches[0].includes('export') && !matches[0].includes('set') && !matches[0].includes('variable')) {
            continue;
          }
          foundInStrictContext = true;
          contextText = matches[0];
          break;
        }
      }
      
      if (foundInStrictContext) {
        envVars.set(envVar, {
          name: envVar,
          required: true,
          context: contextText
        });
      }
    }

    // Convert to EnvironmentVariable array
    return Array.from(envVars.values()).map(envVar => ({
      name: envVar.name,
      description: this.generateEnvVarDescription(envVar.name, envVar.context),
      required: envVar.required,
      defaultValue: envVar.defaultValue
    }));
  }

  /**
   * Extract text content from markdown tokens
   */
  private extractTextFromTokens(tokens: any[]): string {
    return tokens
      .map(token => {
        if (token.type === 'text') return token.raw || token.text || '';
        if (token.type === 'code') return token.text || '';
        if (token.tokens) return this.extractTextFromTokens(token.tokens);
        return token.raw || token.text || '';
      })
      .join('')
      .trim();
  }

  /**
   * Clean and normalize project name
   */
  private cleanProjectName(name: string): string {
    return name
      .replace(/[#*`_~]/g, '') // Remove markdown formatting
      .replace(/^\s*[-•]\s*/, '') // Remove list markers
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Format project name from kebab-case or snake_case to proper title case
   */
  private formatProjectName(name: string): string {
    // Convert kebab-case and snake_case to title case
    return name
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  /**
   * Clean and normalize description
   */
  private cleanDescription(description: string): string {
    return description
      .replace(/[#*`_~]/g, '') // Remove markdown formatting
      .replace(/^\s*[-•]\s*/, '') // Remove list markers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^[>\s]+/, '') // Remove blockquote markers
      .trim();
  }

  /**
   * Clean structure line
   */
  private cleanStructureLine(line: string): string {
    return line
      .replace(/^[│├└─\s]*/, '') // Remove tree characters
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove all emojis
      .replace(/[📁📄📂]/g, '') // Remove specific file/folder emojis
      .trim();
  }

  /**
   * Validate project name
   */
  private isValidProjectName(name: string): boolean {
    return name.length >= 2 && 
           name.length <= 100 && 
           !/^(readme|documentation|docs|guide|tutorial|example|sample|demo|test|installation|setup|getting started|introduction|overview)$/i.test(name);
  }

  /**
   * Check if a name is too generic (like "Project", "App", etc.)
   */
  private isGenericName(name: string): boolean {
    return /^(project|app|application|tool|library|package|service|api|website|site|repo|repository)$/i.test(name);
  }

  /**
   * Check if a name should be formatted (kebab-case or snake_case)
   */
  private shouldFormatName(name: string): boolean {
    return /[-_]/.test(name);
  }

  /**
   * Validate description
   */
  private isValidDescription(description: string): boolean {
    return description.length >= 10 && 
           description.length <= 500 &&
           /[.!?]$/.test(description.trim());
  }

  /**
   * Validate structure line
   */
  private isValidStructureLine(line: string): boolean {
    return line.length >= 2 && 
           line.length <= 200 &&
           !/^(example|sample|demo|test|temp|tmp)$/i.test(line);
  }

  /**
   * Validate environment variable name
   */
  private isValidEnvVarName(name: string): boolean {
    return /^[A-Z][A-Z0-9_]*$/.test(name) && 
           name.length >= 2 && 
           name.length <= 50;
  }

  /**
   * Generate description for environment variable
   */
  private generateEnvVarDescription(name: string, context: string): string | undefined {
    const commonDescriptions: Record<string, string> = {
      'NODE_ENV': 'Node.js environment (development, production, test)',
      'PORT': 'Server port number',
      'HOST': 'Server host address',
      'DATABASE_URL': 'Database connection URL',
      'API_KEY': 'API authentication key',
      'SECRET_KEY': 'Application secret key',
      'JWT_SECRET': 'JWT token signing secret',
      'REDIS_URL': 'Redis connection URL',
      'MONGODB_URI': 'MongoDB connection URI',
      'DEBUG': 'Debug mode flag',
      'LOG_LEVEL': 'Logging level (debug, info, warn, error)',
    };

    if (commonDescriptions[name]) {
      return commonDescriptions[name];
    }

    // Try to infer from context
    if (context.toLowerCase().includes('database')) {
      return 'Database configuration';
    }
    if (context.toLowerCase().includes('api')) {
      return 'API configuration';
    }
    if (context.toLowerCase().includes('auth')) {
      return 'Authentication configuration';
    }
    if (context.toLowerCase().includes('url')) {
      return 'Service URL configuration';
    }

    return undefined;
  }

  /**
   * Calculate confidence score based on extracted metadata
   */
  private calculateConfidence(metadata: ProjectMetadata): number {
    let score = 0;

    // Project name (high weight)
    if (metadata.name) {
      score += 0.4;
    }

    // Description (medium weight)
    if (metadata.description) {
      score += 0.3;
    }

    // Structure (low weight)
    if (metadata.structure && metadata.structure.length > 0) {
      score += 0.2 * Math.min(metadata.structure.length / 5, 1);
    }

    // Environment variables (low weight)
    if (metadata.environment && metadata.environment.length > 0) {
      score += 0.1 * Math.min(metadata.environment.length / 3, 1);
    }

    return Math.min(score, 1.0);
  }

  /**
   * Get sources based on extracted metadata
   */
  private getSources(metadata: ProjectMetadata): string[] {
    const sources: string[] = [];

    if (metadata.name) sources.push('title-extraction');
    if (metadata.description) sources.push('description-extraction');
    if (metadata.structure && metadata.structure.length > 0) sources.push('structure-parsing');
    if (metadata.environment && metadata.environment.length > 0) sources.push('environment-detection');

    return sources;
  }
}