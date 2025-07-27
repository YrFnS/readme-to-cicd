import { AnalyzerResult, LanguageInfo, LanguageSource } from '../types';
import { MarkdownAST, MarkdownNode } from '../../shared/markdown-parser';
import { Analyzer } from './registry';

/**
 * Detects programming languages and frameworks from README content
 */
export class LanguageDetector implements Analyzer<LanguageInfo[]> {
  readonly name = 'LanguageDetector';

  private languagePatterns = new Map([
    ['JavaScript', {
      keywords: ['javascript', 'js', 'node', 'npm', 'yarn'],
      codeBlocks: ['javascript', 'js'],
      fileExtensions: ['.js', '.mjs'],
      frameworks: ['react', 'vue', 'angular', 'express', 'next']
    }],
    ['TypeScript', {
      keywords: ['typescript', 'ts'],
      codeBlocks: ['typescript', 'ts'],
      fileExtensions: ['.ts', '.tsx'],
      frameworks: ['angular', 'nest', 'next']
    }],
    ['Python', {
      keywords: ['python', 'py', 'pip', 'conda'],
      codeBlocks: ['python', 'py'],
      fileExtensions: ['.py'],
      frameworks: ['django', 'flask', 'fastapi', 'pandas']
    }],
    ['Java', {
      keywords: ['java', 'maven', 'gradle'],
      codeBlocks: ['java'],
      fileExtensions: ['.java'],
      frameworks: ['spring', 'hibernate']
    }],
    ['Go', {
      keywords: ['golang', 'go'],
      codeBlocks: ['go'],
      fileExtensions: ['.go'],
      frameworks: ['gin', 'echo']
    }],
    ['Rust', {
      keywords: ['rust', 'cargo'],
      codeBlocks: ['rust'],
      fileExtensions: ['.rs'],
      frameworks: ['actix', 'rocket']
    }],
    ['PHP', {
      keywords: ['php', 'composer'],
      codeBlocks: ['php'],
      fileExtensions: ['.php'],
      frameworks: ['laravel', 'symfony']
    }],
    ['C#', {
      keywords: ['csharp', 'c#', 'dotnet', '.net'],
      codeBlocks: ['csharp', 'cs'],
      fileExtensions: ['.cs'],
      frameworks: ['asp.net', 'blazor']
    }],
    ['Ruby', {
      keywords: ['ruby', 'gem', 'bundler'],
      codeBlocks: ['ruby', 'rb'],
      fileExtensions: ['.rb'],
      frameworks: ['rails', 'sinatra']
    }]
  ]);

  async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult<LanguageInfo[]>> {
    try {
      const languages = this.detectLanguages(ast, content);
      const confidence = this.calculateOverallConfidence(languages);
      
      return {
        success: true,
        data: languages,
        confidence
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        errors: [{
          code: 'LANGUAGE_DETECTION_ERROR',
          message: `Failed to detect languages: ${(error as Error).message}`,
          component: 'LanguageDetector',
          severity: 'error',
          category: 'analysis',
          isRecoverable: true
        }]
      };
    }
  }

  private detectLanguages(ast: MarkdownAST, content: string): LanguageInfo[] {
    const detectedLanguages = new Map<string, LanguageInfo>();
    
    // Analyze code blocks
    this.analyzeCodeBlocks(ast, detectedLanguages);
    
    // Analyze content for keywords
    this.analyzeKeywords(content, detectedLanguages);
    
    // Analyze file extensions mentioned
    this.analyzeFileExtensions(content, detectedLanguages);
    
    // Sort by confidence and return
    return Array.from(detectedLanguages.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  private analyzeCodeBlocks(ast: MarkdownAST, detectedLanguages: Map<string, LanguageInfo>): void {
    this.traverseAST(ast, (node) => {
      if (node.type === 'code' && node.lang) {
        const lang = node.lang.toLowerCase();
        
        for (const [languageName, patterns] of this.languagePatterns) {
          if (patterns.codeBlocks.includes(lang)) {
            this.addOrUpdateLanguage(detectedLanguages, languageName, 0.8, ['code block']);
            break;
          }
        }
      }
    });
  }

  private analyzeKeywords(content: string, detectedLanguages: Map<string, LanguageInfo>): void {
    const lowerContent = content.toLowerCase();
    
    for (const [languageName, patterns] of this.languagePatterns) {
      let keywordMatches = 0;
      const foundKeywords: string[] = [];
      
      for (const keyword of patterns.keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = lowerContent.match(regex);
        if (matches) {
          keywordMatches += matches.length;
          foundKeywords.push(keyword);
        }
      }
      
      if (keywordMatches > 0) {
        const confidence = Math.min(keywordMatches * 0.1, 0.6);
        this.addOrUpdateLanguage(detectedLanguages, languageName, confidence, foundKeywords);
      }
    }
  }

  private analyzeFileExtensions(content: string, detectedLanguages: Map<string, LanguageInfo>): void {
    for (const [languageName, patterns] of this.languagePatterns) {
      for (const extension of patterns.fileExtensions) {
        const regex = new RegExp(`\\${extension}\\b`, 'g');
        const matches = content.match(regex);
        if (matches) {
          const confidence = Math.min(matches.length * 0.05, 0.3);
          this.addOrUpdateLanguage(detectedLanguages, languageName, confidence, [`${extension} files`]);
        }
      }
    }
  }

  private addOrUpdateLanguage(
    detectedLanguages: Map<string, LanguageInfo>,
    languageName: string,
    confidence: number,
    sources: string[]
  ): void {
    const existing = detectedLanguages.get(languageName);
    
    if (existing) {
      existing.confidence = Math.min(existing.confidence + confidence, 1.0);
      existing.sources = [...new Set([...existing.sources, ...sources])] as LanguageSource[];
    } else {
      const frameworks = this.detectFrameworks(languageName, sources.join(' '));
      
      detectedLanguages.set(languageName, {
        name: languageName,
        confidence,
        sources: sources as LanguageSource[],
        ...(frameworks.length > 0 && { frameworks })
      });
    }
  }

  private detectFrameworks(languageName: string, content: string): string[] {
    const patterns = this.languagePatterns.get(languageName);
    if (!patterns) return [];
    
    const frameworks: string[] = [];
    const lowerContent = content.toLowerCase();
    
    for (const framework of patterns.frameworks) {
      if (lowerContent.includes(framework)) {
        frameworks.push(framework);
      }
    }
    
    return frameworks;
  }

  private traverseAST(node: MarkdownAST | MarkdownNode, callback: (node: MarkdownNode) => void): void {
    if ('children' in node && node.children) {
      for (const child of node.children) {
        callback(child);
        this.traverseAST(child, callback);
      }
    }
  }

  private calculateOverallConfidence(languages: LanguageInfo[]): number {
    if (languages.length === 0) return 0;
    
    // Weight by the highest confidence language
    const maxConfidence = Math.max(...languages.map(l => l.confidence));
    const avgConfidence = languages.reduce((sum, l) => sum + l.confidence, 0) / languages.length;
    
    return (maxConfidence * 0.7) + (avgConfidence * 0.3);
  }
}