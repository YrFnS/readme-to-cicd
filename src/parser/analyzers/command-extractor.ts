import { 
  AnalyzerResult, 
  CommandInfo, 
  Command, 
  AssociatedCommand,
  CommandExtractionResult,
  ContextMapping,
  ExtractionMetadata
} from '../types';
import { MarkdownAST, MarkdownNode, MarkdownUtils } from '../../shared/markdown-parser';
import { MarkdownParser } from '../utils/markdown-parser';
import { Analyzer } from './registry';
import { 
  LanguageContext, 
  ContextInheritanceBase, 
  InheritanceRule,
  SourceRange,
  ContextBoundary
} from '../../shared/types/language-context';
import { ContextCollection } from '../../shared/types/context-manager';

/**
 * Context-aware command extractor that inherits language context from LanguageDetector
 * and associates commands with their appropriate programming languages
 */
export class CommandExtractor extends ContextInheritanceBase implements Analyzer<CommandInfo> {
  readonly name = 'CommandExtractor';
  
  private contextCollection: ContextCollection;
  private languageCommandAssociations: Map<string, Command[]> = new Map();

  constructor() {
    super();
    this.contextCollection = new ContextCollection();
    this.setupDefaultInheritanceRules();
  }

  /**
   * Set language contexts from LanguageDetector for context inheritance
   */
  public setLanguageContexts(contexts: LanguageContext[]): void {
    this.contextCollection.clear();
    contexts.forEach(context => this.contextCollection.addContext(context));
    
    // Set the primary context as parent context for inheritance
    const primaryContext = this.findPrimaryContext(contexts);
    if (primaryContext) {
      this.setParentContext(primaryContext);
    }
  }

  /**
   * Associate a command with a specific language context
   */
  public associateCommandWithContext(command: Command, context: LanguageContext): AssociatedCommand {
    return {
      ...command,
      languageContext: context,
      contextConfidence: context.confidence,
      language: context.language
    };
  }

  /**
   * Get commands associated with a specific language
   */
  public getCommandsForLanguage(language: string): Command[] {
    return this.languageCommandAssociations.get(language) || [];
  }

  /**
   * Get all language-command associations
   */
  public getAllLanguageCommandAssociations(): Map<string, Command[]> {
    return new Map(this.languageCommandAssociations);
  }

  /**
   * Extract commands with multi-language separation
   */
  public async extractWithContext(content: string, contexts: LanguageContext[]): Promise<CommandExtractionResult> {
    // Set the contexts for this extraction
    this.setLanguageContexts(contexts);
    
    // Clear previous associations
    this.languageCommandAssociations.clear();
    
    // Parse the content to get AST
    const parser = new MarkdownParser();
    const parseResult = await parser.parseContent(content);
    
    if (!parseResult.success || !parseResult.data) {
      return {
        commands: [],
        contextMappings: [],
        extractionMetadata: {
          totalCommands: 0,
          languagesDetected: 0,
          contextBoundaries: 0,
          extractionTimestamp: new Date()
        }
      };
    }

    // Extract commands
    const commandInfo = this.extractCommands(parseResult.data.ast, content);
    
    // Associate commands with contexts
    this.associateCommandsWithContexts(commandInfo, content);
    
    // Create associated commands with context information
    const associatedCommands = this.createAssociatedCommands(commandInfo, contexts);
    
    // Create context mappings
    const contextMappings = this.createContextMappings(contexts);
    
    // Detect context boundaries
    const contextBoundaries = this.detectContextChanges(contexts);
    
    return {
      commands: associatedCommands,
      contextMappings,
      extractionMetadata: {
        totalCommands: associatedCommands.length,
        languagesDetected: this.languageCommandAssociations.size,
        contextBoundaries: contextBoundaries.length,
        extractionTimestamp: new Date()
      }
    };
  }

  private commandPatterns = {
    install: [
      /npm install/gi,
      /yarn install/gi,
      /pip install/gi,
      /composer install/gi,
      /go get/gi,
      /cargo install/gi
    ],
    build: [
      /npm run build/gi,
      /yarn build/gi,
      /make build/gi,
      /gradle build/gi,
      /mvn compile/gi,
      /cargo build/gi
    ],
    test: [
      /npm test/gi,
      /yarn test/gi,
      /pytest/gi,
      /mvn test/gi,
      /cargo test/gi,
      /go test/gi
    ],
    run: [
      /npm start/gi,
      /yarn start/gi,
      /python.*\.py/gi,
      /node.*\.js/gi,
      /java.*\.jar/gi,
      /cargo run/gi
    ],
    deploy: [
      /npm run deploy/gi,
      /yarn deploy/gi,
      /docker build/gi,
      /kubectl apply/gi,
      /terraform apply/gi
    ]
  };

  async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult<CommandInfo>> {
    try {
      const commands = this.extractCommands(ast, content);
      
      // Associate commands with their language contexts
      this.associateCommandsWithContexts(commands, content);
      
      const confidence = this.calculateConfidence(commands);
      
      return {
        success: true,
        data: commands,
        confidence
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        errors: [{
          code: 'COMMAND_EXTRACTION_ERROR',
          message: `Failed to extract commands: ${(error as Error).message}`,
          component: 'CommandExtractor',
          severity: 'error',
          category: 'analysis',
          isRecoverable: true
        }]
      };
    }
  }

  private extractCommands(ast: MarkdownAST, content: string): CommandInfo {
    const commands: CommandInfo = {
      install: [],
      build: [],
      test: [],
      run: [],
      other: [],
      deploy: []
    };

    // Extract from code blocks
    this.extractFromCodeBlocks(ast, commands);
    
    // Extract from inline code
    this.extractFromInlineCode(content, commands);
    
    // Extract from plain text patterns
    this.extractFromText(content, commands);

    return commands;
  }

  private extractFromCodeBlocks(ast: MarkdownAST, commands: CommandInfo): void {
    this.traverseAST(ast, (node) => {
      if (node.type === 'code') {
        const codeValue = MarkdownUtils.getCodeValue(node);
        if (codeValue) {
          const codeLines = codeValue.split('\n');
        
        for (const line of codeLines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('$') || trimmedLine.startsWith('>')) {
            // Remove shell prompt
            const command = trimmedLine.replace(/^[$>]\s*/, '');
            this.categorizeCommand(command, commands, 'code block');
          } else if (this.looksLikeCommand(trimmedLine)) {
            this.categorizeCommand(trimmedLine, commands, 'code block');
          }
        }
        }
      }
    });
  }

  private extractFromInlineCode(content: string, commands: CommandInfo): void {
    const inlineCodeRegex = /`([^`]+)`/g;
    let match;
    
    while ((match = inlineCodeRegex.exec(content)) !== null) {
      const code = match[1]?.trim();
      if (code && this.looksLikeCommand(code)) {
        this.categorizeCommand(code, commands, 'inline code');
      }
    }
  }

  private extractFromText(content: string, commands: CommandInfo): void {
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Look for command patterns in regular text
      for (const [category, patterns] of Object.entries(this.commandPatterns)) {
        for (const pattern of patterns) {
          const matches = line.match(pattern);
          if (matches) {
            for (const match of matches) {
              const commandArray = commands[category as keyof CommandInfo];
              if (Array.isArray(commandArray)) {
                this.addCommand(commandArray, {
                  command: match,
                  confidence: 0.3,
                  context: 'text mention'
                });
              }
            }
          }
        }
      }
    }
  }

  private categorizeCommand(commandText: string, commands: CommandInfo, context: string): void {
    const lowerCommand = commandText.toLowerCase();
    
    // Infer language from command patterns with enhanced default handling
    const inferredLanguage = this.inferLanguageFromCommand(commandText);
    
    // Determine category based on command content
    if (this.matchesPatterns(lowerCommand, this.commandPatterns.install)) {
      this.addCommand(commands.install, {
        command: commandText,
        confidence: 0.8,
        context,
        language: inferredLanguage
      });
    } else if (this.matchesPatterns(lowerCommand, this.commandPatterns.build)) {
      this.addCommand(commands.build, {
        command: commandText,
        confidence: 0.8,
        context,
        language: inferredLanguage
      });
    } else if (this.matchesPatterns(lowerCommand, this.commandPatterns.test)) {
      this.addCommand(commands.test, {
        command: commandText,
        confidence: 0.8,
        context,
        language: inferredLanguage
      });
    } else if (this.matchesPatterns(lowerCommand, this.commandPatterns.run)) {
      this.addCommand(commands.run, {
        command: commandText,
        confidence: 0.8,
        context,
        language: inferredLanguage
      });
    } else if (this.matchesPatterns(lowerCommand, this.commandPatterns.deploy)) {
      if (!commands.deploy) commands.deploy = [];
      this.addCommand(commands.deploy, {
        command: commandText,
        confidence: 0.8,
        context,
        language: inferredLanguage
      });
    } else {
      // Apply default classification for unmatched commands
      const defaultClassification = this.applyDefaultClassification(commandText, context);
      const inferredCategory = this.inferCategory(commandText);
      
      if (inferredCategory && commands[inferredCategory as keyof CommandInfo]) {
        this.addCommand(commands[inferredCategory as keyof CommandInfo] as Command[], {
          command: commandText,
          confidence: defaultClassification.confidence,
          context: defaultClassification.context,
          language: defaultClassification.language
        });
      } else {
        // Add to 'other' category with default classification
        this.addCommand(commands.other, {
          command: commandText,
          confidence: defaultClassification.confidence,
          context: defaultClassification.context,
          language: defaultClassification.language
        });
      }
    }
  }

  private matchesPatterns(text: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => {
      pattern.lastIndex = 0; // Reset regex state
      return pattern.test(text);
    });
  }

  private inferCategory(command: string): keyof CommandInfo | null {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('install') || lowerCommand.includes('add')) {
      return 'install';
    }
    if (lowerCommand.includes('build') || lowerCommand.includes('compile')) {
      return 'build';
    }
    if (lowerCommand.includes('test') || lowerCommand.includes('spec')) {
      return 'test';
    }
    if (lowerCommand.includes('start') || lowerCommand.includes('run') || lowerCommand.includes('serve')) {
      return 'run';
    }
    if (lowerCommand.includes('deploy') || lowerCommand.includes('publish')) {
      return 'deploy';
    }
    
    return null;
  }

  private looksLikeCommand(text: string): boolean {
    // Basic heuristics to identify if text looks like a command
    const commandIndicators = [
      /^[a-zA-Z][a-zA-Z0-9-_]*\s/, // Starts with command name
      /npm|yarn|pip|cargo|go|mvn|gradle/, // Common package managers
      /^[./]/, // Starts with path
      /&&|\|\||;/, // Command chaining
      /--?\w+/ // Command flags
    ];
    
    return commandIndicators.some(pattern => pattern.test(text.trim()));
  }

  private addCommand(commandArray: Command[], command: Omit<Command, 'description'>): void {
    // Avoid duplicates
    const exists = commandArray.some(existing => existing.command === command.command);
    if (!exists) {
      commandArray.push({
        ...command,
        description: this.generateDescription(command.command)
      });
    }
  }

  private generateDescription(command: string): string {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('install')) {
      return 'Install project dependencies';
    }
    if (lowerCommand.includes('build')) {
      return 'Build the project';
    }
    if (lowerCommand.includes('test')) {
      return 'Run tests';
    }
    if (lowerCommand.includes('start') || lowerCommand.includes('serve')) {
      return 'Start the application';
    }
    if (lowerCommand.includes('deploy')) {
      return 'Deploy the application';
    }
    
    return `Execute: ${command}`;
  }

  private traverseAST(node: MarkdownAST | MarkdownNode, callback: (node: MarkdownNode) => void): void {
    if ('children' in node && node.children) {
      for (const child of node.children) {
        callback(child);
        this.traverseAST(child, callback);
      }
    }
  }

  private calculateConfidence(commands: CommandInfo): number {
    const allCommands = [
      ...commands.install,
      ...commands.build,
      ...commands.test,
      ...commands.run,
      ...(commands.deploy || [])
    ];
    
    if (allCommands.length === 0) return 0;
    
    const avgConfidence = allCommands.reduce((sum, cmd) => sum + cmd.confidence, 0) / allCommands.length;
    const categoryBonus = Object.values(commands).filter(arr => arr.length > 0).length * 0.1;
    
    return Math.min(avgConfidence + categoryBonus, 1.0);
  }

  /**
   * Setup default inheritance rules for context inheritance
   */
  private setupDefaultInheritanceRules(): void {
    // Rule 1: Always inherit if no specific context is found
    this.addInheritanceRule({
      condition: 'no-child-context',
      action: 'inherit',
      priority: 1,
      description: 'Inherit parent context when no specific context is available'
    });

    // Rule 2: Use child context if it has high confidence
    this.addInheritanceRule({
      condition: 'high-confidence',
      action: 'override',
      priority: 2,
      description: 'Use child context when confidence is high'
    });

    // Rule 3: Merge contexts when both have medium confidence
    this.addInheritanceRule({
      condition: 'low-confidence',
      action: 'merge',
      priority: 3,
      description: 'Merge contexts when child has low confidence'
    });
  }

  /**
   * Find the primary (highest confidence) context from available contexts
   */
  private findPrimaryContext(contexts: LanguageContext[]): LanguageContext | undefined {
    if (contexts.length === 0) return undefined;
    
    return contexts.reduce((primary, current) => 
      current.confidence > primary.confidence ? current : primary
    );
  }

  /**
   * Get the appropriate language context for a command at a specific location
   */
  private getContextForLocation(line: number, column: number): LanguageContext | undefined {
    // First try to get context from the collection
    const contextAtLocation = this.contextCollection.getContextAt(line, column);
    
    if (contextAtLocation) {
      return contextAtLocation;
    }

    // Apply inheritance rules if no specific context found
    return this.applyInheritanceRules();
  }

  /**
   * Associate commands with their language contexts and update language-command mappings
   */
  private associateCommandsWithContexts(commands: CommandInfo, content: string): void {
    const lines = content.split('\n');
    
    // Process each command category
    Object.entries(commands).forEach(([category, commandArray]) => {
      if (Array.isArray(commandArray)) {
        commandArray.forEach(command => {
          // Find the line where this command appears
          const commandLine = this.findCommandLine(command.command, lines);
          if (commandLine !== -1) {
            const context = this.getContextForLocation(commandLine, 0);
            if (context) {
              // Context inheritance takes precedence over pattern-based inference
              command.language = context.language;
              
              // Add to language-command associations
              const language = context.language;
              if (!this.languageCommandAssociations.has(language)) {
                this.languageCommandAssociations.set(language, []);
              }
              this.languageCommandAssociations.get(language)!.push(command);
            } else if (command.language) {
              // Use pattern-based inference if no context is available
              const language = command.language;
              if (!this.languageCommandAssociations.has(language)) {
                this.languageCommandAssociations.set(language, []);
              }
              this.languageCommandAssociations.get(language)!.push(command);
            }
          } else if (command.language) {
            // Command not found in content, but has inferred language
            const language = command.language;
            if (!this.languageCommandAssociations.has(language)) {
              this.languageCommandAssociations.set(language, []);
            }
            this.languageCommandAssociations.get(language)!.push(command);
          }
        });
      }
    });
  }

  /**
   * Find the line number where a command appears in the content
   */
  private findCommandLine(commandText: string, lines: string[]): number {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.includes(commandText)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Create associated commands with context information
   */
  private createAssociatedCommands(commandInfo: CommandInfo, contexts: LanguageContext[]): AssociatedCommand[] {
    const allCommands: Command[] = [];
    
    // Collect all commands from all categories
    Object.entries(commandInfo).forEach(([category, commandArray]) => {
      if (Array.isArray(commandArray)) {
        allCommands.push(...commandArray);
      }
    });
    
    // Use the enhanced default context assignment
    return this.assignDefaultContext(allCommands, contexts);
  }

  /**
   * Create context mappings showing which commands belong to which contexts
   */
  private createContextMappings(contexts: LanguageContext[]): ContextMapping[] {
    const mappings: ContextMapping[] = [];
    
    contexts.forEach(context => {
      const commands = this.getCommandsForLanguage(context.language);
      if (commands.length > 0) {
        mappings.push({
          context,
          commands,
          sourceRange: context.sourceRange
        });
      }
    });
    
    return mappings;
  }

  /**
   * Detect context changes within the document
   */
  private detectContextChanges(contexts: LanguageContext[]): ContextBoundary[] {
    const boundaries: ContextBoundary[] = [];
    
    for (let i = 0; i < contexts.length - 1; i++) {
      const current = contexts[i];
      const next = contexts[i + 1];
      
      if (!current || !next) continue;
      
      // Check if there's a language change
      if (current.language !== next.language) {
        boundaries.push({
          location: {
            startLine: current.sourceRange.endLine,
            endLine: next.sourceRange.startLine,
            startColumn: current.sourceRange.endColumn,
            endColumn: next.sourceRange.startColumn
          },
          beforeContext: current,
          afterContext: next,
          transitionType: 'language-change'
        });
      }
    }
    
    return boundaries;
  }

  /**
   * Find the best matching context for a command
   */
  private findBestContextForCommand(command: Command, contexts: LanguageContext[]): LanguageContext | undefined {
    // If command already has a language from pattern inference, try to match it
    if (command.language) {
      const matchingContext = contexts.find(ctx => ctx.language === command.language);
      if (matchingContext) {
        return matchingContext;
      }
    }
    
    // Otherwise, return the highest confidence context
    return contexts.reduce((best, current) => 
      !best || current.confidence > best.confidence ? current : best
    , undefined as LanguageContext | undefined);
  }

  /**
   * Create a default context for commands without specific context
   */
  private createDefaultContext(): LanguageContext {
    return {
      language: 'unknown',
      confidence: 0.1,
      sourceRange: { startLine: 0, endLine: 0, startColumn: 0, endColumn: 0 },
      evidence: [],
      metadata: {
        createdAt: new Date(),
        source: 'default-context'
      }
    };
  }

  /**
   * Apply fallback logic for unknown language contexts
   */
  private applyFallbackLogic(command: Command, contexts: LanguageContext[]): LanguageContext {
    // Try pattern-based language inference first
    if (command.language) {
      // Create a context based on inferred language
      return {
        language: command.language,
        confidence: 0.6, // Medium confidence for pattern-based inference
        sourceRange: { startLine: 0, endLine: 0, startColumn: 0, endColumn: 0 },
        evidence: [{
          type: 'pattern',
          value: command.command,
          confidence: 0.6,
          location: { startLine: 0, endLine: 0, startColumn: 0, endColumn: 0 }
        }],
        metadata: {
          createdAt: new Date(),
          source: 'pattern-inference'
        }
      };
    }

    // Try to inherit from parent context
    const parentContext = this.getParentContext();
    if (parentContext) {
      return {
        ...parentContext,
        confidence: Math.max(0.3, parentContext.confidence * 0.5), // Reduce confidence for inheritance
        metadata: {
          ...parentContext.metadata,
          createdAt: new Date(),
          source: 'parent-inheritance'
        }
      };
    }

    // Use the highest confidence context if available
    if (contexts.length > 0) {
      const bestContext = contexts.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      
      return {
        ...bestContext,
        confidence: Math.max(0.2, bestContext.confidence * 0.3), // Significantly reduce confidence
        metadata: {
          ...bestContext.metadata,
          createdAt: new Date(),
          source: 'best-available-context'
        }
      };
    }

    // Final fallback to default context
    return this.createDefaultContext();
  }



  /**
   * Apply default classification for unknown language contexts
   */
  private applyDefaultClassification(commandText: string, context: string): {
    language: string;
    confidence: number;
    context: string;
  } {
    // First try pattern-based inference
    const inferredLanguage = this.inferLanguageFromCommand(commandText);
    
    if (inferredLanguage !== 'unknown') {
      return {
        language: inferredLanguage,
        confidence: 0.6, // Medium confidence for pattern-based inference
        context: `${context} (pattern-inferred)`
      };
    }

    // Try to inherit from parent context
    const parentContext = this.getParentContext();
    if (parentContext && parentContext.confidence > 0.3) {
      return {
        language: parentContext.language,
        confidence: Math.max(0.3, parentContext.confidence * 0.5), // Reduce confidence for inheritance
        context: `${context} (inherited from ${parentContext.language})`
      };
    }

    // Use the most common language from available contexts
    const contexts = Array.from(this.contextCollection.getAllContexts());
    if (contexts.length > 0) {
      const languageFrequency = new Map<string, number>();
      contexts.forEach(ctx => {
        const count = languageFrequency.get(ctx.language) || 0;
        languageFrequency.set(ctx.language, count + 1);
      });

      const mostCommonLanguage = Array.from(languageFrequency.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0];

      if (mostCommonLanguage) {
        return {
          language: mostCommonLanguage,
          confidence: 0.4, // Low-medium confidence for frequency-based assignment
          context: `${context} (most-common: ${mostCommonLanguage})`
        };
      }
    }

    // Final fallback to unknown
    return {
      language: 'unknown',
      confidence: 0.1, // Very low confidence for unknown
      context: `${context} (default-unknown)`
    };
  }

  /**
   * Track context confidence for command associations with enhanced scoring
   */
  private trackContextConfidence(command: Command, context: LanguageContext): number {
    let confidenceScore = context.confidence;

    // Boost confidence if command language matches context language
    if (command.language && command.language === context.language) {
      confidenceScore = Math.min(1.0, confidenceScore + 0.2);
    }

    // Reduce confidence if languages don't match
    if (command.language && command.language !== context.language && context.language !== 'unknown') {
      confidenceScore = Math.max(0.1, confidenceScore - 0.3);
    }

    // Boost confidence for high-confidence commands
    if (command.confidence > 0.8) {
      confidenceScore = Math.min(1.0, confidenceScore + 0.1);
    }

    // Reduce confidence for commands with low initial confidence
    if (command.confidence < 0.3) {
      confidenceScore = Math.max(0.1, confidenceScore - 0.2);
    }

    // Special handling for 'unknown' language contexts
    if (context.language === 'unknown') {
      confidenceScore = Math.min(0.3, confidenceScore); // Cap unknown contexts at low confidence
    }

    return Math.round(confidenceScore * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Assign default context to unclassified commands with enhanced logic
   */
  public assignDefaultContext(commands: Command[], contexts: LanguageContext[]): AssociatedCommand[] {
    return commands.map(command => {
      // Try to find the best context for this command
      let bestContext = this.findBestContextForCommand(command, contexts);
      
      // If no good context found, apply fallback logic
      if (!bestContext || bestContext.confidence < 0.3) {
        bestContext = this.applyFallbackLogic(command, contexts);
      }

      // Track confidence for this association
      const contextConfidence = this.trackContextConfidence(command, bestContext);

      return {
        ...command,
        languageContext: bestContext,
        contextConfidence,
        language: bestContext.language
      };
    });
  }

  /**
   * Infer language from command patterns with enhanced default handling
   */
  private inferLanguageFromCommand(command: string): string {
    const lowerCommand = command.toLowerCase();
    
    // JavaScript/Node.js patterns
    if (lowerCommand.includes('npm') || lowerCommand.includes('yarn') || 
        lowerCommand.includes('node ') || lowerCommand.includes('npx')) {
      return 'JavaScript';
    }
    
    // Python patterns
    if (lowerCommand.includes('pip') || lowerCommand.includes('python') || 
        lowerCommand.includes('pytest') || lowerCommand.includes('python3')) {
      return 'Python';
    }
    
    // Rust patterns
    if (lowerCommand.includes('cargo')) {
      return 'Rust';
    }
    
    // Go patterns
    if (lowerCommand.startsWith('go ') || lowerCommand.includes('go test') || 
        lowerCommand.includes('go build') || lowerCommand.includes('go run')) {
      return 'Go';
    }
    
    // Java patterns
    if (lowerCommand.includes('mvn') || lowerCommand.includes('maven') || 
        lowerCommand.includes('gradle') || lowerCommand.includes('java -jar') ||
        lowerCommand.includes('java ')) {
      return 'Java';
    }
    
    // C/C++ patterns
    if (lowerCommand.includes('make') || lowerCommand.includes('cmake') || 
        lowerCommand.includes('gcc') || lowerCommand.includes('g++')) {
      return 'C/C++';
    }
    
    // Ruby patterns
    if (lowerCommand.includes('bundle') || lowerCommand.includes('rspec') || 
        lowerCommand.includes('rake') || lowerCommand.includes('ruby')) {
      return 'Ruby';
    }
    
    // PHP patterns
    if (lowerCommand.includes('composer') || lowerCommand.includes('php')) {
      return 'PHP';
    }
    
    // .NET patterns
    if (lowerCommand.includes('dotnet') || lowerCommand.includes('nuget')) {
      return 'C#';
    }
    
    // Docker patterns
    if (lowerCommand.includes('docker') || lowerCommand.includes('dockerfile')) {
      return 'Docker';
    }
    
    // Shell/Bash patterns
    if (lowerCommand.includes('bash') || lowerCommand.includes('sh ') || 
        lowerCommand.includes('chmod') || lowerCommand.includes('curl') ||
        lowerCommand.includes('wget')) {
      return 'Shell';
    }
    
    // Default fallback for unknown commands
    return 'unknown';
  }
}