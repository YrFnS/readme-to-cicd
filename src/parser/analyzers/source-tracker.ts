/**
 * Source Tracking
 * 
 * Provides source tracking capabilities for language detection, including
 * line number tracking, location tracking, and evidence snippet extraction.
 */

import { SourceRange, Evidence, EvidenceType } from '../../shared/types/language-context';

/**
 * Source tracking information for a detection
 */
export interface SourceTracking {
  /** Original source content */
  sourceContent: string;
  /** File path or identifier */
  sourcePath?: string;
  /** Evidence items with location tracking */
  evidence: Evidence[];
  /** Source ranges where detection occurred */
  detectionRanges: SourceRange[];
  /** Extracted snippets for each evidence */
  snippets: SourceSnippet[];
  /** Metadata about the tracking */
  metadata: SourceTrackingMetadata;
}

/**
 * Source snippet with context
 */
export interface SourceSnippet {
  /** The evidence this snippet supports */
  evidenceId: string;
  /** The actual snippet text */
  content: string;
  /** Location of the snippet */
  location: SourceRange;
  /** Context lines before the snippet */
  contextBefore: string[];
  /** Context lines after the snippet */
  contextAfter: string[];
  /** Highlighted portion within the snippet */
  highlight?: SourceRange;
}

/**
 * Metadata about source tracking
 */
export interface SourceTrackingMetadata {
  /** When tracking was performed */
  timestamp: Date;
  /** Total lines in source */
  totalLines: number;
  /** Total characters in source */
  totalCharacters: number;
  /** Number of evidence items tracked */
  evidenceCount: number;
  /** Tracking accuracy score */
  accuracy: number;
}

/**
 * Configuration for source tracking
 */
export interface SourceTrackingConfig {
  /** Number of context lines to include before/after snippets */
  contextLines: number;
  /** Maximum snippet length */
  maxSnippetLength: number;
  /** Whether to extract snippets automatically */
  extractSnippets: boolean;
  /** Whether to track line numbers */
  trackLineNumbers: boolean;
  /** Whether to track column positions */
  trackColumnPositions: boolean;
}

/**
 * Default source tracking configuration
 */
const DEFAULT_CONFIG: SourceTrackingConfig = {
  contextLines: 2,
  maxSnippetLength: 200,
  extractSnippets: true,
  trackLineNumbers: true,
  trackColumnPositions: true
};

/**
 * Source tracker for language detection evidence
 */
export class SourceTracker {
  private config: SourceTrackingConfig;
  private sourceLines: string[] = [];
  private sourceContent: string = '';

  constructor(config?: Partial<SourceTrackingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize tracking for source content
   */
  public initializeTracking(content: string, sourcePath?: string): void {
    this.sourceContent = content;
    this.sourceLines = content.split('\n');
  }

  /**
   * Track evidence with location information
   */
  public trackEvidence(
    evidenceType: EvidenceType,
    value: string,
    confidence: number,
    searchPattern?: string | RegExp
  ): Evidence[] {
    const evidence: Evidence[] = [];
    
    if (!searchPattern) {
      // Create a simple pattern from the value
      searchPattern = this.createSearchPattern(value, evidenceType);
    }

    const locations = this.findLocations(searchPattern);
    
    for (const location of locations) {
      const evidenceItem: Evidence = {
        type: evidenceType,
        value,
        confidence,
        location,
        ...(this.config.extractSnippets && {
          snippet: this.extractSnippet(location).content
        })
      };
      
      evidence.push(evidenceItem);
    }

    return evidence;
  }

  /**
   * Create comprehensive source tracking for multiple evidence items
   */
  public createSourceTracking(
    evidence: Evidence[],
    sourcePath?: string
  ): SourceTracking {
    const detectionRanges = evidence.map(e => e.location);
    const snippets = evidence.map((e, index) => 
      this.createSourceSnippet(e, `evidence_${index}`)
    );

    const metadata: SourceTrackingMetadata = {
      timestamp: new Date(),
      totalLines: this.sourceLines.length,
      totalCharacters: this.sourceContent.length,
      evidenceCount: evidence.length,
      accuracy: this.calculateTrackingAccuracy(evidence)
    };

    return {
      sourceContent: this.sourceContent,
      ...(sourcePath && { sourcePath }),
      evidence,
      detectionRanges,
      snippets,
      metadata
    };
  }

  /**
   * Add line number tracking to existing evidence
   */
  public addLineNumberTracking(evidence: Evidence[]): Evidence[] {
    if (!this.config.trackLineNumbers) {
      return evidence;
    }

    return evidence.map(item => {
      if (!item.location) {
        // Try to find location if not already set
        const locations = this.findLocations(item.value);
        if (locations.length > 0) {
          return { ...item, location: locations[0] };
        }
      }
      return item;
    }).filter(item => item.location) as Evidence[];
  }

  /**
   * Extract snippet with context for a source range
   */
  public extractSnippet(location: SourceRange, contextLines?: number): SourceSnippet {
    const context = contextLines ?? this.config.contextLines;
    
    const startLine = Math.max(0, location.startLine - context);
    const endLine = Math.min(this.sourceLines.length - 1, location.endLine + context);
    
    const contextBefore = this.sourceLines.slice(startLine, location.startLine);
    const contextAfter = this.sourceLines.slice(location.endLine + 1, endLine + 1);
    
    const snippetLines = this.sourceLines.slice(location.startLine, location.endLine + 1);
    let content = snippetLines.join('\n');
    
    // Truncate if too long
    if (content.length > this.config.maxSnippetLength) {
      content = content.substring(0, this.config.maxSnippetLength) + '...';
    }

    return {
      evidenceId: `${location.startLine}_${location.startColumn}`,
      content,
      location,
      contextBefore,
      contextAfter,
      highlight: this.calculateHighlightRange(location, content)
    };
  }

  /**
   * Get source tracking statistics
   */
  public getTrackingStatistics(): SourceTrackingStatistics {
    return {
      totalLines: this.sourceLines.length,
      totalCharacters: this.sourceContent.length,
      averageLineLength: this.sourceContent.length / this.sourceLines.length,
      longestLine: Math.max(...this.sourceLines.map(line => line.length)),
      emptyLines: this.sourceLines.filter(line => line.trim().length === 0).length,
      configuredContextLines: this.config.contextLines,
      maxSnippetLength: this.config.maxSnippetLength
    };
  }

  /**
   * Update tracking configuration
   */
  public updateConfig(config: Partial<SourceTrackingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): SourceTrackingConfig {
    return { ...this.config };
  }

  // Private helper methods

  private createSearchPattern(value: string, evidenceType: EvidenceType): RegExp {
    switch (evidenceType) {
      case 'extension':
        // Match file extensions
        return new RegExp(`\\${value}\\b`, 'gi');
      case 'keyword':
        // Match whole words
        return new RegExp(`\\b${this.escapeRegExp(value)}\\b`, 'gi');
      case 'syntax':
        // Match syntax patterns
        return new RegExp(this.escapeRegExp(value), 'gi');
      case 'framework':
        // Match framework names (case insensitive)
        return new RegExp(`\\b${this.escapeRegExp(value)}\\b`, 'gi');
      case 'dependency':
        // Match dependency names
        return new RegExp(`["']${this.escapeRegExp(value)}["']`, 'gi');
      default:
        // Default pattern
        return new RegExp(this.escapeRegExp(value), 'gi');
    }
  }

  private findLocations(pattern: string | RegExp): SourceRange[] {
    const locations: SourceRange[] = [];
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'gi') : pattern;

    for (let lineIndex = 0; lineIndex < this.sourceLines.length; lineIndex++) {
      const line = this.sourceLines[lineIndex];
      let match;
      
      // Reset regex lastIndex for global patterns
      regex.lastIndex = 0;
      
      while ((match = regex.exec(line ?? '')) !== null) {
        const startColumn = match.index;
        const endColumn = match.index + match[0].length - 1;
        
        locations.push({
          startLine: lineIndex,
          endLine: lineIndex,
          startColumn,
          endColumn
        });
        
        // Prevent infinite loop for zero-length matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
    }

    return locations;
  }

  private createSourceSnippet(evidence: Evidence, evidenceId: string): SourceSnippet {
    if (!evidence.location) {
      // Create a minimal snippet if no location
      return {
        evidenceId,
        content: evidence.value,
        location: { startLine: 0, endLine: 0, startColumn: 0, endColumn: 0 },
        contextBefore: [],
        contextAfter: []
      };
    }

    return this.extractSnippet(evidence.location);
  }

  private calculateHighlightRange(location: SourceRange, content: string): SourceRange {
    // Calculate relative highlight position within the snippet
    const lines = content.split('\n');
    if (lines.length === 1) {
      return {
        startLine: 0,
        endLine: 0,
        startColumn: location.startColumn,
        endColumn: location.endColumn
      };
    }

    return {
      startLine: 0,
      endLine: Math.min(lines.length - 1, location.endLine - location.startLine),
      startColumn: location.startColumn,
      endColumn: location.endColumn
    };
  }

  private calculateTrackingAccuracy(evidence: Evidence[]): number {
    if (evidence.length === 0) {
      return 0;
    }

    const trackedEvidence = evidence.filter(e => e.location !== undefined);
    const accuracyRatio = trackedEvidence.length / evidence.length;
    
    // Factor in the quality of location tracking
    const locationQuality = trackedEvidence.reduce((sum, e) => {
      const hasValidLocation = e.location && 
        e.location.startLine >= 0 && 
        e.location.endLine >= e.location.startLine;
      return sum + (hasValidLocation ? 1 : 0);
    }, 0) / trackedEvidence.length;

    return accuracyRatio * (locationQuality || 0);
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

/**
 * Statistics about source tracking
 */
export interface SourceTrackingStatistics {
  totalLines: number;
  totalCharacters: number;
  averageLineLength: number;
  longestLine: number;
  emptyLines: number;
  configuredContextLines: number;
  maxSnippetLength: number;
}

/**
 * Factory for creating source trackers with common configurations
 */
export class SourceTrackerFactory {
  /**
   * Create a detailed tracker (more context, longer snippets)
   */
  public static createDetailed(): SourceTracker {
    return new SourceTracker({
      contextLines: 5,
      maxSnippetLength: 500,
      extractSnippets: true,
      trackLineNumbers: true,
      trackColumnPositions: true
    });
  }

  /**
   * Create a minimal tracker (less context, shorter snippets)
   */
  public static createMinimal(): SourceTracker {
    return new SourceTracker({
      contextLines: 1,
      maxSnippetLength: 100,
      extractSnippets: true,
      trackLineNumbers: true,
      trackColumnPositions: false
    });
  }

  /**
   * Create a performance-optimized tracker (no snippets, basic tracking)
   */
  public static createPerformanceOptimized(): SourceTracker {
    return new SourceTracker({
      contextLines: 0,
      maxSnippetLength: 50,
      extractSnippets: false,
      trackLineNumbers: true,
      trackColumnPositions: false
    });
  }
}

/**
 * Utility functions for working with source tracking
 */
export class SourceTrackingUtils {
  /**
   * Merge multiple source tracking results
   */
  public static mergeSourceTracking(trackings: SourceTracking[]): SourceTracking {
    if (trackings.length === 0) {
      throw new Error('Cannot merge empty source tracking array');
    }

    if (trackings.length === 1) {
      return trackings[0]!;
    }

    const firstTracking = trackings[0]!;
    const merged: SourceTracking = {
      sourceContent: firstTracking.sourceContent,
      ...(firstTracking.sourcePath && { sourcePath: firstTracking.sourcePath }),
      evidence: [],
      detectionRanges: [],
      snippets: [],
      metadata: {
        timestamp: new Date(),
        totalLines: firstTracking.metadata.totalLines,
        totalCharacters: firstTracking.metadata.totalCharacters,
        evidenceCount: 0,
        accuracy: 0
      }
    };

    for (const tracking of trackings) {
      merged.evidence.push(...tracking.evidence);
      merged.detectionRanges.push(...tracking.detectionRanges);
      merged.snippets.push(...tracking.snippets);
    }

    merged.metadata.evidenceCount = merged.evidence.length;
    merged.metadata.accuracy = trackings.reduce((sum, t) => sum + t.metadata.accuracy, 0) / trackings.length;

    return merged;
  }

  /**
   * Filter source tracking by evidence type
   */
  public static filterByEvidenceType(tracking: SourceTracking, evidenceType: EvidenceType): SourceTracking {
    const filteredEvidence = tracking.evidence.filter(e => e.type === evidenceType);
    const filteredRanges = tracking.detectionRanges.filter((_, index) => 
      tracking.evidence[index]?.type === evidenceType
    );
    const filteredSnippets = tracking.snippets.filter(s => 
      tracking.evidence.find(e => `evidence_${tracking.evidence.indexOf(e)}` === s.evidenceId)?.type === evidenceType
    );

    return {
      ...tracking,
      evidence: filteredEvidence,
      detectionRanges: filteredRanges,
      snippets: filteredSnippets,
      metadata: {
        ...tracking.metadata,
        evidenceCount: filteredEvidence.length,
        timestamp: new Date()
      }
    };
  }

  /**
   * Get evidence summary from source tracking
   */
  public static getEvidenceSummary(tracking: SourceTracking): EvidenceSummary {
    const evidenceByType = new Map<EvidenceType, Evidence[]>();
    
    for (const evidence of tracking.evidence) {
      if (!evidenceByType.has(evidence.type)) {
        evidenceByType.set(evidence.type, []);
      }
      evidenceByType.get(evidence.type)!.push(evidence);
    }

    const summary: EvidenceSummary = {
      totalEvidence: tracking.evidence.length,
      evidenceByType: Object.fromEntries(evidenceByType) as Record<EvidenceType, Evidence[]>,
      averageConfidence: tracking.evidence.length > 0 
        ? tracking.evidence.reduce((sum, e) => sum + e.confidence, 0) / tracking.evidence.length 
        : 0,
      locationCoverage: tracking.detectionRanges.length / Math.max(tracking.evidence.length, 1),
      snippetCoverage: tracking.snippets.length / Math.max(tracking.evidence.length, 1)
    };

    return summary;
  }
}

/**
 * Summary of evidence in source tracking
 */
export interface EvidenceSummary {
  totalEvidence: number;
  evidenceByType: Record<EvidenceType, Evidence[]>;
  averageConfidence: number;
  locationCoverage: number;
  snippetCoverage: number;
}