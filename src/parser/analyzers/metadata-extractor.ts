import { AnalyzerResult, ProjectMetadata, MarkdownAST, EnvironmentVariable } from '../types';
import { AnalysisContext } from '../../shared/types/analysis-context';
import { BaseAnalyzer } from './base-analyzer';
import { MarkdownUtils } from '../../shared/markdown-parser';

/**
 * Extracts project metadata from README content with context sharing capabilities
 */
export class MetadataExtractor extends BaseAnalyzer<ProjectMetadata> {
  readonly name = 'MetadataExtractor';

  async analyze(
    ast: MarkdownAST, 
    content: string, 
    context?: AnalysisContext
  ): Promise<AnalyzerResult<ProjectMetadata>> {
    try {
      // Set analysis context if provided
      if (context) {
        this.setAnalysisContext(context);
      }

      // Get context information to enhance metadata extraction
      const contextInfo = this.getContextInfo(context);
      
      const metadata = this.extractMetadata(ast, content, contextInfo);
      const confidence = this.calculateMetadataConfidence(metadata, content, contextInfo);
      
      const sources = ['title-extraction', 'description-extraction'];
      if (metadata.structure) {
        sources.push('structure-parsing');
      }
      if (metadata.environment) {
        sources.push('environment-detection');
      }
      
      // Share metadata results with context
      if (context) {
        this.updateSharedData('projectMetadata', metadata);
        this.updateSharedData('projectName', metadata.name);
        this.updateSharedData('projectDescription', metadata.description);
        
        // Validate data flow to potential consumers
        this.validateDataFlow('YamlGenerator', ['projectMetadata']);
      }

      return this.createSuccessResult(metadata, confidence, sources);
    } catch (error) {
      const parseError = this.createError(
        'METADATA_EXTRACTION_ERROR',
        `Failed to extract metadata: ${(error as Error).message}`,
        'error'
      );
      return this.createErrorResult(parseError);
    }
  }
  
  /**
   * Get context information to enhance metadata extraction
   */
  private getContextInfo(context?: AnalysisContext): {
    languages: string[];
    dependencies: any[];
    commands: any[];
  } {
    const info = {
      languages: [] as string[],
      dependencies: [] as any[],
      commands: [] as any[]
    };
    
    if (!context) return info;
    
    try {
      // Get language information
      const languageContexts = this.getLanguageContexts();
      info.languages = languageContexts.map(lc => lc.language);
      
      // Get dependency information
      const dependencyData = this.getSharedData('extracted_dependencies');
      if (dependencyData && typeof dependencyData === 'object') {
        info.dependencies = [
          ...((dependencyData as any).dependencies || []),
          ...((dependencyData as any).packages || [])
        ];
      }
      
      // Get command information
      const commandData = this.getSharedData('extracted_commands');
      if (commandData && typeof commandData === 'object') {
        info.commands = [
          ...((commandData as any).build || []),
          ...((commandData as any).test || []),
          ...((commandData as any).run || []),
          ...((commandData as any).install || [])
        ];
      }
      
      console.log(`✅ [${this.name}] Using context info - Languages: ${info.languages.length}, Dependencies: ${info.dependencies.length}, Commands: ${info.commands.length}`);
      
    } catch (error) {
      console.warn(`⚠️ [${this.name}] Failed to get context info:`, error);
    }
    
    return info;
  }
  
  /**
   * Share metadata results with analysis context
   */
  private shareMetadataResults(context: AnalysisContext, metadata: ProjectMetadata): void {
    try {
      // Store metadata in shared data
      this.updateSharedData('extracted_metadata', metadata);
      
      // Create project summary for other analyzers
      const projectSummary = {
        name: metadata.name,
        description: metadata.description,
        hasStructure: !!(metadata.structure && metadata.structure.length > 0),
        hasEnvironmentVars: !!(metadata.environment && metadata.environment.length > 0),
        structureCount: metadata.structure?.length || 0,
        envVarCount: metadata.environment?.length || 0
      };
      
      this.updateSharedData('project_summary', projectSummary);
      
      console.log(`✅ [${this.name}] Shared metadata results for project: ${metadata.name}`);
      
    } catch (error) {
      console.warn(`⚠️ [${this.name}] Failed to share metadata results:`, error);
    }
  }

  private extractMetadata(
    ast: MarkdownAST, 
    content: string, 
    contextInfo?: { languages: string[]; dependencies: any[]; commands: any[] }
  ): ProjectMetadata {
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

    // Extract environment variables (enhanced with context)
    const environment = this.extractEnvironmentVariables(ast, content, contextInfo);
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

  private extractEnvironmentVariables(
    ast: MarkdownAST, 
    content: string, 
    contextInfo?: { languages: string[]; dependencies: any[]; commands: any[] }
  ): EnvironmentVariable[] | undefined {
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

    // Enhance with context-based environment variables
    if (contextInfo) {
      this.enhanceEnvVarsWithContext(envVars, contextInfo);
    }
    
    return envVars.length > 0 ? envVars : undefined;
  }
  
  /**
   * Enhance environment variables with context information
   */
  private enhanceEnvVarsWithContext(
    envVars: EnvironmentVariable[], 
    contextInfo: { languages: string[]; dependencies: any[]; commands: any[] }
  ): void {
    try {
      // Add language-specific environment variables
      for (const language of contextInfo.languages) {
        const langEnvVars = this.getLanguageSpecificEnvVars(language);
        for (const envVar of langEnvVars) {
          const existing = envVars.find(ev => ev.name === envVar.name);
          if (!existing) {
            envVars.push(envVar);
          }
        }
      }
      
      // Add dependency-specific environment variables
      for (const dependency of contextInfo.dependencies) {
        const depEnvVars = this.getDependencySpecificEnvVars(dependency);
        for (const envVar of depEnvVars) {
          const existing = envVars.find(ev => ev.name === envVar.name);
          if (!existing) {
            envVars.push(envVar);
          }
        }
      }
      
    } catch (error) {
      console.warn(`⚠️ [${this.name}] Failed to enhance env vars with context:`, error);
    }
  }
  
  /**
   * Get language-specific environment variables
   */
  private getLanguageSpecificEnvVars(language: string): EnvironmentVariable[] {
    const languageEnvVars: Record<string, EnvironmentVariable[]> = {
      'JavaScript': [
        { name: 'NODE_ENV', description: 'Node.js environment', required: false, defaultValue: 'development' },
        { name: 'PORT', description: 'Server port', required: false, defaultValue: '3000' }
      ],
      'TypeScript': [
        { name: 'NODE_ENV', description: 'Node.js environment', required: false, defaultValue: 'development' },
        { name: 'PORT', description: 'Server port', required: false, defaultValue: '3000' }
      ],
      'Python': [
        { name: 'PYTHONPATH', description: 'Python module search path', required: false },
        { name: 'FLASK_ENV', description: 'Flask environment', required: false, defaultValue: 'development' },
        { name: 'DJANGO_SETTINGS_MODULE', description: 'Django settings module', required: false }
      ],
      'Go': [
        { name: 'GOPATH', description: 'Go workspace path', required: false },
        { name: 'GO111MODULE', description: 'Go modules mode', required: false, defaultValue: 'on' }
      ],
      'Rust': [
        { name: 'RUST_LOG', description: 'Rust logging level', required: false, defaultValue: 'info' }
      ]
    };
    
    return languageEnvVars[language] || [];
  }
  
  /**
   * Get dependency-specific environment variables
   */
  private getDependencySpecificEnvVars(dependency: any): EnvironmentVariable[] {
    const envVars: EnvironmentVariable[] = [];
    
    if (!dependency.name) return envVars;
    
    const depName = dependency.name.toLowerCase();
    
    // Database dependencies
    if (depName.includes('postgres') || depName.includes('pg')) {
      envVars.push({ name: 'DATABASE_URL', description: 'PostgreSQL connection URL', required: true });
    } else if (depName.includes('mysql')) {
      envVars.push({ name: 'MYSQL_URL', description: 'MySQL connection URL', required: true });
    } else if (depName.includes('mongodb') || depName.includes('mongoose')) {
      envVars.push({ name: 'MONGODB_URI', description: 'MongoDB connection URI', required: true });
    }
    
    // Redis dependencies
    if (depName.includes('redis')) {
      envVars.push({ name: 'REDIS_URL', description: 'Redis connection URL', required: false });
    }
    
    // Authentication dependencies
    if (depName.includes('jwt') || depName.includes('auth')) {
      envVars.push({ name: 'JWT_SECRET', description: 'JWT signing secret', required: true });
    }
    
    return envVars;
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
      'contributing', 'changelog', 'todo', 'features', 'requirements',
      'untitled', 'new project', 'my project', 'test', 'example', 
      'sample', 'demo', 'hello world', 'guide', 'tutorial'
    ];
    
    return !invalidNames.includes(name.toLowerCase().trim());
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

  private calculateMetadataConfidence(
    metadata: ProjectMetadata, 
    _content: string, 
    contextInfo?: { languages: string[]; dependencies: any[]; commands: any[] }
  ): number {
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
    
    // Context enhancement bonus
    if (contextInfo) {
      const contextBonus = this.calculateContextBonus(contextInfo);
      confidence += contextBonus;
    }

    return Math.min(confidence, 1.0);
  }
  
  /**
   * Calculate confidence bonus from context information
   */
  private calculateContextBonus(contextInfo: { languages: string[]; dependencies: any[]; commands: any[] }): number {
    let bonus = 0;
    
    // Bonus for having language context
    if (contextInfo.languages.length > 0) {
      bonus += 0.05;
    }
    
    // Bonus for having dependency context
    if (contextInfo.dependencies.length > 0) {
      bonus += 0.05;
    }
    
    // Bonus for having command context
    if (contextInfo.commands.length > 0) {
      bonus += 0.05;
    }
    
    return Math.min(bonus, 0.15); // Cap at 15% bonus
  }
}