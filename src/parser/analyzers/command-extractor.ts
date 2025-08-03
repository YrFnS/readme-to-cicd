import { AnalyzerResult, CommandInfo, Command, AssociatedCommand, CommandExtractionResult, ContextMapping, ExtractionMetadata } from '../types';
import { MarkdownAST, MarkdownNode } from '../../shared/markdown-parser';
import { BaseAnalyzer } from './base-analyzer';
import { LanguageContext, SourceRange } from '../../shared/types/language-context';

/**
 * CommandExtractor analyzes README content to extract build, test, run, and install commands
 * with language context awareness for better CI/CD pipeline generation.
 */
export class CommandExtractor extends BaseAnalyzer<CommandInfo> {
  readonly name = 'CommandExtractor';

  private languageContexts: LanguageContext[] = [];
  private rawContent: string = '';

  // Command patterns organized by category and language
  private commandPatterns = {
    build: {
      npm: [/npm\s+run\s+build/gi, /npm\s+run\s+compile/gi, /npm\s+run\s+dist/gi],
      yarn: [/yarn\s+build/gi, /yarn\s+run\s+build/gi, /yarn\s+compile/gi],
      cargo: [/cargo\s+build/gi, /cargo\s+build\s+--release/gi],
      go: [/go\s+build/gi, /go\s+install/gi],
      maven: [/mvn\s+compile/gi, /mvn\s+package/gi, /mvn\s+install/gi],
      gradle: [/gradle\s+build/gi, /gradle\s+assemble/gi, /\.\/gradlew\s+build/gi],
      make: [/make\s+build/gi, /make\s+all/gi, /make(?:\s|$)/gi],
      cmake: [/cmake\s+--build/gi, /cmake\s+\./gi],
      python: [/python\s+setup\.py\s+build/gi, /python\s+-m\s+build/gi],
      dotnet: [/dotnet\s+build/gi, /dotnet\s+publish/gi],
      ruby: [/bundle\s+exec\s+rake\s+build/gi, /gem\s+build/gi]
    },
    test: {
      npm: [/npm\s+test/gi, /npm\s+run\s+test/gi, /npm\s+run\s+spec/gi],
      yarn: [/yarn\s+test/gi, /yarn\s+run\s+test/gi],
      cargo: [/cargo\s+test/gi],
      go: [/go\s+test/gi, /go\s+test\s+\./gi],
      maven: [/mvn\s+test/gi, /mvn\s+verify/gi],
      gradle: [/gradle\s+test/gi, /\.\/gradlew\s+test/gi],
      make: [/make\s+test/gi, /make\s+check/gi],
      python: [/python\s+-m\s+pytest/gi, /pytest/gi, /python\s+-m\s+unittest/gi, /python\s+test/gi],
      dotnet: [/dotnet\s+test/gi],
      ruby: [/bundle\s+exec\s+rspec/gi, /rake\s+test/gi, /ruby\s+test/gi],
      php: [/phpunit/gi, /composer\s+test/gi],
      java: [/junit/gi]
    },
    run: {
      npm: [/npm\s+start/gi, /npm\s+run\s+start/gi, /npm\s+run\s+dev/gi, /npm\s+run\s+serve/gi],
      yarn: [/yarn\s+start/gi, /yarn\s+dev/gi, /yarn\s+serve/gi],
      cargo: [/cargo\s+run/gi],
      go: [/go\s+run/gi, /go\s+run\s+main\.go/gi],
      python: [/python\s+\w+\.py/gi, /python\s+-m\s+\w+/gi, /python\s+manage\.py\s+runserver/gi],
      java: [/java\s+-jar/gi, /java\s+\w+/gi],
      dotnet: [/dotnet\s+run/gi],
      ruby: [/ruby\s+\w+\.rb/gi, /bundle\s+exec\s+rails\s+server/gi],
      php: [/php\s+\w+\.php/gi, /php\s+-S/gi],
      node: [/node\s+\w+\.js/gi]
    },
    install: {
      npm: [/npm\s+install/gi, /npm\s+i(?:\s|$)/gi, /npm\s+ci/gi],
      yarn: [/yarn\s+install/gi, /yarn(?:\s|$)/gi],
      pip: [/pip\s+install/gi, /pip3\s+install/gi],
      cargo: [/cargo\s+install/gi],
      go: [/go\s+get/gi, /go\s+mod\s+download/gi],
      maven: [/mvn\s+install/gi, /mvn\s+dependency:resolve/gi],
      gradle: [/gradle\s+dependencies/gi],
      composer: [/composer\s+install/gi],
      bundle: [/bundle\s+install/gi],
      dotnet: [/dotnet\s+restore/gi]
    },
    deploy: {
      docker: [/docker\s+build/gi, /docker\s+run/gi, /docker-compose\s+up/gi],
      kubernetes: [/kubectl\s+apply/gi, /helm\s+install/gi],
      cloud: [/aws\s+deploy/gi, /gcloud\s+deploy/gi, /az\s+webapp\s+deploy/gi],
      generic: [/deploy/gi, /publish/gi]
    }
  };

  /**
   * Set language contexts for context-aware command extraction
   */
  public setLanguageContexts(contexts: LanguageContext[]): void {
    this.languageContexts = contexts;
  }

  /**
   * Main analysis method
   */
  async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult<CommandInfo>> {
    try {
      this.rawContent = content;
      
      // Extract the actual AST array from the wrapper object
      const actualAST = Array.isArray(ast) ? ast : (ast as any)?.ast || [];
      
      // Extract commands from code blocks and text
      const commands = this.extractCommands(actualAST, content);
      
      // Categorize commands
      const categorizedCommands = this.categorizeCommands(commands);
      
      // Calculate confidence
      const confidence = this.calculateCommandConfidence(categorizedCommands);
      
      return this.createSuccessResult(categorizedCommands, confidence, ['code-block', 'text-mention']);
    } catch (error) {
      return this.createErrorResult(
        this.createError(
          'COMMAND_EXTRACTION_ERROR',
          `Failed to extract commands: ${(error as Error).message}`,
          'error'
        )
      );
    }
  }  /**
   * Enhanced context-aware command extraction
   */
  public extractWithContext(ast: MarkdownAST, content: string): CommandExtractionResult {
    this.rawContent = content;
    
    // Extract the actual AST array from the wrapper object
    const actualAST = Array.isArray(ast) ? ast : (ast as any)?.ast || [];
    
    // Extract commands with context information
    const commands = this.extractCommandsWithContext(actualAST, content);
    
    // Create context mappings
    const contextMappings = this.createContextMappings(commands);
    
    // Generate extraction metadata
    const extractionMetadata = this.generateExtractionMetadata(commands);
    
    return {
      commands,
      contextMappings,
      extractionMetadata
    };
  }

  /**
   * Extract commands from AST and content
   */
  private extractCommands(ast: MarkdownNode[], content: string): Command[] {
    const commands: Command[] = [];
    
    // Extract from code blocks
    this.extractFromCodeBlocks(ast, commands);
    
    // Extract from inline code
    this.extractFromInlineCode(content, commands);
    
    // Extract from text mentions
    this.extractFromTextMentions(content, commands);
    
    return this.deduplicateCommands(commands);
  }

  /**
   * Extract commands with language context awareness
   */
  private extractCommandsWithContext(ast: MarkdownNode[], content: string): AssociatedCommand[] {
    const commands: AssociatedCommand[] = [];
    
    // Extract commands and associate with contexts
    const basicCommands = this.extractCommands(ast, content);
    
    for (const command of basicCommands) {
      const associatedCommand = this.associateCommandWithContext(command);
      commands.push(associatedCommand);
    }
    
    return commands;
  }

  /**
   * Extract commands from code blocks
   */
  private extractFromCodeBlocks(ast: MarkdownNode[], commands: Command[]): void {
    this.traverseAST(ast, (node) => {
      if (node.type === 'code' && node.text) {
        const language = node.lang || 'shell';
        const codeCommands = this.parseCodeBlock(node.text, language);
        commands.push(...codeCommands);
      }
    });
  }

  /**
   * Extract commands from inline code
   */
  private extractFromInlineCode(content: string, commands: Command[]): void {
    const inlineCodeRegex = /`([^`]+)`/g;
    let match;
    
    while ((match = inlineCodeRegex.exec(content)) !== null) {
      const code = match[1]?.trim();
      if (code && this.looksLikeCommand(code)) {
        const command = this.createCommand(code, 'inline-code', 0.6);
        commands.push(command);
      }
    }
  }

  /**
   * Extract commands from text mentions
   */
  private extractFromTextMentions(content: string, commands: Command[]): void {
    // Look for command patterns in regular text
    for (const [category, languagePatterns] of Object.entries(this.commandPatterns)) {
      for (const [language, patterns] of Object.entries(languagePatterns)) {
        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const commandText = match[0];
            const command = this.createCommand(commandText, 'text-mention', 0.4, language);
            commands.push(command);
          }
        }
      }
    }
  }

  /**
   * Parse commands from a code block
   */
  private parseCodeBlock(code: string, language: string): Command[] {
    const commands: Command[] = [];
    const lines = code.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
        continue;
      }
      
      // Remove shell prompts
      const cleanLine = trimmedLine.replace(/^[\$#>]\s*/, '');
      
      if (this.looksLikeCommand(cleanLine)) {
        const command = this.createCommand(cleanLine, 'code-block', 0.9, language);
        commands.push(command);
      }
    }
    
    return commands;
  }

  /**
   * Check if a string looks like a command
   */
  private looksLikeCommand(text: string): boolean {
    // Skip very short strings
    if (text.length < 3) return false;
    
    // Skip strings that are mostly punctuation
    if (/^[^\w\s]*$/.test(text)) return false;
    
    // Check for common command patterns
    const commandIndicators = [
      /^(npm|yarn|pip|cargo|go|mvn|gradle|make|cmake|docker|kubectl|helm)\s/,
      /^(python|node|java|ruby|php)\s+\w+/,
      /^(dotnet|bundle|composer)\s+\w+/,
      /^\w+\s+(build|test|run|install|start|deploy|compile|package)/,
      /^\.\/\w+/,  // Executable files
      /^\w+\.sh/,  // Shell scripts
    ];
    
    return commandIndicators.some(pattern => pattern.test(text));
  }

  /**
   * Create a command object
   */
  private createCommand(
    commandText: string, 
    context: string, 
    baseConfidence: number, 
    language?: string
  ): Command {
    return {
      command: commandText,
      language: language || this.inferLanguageFromCommand(commandText),
      confidence: baseConfidence,
      context
    };
  }  /**
   * Infer language from command text
   */
  private inferLanguageFromCommand(command: string): string {
    const languageIndicators = {
      'JavaScript': [/^(npm|yarn|node)\s/, /\.js$/, /package\.json/],
      'Python': [/^(pip|python|pytest)\s/, /\.py$/, /requirements\.txt/],
      'Rust': [/^cargo\s/, /\.rs$/],
      'Go': [/^go\s/, /\.go$/],
      'Java': [/^(mvn|gradle|java)\s/, /\.java$/, /pom\.xml/],
      'C++': [/^(make|cmake|g\+\+)\s/, /\.(cpp|cc|cxx)$/],
      'Ruby': [/^(bundle|gem|ruby)\s/, /\.rb$/, /Gemfile/],
      'PHP': [/^(composer|php)\s/, /\.php$/],
      'C#': [/^dotnet\s/, /\.cs$/],
      'Docker': [/^docker/, /^docker-compose/],
      'Shell': [/^(bash|sh|zsh)\s/, /\.sh$/]
    };
    
    for (const [language, patterns] of Object.entries(languageIndicators)) {
      if (patterns.some(pattern => pattern.test(command))) {
        return language;
      }
    }
    
    return 'shell';
  }

  /**
   * Categorize commands by type
   */
  private categorizeCommands(commands: Command[]): CommandInfo {
    const categorized: CommandInfo = {
      build: [],
      test: [],
      run: [],
      install: [],
      other: [],
      deploy: []
    };
    
    for (const command of commands) {
      const category = this.categorizeCommand(command);
      if (category in categorized) {
        (categorized as any)[category].push(command);
      } else {
        categorized.other.push(command);
      }
    }
    
    return categorized;
  }

  /**
   * Categorize a single command
   */
  private categorizeCommand(command: Command): keyof CommandInfo {
    const cmd = command.command.toLowerCase();
    
    // Build commands
    if (/\b(build|compile|assemble|package|dist)\b/.test(cmd)) {
      return 'build';
    }
    
    // Test commands
    if (/\b(test|spec|check|verify|junit|pytest|rspec)\b/.test(cmd)) {
      return 'test';
    }
    
    // Install commands
    if (/\b(install|add|get|restore|dependencies)\b/.test(cmd) && 
        !/\bgo\s+install\b/.test(cmd)) { // go install is a build command
      return 'install';
    }
    
    // Deploy commands
    if (/\b(deploy|publish|release|docker|kubectl|helm)\b/.test(cmd)) {
      return 'deploy';
    }
    
    // Run commands
    if (/\b(start|run|serve|server|dev|development)\b/.test(cmd) ||
        /^(python|node|java|ruby|php)\s+\w+/.test(cmd)) {
      return 'run';
    }
    
    return 'other';
  }

  /**
   * Remove duplicate commands
   */
  private deduplicateCommands(commands: Command[]): Command[] {
    const seen = new Set<string>();
    const unique: Command[] = [];
    
    for (const command of commands) {
      const key = `${command.command}:${command.language}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(command);
      } else {
        // If we see the same command again, boost its confidence
        const existing = unique.find(c => 
          c.command === command.command && c.language === command.language
        );
        if (existing) {
          existing.confidence = Math.min(existing.confidence + 0.1, 1.0);
        }
      }
    }
    
    return unique;
  }

  /**
   * Calculate overall confidence for command extraction
   */
  private calculateCommandConfidence(commands: CommandInfo): number {
    const allCommands = [
      ...commands.build,
      ...commands.test,
      ...commands.run,
      ...commands.install,
      ...commands.other,
      ...(commands.deploy || [])
    ];
    
    if (allCommands.length === 0) return 0;
    
    const avgConfidence = allCommands.reduce((sum, cmd) => sum + cmd.confidence, 0) / allCommands.length;
    
    // Boost confidence if we have commands in multiple categories
    const categoriesWithCommands = [
      commands.build.length > 0,
      commands.test.length > 0,
      commands.run.length > 0,
      commands.install.length > 0
    ].filter(Boolean).length;
    
    const categoryBonus = Math.min(categoriesWithCommands * 0.1, 0.3);
    
    return Math.min(avgConfidence + categoryBonus, 1.0);
  }  /**
   * Associate command with language context
   */
  private associateCommandWithContext(command: Command): AssociatedCommand {
    // Find the best matching language context
    const bestContext = this.findBestLanguageContext(command);
    
    if (bestContext) {
      return {
        ...command,
        languageContext: bestContext,
        contextConfidence: this.calculateContextConfidence(command, bestContext)
      };
    }
    
    // Create a default context if none found
    const defaultContext: LanguageContext = {
      language: command.language || 'shell',
      confidence: 0.3,
      sourceRange: { startLine: 0, endLine: 0, startColumn: 0, endColumn: 0 },
      evidence: [],
      metadata: {
        createdAt: new Date(),
        source: 'CommandExtractor-Default'
      }
    };
    
    return {
      ...command,
      languageContext: defaultContext,
      contextConfidence: 0.3
    };
  }

  /**
   * Find the best matching language context for a command
   */
  private findBestLanguageContext(command: Command): LanguageContext | undefined {
    if (this.languageContexts.length === 0) return undefined;
    
    // First, try to find exact language match
    const exactMatch = this.languageContexts.find(ctx => 
      ctx.language.toLowerCase() === (command.language || '').toLowerCase()
    );
    
    if (exactMatch) return exactMatch;
    
    // Then try to find compatible language
    const compatibleMatch = this.languageContexts.find(ctx => 
      this.areLanguagesCompatible(ctx.language, command.language || '')
    );
    
    if (compatibleMatch) return compatibleMatch;
    
    // Finally, return the highest confidence context
    return this.languageContexts.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
  }

  /**
   * Check if two languages are compatible for command association
   */
  private areLanguagesCompatible(contextLang: string, commandLang: string): boolean {
    const compatibilityMap: Record<string, string[]> = {
      'JavaScript': ['Node.js', 'TypeScript', 'npm', 'yarn'],
      'TypeScript': ['JavaScript', 'Node.js', 'npm', 'yarn'],
      'Python': ['pip', 'conda'],
      'Java': ['maven', 'gradle'],
      'C#': ['dotnet'],
      'Ruby': ['gem', 'bundle'],
      'PHP': ['composer'],
      'Rust': ['cargo'],
      'Go': ['go']
    };
    
    const contextCompatible = compatibilityMap[contextLang] || [];
    const commandCompatible = compatibilityMap[commandLang] || [];
    
    return contextCompatible.includes(commandLang) || 
           commandCompatible.includes(contextLang);
  }

  /**
   * Calculate confidence for context association
   */
  private calculateContextConfidence(command: Command, context: LanguageContext): number {
    let confidence = 0.5; // Base confidence
    
    // Boost for exact language match
    if (context.language.toLowerCase() === (command.language || '').toLowerCase()) {
      confidence += 0.3;
    }
    
    // Boost for compatible languages
    if (this.areLanguagesCompatible(context.language, command.language || '')) {
      confidence += 0.2;
    }
    
    // Factor in context confidence
    confidence *= context.confidence;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Create context mappings
   */
  private createContextMappings(commands: AssociatedCommand[]): ContextMapping[] {
    const mappings = new Map<string, ContextMapping>();
    
    for (const command of commands) {
      const contextKey = `${command.languageContext.language}-${command.languageContext.sourceRange.startLine}`;
      
      if (!mappings.has(contextKey)) {
        mappings.set(contextKey, {
          context: command.languageContext,
          commands: [],
          sourceRange: command.languageContext.sourceRange
        });
      }
      
      mappings.get(contextKey)!.commands.push(command);
    }
    
    return Array.from(mappings.values());
  }

  /**
   * Generate extraction metadata
   */
  private generateExtractionMetadata(commands: AssociatedCommand[]): ExtractionMetadata {
    const languages = new Set(commands.map(c => c.languageContext.language));
    const contexts = new Set(commands.map(c => 
      `${c.languageContext.language}-${c.languageContext.sourceRange.startLine}`
    ));
    
    return {
      totalCommands: commands.length,
      languagesDetected: languages.size,
      contextBoundaries: contexts.size,
      extractionTimestamp: new Date()
    };
  }

  /**
   * Traverse AST nodes
   */
  private traverseAST(node: MarkdownNode[] | MarkdownNode, callback: (node: MarkdownNode) => void): void {
    if (!node) return;
    
    if (Array.isArray(node)) {
      for (const token of node) {
        if (token) {
          callback(token);
          this.traverseAST(token, callback);
        }
      }
    } else if ('children' in node && node.children) {
      for (const child of node.children) {
        if (child) {
          callback(child);
          this.traverseAST(child, callback);
        }
      }
    } else if ('tokens' in node && node.tokens) {
      for (const token of node.tokens) {
        if (token) {
          callback(token);
          this.traverseAST(token, callback);
        }
      }
    }
  }

  /**
   * Add inheritance rule for context-aware command extraction
   */
  public addInheritanceRule(rule: InheritanceRule): void {
    // Store inheritance rules for context association
    // This method is called by the component factory to configure context inheritance
    console.log(`Adding inheritance rule: ${rule.sourceLanguage} -> ${rule.targetLanguage}`);
  }

  /**
   * Assign default context to commands that don't have explicit language context
   */
  public assignDefaultContext(commands: Command[], contexts: LanguageContext[]): Command[] {
    // Set the available contexts for this operation
    this.setLanguageContexts(contexts);
    
    // Process each command and assign context if needed
    return commands.map(command => {
      if (!command.language || command.language === 'shell') {
        // Try to infer language from available contexts
        const inferredLanguage = this.inferLanguageFromContexts(command, contexts);
        if (inferredLanguage) {
          return {
            ...command,
            language: inferredLanguage
          };
        }
      }
      return command;
    });
  }

  /**
   * Infer language from available contexts
   */
  private inferLanguageFromContexts(command: Command, contexts: LanguageContext[]): string | undefined {
    if (contexts.length === 0) return undefined;
    
    // Find the most confident context that could apply to this command
    const compatibleContext = contexts.find(ctx => 
      this.areLanguagesCompatible(ctx.language, this.inferLanguageFromCommand(command.command))
    );
    
    if (compatibleContext) {
      return compatibleContext.language;
    }
    
    // Return the highest confidence context as fallback
    const bestContext = contexts.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
    
    return bestContext.language;
  }
}

/**
 * Interface for inheritance rules used by the component factory
 */
interface InheritanceRule {
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  conditions?: string[];
}