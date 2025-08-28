/**
 * Adapter classes to bridge new AnalyzerResult with old AnalysisResult
 * Enhanced with context sharing capabilities
 */

import { ContentAnalyzer, AnalysisResult, MarkdownAST } from '../types';
import { AnalysisContext } from '../../shared/types/analysis-context';
import { LanguageContext } from '../../shared/types/language-context';
import { ContextAwareAnalyzer as LocalContextAwareAnalyzer } from './context-aware-analyzer';
import { LanguageDetector } from './language-detector';
import { DependencyExtractor } from './dependency-extractor';
import { CommandExtractor } from './command-extractor';
import { TestingDetector } from './testing-detector';
import { MetadataExtractor } from './metadata-extractor';

/**
 * Base adapter class with context awareness
 */
abstract class AnalyzerAdapter extends LocalContextAwareAnalyzer implements ContentAnalyzer {
  abstract readonly name: string;
  
  /**
   * Perform analysis with context support
   */
  protected async performAnalysis(
    ast: MarkdownAST, 
    rawContent: string, 
    context?: AnalysisContext
  ): Promise<AnalysisResult> {
    // Call the legacy analyze method and convert result
    const result = await this.legacyAnalyze(ast, rawContent, context);
    return this.convertResult(result);
  }
  
  /**
   * Legacy analyze method to be implemented by subclasses
   */
  protected abstract legacyAnalyze(
    ast: MarkdownAST, 
    rawContent: string, 
    context?: AnalysisContext
  ): Promise<any>;
  
  /**
   * Convert AnalyzerResult to AnalysisResult
   */
  protected convertResult<T>(result: any): AnalysisResult {
    if (result && result.success) {
      return {
        data: result.data,
        confidence: result.confidence || 0,
        sources: result.sources || [],
        errors: result.errors || []
      };
    } else {
      return {
        data: result?.data || null,
        confidence: result?.confidence || 0,
        sources: result?.sources || [],
        errors: result?.errors || []
      };
    }
  }
}

/**
 * Language detector adapter with context sharing
 */
export class LanguageDetectorAdapter extends AnalyzerAdapter {
  readonly name = 'LanguageDetector';
  public detector = new LanguageDetector(); // Make public for context access
  
  protected getAnalyzerName(): string {
    return this.name;
  }
  
  protected async legacyAnalyze(
    ast: MarkdownAST, 
    rawContent: string, 
    context?: AnalysisContext
  ): Promise<any> {
    // Perform language detection
    const result = await this.detector.analyze(ast, rawContent);
    
    // If context is available, share language contexts
    if (context && result.success && result.data) {
      this.shareLanguageContexts(context, result.data, ast, rawContent);
    }
    
    return result;
  }
  
  /**
   * Share detected language contexts with the analysis context
   */
  private shareLanguageContexts(
    context: AnalysisContext,
    languageData: any[],
    ast: MarkdownAST,
    rawContent: string
  ): void {
    try {
      // Convert language detection results to language contexts
      const languageContexts: LanguageContext[] = languageData.map((lang: any, index: number) => ({
        language: lang.name || 'Unknown',
        confidence: lang.confidence || 0.5,
        sourceRange: {
          startLine: 0,
          endLine: rawContent.split('\n').length - 1,
          startColumn: 0,
          endColumn: 0
        },
        evidence: (lang.sources || []).map((source: string) => ({
          type: 'pattern' as const,
          value: source,
          confidence: lang.confidence || 0.5,
          location: {
            startLine: 0,
            endLine: 0,
            startColumn: 0,
            endColumn: 0
          }
        })),
        metadata: {
          createdAt: new Date(),
          source: this.name,
          framework: lang.frameworks?.[0],
          properties: {
            index,
            originalData: lang
          }
        }
      }));
      
      // Add language contexts to shared context
      languageContexts.forEach(langContext => {
        this.addLanguageContext(context, langContext);
      });
      
      // Store enhanced detection result in shared data
      this.setSharedData(context, 'language_contexts', languageContexts);
      this.setSharedData(context, 'primary_language', languageContexts[0]?.language || 'Unknown');
      
      console.log(`✅ [${this.name}] Shared ${languageContexts.length} language contexts`);
      
    } catch (error) {
      console.warn(`⚠️ [${this.name}] Failed to share language contexts:`, error);
    }
  }
}

/**
 * Dependency extractor adapter with context sharing
 */
export class DependencyExtractorAdapter extends AnalyzerAdapter {
  readonly name = 'DependencyExtractor';
  private extractor = new DependencyExtractor();
  
  protected getAnalyzerName(): string {
    return this.name;
  }
  
  protected async legacyAnalyze(
    ast: MarkdownAST, 
    rawContent: string, 
    context?: AnalysisContext
  ): Promise<any> {
    // Get language information from shared context to improve dependency detection
    let languageHints: string[] = [];
    if (context) {
      const languageContexts = this.getLanguageContexts(context);
      languageHints = languageContexts.map(lc => lc.language);
      
      if (languageHints.length > 0) {
        console.log(`✅ [${this.name}] Using language hints: ${languageHints.join(', ')}`);
      }
    }
    
    // Perform dependency extraction
    const result = await this.extractor.analyze(ast, rawContent);
    
    // Share dependency results with context
    if (context && result.success && result.data) {
      this.shareDependencyResults(context, result.data, languageHints);
    }
    
    return result;
  }
  
  /**
   * Share dependency extraction results with analysis context
   */
  private shareDependencyResults(
    context: AnalysisContext, 
    dependencyData: any, 
    languageHints: string[]
  ): void {
    try {
      // Store dependency results in shared data
      this.setSharedData(context, 'extracted_dependencies', dependencyData);
      
      // Create language-dependency mappings
      const languageDependencyMap = this.createLanguageDependencyMap(dependencyData, languageHints);
      this.setSharedData(context, 'language_dependency_map', languageDependencyMap);
      
      console.log(`✅ [${this.name}] Shared dependency results with mappings for ${Object.keys(languageDependencyMap).length} languages`);
      
    } catch (error) {
      console.warn(`⚠️ [${this.name}] Failed to share dependency results:`, error);
    }
  }
  
  /**
   * Create mappings between languages and their dependencies
   */
  private createLanguageDependencyMap(dependencyData: any, languageHints: string[]): Record<string, any[]> {
    const map: Record<string, any[]> = {};
    
    try {
      // Initialize map with detected languages
      languageHints.forEach(lang => {
        map[lang] = [];
      });
      
      // Map package managers to languages
      const packageManagerLanguageMap: Record<string, string> = {
        'npm': 'JavaScript',
        'yarn': 'JavaScript',
        'pip': 'Python',
        'cargo': 'Rust',
        'go': 'Go',
        'maven': 'Java',
        'gradle': 'Java',
        'composer': 'PHP',
        'gem': 'Ruby',
        'bundler': 'Ruby'
      };
      
      // Process dependencies and packages
      if (dependencyData && typeof dependencyData === 'object') {
        if (Array.isArray((dependencyData as any).dependencies)) {
          (dependencyData as any).dependencies.forEach((dep: any) => {
            const language = packageManagerLanguageMap[dep.manager] || 'Unknown';
            if (!map[language]) map[language] = [];
            map[language].push(dep);
          });
        }
        
        if (Array.isArray((dependencyData as any).packages)) {
          (dependencyData as any).packages.forEach((pkg: any) => {
            const language = packageManagerLanguageMap[pkg.manager] || 'Unknown';
            if (!map[language]) map[language] = [];
            map[language].push(pkg);
          });
        }
      }
      
    } catch (error) {
      console.warn(`⚠️ [${this.name}] Failed to create language-dependency map:`, error);
    }
    
    return map;
  }
}

/**
 * Command extractor adapter with context sharing
 */
export class CommandExtractorAdapter extends AnalyzerAdapter {
  readonly name = 'CommandExtractor';
  public extractor = new CommandExtractor(); // Make public for context setting
  
  protected getAnalyzerName(): string {
    return this.name;
  }
  
  protected async legacyAnalyze(
    ast: MarkdownAST, 
    rawContent: string, 
    context?: AnalysisContext
  ): Promise<any> {
    // Get language contexts from shared context
    if (context) {
      const languageContexts = this.getLanguageContexts(context);
      if (languageContexts.length > 0) {
        this.setLanguageContextsFromContext(languageContexts);
        console.log(`✅ [${this.name}] Using ${languageContexts.length} language contexts from shared context`);
      }
    }
    
    // Perform command extraction
    const result = await this.extractor.analyze(ast, rawContent);
    
    // Share command extraction results with context
    if (context && result.success && result.data) {
      this.shareCommandResults(context, result.data);
    }
    
    return result;
  }
  
  /**
   * Set language contexts from shared analysis context
   */
  private setLanguageContextsFromContext(languageContexts: LanguageContext[]): void {
    try {
      // Convert LanguageContext objects to the format expected by CommandExtractor
      const contextData = languageContexts.map(langContext => ({
        language: langContext.language,
        confidence: langContext.confidence,
        sourceRange: langContext.sourceRange,
        evidence: langContext.evidence.map(e => e.value),
        metadata: langContext.metadata
      }));
      
      // Set contexts on the extractor
      if (typeof this.extractor.setLanguageContexts === 'function') {
        (this.extractor as any).setLanguageContexts(contextData);
      } else {
        // Fallback: set directly on extractor property
        (this.extractor as any).languageContexts = contextData;
      }
      
    } catch (error) {
      console.warn(`⚠️ [${this.name}] Failed to set language contexts:`, error);
    }
  }
  
  /**
   * Share command extraction results with analysis context
   */
  private shareCommandResults(context: AnalysisContext, commandData: any): void {
    try {
      // Store command results in shared data for other analyzers
      this.setSharedData(context, 'extracted_commands', commandData);
      
      // Extract language associations for validation
      const languageAssociations = this.extractLanguageAssociations(commandData);
      this.setSharedData(context, 'command_language_associations', languageAssociations);
      
      console.log(`✅ [${this.name}] Shared command extraction results with ${languageAssociations.length} language associations`);
      
    } catch (error) {
      console.warn(`⚠️ [${this.name}] Failed to share command results:`, error);
    }
  }
  
  /**
   * Extract language associations from command data
   */
  private extractLanguageAssociations(commandData: any): Array<{ command: string; language: string; confidence: number }> {
    const associations: Array<{ command: string; language: string; confidence: number }> = [];
    
    try {
      // Process different command categories
      const categories = ['build', 'test', 'run', 'install', 'other', 'deploy'];
      
      for (const category of categories) {
        const commands = commandData[category];
        if (Array.isArray(commands)) {
          commands.forEach((cmd: any) => {
            if (cmd.language && cmd.language !== 'Shell') {
              associations.push({
                command: cmd.command,
                language: cmd.language,
                confidence: cmd.confidence || 0.5
              });
            }
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️ [${this.name}] Failed to extract language associations:`, error);
    }
    
    return associations;
  }
  
  /**
   * Expose setLanguageContexts method for backward compatibility
   */
  public setLanguageContexts(contexts: any[]): void {
    this.extractor.setLanguageContexts(contexts);
  }
}

/**
 * Testing detector adapter with context sharing
 */
export class TestingDetectorAdapter extends AnalyzerAdapter {
  readonly name = 'TestingDetector';
  private detector = new TestingDetector();

  getAnalyzerName(): string {
    return this.name;
  }
  
  protected async legacyAnalyze(
    ast: MarkdownAST, 
    rawContent: string, 
    context?: AnalysisContext
  ): Promise<any> {
    // Get language and dependency information from shared context
    let languageHints: string[] = [];
    let dependencyHints: any[] = [];
    
    if (context) {
      const languageContexts = this.getLanguageContexts(context);
      languageHints = languageContexts.map(lc => lc.language);
      
      const dependencyData = this.getSharedData(context, 'extracted_dependencies');
      if (dependencyData) {
        dependencyHints = [
          ...((dependencyData as any).dependencies || []),
          ...((dependencyData as any).packages || [])
        ];
      }
      
      if (languageHints.length > 0 || dependencyHints.length > 0) {
        console.log(`✅ [${this.name}] Using context hints - Languages: ${languageHints.length}, Dependencies: ${dependencyHints.length}`);
      }
    }
    
    // Perform testing detection
    const result = await this.detector.analyze(ast, rawContent);
    
    // Share testing results with context
    if (context && result.success && result.data) {
      this.shareTestingResults(context, result.data, languageHints);
    }
    
    return result;
  }
  
  /**
   * Share testing detection results with analysis context
   */
  private shareTestingResults(
    context: AnalysisContext, 
    testingData: any, 
    languageHints: string[]
  ): void {
    try {
      // Store testing results in shared data
      this.setSharedData(context, 'extracted_testing', testingData);
      
      // Create language-testing framework mappings
      const languageTestingMap = this.createLanguageTestingMap(testingData, languageHints);
      this.setSharedData(context, 'language_testing_map', languageTestingMap);
      
      console.log(`✅ [${this.name}] Shared testing results with mappings for ${Object.keys(languageTestingMap).length} languages`);
      
    } catch (error) {
      console.warn(`⚠️ [${this.name}] Failed to share testing results:`, error);
    }
  }
  
  /**
   * Create mappings between languages and their testing frameworks
   */
  private createLanguageTestingMap(testingData: any, languageHints: string[]): Record<string, any[]> {
    const map: Record<string, any[]> = {};
    
    try {
      // Initialize map with detected languages
      languageHints.forEach(lang => {
        map[lang] = [];
      });
      
      // Map testing frameworks to languages
      if (testingData.frameworks) {
        testingData.frameworks.forEach((framework: any) => {
          const language = framework.language || 'Unknown';
          if (!map[language]) map[language] = [];
          map[language].push(framework);
        });
      }
      
      // Map testing tools to languages based on common associations
      if (testingData.tools) {
        testingData.tools.forEach((tool: any) => {
          // Try to associate tools with languages based on common patterns
          const associatedLanguages = this.getToolLanguageAssociations(tool.name);
          associatedLanguages.forEach(lang => {
            if (languageHints.includes(lang)) {
              if (!map[lang]) map[lang] = [];
              map[lang].push(tool);
            }
          });
        });
      }
      
    } catch (error) {
      console.warn(`⚠️ [${this.name}] Failed to create language-testing map:`, error);
    }
    
    return map;
  }
  
  /**
   * Get language associations for testing tools
   */
  private getToolLanguageAssociations(toolName: string): string[] {
    const associations: Record<string, string[]> = {
      'jest': ['JavaScript', 'TypeScript'],
      'mocha': ['JavaScript', 'TypeScript'],
      'jasmine': ['JavaScript', 'TypeScript'],
      'pytest': ['Python'],
      'unittest': ['Python'],
      'rspec': ['Ruby'],
      'minitest': ['Ruby'],
      'junit': ['Java'],
      'testng': ['Java'],
      'cargo': ['Rust'],
      'go test': ['Go'],
      'phpunit': ['PHP']
    };
    
    const lowerToolName = toolName.toLowerCase();
    for (const [tool, languages] of Object.entries(associations)) {
      if (lowerToolName.includes(tool)) {
        return languages;
      }
    }
    
    return [];
  }
}

/**
 * Metadata extractor adapter with context sharing
 */
export class MetadataExtractorAdapter extends AnalyzerAdapter {
  readonly name = 'MetadataExtractor';
  private extractor = new MetadataExtractor();

  getAnalyzerName(): string {
    return this.name;
  }
  
  protected async legacyAnalyze(
    ast: MarkdownAST, 
    rawContent: string, 
    context?: AnalysisContext
  ): Promise<any> {
    // Analysis context is handled by the base class
    
    // Perform metadata extraction
    const result = await this.extractor.analyze(ast, rawContent, context);
    
    // Share metadata results with context
    if (context && result.success && result.data) {
      this.shareMetadataResults(context, result.data);
    }
    
    return result;
  }
  
  /**
   * Share metadata extraction results with analysis context
   */
  private shareMetadataResults(context: AnalysisContext, metadataData: any): void {
    try {
      // Store metadata results in shared data
      this.setSharedData(context, 'extracted_metadata', metadataData);
      
      // Create project summary for other analyzers
      const projectSummary = {
        name: metadataData.name,
        description: metadataData.description,
        hasStructure: !!(metadataData.structure && metadataData.structure.length > 0),
        hasEnvironmentVars: !!(metadataData.environment && metadataData.environment.length > 0),
        structureCount: metadataData.structure?.length || 0,
        envVarCount: metadataData.environment?.length || 0
      };
      
      this.setSharedData(context, 'project_summary', projectSummary);
      
      console.log(`✅ [${this.name}] Shared metadata results for project: ${metadataData.name}`);
      
    } catch (error) {
      console.warn(`⚠️ [${this.name}] Failed to share metadata results:`, error);
    }
  }
}