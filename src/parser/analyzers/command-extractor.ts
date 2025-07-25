/**
 * CommandExtractor - Analyzes README content to extract build, test, run, and other commands
 */

import { BaseAnalyzer } from './base-analyzer';
import { AnalysisResult, CommandInfo, Command, MarkdownAST } from '../types';

/**
 * Command detection patterns for different command types
 */
interface CommandPattern {
  type: 'build' | 'test' | 'run' | 'install' | 'other';
  patterns: RegExp[];
  confidence: number;
  language?: string;
  description?: string;
}

/**
 * CommandExtractor class implementing ContentAnalyzer interface
 * Extracts build, test, run, and other commands from README content
 */
export class CommandExtractor extends BaseAnalyzer {
  readonly name = 'CommandExtractor';

  // Command patterns for different types of commands
  private readonly commandPatterns: CommandPattern[] = [
    // Build commands
    {
      type: 'build',
      patterns: [
        /npm\s+run\s+build(?::[^\s\n\r;`]*)?(?:\s+[^\n\r;`]*)?/gm,
        /yarn\s+build(?:\s+[^\n\r;`]*)?/gm,
        /yarn\s+run\s+build(?:\s+[^\n\r;`]*)?/gm
      ],
      confidence: 0.9,
      language: 'JavaScript',
      description: 'Node.js build command'
    },
    {
      type: 'build',
      patterns: [
        /cargo\s+build(?:\s+[^\n\r;]*)?/gm,
        /cargo\s+build\s+--release(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.9,
      language: 'Rust',
      description: 'Cargo build command'
    },
    {
      type: 'build',
      patterns: [
        /go\s+build(?:\s+[^\n\r;]*)?/gm,
        /go\s+install(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.9,
      language: 'Go',
      description: 'Go build command'
    },
    {
      type: 'build',
      patterns: [
        /mvn\s+compile(?:\s+[^\n\r;]*)?/gm,
        /mvn\s+package(?:\s+[^\n\r;]*)?/gm,
        /mvn\s+install(?:\s+[^\n\r;]*)?/gm,
        /maven\s+compile(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.8,
      language: 'Java',
      description: 'Maven build command'
    },
    {
      type: 'build',
      patterns: [
        /gradle\s+build(?:\s+[^\n\r;]*)?/gm,
        /\.\/gradlew\s+build(?:\s+[^\n\r;]*)?/gm,
        /gradlew\s+build(?:\s+[^\n\r;]*)?/gm,
        /gradle\s+assemble(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.8,
      language: 'Java',
      description: 'Gradle build command'
    },
    {
      type: 'build',
      patterns: [
        /make(?:\s+[^\n\r;]*)?/gm,
        /make\s+all(?:\s+[^\n\r;]*)?/gm,
        /make\s+build(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.8,
      language: 'C/C++',
      description: 'Make build command'
    },
    {
      type: 'build',
      patterns: [
        /cmake\s+--build(?:\s+[^\n\r;]*)?/gm,
        /cmake\s+\.(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.8,
      language: 'C/C++',
      description: 'CMake build command'
    },
    {
      type: 'build',
      patterns: [
        /python\s+setup\.py\s+build(?:\s+[^\n\r;]*)?/gm,
        /python\s+-m\s+build(?:\s+[^\n\r;]*)?/gm,
        /pip\s+install\s+\.(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.8,
      language: 'Python',
      description: 'Python build command'
    },

    // Test commands
    {
      type: 'test',
      patterns: [
        /npm\s+test(?:\s+[^\n\r;`]*)?/gm,
        /npm\s+run\s+test(?::[^\s\n\r;`]*)?(?:\s+[^\n\r;`]*)?/gm,
        /yarn\s+test(?:\s+[^\n\r;`]*)?/gm,
        /yarn\s+run\s+test(?:\s+[^\n\r;`]*)?/gm
      ],
      confidence: 0.9,
      language: 'JavaScript',
      description: 'Node.js test command'
    },
    {
      type: 'test',
      patterns: [
        /cargo\s+test(?:\s+[^\n\r;]*)?/gm,
        /cargo\s+test\s+--release(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.9,
      language: 'Rust',
      description: 'Cargo test command'
    },
    {
      type: 'test',
      patterns: [
        /go\s+test(?:\s+[^\n\r;]*)?/gm,
        /go\s+test\s+\.\/\.\.\.(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.9,
      language: 'Go',
      description: 'Go test command'
    },
    {
      type: 'test',
      patterns: [
        /pytest(?:\s+[^\n\r;]*)?/gm,
        /python\s+-m\s+pytest(?:\s+[^\n\r;]*)?/gm,
        /python\s+-m\s+unittest(?:\s+[^\n\r;]*)?/gm,
        /python\s+test(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.9,
      language: 'Python',
      description: 'Python test command'
    },
    {
      type: 'test',
      patterns: [
        /mvn\s+test(?:\s+[^\n\r;]*)?/gm,
        /maven\s+test(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.8,
      language: 'Java',
      description: 'Maven test command'
    },
    {
      type: 'test',
      patterns: [
        /gradle\s+test(?:\s+[^\n\r;]*)?/gm,
        /\.\/gradlew\s+test(?:\s+[^\n\r;]*)?/gm,
        /gradlew\s+test(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.8,
      language: 'Java',
      description: 'Gradle test command'
    },
    {
      type: 'test',
      patterns: [
        /make\s+test(?:\s+[^\n\r;]*)?/gm,
        /make\s+check(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.8,
      language: 'C/C++',
      description: 'Make test command'
    },
    {
      type: 'test',
      patterns: [
        /bundle\s+exec\s+rspec(?:\s+[^\n\r;]*)?/gm,
        /rspec(?:\s+[^\n\r;]*)?/gm,
        /rake\s+test(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.8,
      language: 'Ruby',
      description: 'Ruby test command'
    },

    // Run commands
    {
      type: 'run',
      patterns: [
        /npm\s+start(?:\s+[^\n\r;`]*)?/gm,
        /npm\s+run\s+start(?:\s+[^\n\r;`]*)?/gm,
        /npm\s+run\s+dev(?::[^\s\n\r;`]*)?(?:\s+[^\n\r;`]*)?/gm,
        /yarn\s+start(?:\s+[^\n\r;`]*)?/gm,
        /yarn\s+dev(?:\s+[^\n\r;`]*)?/gm
      ],
      confidence: 0.9,
      language: 'JavaScript',
      description: 'Node.js run command'
    },
    {
      type: 'run',
      patterns: [
        /cargo\s+run(?:\s+[^\n\r;]*)?/gm,
        /cargo\s+run\s+--release(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.9,
      language: 'Rust',
      description: 'Cargo run command'
    },
    {
      type: 'run',
      patterns: [
        /go\s+run(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.9,
      language: 'Go',
      description: 'Go run command'
    },
    {
      type: 'run',
      patterns: [
        /python\s+[^\s\n\r;]+\.py(?:\s+[^\n\r;]*)?/gm,
        /python3\s+[^\s\n\r;]+\.py(?:\s+[^\n\r;]*)?/gm,
        /python\s+-m\s+[^\s\n\r;]+(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.8,
      language: 'Python',
      description: 'Python run command'
    },
    {
      type: 'run',
      patterns: [
        /java\s+-jar\s+[^\s\n\r;]+\.jar(?:\s+[^\n\r;]*)?/gm,
        /java\s+[^\s\n\r;]+(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.8,
      language: 'Java',
      description: 'Java run command'
    },
    {
      type: 'run',
      patterns: [
        /\.\/[^\s\n\r;]+(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.6,
      description: 'Executable run command'
    },

    // Install commands (for completeness, though DependencyExtractor handles these)
    {
      type: 'install',
      patterns: [
        /npm\s+install(?:\s+[^\n\r;`]*)?/gm,
        /npm\s+i(?:\s+[^\n\r;`]*)?/gm,
        /yarn\s+install(?:\s+[^\n\r;`]*)?/gm,
        /yarn\s+add(?:\s+[^\n\r;`]*)?/gm
      ],
      confidence: 0.9,
      language: 'JavaScript',
      description: 'Node.js install command'
    },
    {
      type: 'install',
      patterns: [
        /pip\s+install(?:\s+[^\n\r;`]*)?/gm,
        /pip3\s+install(?:\s+[^\n\r;`]*)?/gm,
        /python\s+-m\s+pip\s+install(?:\s+[^\n\r;`]*)?/gm
      ],
      confidence: 0.9,
      language: 'Python',
      description: 'Python install command'
    },

    // Other common commands
    {
      type: 'other',
      patterns: [
        /docker\s+build(?:\s+[^\n\r;]*)?/gm,
        /docker\s+run(?:\s+[^\n\r;]*)?/gm,
        /docker-compose\s+up(?:\s+[^\n\r;]*)?/gm,
        /docker-compose\s+build(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.8,
      description: 'Docker command'
    },
    {
      type: 'other',
      patterns: [
        /git\s+clone(?:\s+[^\n\r;]*)?/gm,
        /git\s+pull(?:\s+[^\n\r;]*)?/gm,
        /git\s+push(?:\s+[^\n\r;]*)?/gm
      ],
      confidence: 0.7,
      description: 'Git command'
    }
  ];

  /**
   * Analyze markdown content to extract commands
   */
  async analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult> {
    try {
      const commands: CommandInfo = {
        build: [],
        test: [],
        run: [],
        install: [],
        other: []
      };

      // 1. Extract commands from code blocks
      this.extractFromCodeBlocks(ast, commands);

      // 2. Extract commands from inline code and text
      this.extractFromContent(rawContent, commands);

      // 3. Deduplicate commands
      this.deduplicateCommands(commands);

      // 4. Calculate confidence
      const confidence = this.calculateConfidence(commands);

      return this.createResult(
        commands,
        confidence,
        this.extractSources(commands)
      );

    } catch (error) {
      const parseError = this.createError(
        'COMMAND_EXTRACTION_ERROR',
        `Failed to extract commands: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: error instanceof Error ? error.message : error }
      );

      return this.createResult({
        build: [],
        test: [],
        run: [],
        install: [],
        other: []
      }, 0, [], [parseError]);
    }
  }

  /**
   * Extract commands from code blocks
   */
  private extractFromCodeBlocks(ast: MarkdownAST, commands: CommandInfo): void {
    const codeBlocks = ast.filter(token => token.type === 'code');

    for (const block of codeBlocks) {
      const codeToken = block as any;
      const codeContent = codeToken.text || '';
      const language = codeToken.lang;

      this.processCodeContent(codeContent, commands, 'code-block', language);
    }
  }

  /**
   * Extract commands from general content (inline code, text mentions)
   */
  private extractFromContent(content: string, commands: CommandInfo): void {
    // Extract inline code blocks
    const inlineCodeRegex = /`([^`]+)`/g;
    let match;
    
    while ((match = inlineCodeRegex.exec(content)) !== null) {
      const inlineCode = match[1];
      if (inlineCode) {
        this.processCodeContent(inlineCode, commands, 'inline-code');
      }
    }

    // Also process the full content for command mentions
    this.processCodeContent(content, commands, 'text-mention');
  }

  /**
   * Process code content to extract commands
   */
  private processCodeContent(
    content: string, 
    commands: CommandInfo, 
    context: string,
    language?: string
  ): void {
    // Split content into lines for better command detection
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);

    for (const line of lines) {
      for (const pattern of this.commandPatterns) {
        for (const regex of pattern.patterns) {
          // Reset regex for each line
          const lineRegex = new RegExp(regex.source, regex.flags);
          const match = lineRegex.exec(line);

          if (match && match[0]) {
            const command = match[0].trim();
            
            // Skip if command is too generic or likely a false positive
            if (command && this.isValidCommand(command, pattern.type)) {
              const commandObj: Command = {
                command,
                confidence: this.calculateCommandConfidence(pattern, context, language),
                context
              };

              // Add optional fields if available
              if (pattern.language) {
                commandObj.language = pattern.language;
              }
              if (pattern.description) {
                commandObj.description = pattern.description;
              }

              // Add to appropriate category
              commands[pattern.type].push(commandObj);
            }
          }
        }
      }
    }
  }

  /**
   * Validate if a command is legitimate and not a false positive
   */
  private isValidCommand(command: string, type: string): boolean {
    // Skip very short commands
    if (command.length < 3) {
      return false;
    }

    // Skip commands that are just flags or options
    if (command.startsWith('-') || command.startsWith('--')) {
      return false;
    }

    // Skip common false positives
    const falsePositives = [
      'run', 'test', 'build', 'install', 'start', 'dev',
      'main', 'app', 'src', 'lib', 'dist', 'node_modules'
    ];

    const commandParts = command.split(' ');
    const commandWord = commandParts[0]?.toLowerCase();
    if (commandWord && falsePositives.includes(commandWord) && commandParts.length === 1) {
      return false;
    }

    return true;
  }

  /**
   * Calculate confidence for a specific command based on context and pattern
   */
  private calculateCommandConfidence(
    pattern: CommandPattern, 
    context: string, 
    language?: string
  ): number {
    let confidence = pattern.confidence;

    // Adjust confidence based on context
    switch (context) {
      case 'code-block':
        confidence *= 1.0; // Full confidence for code blocks
        break;
      case 'inline-code':
        confidence *= 0.9; // Slightly lower for inline code
        break;
      case 'text-mention':
        confidence *= 0.7; // Lower for text mentions
        break;
    }

    // Boost confidence if language matches
    if (language && pattern.language) {
      const normalizedLanguage = this.normalizeLanguage(language);
      const normalizedPatternLanguage = this.normalizeLanguage(pattern.language);
      
      if (normalizedLanguage === normalizedPatternLanguage) {
        confidence *= 1.1; // 10% boost for matching language
      }
    }

    return Math.min(confidence, 1.0); // Cap at 1.0
  }

  /**
   * Normalize language names for comparison
   */
  private normalizeLanguage(language: string): string {
    const normalized = language.toLowerCase().trim();
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'javascript': 'javascript',
      'ts': 'javascript', // TypeScript uses same commands as JavaScript
      'typescript': 'javascript',
      'py': 'python',
      'python': 'python',
      'python3': 'python',
      'rs': 'rust',
      'rust': 'rust',
      'go': 'go',
      'golang': 'go',
      'java': 'java',
      'c': 'c/c++',
      'cpp': 'c/c++',
      'c++': 'c/c++',
      'rb': 'ruby',
      'ruby': 'ruby',
      'sh': 'shell',
      'bash': 'shell',
      'shell': 'shell'
    };

    return languageMap[normalized] || normalized;
  }

  /**
   * Remove duplicate commands within each category
   */
  private deduplicateCommands(commands: CommandInfo): void {
    for (const category of Object.keys(commands) as Array<keyof CommandInfo>) {
      const commandList = commands[category];
      const uniqueCommands = new Map<string, Command>();

      for (const cmd of commandList) {
        const existing = uniqueCommands.get(cmd.command);
        
        if (!existing) {
          uniqueCommands.set(cmd.command, cmd);
        } else if (cmd.confidence > existing.confidence) {
          // Replace with higher confidence command
          uniqueCommands.set(cmd.command, cmd);
        } else if (cmd.confidence === existing.confidence && cmd.context === 'code-block' && existing.context !== 'code-block') {
          // Prefer code-block context over other contexts at same confidence
          uniqueCommands.set(cmd.command, cmd);
        }
      }

      commands[category] = Array.from(uniqueCommands.values())
        .sort((a, b) => b.confidence - a.confidence);
    }
  }

  /**
   * Calculate overall confidence for command extraction
   */
  private calculateConfidence(commands: CommandInfo): number {
    const allCommands = [
      ...commands.build,
      ...commands.test,
      ...commands.run,
      ...commands.install,
      ...commands.other
    ];

    if (allCommands.length === 0) {
      return 0;
    }

    // Calculate weighted average confidence
    const totalConfidence = allCommands.reduce((sum, cmd) => sum + cmd.confidence, 0);
    const averageConfidence = totalConfidence / allCommands.length;

    // Boost confidence if we have commands in multiple categories
    const categoriesWithCommands = Object.values(commands).filter(list => list.length > 0).length;
    const categoryBonus = Math.min(categoriesWithCommands * 0.05, 0.2); // Max 20% bonus

    return Math.min(averageConfidence + categoryBonus, 1.0);
  }

  /**
   * Extract sources from command information
   */
  private extractSources(commands: CommandInfo): string[] {
    const sources = new Set<string>();

    const allCommands = [
      ...commands.build,
      ...commands.test,
      ...commands.run,
      ...commands.install,
      ...commands.other
    ];

    for (const cmd of allCommands) {
      if (cmd.context) {
        sources.add(cmd.context);
      }
    }

    return Array.from(sources);
  }
}