// Core Framework Detection Interfaces
export * from './framework-detector';
export * from './detection-result';
export * from './framework-info';
export * from './ci-pipeline';
export { LanguageAnalyzer, LanguageDetectionResult, AnalysisMetadata } from './language-analyzer';
export * from './detection-rules';
export { Evidence, EvidenceType, EvidenceLocation, EvidenceCollector, EvidenceFilter, EvidenceAggregation } from './evidence';
export { OverallConfidence, ConfidenceLevel, ConfidenceBreakdown, ComponentConfidence, EvidenceQuality, ConfidenceFactor, FactorType } from './confidence';