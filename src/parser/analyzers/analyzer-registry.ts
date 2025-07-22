/**
 * Registry for managing content analyzers
 */

import { ContentAnalyzer } from '../types';

/**
 * Registry for managing and organizing content analyzers
 */
export class AnalyzerRegistry {
  private analyzers: Map<string, ContentAnalyzer> = new Map();

  /**
   * Register a new analyzer
   */
  register(analyzer: ContentAnalyzer): void {
    if (this.analyzers.has(analyzer.name)) {
      throw new Error(`Analyzer '${analyzer.name}' is already registered`);
    }
    this.analyzers.set(analyzer.name, analyzer);
  }

  /**
   * Get an analyzer by name
   */
  get(name: string): ContentAnalyzer | undefined {
    return this.analyzers.get(name);
  }

  /**
   * Get all registered analyzers
   */
  getAll(): ContentAnalyzer[] {
    return Array.from(this.analyzers.values());
  }

  /**
   * Get analyzer names
   */
  getNames(): string[] {
    return Array.from(this.analyzers.keys());
  }

  /**
   * Check if an analyzer is registered
   */
  has(name: string): boolean {
    return this.analyzers.has(name);
  }

  /**
   * Unregister an analyzer
   */
  unregister(name: string): boolean {
    return this.analyzers.delete(name);
  }

  /**
   * Clear all analyzers
   */
  clear(): void {
    this.analyzers.clear();
  }

  /**
   * Get the number of registered analyzers
   */
  get size(): number {
    return this.analyzers.size;
  }
}