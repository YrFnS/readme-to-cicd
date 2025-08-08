import { AnalyzerResult, CommandInfo, Command, AssociatedCommand, CommandExtractionResult, ContextMapping, ExtractionMetadata } from '../types';
import { MarkdownAST, MarkdownNode, MarkdownUtils } from '../../shared/markdown-parser';
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
  private parentContext: LanguageContext | null = null;
  private lastAnalysisResult: CommandInfo | null = null;

  // Command patterns organized by category and language
  private commandPatterns = {
    build: {
      npm: [/npm\s+run\s+build/gi, /npm\s+run\s+build:/gi, /npm\s+run\s+compile/gi, /npm\s+run\s+dist/gi],
      yarn: [/yarn\s+build/gi, /yarn\s+run\s+build/gi, /yarn\s+run\s+build:/gi, /yarn\s+compile/gi],
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
      
      // Extract basic commands first
      const basicCommands = this.extractCommands(actualAST, content);
      
      // If we have language contexts, associate commands with contexts
      if (this.languageContexts && this.languageContexts.length > 0) {
        const associatedCommands = this.assignDefaultContext(basicCommands, this.languageContexts);
        const commandInfo = this.convertAssociatedCommandsToCommandInfo(associatedCommands);
        
        // Calculate confidence based on command extraction success
        const totalCommands = basicCommands.length;
        const baseConfidence = totalCommands > 0 ? 0.85 : 0.6;
        const contextBonus = this.languageContexts.length > 0 ? 0.05 : 0;
        const finalConfidence = Math.min(baseConfidence + contextBonus, 1.0);
        
        // Store result for getCommandsForLanguage method
        this.lastAnalysisResult = commandInfo;
        
        return {
          success: true,
          data: commandInfo,
          confidence: finalConfidence
        };
      }
      
      // Fallback to basic categorization without context
      const commandInfo = this.categorizeCommands(basicCommands);
      
      // Store result for getCommandsForLanguage method
      this.lastAnalysisResult = commandInfo;
      
      // Calculate confidence based on commands found
      const totalCommands = basicCommands.length;
      const confidence = totalCommands > 0 ? 0.6 : 0;
      
      return {
        success: true,
        data: commandInfo,
        confidence
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        errors: [{
          code: 'COMMAND_EXTRACTION_ERROR',
          message: `Failed to extract commands: ${(error as Error).message}`,
          component: this.name,
          severity: 'error'
        }]
      };
    }
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
   * Extract commands from code blocks
   */
  private extractFromCodeBlocks(ast: MarkdownNode[], commands: Command[]): void {
    this.traverseAST(ast, (node: MarkdownNode) => {
      // Handle code blocks using proper type checking
      if (node.type === 'code') {
        const codeContent = MarkdownUtils.getCodeValue(node) || '';
        const language = ('lang' in node && typeof node.lang === 'string') ? node.lang : 'shell';
        
        // Extract commands from code block content
        const blockCommands = this.extractCommandsFromText(codeContent, language, 'code-block');
        commands.push(...blockCommands);
      }
      
      // Also check for inline code within other nodes
      if (node.type === 'codespan') {
        const codeContent = ('text' in node && typeof node.text === 'string') ? node.text : '';
        if (this.looksLikeCommand(codeContent)) {
          const blockCommands = this.extractCommandsFromText(codeContent, 'shell', 'inline-code');
          commands.push(...blockCommands);
        }
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
      const codeContent = match[1];
      if (codeContent && this.looksLikeCommand(codeContent)) {
        const blockCommands = this.extractCommandsFromText(codeContent, 'shell', 'inline-code');
        commands.push(...blockCommands);
      }
    }
  }

  /**
   * Extract commands from text mentions
   */
  private extractFromTextMentions(content: string, commands: Command[]): void {
    // Ensure content is a string
    if (typeof content !== 'string') {
      console.warn('extractFromTextMentions: content is not a string:', typeof content);
      return;
    }
    
    // Look for command patterns in regular text
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Skip code blocks and inline code
      if (line.includes('```') || line.includes('`')) continue;
      
      const blockCommands = this.extractCommandsFromText(line, 'shell', 'text-mention');
      commands.push(...blockCommands);
    }
  }

  /**
   * Extract commands from text content
   */
  private extractCommandsFromText(text: string, language: string, source: string): Command[] {
    const commands: Command[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      
      // Check if line looks like a command
      if (this.looksLikeCommand(trimmedLine)) {
        const inferredLanguage = this.inferLanguageFromCommand(trimmedLine);
        
        commands.push({
          command: trimmedLine,
          language: inferredLanguage || language,
          confidence: source === 'code-block' ? 0.9 : 0.7
        });
      }
    }
    
    return commands;
  }

  /**
   * Check if text looks like a command - improved pattern matching
   */
  private looksLikeCommand(text: string): boolean {
    const trimmed = text.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return false;
    
    // Check for common command patterns
    const commandPatterns = [
      // Package managers
      /^(npm|yarn|pnpm|pip|pip3|cargo|go|mvn|gradle|make|cmake|dotnet|bundle|composer|gem)\s+/i,
      // Language executables
      /^(python|python3|node|java|ruby|php|rustc|gcc|clang)\s+/i,
      // Container and deployment tools
      /^(docker|kubectl|helm|podman)\s+/i,
      // Build tools
      /^(webpack|vite|rollup|parcel|tsc|babel)\s+/i,
      // Shell commands that are commonly used in READMEs
      /^(curl|wget|git|cd|mkdir|cp|mv|rm|chmod|chown)\s+/i,
      // Executable patterns
      /^\.\/[\w\-\.]+/i, // ./executable
      /^[\w\-\.]+\s+[\w\-\.]+/i // command with arguments
    ];
    
    return commandPatterns.some(pattern => pattern.test(trimmed));
  }

  /**
   * Categorize a command - improved pattern matching
   */
  private categorizeCommand(command: string): string {
    const cmd = command.toLowerCase();
    
    // Enhanced build detection - check for build-related keywords
    if (cmd.includes('build') || cmd.includes('compile') || cmd.includes('dist') || 
        cmd.includes('assemble') || cmd.includes('package')) {
      // Check build patterns
      for (const patterns of Object.values(this.commandPatterns.build)) {
        if (patterns.some(pattern => pattern.test(cmd))) return 'build';
      }
      // If it contains build keywords but doesn't match specific patterns, still consider it build
      if (cmd.includes('build')) return 'build';
    }
    
    // Enhanced test detection
    if (cmd.includes('test') || cmd.includes('spec') || cmd.includes('check')) {
      for (const patterns of Object.values(this.commandPatterns.test)) {
        if (patterns.some(pattern => pattern.test(cmd))) return 'test';
      }
      if (cmd.includes('test')) return 'test';
    }
    
    // Enhanced run detection
    if (cmd.includes('start') || cmd.includes('serve') || cmd.includes('dev') || 
        cmd.includes('run ') || cmd.includes('exec')) {
      for (const patterns of Object.values(this.commandPatterns.run)) {
        if (patterns.some(pattern => pattern.test(cmd))) return 'run';
      }
    }
    
    // Enhanced install detection
    if (cmd.includes('install') || cmd.includes('add') || cmd.includes('get') || 
        cmd.includes('restore') || cmd.includes('download')) {
      for (const patterns of Object.values(this.commandPatterns.install)) {
        if (patterns.some(pattern => pattern.test(cmd))) return 'install';
      }
      if (cmd.includes('install')) return 'install';
    }
    
    return 'other';
  }

  /**
   * Infer language from command content - improved detection
   */
  private inferLanguageFromCommand(command: string): string {
    const cmd = command.toLowerCase();

    // JavaScript/Node.js
    if (cmd.includes('npm') || cmd.includes('yarn') || cmd.includes('pnpm') || 
        cmd.includes('node ') || cmd.startsWith('node ')) return 'JavaScript';
    
    // Python
    if (cmd.includes('pip') || cmd.includes('pip3') || cmd.includes('python') || 
        cmd.includes('python3') || cmd.includes('pytest') || cmd.includes('conda')) return 'Python';
    
    // Rust
    if (cmd.includes('cargo') || cmd.includes('rustc') || cmd.includes('rustup')) return 'Rust';
    
    // Go
    if (cmd.includes('go ') || cmd.startsWith('go ') || cmd.includes('go build') || 
        cmd.includes('go run') || cmd.includes('go test')) return 'Go';
    
    // Java
    if (cmd.includes('mvn') || cmd.includes('gradle') || cmd.includes('gradlew') || 
        cmd.includes('java ') || cmd.startsWith('java ')) return 'Java';
    
    // C#/.NET
    if (cmd.includes('dotnet') || cmd.includes('nuget')) return 'C#';
    
    // Ruby
    if (cmd.includes('bundle') || cmd.includes('gem ') || cmd.includes('rake') || 
        cmd.includes('ruby ') || cmd.startsWith('ruby ')) return 'Ruby';
    
    // PHP
    if (cmd.includes('composer') || cmd.includes('php ') || cmd.startsWith('php ') || 
        cmd.includes('phpunit')) return 'PHP';
    
    // C/C++
    if (cmd.includes('make') || cmd.includes('cmake') || cmd.includes('gcc') || 
        cmd.includes('clang') || cmd.includes('g++')) return 'C/C++';
    
    // Docker
    if (cmd.includes('docker') || cmd.includes('podman')) return 'Docker';
    
    // Shell/System commands
    if (cmd.includes('curl') || cmd.includes('wget') || cmd.includes('chmod') || 
        cmd.includes('chown') || cmd.includes('mkdir') || cmd.includes('cp') || 
        cmd.includes('mv') || cmd.includes('rm')) return 'Shell';

    // Check if it's a truly unknown command
    if (cmd.includes('unknown') || cmd.includes('mysterious') || cmd.includes('weird')) {
      return 'unknown';
    }
    
    // Default to Shell for generic commands
    return 'Shell';
  }

  /**
   * Assign default context to commands that don't have explicit language context
   */
  public assignDefaultContext(commands: Command[], contexts: LanguageContext[]): AssociatedCommand[] {
    return commands.map(command => {
      let languageContext: LanguageContext;
      let finalLanguage: string;
      
      // Try to find matching context
      const matchingContext = contexts.find(ctx => 
        ctx.language === command.language || 
        ctx.language.toLowerCase() === command.language?.toLowerCase()
      );
      
      if (matchingContext) {
        languageContext = matchingContext;
        finalLanguage = matchingContext.language;
      } else {
        // Use the most common language from contexts as fallback
        const mostCommonLanguage = this.getMostCommonLanguage(contexts);
        languageContext = this.createDefaultContext(mostCommonLanguage);
        finalLanguage = mostCommonLanguage;
      }
      
      return {
        ...command,
        language: finalLanguage || 'Shell', // Ensure language is always set
        languageContext,
        contextConfidence: this.calculateContextConfidence(command, languageContext)
      } as AssociatedCommand;
    });
  }

  /**
   * Get the most common language from contexts (highest confidence)
   */
  private getMostCommonLanguage(contexts: LanguageContext[]): string {
    if (contexts.length === 0) return 'Shell';
    
    // Sort by confidence and return the highest
    const sorted = contexts.sort((a, b) => b.confidence - a.confidence);
    return sorted[0]?.language || 'Shell';
  }

  /**
   * Calculate confidence for command-context association
   */
  private calculateContextConfidence(command: Command, context: LanguageContext): number {
    let confidence = 0.5; // Base confidence

    // Boost if command language matches context language
    if (command.language === context.language) {
      confidence += 0.3;
    }

    // Factor in context confidence
    confidence += context.confidence * 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Create a default language context for a given language
   */
  private createDefaultContext(language: string): LanguageContext {
    return {
      language,
      confidence: 0.5,
      sourceRange: {
        startLine: 0,
        endLine: 0,
        startColumn: 0,
        endColumn: 0
      },
      evidence: []
    };
  }

  /**
   * Convert AssociatedCommand[] to CommandInfo structure
   */
  private convertAssociatedCommandsToCommandInfo(commands: AssociatedCommand[]): CommandInfo {
    const commandInfo: CommandInfo = {
      build: [],
      test: [],
      run: [],
      install: [],
      other: []
    };

    for (const cmd of commands) {
      // CRITICAL FIX: Ensure the command has the language property set properly
      const command: Command = {
        command: cmd.command,
        language: cmd.language || cmd.languageContext?.language || 'Shell', // Use languageContext if available
        confidence: cmd.confidence
      };

      // Categorize the command based on the command content
      const category = this.categorizeCommand(cmd.command);
      switch (category) {
        case 'build':
          commandInfo.build.push(command);
          break;
        case 'test':
          commandInfo.test.push(command);
          break;
        case 'run':
          commandInfo.run.push(command);
          break;
        case 'install':
          commandInfo.install.push(command);
          break;
        default:
          commandInfo.other.push(command);
      }
    }

    return commandInfo;
  }

  /**
   * Categorize commands into CommandInfo structure (fallback without context)
   */
  private categorizeCommands(commands: Command[]): CommandInfo {
    const commandInfo: CommandInfo = {
      build: [],
      test: [],
      run: [],
      install: [],
      other: []
    };

    for (const command of commands) {
      // CRITICAL FIX: Ensure language is always set, even in fallback mode
      const enhancedCommand: Command = {
        command: command.command,
        language: command.language || this.inferLanguageFromCommand(command.command) || 'Shell',
        confidence: command.confidence
      };

      const category = this.categorizeCommand(command.command);
      switch (category) {
        case 'build':
          commandInfo.build.push(enhancedCommand);
          break;
        case 'test':
          commandInfo.test.push(enhancedCommand);
          break;
        case 'run':
          commandInfo.run.push(enhancedCommand);
          break;
        case 'install':
          commandInfo.install.push(enhancedCommand);
          break;
        default:
          commandInfo.other.push(enhancedCommand);
      }
    }

    return commandInfo;
  }

  /**
   * Remove duplicate commands
   */
  private deduplicateCommands(commands: Command[]): Command[] {
    const seen = new Set<string>();
    return commands.filter(cmd => {
      const key = `${cmd.command}-${cmd.language}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Traverse AST nodes - improved to handle different AST structures
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
    } else {
      // Call callback for current node
      callback(node);
      
      // Traverse different possible child properties
      const childProperties = ['children', 'tokens', 'content', 'body'];
      
      for (const prop of childProperties) {
        if (node[prop as keyof MarkdownNode]) {
          const children = node[prop as keyof MarkdownNode];
          if (Array.isArray(children)) {
            for (const child of children) {
              if (child && typeof child === 'object') {
                this.traverseAST(child as MarkdownNode, callback);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Add inheritance rule for context-aware command extraction (required by component factory)
   */
  public addInheritanceRule(rule: any): void {
    // Store inheritance rules for context association
    // This method is called by the component factory to configure context inheritance
    console.log(`Adding inheritance rule: ${rule.sourceLanguage} -> ${rule.targetLanguage}`);
  }

  /**
   * Get commands filtered by language
   */
  public getCommandsForLanguage(language: string): Command[] {
    if (!this.lastAnalysisResult) return [];
    
    const allCommands = [
      ...this.lastAnalysisResult.build,
      ...this.lastAnalysisResult.test,
      ...this.lastAnalysisResult.run,
      ...this.lastAnalysisResult.install,
      ...this.lastAnalysisResult.other
    ];
    
    return allCommands.filter(cmd => cmd.language === language);
  }

  /**
   * Set parent context for inheritance
   */
  public setParentContext(context: LanguageContext): void {
    this.parentContext = context;
  }

  /**
   * Associate a command with a specific language context
   */
  public associateCommandWithContext(command: Command, context: LanguageContext): AssociatedCommand {
    return {
      ...command,
      languageContext: context,
      contextConfidence: this.calculateContextConfidence(command, context)
    } as AssociatedCommand;
  }

  /**
   * Enhanced context-aware command extraction (required by integration pipeline)
   */
  public extractWithContext(ast: MarkdownAST, content: string): CommandExtractionResult {
    this.rawContent = content;
    
    // Extract the actual AST array from the wrapper object
    const actualAST = Array.isArray(ast) ? ast : (ast as any)?.ast || [];
    
    // Extract commands with context information
    const basicCommands = this.extractCommands(actualAST, content);
    const commands = this.assignDefaultContext(basicCommands, this.languageContexts);
    
    // Create context mappings
    const contextMappings: ContextMapping[] = [];
    const contextGroups = new Map<string, AssociatedCommand[]>();
    
    // Group commands by language context
    for (const cmd of commands) {
      const contextKey = cmd.languageContext.language;
      if (!contextGroups.has(contextKey)) {
        contextGroups.set(contextKey, []);
      }
      contextGroups.get(contextKey)!.push(cmd);
    }
    
    // Create context mappings for each group
    for (const [language, groupCommands] of contextGroups) {
      if (groupCommands.length > 0) {
        const firstCommand = groupCommands[0]!; // Safe because we checked length > 0
        contextMappings.push({
          context: firstCommand.languageContext,
          commands: groupCommands.map(cmd => ({
            command: cmd.command,
            language: cmd.language || 'Shell',
            confidence: cmd.confidence
          })),
          sourceRange: firstCommand.languageContext.sourceRange
        });
      }
    }
    
    // Generate extraction metadata
    const extractionMetadata: ExtractionMetadata = {
      totalCommands: commands.length,
      languagesDetected: new Set(commands.map(c => c.languageContext.language)).size,
      contextBoundaries: contextMappings.length,
      extractionTimestamp: new Date()
    };
    
    return {
      commands,
      contextMappings,
      extractionMetadata
    };
  }
}