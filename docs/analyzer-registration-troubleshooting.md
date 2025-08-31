# Analyzer Registration Troubleshooting Guide

## Common Registration Failures

This guide covers the most common issues encountered when registering custom analyzers and provides step-by-step solutions.

## Interface Validation Failures

### Problem: "Interface validation failed: missing methods"

**Symptoms:**
```
✗ MyAnalyzer failed: Interface validation failed: Missing methods: getCapabilities, validateInterface
```

**Cause:** The analyzer doesn't implement all required methods of the `AnalyzerInterface`.

**Solution:**
1. Ensure your analyzer implements all required methods:
   ```typescript
   export class MyAnalyzer implements AnalyzerInterface {
     readonly name = 'MyAnalyzer';
     
     // ✓ Required: analyze method
     async analyze(ast: MarkdownAST, content: string, context?: AnalysisContext): Promise<AnalyzerResult> {
       // Implementation
     }
     
     // ✓ Required: getCapabilities method
     getCapabilities(): AnalyzerCapabilities {
       return {
         supportedContentTypes: ['text/markdown'],
         requiresContext: false,
         canProcessLargeFiles: true,
         estimatedProcessingTime: 100,
         dependencies: []
       };
     }
     
     // ✓ Required: validateInterface method
     validateInterface(): boolean {
       return typeof this.analyze === 'function' &&
              typeof this.getCapabilities === 'function' &&
              typeof this.name === 'string' &&
              this.name.length > 0;
     }
   }
   ```

2. Verify method signatures match the interface exactly:
   ```typescript
   // ✗ Wrong signature
   analyze(content: string): AnalyzerResult { }
   
   // ✓ Correct signature
   async analyze(ast: MarkdownAST, content: string, context?: AnalysisContext): Promise<AnalyzerResult> { }
   ```

### Problem: "Invalid method signatures"

**Symptoms:**
```
Interface validation failed: Invalid methods: analyze (wrong signature)
```

**Cause:** Method exists but has incorrect signature.

**Solution:**
Check the exact method signatures required:
```typescript
// Required signatures:
readonly name: string;
analyze(ast: MarkdownAST, content: string, context?: AnalysisContext): Promise<AnalyzerResult<T>>;
getCapabilities(): AnalyzerCapabilities;
validateInterface(): boolean;
```

**Common signature mistakes:**
```typescript
// ✗ Missing async/Promise
analyze(ast: MarkdownAST, content: string): AnalyzerResult { }

// ✗ Wrong parameter types
analyze(content: string, ast: any): Promise<AnalyzerResult> { }

// ✗ Missing optional context parameter
analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> { }

// ✓ Correct
async analyze(ast: MarkdownAST, content: string, context?: AnalysisContext): Promise<AnalyzerResult> { }
```

## Dependency Resolution Failures

### Problem: "Dependency validation failed: missing dependencies"

**Symptoms:**
```
✗ FrameworkAnalyzer failed: Dependency validation failed: Missing dependencies: LanguageAnalyzer
```

**Cause:** Analyzer declares dependencies that aren't registered yet.

**Solution:**
1. Register dependencies first:
   ```typescript
   // ✓ Register dependencies in correct order
   const results = registry.registerMultiple([
     {
       name: 'LanguageAnalyzer',
       analyzer: new LanguageAnalyzer(),
       priority: 10 // Higher priority = registered first
     },
     {
       name: 'FrameworkAnalyzer', 
       analyzer: new FrameworkAnalyzer(),
       dependencies: ['LanguageAnalyzer'],
       priority: 5
     }
   ]);
   ```

2. Or use dependency resolution:
   ```typescript
   const analyzers = [
     { name: 'FrameworkAnalyzer', analyzer: new FrameworkAnalyzer(), dependencies: ['LanguageAnalyzer'] },
     { name: 'LanguageAnalyzer', analyzer: new LanguageAnalyzer() }
   ];
   
   // Registry will automatically resolve dependency order
   const dependencyOrder = registry.resolveDependencies(analyzers);
   console.log('Resolution order:', dependencyOrder); // ['LanguageAnalyzer', 'FrameworkAnalyzer']
   ```

### Problem: "Circular dependency detected"

**Symptoms:**
```
✗ Registration failed: Circular dependency detected: A -> B -> A
```

**Cause:** Analyzers have circular dependencies.

**Solution:**
1. Review and remove circular dependencies:
   ```typescript
   // ✗ Circular dependency
   class AnalyzerA implements AnalyzerInterface {
     getCapabilities() {
       return { dependencies: ['AnalyzerB'] };
     }
   }
   
   class AnalyzerB implements AnalyzerInterface {
     getCapabilities() {
       return { dependencies: ['AnalyzerA'] }; // Circular!
     }
   }
   ```

2. Restructure dependencies:
   ```typescript
   // ✓ Remove circular dependency
   class AnalyzerA implements AnalyzerInterface {
     getCapabilities() {
       return { dependencies: [] }; // No dependencies
     }
   }
   
   class AnalyzerB implements AnalyzerInterface {
     getCapabilities() {
       return { dependencies: ['AnalyzerA'] }; // One-way dependency
     }
   }
   ```

## Registration Timeout Issues

### Problem: "Registration timeout after 5000ms"

**Symptoms:**
```
✗ SlowAnalyzer failed: Registration timeout after 5000ms
```

**Cause:** Analyzer initialization takes too long.

**Solution:**
1. Increase timeout:
   ```typescript
   registry.setRegistrationOptions({
     registrationTimeout: 15000 // 15 seconds
   });
   ```

2. Optimize analyzer initialization:
   ```typescript
   class SlowAnalyzer implements AnalyzerInterface {
     private initialized = false;
     
     constructor() {
       // ✗ Don't do heavy work in constructor
       // this.loadLargeModel(); 
     }
     
     async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
       // ✓ Lazy initialization
       if (!this.initialized) {
         await this.initialize();
         this.initialized = true;
       }
       
       // Analysis logic...
     }
     
     private async initialize(): Promise<void> {
       // Heavy initialization work here
     }
   }
   ```

## Duplicate Registration Issues

### Problem: "Analyzer 'MyAnalyzer' is already registered"

**Symptoms:**
```
✗ MyAnalyzer failed: Analyzer 'MyAnalyzer' is already registered
```

**Cause:** Attempting to register an analyzer with a name that's already in use.

**Solution:**
1. Allow duplicates (replaces existing):
   ```typescript
   registry.setRegistrationOptions({
     allowDuplicates: true
   });
   ```

2. Use unique names:
   ```typescript
   // ✗ Duplicate names
   registry.register(new MyAnalyzer(), 'MyAnalyzer');
   registry.register(new MyAnalyzer(), 'MyAnalyzer'); // Fails
   
   // ✓ Unique names
   registry.register(new MyAnalyzer(), 'MyAnalyzer_v1');
   registry.register(new MyAnalyzer(), 'MyAnalyzer_v2');
   ```

3. Check before registering:
   ```typescript
   if (!registry.isAnalyzerRegistered('MyAnalyzer')) {
     registry.register(new MyAnalyzer());
   }
   ```

## Runtime Analysis Failures

### Problem: Analyzer throws errors during analysis

**Symptoms:**
```typescript
// Analysis fails with unhandled errors
const result = await analyzer.analyze(ast, content);
// Throws: TypeError: Cannot read property 'length' of undefined
```

**Cause:** Analyzer doesn't handle edge cases or invalid input.

**Solution:**
1. Add proper error handling:
   ```typescript
   async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult> {
     try {
       // Validate inputs
       if (!ast) {
         return {
           success: false,
           confidence: 0,
           errors: [{
             code: 'INVALID_AST',
             message: 'AST is null or undefined',
             component: this.name,
             severity: 'error'
           }]
         };
       }
       
       if (typeof content !== 'string') {
         return {
           success: false,
           confidence: 0,
           errors: [{
             code: 'INVALID_CONTENT',
             message: 'Content must be a string',
             component: this.name,
             severity: 'error'
           }]
         };
       }
       
       // Safe analysis logic
       const result = this.performAnalysis(ast, content);
       
       return {
         success: true,
         data: result,
         confidence: this.calculateConfidence(result)
       };
       
     } catch (error) {
       return {
         success: false,
         confidence: 0,
         errors: [{
           code: 'ANALYSIS_ERROR',
           message: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
           component: this.name,
           severity: 'error'
         }]
       };
     }
   }
   ```

## Configuration Issues

### Problem: Registry options not taking effect

**Symptoms:**
```typescript
registry.setRegistrationOptions({ validateInterfaces: false });
// But validation still occurs
```

**Cause:** Options set after registration or not applied correctly.

**Solution:**
1. Set options before registration:
   ```typescript
   // ✓ Set options first
   const registry = new EnhancedAnalyzerRegistry({
     validateInterfaces: false,
     failOnError: true
   });
   
   // Then register analyzers
   registry.register(analyzer);
   ```

2. Or update options and re-register:
   ```typescript
   registry.setRegistrationOptions({ validateInterfaces: false });
   registry.clearRegistry(); // Clear existing registrations
   registry.register(analyzer); // Re-register with new options
   ```

## Debugging Registration Issues

### Enable Detailed Logging

```typescript
// Enable comprehensive logging
registry.setRegistrationOptions({
  enableLogging: true
});

// Registration attempts will now log:
// - Registration start/end
// - Validation details
// - Error information with correlation IDs
// - Recovery attempts
```

### Get Diagnostic Information

```typescript
// Get comprehensive error diagnostics
const diagnostics = registry.getErrorDiagnostics();

console.log('Registration Diagnostics:');
console.log(`Total failures: ${diagnostics.totalFailures}`);

// Review failed registrations
Object.entries(diagnostics.failuresByAnalyzer).forEach(([name, failure]) => {
  console.log(`${name}: ${failure.error} (retries: ${failure.retryCount})`);
});

// Get recovery recommendations
diagnostics.recoveryRecommendations.forEach(rec => {
  console.log(`Recommendation: ${rec}`);
});
```

### Validate Registry State

```typescript
// Check overall registry health
const validation = registry.validateRegistration();

if (!validation.isValid) {
  console.log('Registry Issues:');
  validation.issues.forEach(issue => {
    console.log(`${issue.severity.toUpperCase()}: ${issue.analyzerName} - ${issue.message}`);
  });
  
  console.log('Recommendations:');
  validation.recommendations.forEach(rec => {
    console.log(`- ${rec}`);
  });
}
```

### Check Individual Analyzer Status

```typescript
// Get detailed status for specific analyzer
const status = registry.getAnalyzerStatus('MyAnalyzer');

if (status) {
  console.log(`Analyzer: ${status.name}`);
  console.log(`Status: ${status.status}`);
  console.log(`Registered: ${status.isRegistered}`);
  
  if (status.lastError) {
    console.log(`Last Error: ${status.lastError}`);
    console.log(`Retry Count: ${status.retryCount}`);
  }
  
  console.log(`Dependencies: ${status.dependencies.join(', ')}`);
  console.log(`Dependents: ${status.dependents.join(', ')}`);
}
```

## Performance Issues

### Problem: Registration is slow

**Symptoms:**
- Registration takes several seconds
- High memory usage during registration
- System becomes unresponsive

**Solutions:**

1. **Optimize validation:**
   ```typescript
   // Disable validation for production if analyzers are pre-validated
   registry.setRegistrationOptions({
     validateInterfaces: false // Skip validation for performance
   });
   ```

2. **Batch register efficiently:**
   ```typescript
   // ✗ Individual registration (slower)
   analyzers.forEach(analyzer => {
     registry.register(analyzer);
   });
   
   // ✓ Batch registration (faster)
   registry.registerMultiple(analyzers);
   ```

3. **Use priority ordering:**
   ```typescript
   const analyzers = [
     { name: 'CriticalAnalyzer', analyzer: new CriticalAnalyzer(), priority: 10 },
     { name: 'OptionalAnalyzer', analyzer: new OptionalAnalyzer(), priority: 1 }
   ];
   
   // Critical analyzers register first
   registry.registerMultiple(analyzers);
   ```

## Integration Test Failures

### Problem: "MockAnalyzer not found in analyzer list"

**Symptoms:**
```typescript
// Integration test fails
const analyzers = registry.getRegisteredAnalyzers();
expect(analyzers).toContain('MockAnalyzer'); // Fails
```

**Cause:** MockAnalyzer registration failed silently or wasn't registered.

**Solution:**

1. **Check registration result:**
   ```typescript
   const mockAnalyzer = new MockAnalyzer();
   const result = registry.register(mockAnalyzer);
   
   // ✓ Always check registration result
   if (!result.success) {
     console.error('MockAnalyzer registration failed:', result.error);
     throw new Error(`Registration failed: ${result.error}`);
   }
   
   // Now test should pass
   const analyzers = registry.getRegisteredAnalyzers();
   expect(analyzers).toContain('MockAnalyzer');
   ```

2. **Verify analyzer implementation:**
   ```typescript
   // Test analyzer interface compliance first
   const mockAnalyzer = new MockAnalyzer();
   const isValid = mockAnalyzer.validateInterface();
   
   if (!isValid) {
     console.error('MockAnalyzer interface validation failed');
     // Fix analyzer implementation
   }
   ```

3. **Use proper test setup:**
   ```typescript
   describe('Analyzer Registration', () => {
     let registry: EnhancedAnalyzerRegistry;
     
     beforeEach(() => {
       // Fresh registry for each test
       registry = new EnhancedAnalyzerRegistry({
         validateInterfaces: true,
         failOnError: true // Fail fast in tests
       });
     });
     
     it('should register MockAnalyzer', () => {
       const mockAnalyzer = new MockAnalyzer();
       const result = registry.register(mockAnalyzer);
       
       expect(result.success).toBe(true);
       expect(registry.getRegisteredAnalyzers()).toContain('MockAnalyzer');
     });
   });
   ```

## Recovery Strategies

### Graceful Failure Handling

```typescript
// Configure registry for graceful failure handling
registry.setRegistrationOptions({
  failOnError: false, // Continue on individual failures
  validateInterfaces: true, // But still validate
  enableLogging: true // Log issues for debugging
});

const results = registry.registerMultiple(analyzers);

// Handle partial failures
const successful = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

console.log(`Successfully registered: ${successful.length}`);
console.log(`Failed registrations: ${failed.length}`);

// Continue with successful analyzers
if (successful.length > 0) {
  console.log('Proceeding with available analyzers');
} else {
  throw new Error('No analyzers could be registered');
}
```

### Retry Failed Registrations

```typescript
// Retry failed registrations with different options
const failedAnalyzers = registry.getFailedAnalyzers();

if (failedAnalyzers.length > 0) {
  console.log(`Retrying ${failedAnalyzers.length} failed registrations...`);
  
  // Try with relaxed validation
  registry.setRegistrationOptions({
    validateInterfaces: false,
    failOnError: false
  });
  
  for (const analyzerName of failedAnalyzers) {
    // Get original analyzer config and retry
    // Implementation depends on how you store original configs
  }
}
```

This troubleshooting guide covers the most common issues and provides practical solutions for each scenario. Always check registration results and enable logging when debugging registration issues.