# TypeScript Compilation Troubleshooting Guide

## Quick Diagnosis Commands

```bash
# Check for compilation errors
npx tsc --noEmit

# Run with detailed error reporting
npx tsc --noEmit --pretty --listFiles

# Check specific file
npx tsc --noEmit src/path/to/file.ts
```

## Common Error Patterns

### 1. Missing Type Definitions

#### Error Messages
```
error TS2304: Cannot find name 'ResultType'
error TS2307: Cannot find module './types/missing-type'
```

#### Diagnosis Steps
1. **Check Import Path**: Verify the import path exists and is correct
2. **Check Export**: Ensure the type is exported from its module
3. **Check File Extension**: TypeScript files should use `.ts` extension in source

#### Resolution Template
```typescript
// 1. Create the missing type definition
export interface MissingType {
  property: string;
}

// 2. Export from index file if needed
export { MissingType } from './missing-type';

// 3. Update import statement
import { MissingType } from '../shared/types/missing-type';
```

### 2. Method Name Mismatches

#### Error Messages
```
error TS2339: Property 'methodName' does not exist on type 'ClassName'
error TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'
```

#### Diagnosis Steps
1. **Check Method Signature**: Use IDE or check class definition
2. **Verify Method Name**: Ensure exact spelling and casing
3. **Check Parameters**: Verify parameter types and order
4. **Check Return Type**: Ensure return type compatibility

#### Resolution Process
```typescript
// 1. Find the correct method name
class YAMLGenerator {
  generateWorkflow(input: DetectionResult): WorkflowOutput { } // Correct method
  // NOT: generateWorkflows() - this doesn't exist
}

// 2. Update the method call
const result = await generator.generateWorkflow(input); // Fixed

// 3. Handle return type differences if needed
if (result.success) {
  // Handle success case
} else {
  // Handle error case
}
```

### 3. Interface Compatibility Issues

#### Error Messages
```
error TS2322: Type 'X' is not assignable to type 'Y'
error TS2345: Argument of type 'A' is not assignable to parameter of type 'B'
```

#### Diagnosis Steps
1. **Compare Interface Definitions**: Check both interfaces side by side
2. **Check Property Names**: Verify exact property names and casing
3. **Check Property Types**: Ensure type compatibility
4. **Check Optional Properties**: Verify required vs optional properties

#### Resolution Strategies
```typescript
// Strategy 1: Create adapter/converter function
function convertToExpectedFormat(input: InputType): ExpectedType {
  return {
    expectedProperty: input.inputProperty,
    // Map other properties as needed
  };
}

// Strategy 2: Update interface to match
interface UpdatedInterface {
  // Add missing properties
  newProperty: string;
  // Make properties optional if needed
  optionalProperty?: number;
}

// Strategy 3: Use type assertion (use sparingly)
const converted = input as ExpectedType;
```

## Error Resolution Workflow

### Step 1: Error Collection
```bash
# Generate comprehensive error report
npx tsc --noEmit > compilation-errors.txt 2>&1
```

### Step 2: Error Categorization
- **Import/Export Errors**: Missing modules, incorrect paths
- **Type Errors**: Interface mismatches, missing properties
- **Method Errors**: Incorrect method names, parameter mismatches
- **Generic Errors**: Type parameter issues, constraint violations

### Step 3: Prioritization
1. **Blocking Errors**: Prevent compilation entirely
2. **Integration Errors**: Break component interactions
3. **Type Safety Errors**: Reduce code reliability
4. **Style Errors**: Code quality issues

### Step 4: Resolution Implementation
1. **Fix One Error at a Time**: Avoid cascading changes
2. **Validate Each Fix**: Run compilation after each change
3. **Test Integration**: Ensure fixes don't break functionality
4. **Document Changes**: Add comments explaining fixes

### Step 5: Validation
```bash
# Verify zero errors
npx tsc --noEmit
echo $? # Should output 0 for success

# Run tests to check for regressions
npm test

# Validate integration
npm run validate:integration
```

## Prevention Strategies

### Development Practices

#### 1. Interface-First Development
```typescript
// Define interfaces before implementation
interface ComponentInterface {
  method(input: InputType): Promise<OutputType>;
}

// Implement interface
class Component implements ComponentInterface {
  async method(input: InputType): Promise<OutputType> {
    // Implementation
  }
}
```

#### 2. Strict TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noImplicitThis": true
  }
}
```

#### 3. Automated Validation
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "pre-commit": "npm run type-check && npm test",
    "validate": "npm run type-check && npm run test && npm run lint"
  }
}
```

### Code Review Checklist

- [ ] All imports resolve correctly
- [ ] Method names match between caller and implementation
- [ ] Parameter types are compatible
- [ ] Return types are handled appropriately
- [ ] Error cases are properly handled
- [ ] Type assertions are justified and documented

## Debugging Tools

### TypeScript Compiler Options
```bash
# Show detailed type information
npx tsc --noEmit --listFiles --traceResolution

# Generate declaration files to check exports
npx tsc --declaration --emitDeclarationOnly

# Check specific module resolution
npx tsc --noEmit --moduleResolution node --traceResolution
```

### IDE Integration
- **VSCode**: Use TypeScript language server for real-time error checking
- **Error Lens**: Extension to show errors inline
- **TypeScript Importer**: Auto-import missing types

### Validation Scripts
```typescript
// scripts/validate-types.ts
import { execSync } from 'child_process';

try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.error('❌ TypeScript compilation failed');
  process.exit(1);
}
```

## Emergency Recovery

### When Everything Breaks
1. **Revert Recent Changes**: Use git to revert to last working state
2. **Isolate Components**: Test each component individually
3. **Check Dependencies**: Verify all required packages are installed
4. **Clear Cache**: Remove `node_modules` and reinstall
5. **Rebuild**: Clean build and regenerate all artifacts

### Recovery Commands
```bash
# Reset to last working state
git checkout HEAD~1 -- src/

# Clean reinstall
rm -rf node_modules package-lock.json
npm install

# Force rebuild
npm run clean
npm run build

# Validate recovery
npm run type-check
npm test
```

## Success Metrics

### Compilation Health
- **Zero TypeScript Errors**: `npx tsc --noEmit` returns exit code 0
- **Clean Build**: `npm run build` completes successfully
- **Test Compatibility**: All tests run without compilation errors

### Integration Health
- **Component Compatibility**: All components integrate without type errors
- **Method Signatures**: All method calls match implementations
- **Data Flow**: Types flow correctly through the entire pipeline

### Maintenance Health
- **Documentation**: All fixes are documented with explanations
- **Prevention**: Automated checks prevent regression
- **Monitoring**: Regular validation catches issues early