import { ContentAnalyzer, AnalysisResult, ProjectMetadata, MarkdownAST, EnvironmentVariable } from '../types';
import { MarkdownUtils } from '../../shared/markdown-parser';

/**
 * Extracts project metadata from README content
 */
export class MetadataExtractor implements ContentAnalyzer {
  readonly name = 'MetadataExtractor';

  async analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult> {
    try {
      const metadata = this.extractMetadata(ast, rawContent);
      const confidence = this.calculateConfidence(metadata, rawContent);
      
      const sources = ['title-extraction', 'description-extraction'];
      if (metadata.structure) {
        sources.push('structure-parsing');
      }
      if (metadata.environment) {
        sources.push('environment-detection');
      }

      return {
        data: metadata,
        confidence,
        sources
      };
    } catch (error) {
      return {
        data: { name: 'Project' },
        confidence: 0,
        sources: [],
        errors: [{
          code: 'METADATA_EXTRACTION_ERROR',
          message: `Failed to extract metadata: ${(error as Error).message}`,
          component: 'MetadataExtractor',
          severity: 'error'
        }]
      };
    }
  }

  private extractMetadata(ast: MarkdownAST, content: string): ProjectMetadata {
    const projectName = this.extractProjectName(ast, content);
    const metadata: ProjectMetadata = {
      name: projectName || 'Project' // Always provide a fallback name
    };

    // Extract description from first paragraph or subtitle
    const description = this.extractDescription(ast, content);
    if (description) {
      metadata.description = description;
    }

    // Extract directory structure
    const structure = this.extractStructure(ast, content);
    if (structure && structure.length > 0) {
      metadata.structure = structure;
    }

    // Extract environment variables
    const environment = this.extractEnvironmentVariables(ast, content);
    if (environment && environment.length > 0) {
      metadata.environment = environment;
    }

    return metadata;
  }

  private extractProjectName(ast: MarkdownAST, content: string): string | undefined {
    // Try to get from first h1 heading
    const firstHeading = ast.find(token => token.type === 'heading' && token.depth === 1);
    if (firstHeading) {
      const headingText = MarkdownUtils.getHeadingText(firstHeading);
      if (headingText && this.isValidProjectName(headingText.trim())) {
        return this.cleanProjectName(headingText.trim());
      }
    }

    // Try to get from h2 heading if no valid h1
    const secondHeading = ast.find(token => token.type === 'heading' && token.depth === 2);
    if (secondHeading) {
      const headingText = MarkdownUtils.getHeadingText(secondHeading);
      if (headingText && this.isValidProjectName(headingText.trim())) {
        return this.cleanProjectName(headingText.trim());
      }
    }

    // Try to extract from package.json mention
    const packageMatch = content.match(/"name"\s*:\s*"([^"]+)"/);
    if (packageMatch && packageMatch[1]) {
      return packageMatch[1];
    }

    // Try to extract from GitHub URL
    const githubMatch = content.match(/github\.com\/[^/]+\/([^/\s)]+)/);
    if (githubMatch && githubMatch[1]) {
      const name = githubMatch[1].replace(/\.git$/, '');
      return this.cleanProjectName(name);
    }

    return undefined;
  }

  private extractDescription(ast: MarkdownAST, content: string): string | undefined {
    // Look for blockquotes first (common for project descriptions)
    const blockquotes = MarkdownUtils.findNodesByType(ast, 'blockquote');
    for (const quote of blockquotes) {
      if ('text' in quote && typeof quote.text === 'string') {
        const description = quote.text.trim();
        if (this.isValidDescription(description)) {
          return description;
        }
      }
    }

    // Look for first paragraph after heading
    let foundHeading = false;
    
    for (const token of ast) {
      if (token.type === 'heading') {
        foundHeading = true;
        continue;
      }
      
      if (foundHeading && token.type === 'paragraph' && token.text) {
        const description = token.text.trim();
        if (this.isValidDescription(description)) {
          return description;
        }
      }
    }

    // Try to extract from package.json mention
    const packageDescMatch = content.match(/"description"\s*:\s*"([^"]+)"/);
    if (packageDescMatch && packageDescMatch[1]) {
      const description = packageDescMatch[1];
      if (this.isValidDescription(description)) {
        return description;
      }
    }
    
    return undefined;
  }

  private isValidDescription(description: string): boolean {
    if (!description || description.length < 10) return false;
    
    // Reject descriptions that are too short or generic
    const invalidDescriptions = [
      'short.', 'todo', 'coming soon', 'work in progress',
      'under construction', 'placeholder'
    ];
    
    return !invalidDescriptions.some(invalid => 
      description.toLowerCase().includes(invalid)
    );
  }

  private extractStructure(ast: MarkdownAST, content: string): string[] | undefined {
    const structure: string[] = [];

    // Extract from code blocks that look like directory structures
    const codeBlocks = MarkdownUtils.findCodeBlocks(ast);
    for (const block of codeBlocks) {
      const code = ('text' in block && typeof block.text === 'string') ? block.text : '';
      
      // Look for directory tree patterns and file mentions
      const lines = code.split('\n');
      for (const line of lines) {
        // Tree structure patterns
        if (line.includes('├──') || line.includes('└──') || line.includes('│')) {
          const cleaned = line.replace(/[├└│─\s]/g, '').trim();
          if (cleaned && cleaned.length > 0) {
            structure.push(cleaned);
          }
        }
        // Direct file/directory mentions
        else if (line.match(/^[\s]*[\w.-]+\.(js|ts|py|java|go|rs|rb|php|cpp|c|h|json|md|txt|yml|yaml)$/)) {
          const cleaned = line.trim();
          if (cleaned) {
            structure.push(cleaned);
          }
        }
        // Directory patterns
        else if (line.match(/^[\s]*[\w-]+\/[\s]*$/)) {
          const cleaned = line.trim();
          if (cleaned) {
            structure.push(cleaned);
          }
        }
      }
    }

    // Extract file/directory mentions from text
    const textContent = content.toLowerCase();
    const commonPaths = [
      'src/', 'lib/', 'dist/', 'build/', 'public/', 'assets/',
      'components/', 'pages/', 'utils/', 'helpers/', 'services/',
      'controllers/', 'models/', 'views/', 'routes/', 'middleware/',
      'tests/', 'test/', '__tests__/', 'spec/', 'docs/', 'documentation/'
    ];

    for (const path of commonPaths) {
      if (textContent.includes(path)) {
        structure.push(path);
      }
    }

    // Extract specific file and directory mentions
    const filePatterns = [
      /src\/[\w.-]+\.(js|ts|py|java|go|rs|rb|php|cpp|c|h)/gi,
      /src\/[\w-]+\//gi,  // src/components/, src/pages/, etc.
      /[\w.-]+\.(json|md|txt|yml|yaml|config\.js|config\.ts)/gi
    ];

    for (const pattern of filePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        structure.push(match[0]);
      }
    }

    return structure.length > 0 ? [...new Set(structure)] : undefined;
  }

  private extractEnvironmentVariables(ast: MarkdownAST, content: string): EnvironmentVariable[] | undefined {
    const envVars: EnvironmentVariable[] = [];

    // Look for environment variable patterns with default values
    const envPatterns = [
      // Pattern: VAR_NAME=default_value
      /(?:^|\s)([A-Z][A-Z0-9_]*)\s*=\s*([^\s\n]+)/gm,
      // Pattern: process.env.VAR_NAME
      /process\.env\.([A-Z][A-Z0-9_]*)/gm,
      // Pattern: ${VAR_NAME}
      /\$\{?([A-Z][A-Z0-9_]*)\}?/gm,
      // Pattern: export VAR_NAME=value
      /export\s+([A-Z][A-Z0-9_]*)\s*=\s*([^\s\n]+)/gm,
      // Pattern: DEBUG=true (case insensitive for some vars)
      /(?:^|\s)(DEBUG|NODE_ENV|PORT)\s*=\s*([^\s\n]+)/gmi,
      // Pattern: mentions in text like "Set NODE_ENV and DATABASE_URL"
      /(?:set|use|configure|export)\s+([A-Z][A-Z0-9_]*)/gmi,
      // Pattern: environment variable names in context (more specific)
      /(?:environment|env|variable|config)\s+(?:variable[s]?|var[s]?)?[:\s]*([A-Z][A-Z0-9_]*)/gmi,
      // Pattern: "VAR1 and VAR2" pattern
      /([A-Z][A-Z0-9_]*)\s+and\s+([A-Z][A-Z0-9_]*)/gm,
      // Pattern: code-formatted environment variables like `REACT_APP_API_URL`
      /`([A-Z][A-Z0-9_]*)`/gm
    ];

    for (const pattern of envPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        // Handle different pattern types
        if (pattern.source.includes('and')) {
          // "VAR1 and VAR2" pattern - both variables, no default values
          const name1 = match[1]?.toUpperCase();
          const name2 = match[2]?.toUpperCase();
          
          for (const name of [name1, name2].filter(Boolean)) {
            if (name && name.length > 1) {
              const existing = envVars.find(env => env.name === name);
              if (!existing) {
                const description = this.getEnvVarDescription(name);
                envVars.push({
                  name,
                  required: this.isRequiredEnvVar(name),
                  ...(description && { description })
                });
              }
            }
          }
        } else {
          // Regular patterns with potential default values
          const name = match[1]?.toUpperCase();
          const defaultValue = match[2];
          
          if (name && name.length > 1) {
            const existing = envVars.find(env => env.name === name);
            if (!existing) {
              const description = this.getEnvVarDescription(name);
              const processedDefaultValue = defaultValue && defaultValue !== name ? defaultValue.replace(/['"]/g, '') : undefined;
              envVars.push({
                name,
                required: this.isRequiredEnvVar(name),
                ...(description && { description }),
                ...(processedDefaultValue && { defaultValue: processedDefaultValue })
              });
            } else if (defaultValue && !existing.defaultValue && defaultValue !== name) {
              existing.defaultValue = defaultValue.replace(/['"]/g, '');
            }
          }
        }
      }
    }

    return envVars.length > 0 ? envVars : undefined;
  }

  private isRequiredEnvVar(name: string): boolean {
    const requiredVars = ['DATABASE_URL', 'API_KEY', 'SECRET_KEY'];
    return requiredVars.includes(name);
  }

  private getEnvVarDescription(name: string): string | undefined {
    const descriptions: Record<string, string> = {
      'NODE_ENV': 'Node.js environment (development, production, test)',
      'PORT': 'Server port number',
      'DATABASE_URL': 'Database connection URL',
      'API_KEY': 'API authentication key',
      'SECRET_KEY': 'Secret key for encryption/signing'
    };
    return descriptions[name];
  }

  private isValidProjectName(name: string): boolean {
    if (!name || name.length < 2) return false;
    
    // Reject common invalid names
    const invalidNames = [
      'readme', 'readme.md', 'project', 'installation', 'getting started',
      'usage', 'documentation', 'docs', 'api', 'examples', 'license',
      'contributing', 'changelog', 'todo', 'features', 'requirements'
    ];
    
    return !invalidNames.includes(name.toLowerCase());
  }

  private cleanProjectName(name: string): string {
    // Remove markdown formatting
    return name
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold
      .replace(/\*(.*?)\*/g, '$1')      // Remove italic
      .replace(/_(.*?)_/g, '$1')        // Remove underscore italic
      .replace(/`(.*?)`/g, '$1')        // Remove code formatting
      .trim();
  }

  private calculateConfidence(metadata: ProjectMetadata, _content: string): number {
    let confidence = 0;

    // Project name confidence
    if (metadata.name) {
      confidence += 0.4;
    }

    // Description confidence
    if (metadata.description) {
      confidence += 0.3;
    }

    // Structure confidence
    if (metadata.structure && metadata.structure.length > 0) {
      confidence += 0.2;
    }

    // Environment variables confidence
    if (metadata.environment && metadata.environment.length > 0) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }
}