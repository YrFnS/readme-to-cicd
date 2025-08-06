/**
 * Adapter classes to bridge new AnalyzerResult with old AnalysisResult
 */

import { ContentAnalyzer, AnalysisResult, MarkdownAST } from '../types';
import { LanguageDetector } from './language-detector';
import { DependencyExtractor } from './dependency-extractor';
import { CommandExtractor } from './command-extractor';
import { TestingDetector } from './testing-detector';

/**
 * Base adapter class
 */
abstract class AnalyzerAdapter implements ContentAnalyzer {
  abstract readonly name: string;
  
  abstract analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult>;
  
  /**
   * Convert AnalyzerResult to AnalysisResult
   */
  protected convertResult<T>(result: any): AnalysisResult {
    if (result.success) {
      return {
        data: result.data,
        confidence: result.confidence,
        sources: result.sources || [],
        errors: result.errors
      };
    } else {
      return {
        data: null,
        confidence: result.confidence,
        sources: result.sources || [],
        errors: result.errors
      };
    }
  }
}

/**
 * Language detector adapter
 */
export class LanguageDetectorAdapter extends AnalyzerAdapter {
  readonly name = 'LanguageDetector';
  private detector = new LanguageDetector();
  
  async analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult> {
    const result = await this.detector.analyze(ast, rawContent);
    return this.convertResult(result);
  }
}

/**
 * Dependency extractor adapter
 */
export class DependencyExtractorAdapter extends AnalyzerAdapter {
  readonly name = 'DependencyExtractor';
  private extractor = new DependencyExtractor();
  
  async analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult> {
    const result = await this.extractor.analyze(ast, rawContent);
    return this.convertResult(result);
  }
}

/**
 * Command extractor adapter
 */
export class CommandExtractorAdapter extends AnalyzerAdapter {
  readonly name = 'CommandExtractor';
  public extractor = new CommandExtractor(); // Make public for context setting
  
  async analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult> {
    const result = await this.extractor.analyze(ast, rawContent);
    return this.convertResult(result);
  }
}

/**
 * Testing detector adapter
 */
export class TestingDetectorAdapter extends AnalyzerAdapter {
  readonly name = 'TestingDetector';
  private detector = new TestingDetector();
  
  async analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult> {
    const result = await this.detector.analyze(ast, rawContent);
    return this.convertResult(result);
  }
}