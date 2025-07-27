/**
 * Regex Optimizer - Optimized regex patterns and utilities for better performance
 */

/**
 * Optimized language patterns with compiled regex for better performance
 */
export class OptimizedLanguagePatterns {
  // Pre-compiled regex patterns for better performance
  private static readonly compiledPatterns = new Map<string, {
    patterns: RegExp[];
    confidence: number;
    keywords: string[];
  }>();

  // Initialize compiled patterns once
  static {
    const patterns = [
      {
        name: 'JavaScript',
        patterns: [
          // Combined function/variable declarations
          /\b(?:function|const|let|var)\s+\w+/g,
          // Module system
          /\b(?:require|import|export)\s*[\(\s]/g,
          // Async patterns
          /\b(?:async|await|Promise)\b/g,
          // Browser/Node APIs
          /\b(?:console\.log|document\.|window\.|process\.)/g,
          // Package managers
          /\b(?:npm|yarn|node)\s+/g
        ],
        confidence: 0.8,
        keywords: ['javascript', 'js', 'node', 'nodejs', 'npm', 'yarn']
      },
      {
        name: 'TypeScript',
        patterns: [
          // Type definitions
          /\b(?:interface|type)\s+\w+/g,
          // Type annotations - optimized to avoid backtracking
          /:\s*(?:string|number|boolean|any)\b/g,
          // Import/export with from
          /\b(?:export|import).*\bfrom\s+['"][^'"]+['"]/g,
          // Promise types
          /\b(?:async|await)\s*\w*\s*:\s*Promise</g
        ],
        confidence: 0.9,
        keywords: ['typescript', 'ts', 'tsc']
      },
      {
        name: 'Python',
        patterns: [
          // Function/class definitions
          /\b(?:def|class)\s+\w+/g,
          // Import statements
          /\b(?:import|from)\s+\w+/g,
          // Control structures
          /\b(?:if|elif|else):\s*$/gm,
          // Built-in functions
          /\b(?:print|len|range)\s*\(/g,
          // Python tools
          /\b(?:pip|python|python3)\s+/g
        ],
        confidence: 0.8,
        keywords: ['python', 'py', 'pip', 'conda', 'virtualenv', 'pytest']
      },
      {
        name: 'Java',
        patterns: [
          // Class/interface declarations
          /\b(?:public|private|protected)\s+(?:class|interface)/g,
          // Main method
          /\bpublic\s+static\s+void\s+main/g,
          // Java imports
          /\bimport\s+java\./g,
          // System output
          /\bSystem\.out\.println/g,
          // Build tools
          /\b(?:maven|gradle|mvn)\s+/g
        ],
        confidence: 0.9,
        keywords: ['java', 'maven', 'gradle', 'spring', 'junit']
      },
      {
        name: 'Go',
        patterns: [
          // Package declaration
          /\bpackage\s+main/g,
          // Import blocks
          /\bimport\s*\(/g,
          // Function declarations
          /\bfunc\s+\w+/g,
          // Go commands
          /\bgo\s+(?:run|build|test)/g,
          // fmt package
          /\bfmt\.(?:Print|Scan)/g
        ],
        confidence: 0.9,
        keywords: ['go', 'golang', 'mod']
      },
      {
        name: 'Rust',
        patterns: [
          // Function declarations
          /\bfn\s+\w+/g,
          // Mutable variables
          /\blet\s+mut\s+\w+/g,
          // Standard library
          /\buse\s+std::/g,
          // Cargo commands
          /\bcargo\s+(?:run|build|test)/g,
          // Macros
          /\b(?:println!|panic!)/g
        ],
        confidence: 0.9,
        keywords: ['rust', 'cargo', 'rustc']
      }
    ];

    // Compile patterns once for better performance
    patterns.forEach(lang => {
      this.compiledPatterns.set(lang.name, {
        patterns: lang.patterns,
        confidence: lang.confidence,
        keywords: lang.keywords
      });
    });
  }

  /**
   * Get optimized patterns for a language
   */
  static getPatterns(language: string) {
    return this.compiledPatterns.get(language);
  }

  /**
   * Get all language patterns
   */
  static getAllPatterns() {
    return Array.from(this.compiledPatterns.entries()).map(([name, data]) => ({
      name,
      ...data
    }));
  }
}

/**
 * Optimized text mention patterns
 */
export class OptimizedTextMentions {
  private static readonly compiledMentions = new Map<string, RegExp[]>();

  static {
    const mentions = [
      { language: 'JavaScript', terms: ['javascript', 'js', 'node.js', 'nodejs', 'ecmascript'] },
      { language: 'TypeScript', terms: ['typescript', 'ts'] },
      { language: 'Python', terms: ['python', 'py'] },
      { language: 'Java', terms: ['java'] },
      { language: 'C++', terms: ['c\\+\\+', 'cpp', 'cxx', 'c plus plus'] },
      { language: 'C', terms: ['\\bc\\b', 'ansi c'] },
      { language: 'Go', terms: ['\\bgo\\b', 'golang'] },
      { language: 'Rust', terms: ['rust'] },
      { language: 'PHP', terms: ['php'] },
      { language: 'Ruby', terms: ['ruby'] }
    ];

    // Pre-compile regex patterns for better performance
    mentions.forEach(({ language, terms }) => {
      const patterns = terms.map(term => {
        // Use word boundaries for most terms, but handle special cases
        const hasSpecialChars = /[+#\\]/.test(term);
        if (hasSpecialChars) {
          return new RegExp(term, 'gi');
        } else {
          return new RegExp(`\\b${term}\\b`, 'gi');
        }
      });
      this.compiledMentions.set(language, patterns);
    });
  }

  /**
   * Get optimized mention patterns for a language
   */
  static getPatterns(language: string): RegExp[] {
    return this.compiledMentions.get(language) || [];
  }

  /**
   * Get all mention patterns
   */
  static getAllPatterns() {
    return Array.from(this.compiledMentions.entries());
  }
}

/**
 * Optimized file extension patterns
 */
export class OptimizedFilePatterns {
  private static readonly compiledExtensions = new Map<string, {
    pattern: RegExp;
    confidence: number;
  }>();

  static {
    const extensions = [
      { language: 'JavaScript', exts: ['\\.js', '\\.mjs', '\\.cjs'], confidence: 0.8 },
      { language: 'TypeScript', exts: ['\\.ts', '\\.tsx'], confidence: 0.9 },
      { language: 'Python', exts: ['\\.py', '\\.pyx', '\\.pyi'], confidence: 0.9 },
      { language: 'Java', exts: ['\\.java'], confidence: 0.9 },
      { language: 'C++', exts: ['\\.cpp', '\\.cxx', '\\.cc', '\\.hpp'], confidence: 0.9 },
      { language: 'C', exts: ['\\.c', '\\.h'], confidence: 0.8 },
      { language: 'Go', exts: ['\\.go'], confidence: 0.9 },
      { language: 'Rust', exts: ['\\.rs'], confidence: 0.9 },
      { language: 'PHP', exts: ['\\.php'], confidence: 0.9 },
      { language: 'Ruby', exts: ['\\.rb'], confidence: 0.9 }
    ];

    // Compile extension patterns
    extensions.forEach(({ language, exts, confidence }) => {
      const pattern = new RegExp(`(?:${exts.join('|')})\\b`, 'g');
      this.compiledExtensions.set(language, { pattern, confidence });
    });
  }

  /**
   * Get optimized extension pattern for a language
   */
  static getPattern(language: string) {
    return this.compiledExtensions.get(language);
  }

  /**
   * Get all extension patterns
   */
  static getAllPatterns() {
    return Array.from(this.compiledExtensions.entries());
  }
}

/**
 * Optimized config file patterns
 */
export class OptimizedConfigPatterns {
  private static readonly compiledConfigs = new Map<string, {
    pattern: RegExp;
    confidence: number;
  }>();

  static {
    const configs = [
      { language: 'JavaScript', files: ['package\\.json', 'package-lock\\.json', 'yarn\\.lock'], confidence: 0.7 },
      { language: 'TypeScript', files: ['tsconfig\\.json'], confidence: 0.8 },
      { language: 'Python', files: ['requirements\\.txt', 'setup\\.py', 'Pipfile', 'pyproject\\.toml'], confidence: 0.7 },
      { language: 'Java', files: ['pom\\.xml', 'build\\.gradle'], confidence: 0.7 },
      { language: 'Rust', files: ['Cargo\\.toml', 'Cargo\\.lock'], confidence: 0.8 },
      { language: 'Go', files: ['go\\.mod', 'go\\.sum'], confidence: 0.8 },
      { language: 'PHP', files: ['composer\\.json'], confidence: 0.7 },
      { language: 'Ruby', files: ['Gemfile'], confidence: 0.7 }
    ];

    // Compile config file patterns
    configs.forEach(({ language, files, confidence }) => {
      const pattern = new RegExp(`\\b(?:${files.join('|')})\\b`, 'g');
      this.compiledConfigs.set(language, { pattern, confidence });
    });
  }

  /**
   * Get optimized config pattern for a language
   */
  static getPattern(language: string) {
    return this.compiledConfigs.get(language);
  }

  /**
   * Get all config patterns
   */
  static getAllPatterns() {
    return Array.from(this.compiledConfigs.entries());
  }
}

/**
 * Regex performance utilities
 */
export class RegexUtils {
  /**
   * Count matches efficiently without creating match array
   */
  static countMatches(text: string, pattern: RegExp): number {
    let count = 0;
    let match;
    
    // Reset regex state
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(text)) !== null) {
      count++;
      // Prevent infinite loop on zero-length matches
      if (match.index === pattern.lastIndex) {
        pattern.lastIndex++;
      }
    }
    
    return count;
  }

  /**
   * Get limited matches for evidence without creating large arrays
   */
  static getLimitedMatches(text: string, pattern: RegExp, limit: number = 5): string[] {
    const matches: string[] = [];
    let match;
    
    // Reset regex state
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(text)) !== null && matches.length < limit) {
      matches.push(match[0]);
      // Prevent infinite loop on zero-length matches
      if (match.index === pattern.lastIndex) {
        pattern.lastIndex++;
      }
    }
    
    return matches;
  }

  /**
   * Test if pattern matches without creating match objects
   */
  static hasMatch(text: string, pattern: RegExp): boolean {
    pattern.lastIndex = 0;
    return pattern.test(text);
  }

  /**
   * Escape special regex characters
   */
  static escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Create optimized word boundary pattern
   */
  static createWordBoundaryPattern(word: string, flags: string = 'gi'): RegExp {
    const escaped = this.escapeRegex(word);
    return new RegExp(`\\b${escaped}\\b`, flags);
  }

  /**
   * Combine multiple patterns into one for better performance
   */
  static combinePatterns(patterns: string[], flags: string = 'g'): RegExp {
    const combined = `(?:${patterns.join('|')})`;
    return new RegExp(combined, flags);
  }
}

/**
 * Pattern cache for frequently used regex patterns
 */
export class PatternCache {
  private static cache = new Map<string, RegExp>();
  private static maxSize = 100;

  /**
   * Get cached pattern or create and cache new one
   */
  static getPattern(pattern: string, flags: string = 'g'): RegExp {
    const key = `${pattern}:${flags}`;
    
    if (this.cache.has(key)) {
      const cached = this.cache.get(key)!;
      // Reset lastIndex for global patterns
      cached.lastIndex = 0;
      return cached;
    }

    // Check cache size and evict oldest if needed
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const regex = new RegExp(pattern, flags);
    this.cache.set(key, regex);
    return regex;
  }

  /**
   * Clear pattern cache
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}