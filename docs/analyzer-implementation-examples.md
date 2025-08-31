# Analyzer Implementation Examples

## Complete MockAnalyzer Implementation

This section provides a comprehensive example of implementing a custom analyzer using the MockAnalyzer as a reference.

### Basic MockAnalyzer Implementation

```typescript
import { MarkdownAST } from '../../shared/markdown-parser';
import { AnalyzerResult, ParseError } from '../types';
import { AnalysisContext } from '../../shared/types/analysis-context';
import { 
  AnalyzerInterface, 
  AnalyzerCapabilities 
} from './enhanced-analyzer-registry';

/**
 * MockAnalyzer - A complete example of custom analyzer implementation
 */
export class MockAnalyzer implements AnalyzerInterface<any> {
  readonly name = 'MockAnalyzer';
  
  private mockResult: MockAnalysisResult;
  private callHistory: MethodCall[] = [];
  private capabilities: AnalyzerCapabilities;

  constructor(mockResult?: MockAnalysisResult) {
    // Initialize with default mock result
    this.mockResult = mockResult || {
      data: { mockData: 'test-data', type: 'mock' },
      confidence: 0.9,
      sources: ['mock-source']
    };

    // Define analyzer capabilities
    this.capabilities = {
      supportedContentTypes: ['text/markdown', 'text/plain'],
      requiresContext: false,
      canProcessLargeFiles: true,
      estimatedProcessingTime: 100,
      dependencies: []
    };
  }

  /**
   * Core analysis method - processes markdown content
   */
  async analyze(
    ast: MarkdownAST, 
    content: string, 
    context?: AnalysisContext
  ): Promise<AnalyzerResult<any>> {
    // Track method call for testing
    const call: MethodCall = {
      method: 'analyze',
      args: [ast, content, context],
      timestamp: new Date()
    };

    try {
      // Simulate processing delay
      if (this.capabilities.estimatedProcessingTime > 0) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.min(this.capabilities.estimatedProcessingTime, 50))
        );
      }

      let result: AnalyzerResult<any>;

      // Handle configured failure scenarios
      if (this.mockResult.shouldFail) {
        result = {
          success: false,
          confidence: 0,
          errors: this.mockResult.error ? [this.mockResult.error] : [
            {
              code: 'MOCK_ERROR',
              message: 'Mock analyzer configured to fail',
              component: this.name,
              severity: 'error'
            }
          ]
        };
      } else {
        // Return successful analysis result
        result = {
          success: true,
          data: {
            ...this.mockResult.data,
            // Add dynamic data based on input
            contentLength: content.length,
            astNodeCount: Array.isArray(ast) ? ast.length : 0,
            hasContext: !!context,
            processedAt: new Date().toISOString()
          },
          confidence: this.mockResult.confidence,
          sources: this.mockResult.sources || ['mock-source']
        };
      }

      call.result = result;
      this.callHistory.push(call);
      
      return result;
    } catch (error) {
      // Handle unexpected errors
      const errorResult: AnalyzerResult<any> = {
        success: false,
        confidence: 0,
        errors: [{
          code: 'MOCK_ANALYZER_ERROR',
          message: `MockAnalyzer error: ${error instanceof Error ? error.message : String(error)}`,
          component: this.name,
          severity: 'error'
        }]
      };

      call.result = errorResult;
      this.callHistory.push(call);
      
      return errorResult;
    }
  }

  /**
   * Return analyzer capabilities
   */
  getCapabilities(): AnalyzerCapabilities {
    const call: MethodCall = {
      method: 'getCapabilities',
      args: [],
      timestamp: new Date(),
      result: this.capabilities
    };
    
    this.callHistory.push(call);
    return { ...this.capabilities };
  }

  /**
   * Validate interface implementation
   */
  validateInterface(): boolean {
    const call: MethodCall = {
      method: 'validateInterface',
      args: [],
      timestamp: new Date()
    };

    try {
      // Check required properties and methods
      const hasName = typeof this.name === 'string' && this.name.length > 0;
      const hasAnalyze = typeof this.analyze === 'function';
      const hasGetCapabilities = typeof this.getCapabilities === 'function';
      const hasValidateInterface = typeof this.validateInterface === 'function';
      const analyzeSignature = this.analyze.length >= 2;

      const isValid = hasName && hasAnalyze && hasGetCapabilities && 
                     hasValidateInterface && analyzeSignature;
      
      call.result = isValid;
      this.callHistory.push(call);
      
      return isValid;
    } catch (error) {
      call.result = false;
      this.callHistory.push(call);
      return false;
    }
  }

  // Test-specific methods (optional for production analyzers)
  
  setMockResult(result: MockAnalysisResult): void {
    this.mockResult = result;
  }

  resetMock(): void {
    this.mockResult = {
      data: { mockData: 'test-data', type: 'mock' },
      confidence: 0.9,
      sources: ['mock-source']
    };
    this.callHistory = [];
  }

  getCallHistory(): MethodCall[] {
    return [...this.callHistory];
  }
}
```

## Real-World Analyzer Examples

### 1. Language Detection Analyzer

```typescript
export class LanguageDetectionAnalyzer implements AnalyzerInterface<LanguageInfo> {
  readonly name = 'LanguageDetectionAnalyzer';

  async analyze(
    ast: MarkdownAST, 
    content: string, 
    context?: AnalysisContext
  ): Promise<AnalyzerResult<LanguageInfo>> {
    try {
      const languages = this.detectLanguages(content);
      const primaryLanguage = this.determinePrimaryLanguage(languages);
      
      return {
        success: true,
        data: {
          primaryLanguage,
          detectedLanguages: languages,
          confidence: this.calculateConfidence(languages)
        },
        confidence: this.calculateConfidence(languages),
        sources: ['code-blocks', 'file-extensions', 'keywords']
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        errors: [{
          code: 'LANGUAGE_DETECTION_ERROR',
          message: `Language detection failed: ${error instanceof Error ? error.message : String(error)}`,
          component: this.name,
          severity: 'error'
        }]
      };
    }
  }

  getCapabilities(): AnalyzerCapabilities {
    return {
      supportedContentTypes: ['text/markdown'],
      requiresContext: false,
      canProcessLargeFiles: true,
      estimatedProcessingTime: 200,
      dependencies: []
    };
  }

  validateInterface(): boolean {
    return typeof this.analyze === 'function' &&
           typeof this.getCapabilities === 'function' &&
           typeof this.name === 'string' &&
           this.name.length > 0;
  }

  private detectLanguages(content: string): LanguageMatch[] {
    // Implementation details...
    return [];
  }

  private determinePrimaryLanguage(languages: LanguageMatch[]): string {
    // Implementation details...
    return 'javascript';
  }

  private calculateConfidence(languages: LanguageMatch[]): number {
    // Implementation details...
    return 0.8;
  }
}
```

### 2. Framework Detection Analyzer

```typescript
export class FrameworkDetectionAnalyzer implements AnalyzerInterface<FrameworkInfo> {
  readonly name = 'FrameworkDetectionAnalyzer';
  
  private frameworkRules: FrameworkRule[];

  constructor(rules?: FrameworkRule[]) {
    this.frameworkRules = rules || this.getDefaultRules();
  }

  async analyze(
    ast: MarkdownAST, 
    content: string, 
    context?: AnalysisContext
  ): Promise<AnalyzerResult<FrameworkInfo>> {
    try {
      const detectedFrameworks: FrameworkMatch[] = [];
      
      for (const rule of this.frameworkRules) {
        const match = await this.applyRule(rule, content, ast);
        if (match) {
          detectedFrameworks.push(match);
        }
      }

      const primaryFramework = this.selectPrimaryFramework(detectedFrameworks);
      
      return {
        success: true,
        data: {
          primaryFramework,
          allFrameworks: detectedFrameworks,
          confidence: primaryFramework?.confidence || 0
        },
        confidence: primaryFramework?.confidence || 0,
        sources: detectedFrameworks.map(f => f.source)
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        errors: [{
          code: 'FRAMEWORK_DETECTION_ERROR',
          message: `Framework detection failed: ${error instanceof Error ? error.message : String(error)}`,
          component: this.name,
          severity: 'error'
        }]
      };
    }
  }

  getCapabilities(): AnalyzerCapabilities {
    return {
      supportedContentTypes: ['text/markdown'],
      requiresContext: true, // May need file system context
      canProcessLargeFiles: true,
      estimatedProcessingTime: 500,
      dependencies: ['LanguageDetectionAnalyzer'] // Depends on language detection
    };
  }

  validateInterface(): boolean {
    return typeof this.analyze === 'function' &&
           typeof this.getCapabilities === 'function' &&
           typeof this.name === 'string' &&
           this.name.length > 0 &&
           Array.isArray(this.frameworkRules);
  }

  private async applyRule(rule: FrameworkRule, content: string, ast: MarkdownAST): Promise<FrameworkMatch | null> {
    // Rule application logic...
    return null;
  }

  private selectPrimaryFramework(frameworks: FrameworkMatch[]): FrameworkMatch | null {
    // Selection logic...
    return frameworks.length > 0 ? frameworks[0] : null;
  }

  private getDefaultRules(): FrameworkRule[] {
    return [
      {
        name: 'React',
        patterns: ['react', 'jsx', 'create-react-app'],
        confidence: 0.9
      },
      {
        name: 'Vue',
        patterns: ['vue', 'nuxt', '@vue/cli'],
        confidence: 0.9
      }
      // More rules...
    ];
  }
}
```

## Factory Functions and Utilities

### Analyzer Factory Functions

```typescript
/**
 * Factory function to create a MockAnalyzer with specific configuration
 */
export function createMockAnalyzer(config?: {
  mockResult?: MockAnalysisResult;
  capabilities?: Partial<AnalyzerCapabilities>;
  name?: string;
}): MockAnalyzer {
  const analyzer = new MockAnalyzer(config?.mockResult);
  
  if (config?.capabilities) {
    analyzer.setCapabilities(config.capabilities);
  }
  
  return analyzer;
}

/**
 * Create a MockAnalyzer configured for failure testing
 */
export function createFailingMockAnalyzer(error?: ParseError): MockAnalyzer {
  const analyzer = new MockAnalyzer();
  analyzer.simulateFailure(error);
  return analyzer;
}

/**
 * Create a MockAnalyzer configured for success testing
 */
export function createSuccessfulMockAnalyzer(data?: any, confidence?: number): MockAnalyzer {
  const analyzer = new MockAnalyzer();
  analyzer.simulateSuccess(data, confidence);
  return analyzer;
}

/**
 * Create multiple mock analyzers for batch testing
 */
export function createMockAnalyzers(count: number): MockAnalyzer[] {
  const analyzers: MockAnalyzer[] = [];
  
  for (let i = 0; i < count; i++) {
    const analyzer = new MockAnalyzer();
    // Override name to make each unique
    (analyzer as any).name = `MockAnalyzer${i + 1}`;
    analyzers.push(analyzer);
  }
  
  return analyzers;
}
```

## Registration Examples

### Simple Registration

```typescript
import { EnhancedAnalyzerRegistry } from '../src/parser/analyzers/enhanced-analyzer-registry';
import { MockAnalyzer } from './mock-analyzer';

// Create registry and analyzer
const registry = new EnhancedAnalyzerRegistry();
const mockAnalyzer = new MockAnalyzer();

// Register the analyzer
const result = registry.register(mockAnalyzer);

if (result.success) {
  console.log('MockAnalyzer registered successfully');
  
  // Verify registration
  const registered = registry.getRegisteredAnalyzers();
  console.log('Registered analyzers:', registered); // ['MockAnalyzer']
  
  // Get the analyzer instance
  const analyzer = registry.getAnalyzer('MockAnalyzer');
  if (analyzer) {
    console.log('Analyzer retrieved successfully');
  }
} else {
  console.error('Registration failed:', result.error);
}
```

### Batch Registration with Dependencies

```typescript
const analyzers: AnalyzerConfig[] = [
  {
    name: 'LanguageDetector',
    analyzer: new LanguageDetectionAnalyzer(),
    priority: 10, // High priority - register first
    enabled: true
  },
  {
    name: 'FrameworkDetector',
    analyzer: new FrameworkDetectionAnalyzer(),
    dependencies: ['LanguageDetector'], // Depends on language detection
    priority: 5,
    enabled: true
  },
  {
    name: 'MockAnalyzer',
    analyzer: new MockAnalyzer(),
    priority: 1, // Low priority - register last
    enabled: true,
    metadata: {
      version: '1.0.0',
      author: 'Test Suite',
      description: 'Mock analyzer for testing',
      isCustom: true
    }
  }
];

// Register all analyzers
const results = registry.registerMultiple(analyzers);

// Check results
results.forEach(result => {
  if (result.success) {
    console.log(`✓ ${result.analyzerName} registered`);
    if (result.warnings) {
      result.warnings.forEach(warning => {
        console.warn(`  Warning: ${warning}`);
      });
    }
  } else {
    console.error(`✗ ${result.analyzerName} failed: ${result.error}`);
  }
});

// Verify dependency order
const dependencyOrder = registry.getDependencyOrder();
console.log('Dependency order:', dependencyOrder);
// Expected: ['LanguageDetector', 'FrameworkDetector', 'MockAnalyzer']
```

## Testing Examples

### Unit Testing Analyzer Implementation

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MockAnalyzer } from './mock-analyzer';

describe('MockAnalyzer', () => {
  let analyzer: MockAnalyzer;

  beforeEach(() => {
    analyzer = new MockAnalyzer();
  });

  it('should implement AnalyzerInterface correctly', () => {
    expect(analyzer.name).toBe('MockAnalyzer');
    expect(typeof analyzer.analyze).toBe('function');
    expect(typeof analyzer.getCapabilities).toBe('function');
    expect(typeof analyzer.validateInterface).toBe('function');
  });

  it('should validate interface implementation', () => {
    const isValid = analyzer.validateInterface();
    expect(isValid).toBe(true);
  });

  it('should return capabilities', () => {
    const capabilities = analyzer.getCapabilities();
    expect(capabilities).toMatchObject({
      supportedContentTypes: expect.arrayContaining(['text/markdown']),
      requiresContext: false,
      canProcessLargeFiles: true,
      estimatedProcessingTime: expect.any(Number),
      dependencies: expect.any(Array)
    });
  });

  it('should analyze content successfully', async () => {
    const ast = []; // Mock AST
    const content = 'Test content';
    
    const result = await analyzer.analyze(ast, content);
    
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      mockData: 'test-data',
      type: 'mock',
      contentLength: content.length
    });
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should track method calls', async () => {
    const ast = [];
    const content = 'Test content';
    
    await analyzer.analyze(ast, content);
    analyzer.getCapabilities();
    
    const history = analyzer.getCallHistory();
    expect(history).toHaveLength(2);
    expect(history[0].method).toBe('analyze');
    expect(history[1].method).toBe('getCapabilities');
  });
});
```

### Integration Testing with Registry

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { EnhancedAnalyzerRegistry } from '../src/parser/analyzers/enhanced-analyzer-registry';
import { MockAnalyzer } from './mock-analyzer';

describe('MockAnalyzer Registration', () => {
  let registry: EnhancedAnalyzerRegistry;
  let mockAnalyzer: MockAnalyzer;

  beforeEach(() => {
    registry = new EnhancedAnalyzerRegistry();
    mockAnalyzer = new MockAnalyzer();
  });

  it('should register MockAnalyzer successfully', () => {
    const result = registry.register(mockAnalyzer);
    
    expect(result.success).toBe(true);
    expect(result.analyzerName).toBe('MockAnalyzer');
    expect(result.error).toBeUndefined();
  });

  it('should include MockAnalyzer in registered analyzers list', () => {
    registry.register(mockAnalyzer);
    
    const registered = registry.getRegisteredAnalyzers();
    expect(registered).toContain('MockAnalyzer');
  });

  it('should retrieve registered MockAnalyzer', () => {
    registry.register(mockAnalyzer);
    
    const retrieved = registry.getAnalyzer('MockAnalyzer');
    expect(retrieved).toBe(mockAnalyzer);
  });

  it('should validate registry with MockAnalyzer', () => {
    registry.register(mockAnalyzer);
    
    const validation = registry.validateRegistration();
    expect(validation.isValid).toBe(true);
    expect(validation.validAnalyzers).toBe(1);
  });
});
```

This comprehensive set of examples demonstrates proper implementation patterns for custom analyzers, including interface compliance, error handling, testing, and integration with the registration system.