import { AnalyzerResult, CommandInfo, Command } from '../types';
import { MarkdownAST, MarkdownNode, MarkdownUtils } from '../../shared/markdown-parser';
import { Analyzer } from './registry';

/**
 * Extracts commands from README content
 */
export class CommandExtractor implements Analyzer<CommandInfo> {
  readonly name = 'CommandExtractor';

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
    
    // Determine category based on command content
    if (this.matchesPatterns(lowerCommand, this.commandPatterns.install)) {
      this.addCommand(commands.install, {
        command: commandText,
        confidence: 0.8,
        context
      });
    } else if (this.matchesPatterns(lowerCommand, this.commandPatterns.build)) {
      this.addCommand(commands.build, {
        command: commandText,
        confidence: 0.8,
        context
      });
    } else if (this.matchesPatterns(lowerCommand, this.commandPatterns.test)) {
      this.addCommand(commands.test, {
        command: commandText,
        confidence: 0.8,
        context
      });
    } else if (this.matchesPatterns(lowerCommand, this.commandPatterns.run)) {
      this.addCommand(commands.run, {
        command: commandText,
        confidence: 0.8,
        context
      });
    } else if (this.matchesPatterns(lowerCommand, this.commandPatterns.deploy)) {
      if (!commands.deploy) commands.deploy = [];
      this.addCommand(commands.deploy, {
        command: commandText,
        confidence: 0.8,
        context
      });
    } else {
      // Try to infer category from context or command structure
      const inferredCategory = this.inferCategory(commandText);
      if (inferredCategory && commands[inferredCategory as keyof CommandInfo]) {
        this.addCommand(commands[inferredCategory as keyof CommandInfo] as Command[], {
          command: commandText,
          confidence: 0.5,
          context: `${context} (inferred)`
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
}