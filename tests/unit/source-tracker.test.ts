/**
 * Unit tests for SourceTracker
 * 
 * Tests source tracking capabilities including line number tracking,
 * location tracking, and evidence snippet extraction.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  SourceTracker, 
  SourceTrackerFactory,
  SourceTrackingUtils,
  SourceTracking,
  SourceTrackingConfig
} from '../../src/parser/analyzers/source-tracker';
import { EvidenceType } from '../../src/shared/types/language-context';

describe('SourceTracker', () => {
  let tracker: SourceTracker;
  const sampleContent = `# TypeScript Project

This is a TypeScript project using React.

\`\`\`typescript
interface User {
  name: string;
  age: number;
}
\`\`\`

## Installation

\`\`\`bash
npm install
npm run build
\`\`\`

Dependencies:
- react
- typescript
- @types/node

File extensions: .ts, .tsx, .js`;

  beforeEach(() => {
    tracker = new SourceTracker();
    tracker.initializeTracking(sampleContent);
  });

  describe('initialization', () => {
    it('should initialize with source content', () => {
      const stats = tracker.getTrackingStatistics();
      expect(stats.totalLines).toBeGreaterThan(0);
      expect(stats.totalCharacters).toBe(sampleContent.length);
    });

    it('should handle empty content', () => {
      const emptyTracker = new SourceTracker();
      emptyTracker.initializeTracking('');
      
      const stats = emptyTracker.getTrackingStatistics();
      expect(stats.totalLines).toBe(1); // Empty string creates one empty line
      expect(stats.totalCharacters).toBe(0);
    });

    it('should calculate line statistics correctly', () => {
      const stats = tracker.getTrackingStatistics();
      const lines = sampleContent.split('\n');
      
      expect(stats.totalLines).toBe(lines.length);
      expect(stats.averageLineLength).toBeCloseTo(sampleContent.length / lines.length, 2);
      expect(stats.longestLine).toBe(Math.max(...lines.map(line => line.length)));
    });
  });

  describe('trackEvidence', () => {
    it('should track keyword evidence with locations', () => {
      const evidence = tracker.trackEvidence('keyword', 'TypeScript', 0.8);
      
      expect(evidence.length).toBeGreaterThan(0); // Should find "TypeScript" instances
      expect(evidence[0].type).toBe('keyword');
      expect(evidence[0].value).toBe('TypeScript');
      expect(evidence[0].confidence).toBe(0.8);
      expect(evidence[0].location).toBeDefined();
      expect(evidence[0].location.startLine).toBeGreaterThanOrEqual(0);
    });

    it('should track extension evidence', () => {
      const evidence = tracker.trackEvidence('extension', '.ts', 0.9);
      
      expect(evidence.length).toBeGreaterThan(0);
      expect(evidence[0].type).toBe('extension');
      expect(evidence[0].value).toBe('.ts');
      expect(evidence[0].location).toBeDefined();
    });

    it('should track framework evidence', () => {
      const evidence = tracker.trackEvidence('framework', 'React', 0.7);
      
      expect(evidence.length).toBeGreaterThan(0);
      expect(evidence[0].type).toBe('framework');
      expect(evidence[0].value).toBe('React');
    });

    it('should handle case-insensitive matching', () => {
      const evidence = tracker.trackEvidence('keyword', 'typescript', 0.8);
      
      expect(evidence.length).toBeGreaterThan(0); // Should find "TypeScript" despite case difference
    });

    it('should return empty array for non-existent patterns', () => {
      const evidence = tracker.trackEvidence('keyword', 'nonexistent', 0.5);
      
      expect(evidence).toHaveLength(0);
    });

    it('should track with custom search patterns', () => {
      const customPattern = /interface\s+\w+/gi;
      const evidence = tracker.trackEvidence('syntax', 'interface declaration', 0.9, customPattern);
      
      expect(evidence.length).toBeGreaterThan(0);
      expect(evidence[0].location).toBeDefined();
    });
  });

  describe('createSourceTracking', () => {
    it('should create comprehensive source tracking', () => {
      const evidence = [
        ...tracker.trackEvidence('keyword', 'TypeScript', 0.8),
        ...tracker.trackEvidence('framework', 'React', 0.7)
      ];

      const sourceTracking = tracker.createSourceTracking(evidence, 'test.md');

      expect(sourceTracking.sourceContent).toBe(sampleContent);
      expect(sourceTracking.sourcePath).toBe('test.md');
      expect(sourceTracking.evidence).toHaveLength(evidence.length);
      expect(sourceTracking.detectionRanges).toHaveLength(evidence.length);
      expect(sourceTracking.snippets).toHaveLength(evidence.length);
      expect(sourceTracking.metadata.evidenceCount).toBe(evidence.length);
      expect(sourceTracking.metadata.accuracy).toBeGreaterThan(0);
    });

    it('should handle empty evidence array', () => {
      const sourceTracking = tracker.createSourceTracking([]);

      expect(sourceTracking.evidence).toHaveLength(0);
      expect(sourceTracking.detectionRanges).toHaveLength(0);
      expect(sourceTracking.snippets).toHaveLength(0);
      expect(sourceTracking.metadata.evidenceCount).toBe(0);
      expect(sourceTracking.metadata.accuracy).toBe(0);
    });

    it('should include metadata with timestamp', () => {
      const evidence = tracker.trackEvidence('keyword', 'TypeScript', 0.8);
      const sourceTracking = tracker.createSourceTracking(evidence);

      expect(sourceTracking.metadata.timestamp).toBeInstanceOf(Date);
      expect(sourceTracking.metadata.totalLines).toBeGreaterThan(0);
      expect(sourceTracking.metadata.totalCharacters).toBeGreaterThan(0);
    });
  });

  describe('addLineNumberTracking', () => {
    it('should add location tracking to evidence without locations', () => {
      const evidenceWithoutLocation = [{
        type: 'keyword' as EvidenceType,
        value: 'TypeScript',
        confidence: 0.8,
        location: { startLine: 0, endLine: 0, startColumn: 0, endColumn: 0 }
      }];

      const trackedEvidence = tracker.addLineNumberTracking(evidenceWithoutLocation);

      expect(trackedEvidence).toHaveLength(1);
      expect(trackedEvidence[0].location).toBeDefined();
    });

    it('should preserve existing location tracking', () => {
      const originalEvidence = tracker.trackEvidence('keyword', 'TypeScript', 0.8);
      const trackedEvidence = tracker.addLineNumberTracking(originalEvidence);

      expect(trackedEvidence).toHaveLength(originalEvidence.length);
      expect(trackedEvidence[0].location).toEqual(originalEvidence[0].location);
    });

    it('should respect configuration for line number tracking', () => {
      const noLineTracker = new SourceTracker({ trackLineNumbers: false });
      noLineTracker.initializeTracking(sampleContent);

      const evidence = [{
        type: 'keyword' as EvidenceType,
        value: 'test',
        confidence: 0.5,
        location: { startLine: 0, endLine: 0, startColumn: 0, endColumn: 0 }
      }];

      const result = noLineTracker.addLineNumberTracking(evidence);
      expect(result).toEqual(evidence); // Should return unchanged
    });
  });

  describe('extractSnippet', () => {
    it('should extract snippet with context', () => {
      const location = {
        startLine: 4,
        endLine: 4,
        startColumn: 0,
        endColumn: 10
      };

      const snippet = tracker.extractSnippet(location);

      expect(snippet.content).toBeDefined();
      expect(snippet.location).toEqual(location);
      expect(snippet.contextBefore).toHaveLength(2); // Default context lines
      expect(snippet.contextAfter).toHaveLength(2);
      expect(snippet.evidenceId).toBe('4_0');
    });

    it('should handle snippets at file boundaries', () => {
      const locationAtStart = {
        startLine: 0,
        endLine: 0,
        startColumn: 0,
        endColumn: 5
      };

      const snippet = tracker.extractSnippet(locationAtStart);

      expect(snippet.contextBefore).toHaveLength(0); // No lines before first line
      expect(snippet.content).toBeDefined();
    });

    it('should truncate long snippets', () => {
      const shortSnippetTracker = new SourceTracker({ maxSnippetLength: 20 });
      shortSnippetTracker.initializeTracking(sampleContent);

      const location = {
        startLine: 0,
        endLine: 5,
        startColumn: 0,
        endColumn: 0
      };

      const snippet = shortSnippetTracker.extractSnippet(location);

      expect(snippet.content.length).toBeLessThanOrEqual(23); // 20 + '...'
      expect(snippet.content).toMatch(/\.\.\.$/);
    });

    it('should include highlight range', () => {
      const location = {
        startLine: 1,
        endLine: 1,
        startColumn: 5,
        endColumn: 15
      };

      const snippet = tracker.extractSnippet(location);

      expect(snippet.highlight).toBeDefined();
      expect(snippet.highlight!.startColumn).toBe(5);
      expect(snippet.highlight!.endColumn).toBe(15);
    });

    it('should handle custom context lines', () => {
      const snippet = tracker.extractSnippet({
        startLine: 5,
        endLine: 5,
        startColumn: 0,
        endColumn: 10
      }, 1);

      expect(snippet.contextBefore).toHaveLength(1);
      expect(snippet.contextAfter).toHaveLength(1);
    });
  });

  describe('configuration management', () => {
    it('should allow configuration updates', () => {
      const newConfig: Partial<SourceTrackingConfig> = {
        contextLines: 5,
        maxSnippetLength: 500
      };

      tracker.updateConfig(newConfig);
      const config = tracker.getConfig();

      expect(config.contextLines).toBe(5);
      expect(config.maxSnippetLength).toBe(500);
    });

    it('should preserve existing config when partially updating', () => {
      const originalConfig = tracker.getConfig();
      const newConfig: Partial<SourceTrackingConfig> = {
        contextLines: 5
      };

      tracker.updateConfig(newConfig);
      const updatedConfig = tracker.getConfig();

      expect(updatedConfig.contextLines).toBe(5);
      expect(updatedConfig.maxSnippetLength).toBe(originalConfig.maxSnippetLength);
      expect(updatedConfig.extractSnippets).toBe(originalConfig.extractSnippets);
    });
  });

  describe('edge cases', () => {
    it('should handle single line content', () => {
      const singleLineTracker = new SourceTracker();
      singleLineTracker.initializeTracking('TypeScript project');

      const evidence = singleLineTracker.trackEvidence('keyword', 'TypeScript', 0.8);

      expect(evidence).toHaveLength(1);
      expect(evidence[0].location.startLine).toBe(0);
      expect(evidence[0].location.endLine).toBe(0);
    });

    it('should handle content with special regex characters', () => {
      const specialContent = 'File: test.js (version 1.0)';
      const specialTracker = new SourceTracker();
      specialTracker.initializeTracking(specialContent);

      const evidence = specialTracker.trackEvidence('pattern', '(version', 0.7);

      expect(evidence).toHaveLength(1);
      expect(evidence[0].location).toBeDefined();
    });

    it('should handle overlapping matches', () => {
      const overlappingContent = 'typescript TypeScript TYPESCRIPT';
      const overlappingTracker = new SourceTracker();
      overlappingTracker.initializeTracking(overlappingContent);

      const evidence = overlappingTracker.trackEvidence('keyword', 'typescript', 0.8);

      expect(evidence.length).toBeGreaterThan(1); // Should find multiple matches
    });

    it('should handle zero-length matches gracefully', () => {
      const zeroLengthPattern = /(?=TypeScript)/g;
      const evidence = tracker.trackEvidence('pattern', 'lookahead', 0.5, zeroLengthPattern);

      // Should not cause infinite loop
      expect(evidence.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('SourceTrackerFactory', () => {
  describe('createDetailed', () => {
    it('should create tracker with detailed settings', () => {
      const tracker = SourceTrackerFactory.createDetailed();
      const config = tracker.getConfig();

      expect(config.contextLines).toBe(5);
      expect(config.maxSnippetLength).toBe(500);
      expect(config.extractSnippets).toBe(true);
      expect(config.trackLineNumbers).toBe(true);
      expect(config.trackColumnPositions).toBe(true);
    });
  });

  describe('createMinimal', () => {
    it('should create tracker with minimal settings', () => {
      const tracker = SourceTrackerFactory.createMinimal();
      const config = tracker.getConfig();

      expect(config.contextLines).toBe(1);
      expect(config.maxSnippetLength).toBe(100);
      expect(config.extractSnippets).toBe(true);
      expect(config.trackLineNumbers).toBe(true);
      expect(config.trackColumnPositions).toBe(false);
    });
  });

  describe('createPerformanceOptimized', () => {
    it('should create tracker with performance-optimized settings', () => {
      const tracker = SourceTrackerFactory.createPerformanceOptimized();
      const config = tracker.getConfig();

      expect(config.contextLines).toBe(0);
      expect(config.maxSnippetLength).toBe(50);
      expect(config.extractSnippets).toBe(false);
      expect(config.trackLineNumbers).toBe(true);
      expect(config.trackColumnPositions).toBe(false);
    });
  });
});

describe('SourceTrackingUtils', () => {
  let sampleTracking1: SourceTracking;
  let sampleTracking2: SourceTracking;

  beforeEach(() => {
    const tracker1 = new SourceTracker();
    tracker1.initializeTracking('TypeScript project');
    const evidence1 = tracker1.trackEvidence('keyword', 'TypeScript', 0.8);
    sampleTracking1 = tracker1.createSourceTracking(evidence1);

    const tracker2 = new SourceTracker();
    tracker2.initializeTracking('React application');
    const evidence2 = tracker2.trackEvidence('framework', 'React', 0.7);
    sampleTracking2 = tracker2.createSourceTracking(evidence2);
  });

  describe('mergeSourceTracking', () => {
    it('should merge multiple source tracking results', () => {
      const merged = SourceTrackingUtils.mergeSourceTracking([sampleTracking1, sampleTracking2]);

      expect(merged.evidence.length).toBe(
        sampleTracking1.evidence.length + sampleTracking2.evidence.length
      );
      expect(merged.detectionRanges.length).toBe(
        sampleTracking1.detectionRanges.length + sampleTracking2.detectionRanges.length
      );
      expect(merged.snippets.length).toBe(
        sampleTracking1.snippets.length + sampleTracking2.snippets.length
      );
    });

    it('should return single tracking when only one provided', () => {
      const result = SourceTrackingUtils.mergeSourceTracking([sampleTracking1]);

      expect(result).toEqual(sampleTracking1);
    });

    it('should throw error for empty array', () => {
      expect(() => SourceTrackingUtils.mergeSourceTracking([])).toThrow();
    });

    it('should calculate average accuracy', () => {
      const merged = SourceTrackingUtils.mergeSourceTracking([sampleTracking1, sampleTracking2]);

      const expectedAccuracy = (sampleTracking1.metadata.accuracy + sampleTracking2.metadata.accuracy) / 2;
      expect(merged.metadata.accuracy).toBeCloseTo(expectedAccuracy, 2);
    });
  });

  describe('filterByEvidenceType', () => {
    it('should filter evidence by type', () => {
      const tracker = new SourceTracker();
      tracker.initializeTracking('TypeScript React project');
      const evidence = [
        ...tracker.trackEvidence('keyword', 'TypeScript', 0.8),
        ...tracker.trackEvidence('framework', 'React', 0.7)
      ];
      const tracking = tracker.createSourceTracking(evidence);

      const filtered = SourceTrackingUtils.filterByEvidenceType(tracking, 'keyword');

      expect(filtered.evidence.every(e => e.type === 'keyword')).toBe(true);
      expect(filtered.evidence.length).toBeGreaterThan(0);
      expect(filtered.metadata.evidenceCount).toBe(filtered.evidence.length);
    });

    it('should return empty results for non-existent evidence type', () => {
      const filtered = SourceTrackingUtils.filterByEvidenceType(sampleTracking1, 'dependency');

      expect(filtered.evidence).toHaveLength(0);
      expect(filtered.detectionRanges).toHaveLength(0);
      expect(filtered.snippets).toHaveLength(0);
      expect(filtered.metadata.evidenceCount).toBe(0);
    });
  });

  describe('getEvidenceSummary', () => {
    it('should provide comprehensive evidence summary', () => {
      const tracker = new SourceTracker();
      tracker.initializeTracking('TypeScript React project with .ts files');
      const evidence = [
        ...tracker.trackEvidence('keyword', 'TypeScript', 0.8),
        ...tracker.trackEvidence('framework', 'React', 0.7),
        ...tracker.trackEvidence('extension', '.ts', 0.9)
      ];
      const tracking = tracker.createSourceTracking(evidence);

      const summary = SourceTrackingUtils.getEvidenceSummary(tracking);

      expect(summary.totalEvidence).toBe(evidence.length);
      expect(summary.evidenceByType).toHaveProperty('keyword');
      expect(summary.evidenceByType).toHaveProperty('framework');
      expect(summary.evidenceByType).toHaveProperty('extension');
      expect(summary.averageConfidence).toBeGreaterThan(0);
      expect(summary.locationCoverage).toBeGreaterThan(0);
      expect(summary.snippetCoverage).toBeGreaterThan(0);
    });

    it('should handle empty evidence gracefully', () => {
      const emptyTracking = {
        sourceContent: '',
        evidence: [],
        detectionRanges: [],
        snippets: [],
        metadata: {
          timestamp: new Date(),
          totalLines: 0,
          totalCharacters: 0,
          evidenceCount: 0,
          accuracy: 0
        }
      };

      const summary = SourceTrackingUtils.getEvidenceSummary(emptyTracking);

      expect(summary.totalEvidence).toBe(0);
      expect(summary.averageConfidence).toBe(0);
      expect(summary.locationCoverage).toBe(0);
      expect(summary.snippetCoverage).toBe(0);
    });
  });
});