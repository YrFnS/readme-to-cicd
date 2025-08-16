/**
 * Command Suggestion Engine
 * 
 * Provides intelligent command suggestions for typos and similar commands
 * using string similarity algorithms and command pattern matching.
 */

export interface CommandSuggestion {
  command: string;
  similarity: number;
  reason: string;
  category: 'exact-match' | 'typo' | 'similar' | 'related';
}

export class CommandSuggestionEngine {
  private readonly commands: string[] = [
    'generate',
    'validate',
    'init',
    'export',
    'import',
    'help'
  ];

  private readonly commandAliases: Record<string, string[]> = {
    'generate': ['gen', 'create', 'build', 'make'],
    'validate': ['check', 'verify', 'test', 'lint'],
    'init': ['initialize', 'setup', 'configure', 'start'],
    'export': ['save', 'backup', 'share'],
    'import': ['load', 'restore', 'apply']
  };

  private readonly commonTypos: Record<string, string[]> = {
    'generate': ['generat', 'generete', 'genrate', 'genarate', 'generae'],
    'validate': ['validat', 'valiate', 'vaidate', 'validte'],
    'init': ['initi', 'initalize', 'intialize'],
    'export': ['exprot', 'exort', 'expor'],
    'import': ['improt', 'imort', 'impor']
  };

  /**
   * Suggest commands based on input string
   */
  suggestCommands(input: string, maxSuggestions: number = 5): string[] {
    // Handle null/undefined input gracefully
    if (!input || typeof input !== 'string') {
      return [];
    }
    
    const suggestions = this.generateSuggestions(input);
    
    // Sort by similarity score (descending) and take top suggestions
    return suggestions
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxSuggestions)
      .map(s => s.command);
  }

  /**
   * Get detailed suggestions with reasons
   */
  getDetailedSuggestions(input: string, maxSuggestions: number = 5): CommandSuggestion[] {
    const suggestions = this.generateSuggestions(input);
    
    return suggestions
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxSuggestions);
  }

  /**
   * Generate all possible suggestions for input
   */
  private generateSuggestions(input: string): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];
    const normalizedInput = input.toLowerCase().trim();

    // Check for exact matches (case insensitive)
    for (const command of this.commands) {
      if (command.toLowerCase() === normalizedInput) {
        suggestions.push({
          command,
          similarity: 1.0,
          reason: 'Exact match',
          category: 'exact-match'
        });
      }
    }

    // Check for common typos
    for (const [command, typos] of Object.entries(this.commonTypos)) {
      for (const typo of typos) {
        if (typo === normalizedInput) {
          suggestions.push({
            command,
            similarity: 0.9,
            reason: `Common typo for "${command}"`,
            category: 'typo'
          });
        }
      }
    }

    // Check for aliases
    for (const [command, aliases] of Object.entries(this.commandAliases)) {
      for (const alias of aliases) {
        if (alias === normalizedInput) {
          suggestions.push({
            command,
            similarity: 0.85,
            reason: `Alias for "${command}"`,
            category: 'similar'
          });
        }
      }
    }

    // Check for partial matches and string similarity
    for (const command of this.commands) {
      // Skip if already found exact match or typo
      if (suggestions.some(s => s.command === command && (s.category === 'exact-match' || s.category === 'typo'))) {
        continue;
      }

      // Check for substring matches
      if (command.includes(normalizedInput) || normalizedInput.includes(command)) {
        const similarity = Math.max(
          normalizedInput.length / command.length,
          command.length / normalizedInput.length
        ) * 0.8;
        
        suggestions.push({
          command,
          similarity,
          reason: `Partial match with "${command}"`,
          category: 'similar'
        });
      }

      // Calculate Levenshtein distance for fuzzy matching
      const distance = this.calculateLevenshteinDistance(normalizedInput, command);
      const maxLength = Math.max(normalizedInput.length, command.length);
      const similarity = (maxLength - distance) / maxLength;

      // Only include if similarity is above threshold
      if (similarity > 0.5 && !suggestions.some(s => s.command === command)) {
        suggestions.push({
          command,
          similarity,
          reason: `Similar to "${command}" (${Math.round(similarity * 100)}% match)`,
          category: 'similar'
        });
      }
    }

    // Add related commands based on context
    const relatedSuggestions = this.getRelatedCommands(normalizedInput);
    for (const related of relatedSuggestions) {
      if (!suggestions.some(s => s.command === related.command)) {
        suggestions.push(related);
      }
    }

    return suggestions;
  }

  /**
   * Get related commands based on context and common workflows
   */
  private getRelatedCommands(input: string): CommandSuggestion[] {
    const related: CommandSuggestion[] = [];

    // Context-based suggestions
    const contextMappings: Record<string, string[]> = {
      'create': ['generate', 'init'],
      'build': ['generate'],
      'check': ['validate'],
      'test': ['validate'],
      'setup': ['init'],
      'configure': ['init'],
      'save': ['export'],
      'backup': ['export'],
      'load': ['import'],
      'restore': ['import'],
      'workflow': ['generate', 'validate'],
      'cicd': ['generate', 'validate'],
      'ci': ['generate', 'validate'],
      'cd': ['generate'],
      'yaml': ['generate', 'validate'],
      'github': ['generate', 'validate'],
      'actions': ['generate', 'validate']
    };

    for (const [keyword, commands] of Object.entries(contextMappings)) {
      if (input.includes(keyword)) {
        for (const command of commands) {
          related.push({
            command,
            similarity: 0.7,
            reason: `Related to "${keyword}" context`,
            category: 'related'
          });
        }
      }
    }

    return related;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));

    // Initialize matrix with proper dimensions
    for (let i = 0; i <= str2.length; i++) {
      matrix[i]![0] = i;
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0]![j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!;
        } else {
          matrix[i]![j] = Math.min(
            matrix[i - 1]![j - 1]! + 1, // substitution
            matrix[i]![j - 1]! + 1,     // insertion
            matrix[i - 1]![j]! + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length]![str1.length]!;
  }

  /**
   * Suggest options for a given command
   */
  suggestOptions(command: string, input: string): string[] {
    const commandOptions: Record<string, string[]> = {
      'generate': [
        '--output-dir', '--workflow-type', '--framework', '--dry-run',
        '--directories', '--recursive', '--parallel', '--interactive',
        '--verbose', '--debug', '--quiet', '--config'
      ],
      'validate': [
        '--update', '--verbose', '--debug', '--quiet', '--config'
      ],
      'init': [
        '--template', '--interactive', '--verbose', '--debug', '--quiet'
      ],
      'export': [
        '--output', '--config', '--verbose', '--debug', '--quiet'
      ],
      'import': [
        '--merge', '--interactive', '--verbose', '--debug', '--quiet', '--config'
      ]
    };

    const options = commandOptions[command] || [];
    const normalizedInput = input.toLowerCase();

    return options.filter(option => 
      option.toLowerCase().includes(normalizedInput) ||
      normalizedInput.includes(option.toLowerCase().replace('--', ''))
    );
  }

  /**
   * Check if input looks like a misspelled option
   */
  isLikelyMisspelledOption(input: string): boolean {
    return input.startsWith('-') && input.length > 2;
  }

  /**
   * Suggest corrections for misspelled options
   */
  suggestOptionCorrections(input: string, availableOptions: string[]): string[] {
    const normalizedInput = input.toLowerCase().replace(/^-+/, '');
    const suggestions: Array<{ option: string; similarity: number }> = [];

    for (const option of availableOptions) {
      const normalizedOption = option.toLowerCase().replace(/^-+/, '');
      
      // Check for substring matches first (higher priority)
      if (normalizedOption.includes(normalizedInput) || normalizedInput.includes(normalizedOption)) {
        const similarity = Math.max(
          normalizedInput.length / normalizedOption.length,
          normalizedOption.length / normalizedInput.length
        ) * 0.9; // High similarity for substring matches
        suggestions.push({ option, similarity });
        continue;
      }
      
      // Calculate Levenshtein distance for fuzzy matching
      const distance = this.calculateLevenshteinDistance(normalizedInput, normalizedOption);
      const maxLength = Math.max(normalizedInput.length, normalizedOption.length);
      const similarity = (maxLength - distance) / maxLength;

      // Lower threshold for option corrections
      if (similarity > 0.4) {
        suggestions.push({ option, similarity });
      }
    }

    return suggestions
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map(s => s.option);
  }
}