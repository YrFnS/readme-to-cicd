import { AnalyzerResult, LanguageInfo, LanguageSource } from '../types';
import { MarkdownAST, MarkdownNode } from '../../shared/markdown-parser';
import { Analyzer } from './registry';
import { 
  LanguageContext, 
  Evidence, 
  EvidenceType, 
  SourceRange,
  ContextBoundary,
  BoundaryTransitionType 
} from '../../shared/types/language-context';
import { ConfidenceCalculator } from './confidence-calculator';
import { SourceTracker, SourceTracking } from './source-tracker';
import { ContextCollection } from '../../shared/types/context-manager';

/**
 * Enhanced Language Detector with confidence scoring and context generation
 */
export class LanguageDetector implements Analyzer<LanguageInfo[]> {
  readonly name = 'LanguageDetector';
  
  private confidenceCalculator: ConfidenceCalculator;
  private sourceTracker: SourceTracker;
  private contextCollection: ContextCollection;
  private rawContent: string = '';

  constructor() {
    this.confidenceCalculator = new ConfidenceCalculator();
    this.sourceTracker = new SourceTracker();
    this.contextCollection = new ContextCollection();
  }

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
      // Initialize tracking for this content
      this.rawContent = content;
      this.sourceTracker.initializeTracking(content);
      this.contextCollection.clear();

      // Perform enhanced detection with context generation
      const detectionResult = this.detectWithContext(ast, content);
      const languages = this.convertContextsToLanguageInfo(detectionResult.contexts);
      
      return {
        success: true,
        data: languages,
        confidence: detectionResult.overallConfidence
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

  /**
   * Enhanced detection that generates language contexts
   */
  public detectWithContext(ast: MarkdownAST, content: string): EnhancedDetectionResult {
    // Initialize tracking
    this.rawContent = content;
    this.sourceTracker.initializeTracking(content);
    this.contextCollection.clear();

    // Detect languages with evidence collection
    const languageEvidence = this.collectLanguageEvidence(ast, content);
    
    // Generate contexts from evidence
    const contexts = this.generateLanguageContexts(languageEvidence);
    
    // Detect context boundaries
    const boundaries = this.detectContextBoundaries(contexts);
    
    // Calculate overall confidence
    const overallConfidence = this.calculateContextualConfidence(contexts);

    return {
      languages: this.convertContextsToLanguageDetections(contexts),
      contexts,
      boundaries,
      overallConfidence,
      sourceTracking: this.sourceTracker.createSourceTracking(
        contexts.flatMap(c => c.evidence)
      )
    };
  }

  /**
   * Get language context at a specific position
   */
  public getContext(position: number): LanguageContext | undefined {
    const line = this.getLineFromPosition(position);
    const column = this.getColumnFromPosition(position, line);
    return this.contextCollection.getContextAt(line, column);
  }

  /**
   * Get all detected contexts
   */
  public getAllContexts(): LanguageContext[] {
    return this.contextCollection.getAllContexts();
  }

  /**
   * Get context boundaries
   */
  public getContextBoundaries(): ContextBoundary[] {
    return this.contextCollection.getBoundaries();
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

  // Enhanced detection methods

  /**
   * Collect evidence for all languages from AST and content
   */
  private collectLanguageEvidence(ast: MarkdownAST, content: string): Map<string, Evidence[]> {
    const languageEvidence = new Map<string, Evidence[]>();

    // Collect evidence from code blocks
    this.collectCodeBlockEvidence(ast, languageEvidence);
    
    // Collect evidence from keywords
    this.collectKeywordEvidence(content, languageEvidence);
    
    // Collect evidence from file extensions
    this.collectExtensionEvidence(content, languageEvidence);
    
    // Collect evidence from framework mentions
    this.collectFrameworkEvidence(content, languageEvidence);

    return languageEvidence;
  }

  /**
   * Generate language contexts from collected evidence
   */
  private generateLanguageContexts(languageEvidence: Map<string, Evidence[]>): LanguageContext[] {
    const contexts: LanguageContext[] = [];

    for (const [language, evidence] of languageEvidence) {
      if (evidence.length === 0) continue;

      // Calculate confidence using enhanced calculator
      const confidence = this.confidenceCalculator.calculateWithBoosts(evidence);
      
      // Apply fallback strategies for low confidence
      const adjustedConfidence = this.applyFallbackStrategies(language, confidence, evidence);
      
      // Determine source range for this language context
      const sourceRange = this.calculateLanguageSourceRange(evidence);
      
      // Create language context
      const context: LanguageContext = {
        language,
        confidence: adjustedConfidence,
        sourceRange,
        evidence,
        metadata: {
          createdAt: new Date(),
          source: 'LanguageDetector',
          ...(this.detectPrimaryFramework(language, evidence) ? {
            framework: this.detectPrimaryFramework(language, evidence)!
          } : {})
        }
      };

      contexts.push(context);
      this.contextCollection.addContext(context);
    }

    return contexts.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect context boundaries between different language contexts
   */
  private detectContextBoundaries(contexts: LanguageContext[]): ContextBoundary[] {
    return this.contextCollection.getBoundaries();
  }

  /**
   * Calculate contextual confidence considering boundaries and transitions
   */
  private calculateContextualConfidence(contexts: LanguageContext[]): number {
    if (contexts.length === 0) return 0;

    const boundaries = this.contextCollection.getBoundaries();
    const boundaryPenalty = Math.min(boundaries.length * 0.05, 0.2);
    
    const baseConfidence = this.calculateOverallConfidence(
      contexts.map(c => ({ confidence: c.confidence } as LanguageInfo))
    );

    return Math.max(0, baseConfidence - boundaryPenalty);
  }

  /**
   * Apply fallback detection strategies for low-confidence scenarios
   */
  private applyFallbackStrategies(
    language: string, 
    confidence: number, 
    evidence: Evidence[]
  ): number {
    if (confidence >= 0.6) {
      return confidence; // High confidence, no fallback needed
    }

    // Fallback strategy 1: Boost confidence for languages with multiple evidence types
    const evidenceTypes = new Set(evidence.map(e => e.type));
    if (evidenceTypes.size >= 3) {
      confidence = Math.min(confidence * 1.2, 1.0);
    }

    // Fallback strategy 2: Context-based boosting
    if (this.hasContextualSupport(language, evidence)) {
      confidence = Math.min(confidence * 1.1, 1.0);
    }

    // Fallback strategy 3: Minimum confidence for recognized languages
    if (this.languagePatterns.has(language) && confidence < 0.3) {
      confidence = 0.3;
    }

    return confidence;
  }

  /**
   * Check if language has contextual support from surrounding content
   */
  private hasContextualSupport(language: string, evidence: Evidence[]): boolean {
    const patterns = this.languagePatterns.get(language);
    if (!patterns) return false;

    // Check if any frameworks for this language are mentioned
    const frameworkEvidence = evidence.filter(e => e.type === 'framework');
    return frameworkEvidence.some(e => 
      patterns.frameworks.some(f => 
        e.value.toLowerCase().includes(f.toLowerCase())
      )
    );
  }

  /**
   * Calculate source range that encompasses all evidence for a language
   */
  private calculateLanguageSourceRange(evidence: Evidence[]): SourceRange {
    if (evidence.length === 0) {
      return { startLine: 0, endLine: 0, startColumn: 0, endColumn: 0 };
    }

    const locations = evidence.map(e => e.location);
    const startLine = Math.min(...locations.map(l => l.startLine));
    const endLine = Math.max(...locations.map(l => l.endLine));
    const startColumn = Math.min(...locations.filter(l => l.startLine === startLine).map(l => l.startColumn));
    const endColumn = Math.max(...locations.filter(l => l.endLine === endLine).map(l => l.endColumn));

    return { startLine, endLine, startColumn, endColumn };
  }

  /**
   * Detect primary framework for a language from evidence
   */
  private detectPrimaryFramework(language: string, evidence: Evidence[]): string | undefined {
    const frameworkEvidence = evidence.filter(e => e.type === 'framework');
    if (frameworkEvidence.length === 0) {
      // Also check if any evidence values contain framework names
      const patterns = this.languagePatterns.get(language);
      if (patterns) {
        for (const framework of patterns.frameworks) {
          const hasFrameworkEvidence = evidence.some(e => 
            e.value.toLowerCase().includes(framework.toLowerCase())
          );
          if (hasFrameworkEvidence) {
            return framework;
          }
        }
      }
      return undefined;
    }

    // Return the framework with highest confidence
    const primaryFramework = frameworkEvidence.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    return primaryFramework.value;
  }

  // Evidence collection methods

  private collectCodeBlockEvidence(ast: MarkdownAST, languageEvidence: Map<string, Evidence[]>): void {
    this.traverseAST(ast, (node) => {
      if (node.type === 'code' && node.lang) {
        const lang = node.lang.toLowerCase();
        
        for (const [languageName, patterns] of this.languagePatterns) {
          if (patterns.codeBlocks.includes(lang)) {
            const evidence = this.sourceTracker.trackEvidence(
              'syntax',
              `\`\`\`${lang}`,
              0.9
            );
            
            this.addEvidenceToMap(languageEvidence, languageName, evidence);
            break;
          }
        }
      }
    });
  }

  private collectKeywordEvidence(content: string, languageEvidence: Map<string, Evidence[]>): void {
    for (const [languageName, patterns] of this.languagePatterns) {
      for (const keyword of patterns.keywords) {
        const evidence = this.sourceTracker.trackEvidence('keyword', keyword, 0.5);
        if (evidence.length > 0) {
          this.addEvidenceToMap(languageEvidence, languageName, evidence);
        }
      }
    }
  }

  private collectExtensionEvidence(content: string, languageEvidence: Map<string, Evidence[]>): void {
    for (const [languageName, patterns] of this.languagePatterns) {
      for (const extension of patterns.fileExtensions) {
        const evidence = this.sourceTracker.trackEvidence('extension', extension, 0.8);
        if (evidence.length > 0) {
          this.addEvidenceToMap(languageEvidence, languageName, evidence);
        }
      }
    }
  }

  private collectFrameworkEvidence(content: string, languageEvidence: Map<string, Evidence[]>): void {
    for (const [languageName, patterns] of this.languagePatterns) {
      for (const framework of patterns.frameworks) {
        const evidence = this.sourceTracker.trackEvidence('framework', framework, 0.7);
        if (evidence.length > 0) {
          this.addEvidenceToMap(languageEvidence, languageName, evidence);
        }
      }
    }
  }

  private addEvidenceToMap(
    languageEvidence: Map<string, Evidence[]>, 
    language: string, 
    evidence: Evidence[]
  ): void {
    if (!languageEvidence.has(language)) {
      languageEvidence.set(language, []);
    }
    languageEvidence.get(language)!.push(...evidence);
  }

  // Conversion methods

  private convertContextsToLanguageInfo(contexts: LanguageContext[]): LanguageInfo[] {
    return contexts.map(context => ({
      name: context.language,
      confidence: context.confidence,
      sources: this.convertEvidenceToSources(context.evidence),
      ...(context.metadata?.framework && {
        frameworks: [context.metadata.framework]
      })
    }));
  }

  private convertContextsToLanguageDetections(contexts: LanguageContext[]): LanguageDetection[] {
    return contexts.map(context => ({
      language: context.language,
      confidence: context.confidence,
      evidence: context.evidence,
      sourceTracking: this.sourceTracker.createSourceTracking(context.evidence)
    }));
  }

  private convertEvidenceToSources(evidence: Evidence[]): LanguageSource[] {
    const sourceMap: Record<EvidenceType, LanguageSource> = {
      'keyword': 'text-mention',
      'extension': 'file-reference',
      'syntax': 'code-block',
      'dependency': 'text-mention',
      'framework': 'text-mention',
      'tool': 'text-mention',
      'pattern': 'pattern-match',
      'declaration': 'code-block'
    };

    const sources = evidence.map(e => sourceMap[e.type] || 'text-mention');
    return [...new Set(sources)]; // Remove duplicates
  }

  // Utility methods

  private getLineFromPosition(position: number): number {
    let currentPos = 0;
    const lines = this.rawContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      if (currentPos + (lines[i]?.length ?? 0) >= position) {
        return i;
      }
      currentPos += (lines[i]?.length ?? 0) + 1; // +1 for newline
    }
    
    return Math.max(0, lines.length - 1);
  }

  private getColumnFromPosition(position: number, line: number): number {
    const lines = this.rawContent.split('\n');
    let currentPos = 0;
    
    for (let i = 0; i < line; i++) {
      currentPos += (lines[i]?.length ?? 0) + 1; // +1 for newline
    }
    
    return position - currentPos;
  }
}

// Enhanced detection result interface
export interface EnhancedDetectionResult {
  languages: LanguageDetection[];
  contexts: LanguageContext[];
  boundaries: ContextBoundary[];
  overallConfidence: number;
  sourceTracking: SourceTracking;
}

// Language detection with enhanced information
export interface LanguageDetection {
  language: string;
  confidence: number;
  evidence: Evidence[];
  sourceTracking: SourceTracking;
}