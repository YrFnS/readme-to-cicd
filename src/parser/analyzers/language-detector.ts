/**
 * LanguageDetector - Analyzes README content to detect programming languages
 */

import { BaseAnalyzer } from './base-analyzer';
import { AnalysisResult, LanguageInfo, LanguageSource, MarkdownAST } from '../types';

/**
 * Language detection patterns for syntax-based identification
 */
interface LanguagePattern {
  name: string;
  patterns: RegExp[];
  confidence: number;
  keywords?: string[];
}

/**
 * Language detection result with detailed information
 */
interface LanguageDetectionResult {
  name: string;
  confidence: number;
  sources: LanguageSource[];
  evidence: string[];
  frameworks?: string[];
}

/**
 * LanguageDetector class implementing ContentAnalyzer interface
 * Detects programming languages from README content using multiple strategies
 */
export class LanguageDetector extends BaseAnalyzer {
  readonly name = 'LanguageDetector';

  // Language patterns for syntax-based detection
  private readonly languagePatterns: LanguagePattern[] = [
    {
      name: 'JavaScript',
      patterns: [
        /\b(function|const|let|var)\s+\w+/g,
        /\b(require|import|export)\s*\(/g,
        /\b(async|await|Promise)\b/g,
        /\b(console\.log|document\.)\w+/g,
        /\b(npm|yarn|node)\s+/g
      ],
      confidence: 0.8,
      keywords: ['javascript', 'js', 'node', 'nodejs', 'npm', 'yarn']
    },
    {
      name: 'TypeScript',
      patterns: [
        /\b(interface|type)\s+\w+/g,
        /:\s*(string|number|boolean|any)\b/g,
        /\b(export|import).*from\s+['"][^'"]+['"]/g,
        /\b(async|await)\s*\w*\s*:\s*Promise</g
      ],
      confidence: 0.9,
      keywords: ['typescript', 'ts', 'tsc']
    },
    {
      name: 'Python',
      patterns: [
        /\b(def|class)\s+\w+/g,
        /\b(import|from)\s+\w+/g,
        /\b(if|elif|else):\s*$/gm,
        /\b(print|len|range)\s*\(/g,
        /\b(pip|python|python3)\s+/g
      ],
      confidence: 0.8,
      keywords: ['python', 'py', 'pip', 'conda', 'virtualenv', 'pytest']
    },
    {
      name: 'Java',
      patterns: [
        /\b(public|private|protected)\s+(class|interface)/g,
        /\b(public\s+static\s+void\s+main)/g,
        /\b(import\s+java\.)/g,
        /\b(System\.out\.println)/g,
        /\b(maven|gradle|mvn)\s+/g
      ],
      confidence: 0.9,
      keywords: ['java', 'maven', 'gradle', 'spring', 'junit']
    },
    {
      name: 'C++',
      patterns: [
        /\b(#include\s*<[^>]+>)/g,
        /\b(std::|using\s+namespace\s+std)/g,
        /\b(int\s+main\s*\()/g,
        /\b(cout|cin|endl)\b/g,
        /\b(class|struct)\s+\w+/g
      ],
      confidence: 0.9,
      keywords: ['cpp', 'c++', 'cmake', 'make', 'gcc', 'clang']
    },
    {
      name: 'C',
      patterns: [
        /\b(#include\s*<[^>]+\.h>)/g,
        /\b(int\s+main\s*\()/g,
        /\b(printf|scanf|malloc|free)\s*\(/g,
        /\b(struct|typedef)\s+\w+/g
      ],
      confidence: 0.8,
      keywords: ['c', 'gcc', 'make', 'cmake']
    },
    {
      name: 'Go',
      patterns: [
        /\b(package\s+main)/g,
        /\b(import\s*\()/g,
        /\b(func\s+\w+)/g,
        /\b(go\s+run|go\s+build|go\s+test)/g,
        /\b(fmt\.Print|fmt\.Scan)/g
      ],
      confidence: 0.9,
      keywords: ['go', 'golang', 'mod']
    },
    {
      name: 'Rust',
      patterns: [
        /\b(fn\s+\w+)/g,
        /\b(let\s+mut\s+\w+)/g,
        /\b(use\s+std::)/g,
        /\b(cargo\s+run|cargo\s+build|cargo\s+test)/g,
        /\b(println!|panic!)/g
      ],
      confidence: 0.9,
      keywords: ['rust', 'cargo', 'rustc']
    },
    {
      name: 'PHP',
      patterns: [
        /\b(<\?php)/g,
        /\b(\$\w+\s*=)/g,
        /\b(function\s+\w+\s*\()/g,
        /\b(echo|print|var_dump)\s*\(/g,
        /\b(composer|php)\s+/g
      ],
      confidence: 0.8,
      keywords: ['php', 'composer', 'laravel', 'symfony']
    },
    {
      name: 'Ruby',
      patterns: [
        /\b(def\s+\w+)/g,
        /\b(class\s+\w+)/g,
        /\b(require\s+['"][^'"]+['"])/g,
        /\b(puts|print|p)\s+/g,
        /\b(gem|bundle|rails)\s+/g
      ],
      confidence: 0.8,
      keywords: ['ruby', 'gem', 'bundle', 'rails', 'rake']
    }
  ];

  // Common language mentions in text
  private readonly textMentions: Map<string, string[]> = new Map([
    ['JavaScript', ['javascript', 'js', 'node.js', 'nodejs', 'ecmascript']],
    ['TypeScript', ['typescript', 'ts']],
    ['Python', ['python', 'py']],
    ['Java', ['java']],
    ['C++', ['c++', 'C++', 'cpp', 'cxx', 'c plus plus']],
    ['C', ['c language', ' c ', 'ansi c']],
    ['Go', ['go', 'golang']],
    ['Rust', ['rust']],
    ['PHP', ['php']],
    ['Ruby', ['ruby']],
    ['C#', ['c#', 'csharp', 'c sharp']],
    ['Swift', ['swift']],
    ['Kotlin', ['kotlin']],
    ['Scala', ['scala']],
    ['R', [' r ', 'r language']],
    ['MATLAB', ['matlab']],
    ['Shell', ['bash', 'shell', 'sh', 'zsh']],
    ['PowerShell', ['powershell', 'pwsh']],
    ['SQL', ['sql', 'mysql', 'postgresql', 'sqlite']],
    ['HTML', ['html']],
    ['CSS', ['css']],
    ['Dart', ['dart', 'flutter']],
    ['Elixir', ['elixir']],
    ['Haskell', ['haskell']],
    ['Clojure', ['clojure']]
  ]);

  /**
   * Analyze markdown content to detect programming languages
   */
  async analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult> {
    try {
      const detectionResults = new Map<string, LanguageDetectionResult>();

      // 1. Extract languages from code blocks
      this.extractFromCodeBlocks(ast, detectionResults);

      // 2. Pattern matching for language-specific syntax
      this.detectFromPatterns(rawContent, detectionResults);

      // 3. Text analysis for language mentions
      this.detectFromTextMentions(rawContent, detectionResults);

      // 4. File reference detection
      this.detectFromFileReferences(rawContent, detectionResults);

      // Convert to LanguageInfo array and calculate confidence
      const languages = this.consolidateResults(detectionResults);

      return this.createResult(
        languages,
        this.calculateOverallConfidence(languages),
        this.extractSources(languages)
      );

    } catch (error) {
      const parseError = this.createError(
        'LANGUAGE_DETECTION_ERROR',
        `Failed to detect languages: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: error instanceof Error ? error.message : error }
      );

      return this.createResult([], 0, [], [parseError]);
    }
  }

  /**
   * Extract languages from fenced code blocks
   */
  private extractFromCodeBlocks(ast: MarkdownAST, results: Map<string, LanguageDetectionResult>): void {
    const codeBlocks = ast.filter(token => token.type === 'code');

    for (const block of codeBlocks) {
      const codeToken = block as any;
      if (codeToken.lang) {
        const language = this.normalizeLanguageName(codeToken.lang);
        if (language) {
          this.addOrUpdateResult(results, language, {
            name: language,
            confidence: 0.9, // High confidence for explicit code block languages
            sources: ['code-block'],
            evidence: [`Code block with language: ${codeToken.lang}`]
          });
        }
      }
    }
  }  /*
*
   * Detect languages using pattern matching
   */
  private detectFromPatterns(content: string, results: Map<string, LanguageDetectionResult>): void {
    for (const pattern of this.languagePatterns) {
      let matchCount = 0;
      const evidence: string[] = [];

      for (const regex of pattern.patterns) {
        const matches = content.match(regex);
        if (matches) {
          matchCount += matches.length;
          evidence.push(...matches.slice(0, 3)); // Limit evidence to avoid bloat
        }
      }

      if (matchCount > 0) {
        // Calculate confidence based on match count and pattern confidence
        const confidence = Math.min(pattern.confidence * (matchCount / 10), 1.0);
        
        this.addOrUpdateResult(results, pattern.name, {
          name: pattern.name,
          confidence,
          sources: ['pattern-match'],
          evidence: evidence.slice(0, 5) // Limit evidence
        });
      }
    }
  }

  /**
   * Detect languages from text mentions
   */
  private detectFromTextMentions(content: string, results: Map<string, LanguageDetectionResult>): void {

    for (const [language, mentions] of this.textMentions) {
      let mentionCount = 0;
      const evidence: string[] = [];

      for (const mention of mentions) {
        // Create regex pattern, escaping special characters
        const escapedMention = mention.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Use word boundaries for most cases, but not for patterns with special chars like C++
        const useWordBoundary = !/[+#]/.test(mention);
        const pattern = useWordBoundary ? `\\b${escapedMention}\\b` : escapedMention;
        const regex = new RegExp(pattern, 'gi');
        const matches = content.match(regex);
        if (matches) {
          mentionCount += matches.length;
          evidence.push(...matches.slice(0, 2));
        }
      }

      if (mentionCount > 0) {
        // Lower confidence for text mentions
        const confidence = Math.min(0.6 * (mentionCount / 5), 0.8);
        
        this.addOrUpdateResult(results, language, {
          name: language,
          confidence,
          sources: ['text-mention'],
          evidence: evidence.slice(0, 3)
        });
      }
    }
  }

  /**
   * Detect languages from file references
   */
  private detectFromFileReferences(content: string, results: Map<string, LanguageDetectionResult>): void {
    const filePatterns = [
      { extensions: ['.js', '.mjs', '.cjs'], language: 'JavaScript', confidence: 0.8 },
      { extensions: ['.ts', '.tsx'], language: 'TypeScript', confidence: 0.9 },
      { extensions: ['.py', '.pyx', '.pyi'], language: 'Python', confidence: 0.9 },
      { extensions: ['.java'], language: 'Java', confidence: 0.9 },
      { extensions: ['.cpp', '.cxx', '.cc', '.hpp'], language: 'C++', confidence: 0.9 },
      { extensions: ['.c', '.h'], language: 'C', confidence: 0.8 },
      { extensions: ['.go'], language: 'Go', confidence: 0.9 },
      { extensions: ['.rs'], language: 'Rust', confidence: 0.9 },
      { extensions: ['.php'], language: 'PHP', confidence: 0.9 },
      { extensions: ['.rb'], language: 'Ruby', confidence: 0.9 },
      { extensions: ['.cs'], language: 'C#', confidence: 0.9 },
      { extensions: ['.swift'], language: 'Swift', confidence: 0.9 },
      { extensions: ['.kt', '.kts'], language: 'Kotlin', confidence: 0.9 },
      { extensions: ['.scala'], language: 'Scala', confidence: 0.9 },
      { extensions: ['.dart'], language: 'Dart', confidence: 0.9 },
      { extensions: ['.sh', '.bash'], language: 'Shell', confidence: 0.8 }
    ];

    for (const { extensions, language, confidence } of filePatterns) {
      let fileCount = 0;
      const evidence: string[] = [];

      for (const ext of extensions) {
        // Simple regex to catch file extensions
        const regex = new RegExp(ext.replace('.', '\\.'), 'g');
        const matches = content.match(regex);
        if (matches) {
          fileCount += matches.length;
          evidence.push(...matches.slice(0, 3));
        }
      }

      if (fileCount > 0) {
        this.addOrUpdateResult(results, language, {
          name: language,
          confidence: Math.min(confidence * (fileCount / 5), confidence),
          sources: ['file-reference'],
          evidence: evidence.slice(0, 3)
        });
      }
    }

    // Special handling for common config files
    const configFiles = [
      { files: ['package.json', 'package-lock.json', 'yarn.lock'], language: 'JavaScript', confidence: 0.7 },
      { files: ['tsconfig.json'], language: 'TypeScript', confidence: 0.8 },
      { files: ['requirements.txt', 'setup.py', 'Pipfile', 'pyproject.toml'], language: 'Python', confidence: 0.7 },
      { files: ['pom.xml', 'build.gradle'], language: 'Java', confidence: 0.7 },
      { files: ['Cargo.toml', 'Cargo.lock'], language: 'Rust', confidence: 0.8 },
      { files: ['go.mod', 'go.sum'], language: 'Go', confidence: 0.8 },
      { files: ['composer.json'], language: 'PHP', confidence: 0.7 },
      { files: ['Gemfile'], language: 'Ruby', confidence: 0.7 }
    ];

    for (const { files, language, confidence } of configFiles) {
      let configCount = 0;
      const evidence: string[] = [];

      for (const file of files) {
        const regex = new RegExp(`\\b${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        const matches = content.match(regex);
        if (matches) {
          configCount += matches.length;
          evidence.push(...matches.slice(0, 2));
        }
      }

      if (configCount > 0) {
        this.addOrUpdateResult(results, language, {
          name: language,
          confidence: Math.min(confidence * (configCount / 3), confidence),
          sources: ['file-reference'],
          evidence: evidence.slice(0, 3)
        });
      }
    }
  }

  /**
   * Add or update language detection result
   */
  private addOrUpdateResult(
    results: Map<string, LanguageDetectionResult>,
    language: string,
    newResult: LanguageDetectionResult
  ): void {
    const existing = results.get(language);
    
    if (existing) {
      // Combine results with weighted confidence based on sources
      const sourceBonus = 0.1 * Math.min(existing.sources.length + newResult.sources.length, 4);
      const combinedConfidence = Math.min(
        Math.max(existing.confidence, newResult.confidence) + sourceBonus,
        1.0
      );
      const combinedSources = Array.from(new Set([...existing.sources, ...newResult.sources]));
      const combinedEvidence = [...existing.evidence, ...newResult.evidence].slice(0, 10);

      const combinedFrameworks = existing.frameworks ?? newResult.frameworks;
      results.set(language, {
        name: language,
        confidence: combinedConfidence,
        sources: combinedSources,
        evidence: combinedEvidence,
        ...(combinedFrameworks && { frameworks: combinedFrameworks })
      });
    } else {
      results.set(language, newResult);
    }
  }

  /**
   * Consolidate detection results into LanguageInfo array
   */
  private consolidateResults(results: Map<string, LanguageDetectionResult>): LanguageInfo[] {
    const languages: LanguageInfo[] = [];

    for (const result of results.values()) {
      languages.push({
        name: result.name,
        confidence: result.confidence,
        sources: result.sources,
        ...(result.frameworks && { frameworks: result.frameworks })
      });
    }

    // Sort by confidence (highest first)
    return languages.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(languages: LanguageInfo[]): number {
    if (languages.length === 0) return 0;

    // Weight by confidence and number of sources
    const totalWeight = languages.reduce((sum, lang) => {
      const sourceWeight = lang.sources.length * 0.2; // Increased weight for multiple sources
      return sum + (lang.confidence * (1 + sourceWeight));
    }, 0);

    // More generous overall confidence calculation
    const baseConfidence = totalWeight / languages.length;
    const bonusForMultipleLanguages = languages.length > 1 ? 0.1 : 0;
    
    return Math.min(baseConfidence + bonusForMultipleLanguages, 1.0);
  }

  /**
   * Extract all unique sources from languages
   */
  private extractSources(languages: LanguageInfo[]): string[] {
    const allSources = languages.flatMap(lang => lang.sources);
    return Array.from(new Set(allSources));
  }

  /**
   * Normalize language names from code block identifiers
   */
  private normalizeLanguageName(lang: string): string | null {
    const normalized = lang.toLowerCase().trim();
    
    const languageMap: Record<string, string> = {
      'js': 'JavaScript',
      'javascript': 'JavaScript',
      'jsx': 'JavaScript',
      'ts': 'TypeScript',
      'typescript': 'TypeScript',
      'tsx': 'TypeScript',
      'py': 'Python',
      'python': 'Python',
      'python3': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c++': 'C++',
      'cxx': 'C++',
      'cc': 'C++',
      'c': 'C',
      'go': 'Go',
      'golang': 'Go',
      'rs': 'Rust',
      'rust': 'Rust',
      'php': 'PHP',
      'rb': 'Ruby',
      'ruby': 'Ruby',
      'cs': 'C#',
      'csharp': 'C#',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'kotlin': 'Kotlin',
      'scala': 'Scala',
      'dart': 'Dart',
      'sh': 'Shell',
      'bash': 'Shell',
      'shell': 'Shell',
      'zsh': 'Shell',
      'powershell': 'PowerShell',
      'pwsh': 'PowerShell',
      'sql': 'SQL',
      'html': 'HTML',
      'css': 'CSS',
      'r': 'R',
      'matlab': 'MATLAB',
      'elixir': 'Elixir',
      'haskell': 'Haskell',
      'clojure': 'Clojure'
    };

    return languageMap[normalized] || null;
  }
}