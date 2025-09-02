# VSCode Extension Test Utilities

## Overview

This document describes the comprehensive test utilities created for testing the README-to-CICD VSCode extension. These utilities provide a robust testing infrastructure that enables thorough testing of extension components, commands, webviews, and user interactions.

## Created Files

### 1. `extension-test-utilities.ts`
**Main test utilities for extension testing**

#### Key Classes:
- **`ExtensionTestContext`**: Core test context that provides all necessary mocks and utilities
- **`ExtensionTestSuite`**: High-level test suite helper for common extension testing patterns
- **`ExtensionTestUtils`**: Static utility methods for creating specialized test contexts

#### Features:
- Complete VSCode API mocking setup
- File system operation simulation
- User interaction simulation
- Command registration and execution testing
- Extension activation simulation
- Configuration management for tests
- Automatic cleanup and resource management

#### Usage Example:
```typescript
const context = new ExtensionTestContext({
  enableVSCodeMock: true,
  enableFileSystemMock: true,
  mockReadmeContent: mockReadmeContent.nodejs
});

await context.setup();
const result = await context.simulateExtensionActivation();
context.cleanup();
```

### 2. `command-test-utilities.ts`
**Specialized utilities for testing VSCode commands**

#### Key Classes:
- **`CommandTestHelper`**: Helper for testing command registration, execution, and validation
- **`ReadmeToCICDCommandScenarios`**: Predefined test scenarios for README-to-CICD commands
- **`CommandTestUtils`**: Utility functions for common command testing patterns

#### Features:
- Command registration with mock implementations
- Command execution with performance tracking
- Error handling testing
- User interaction simulation for commands
- Command history and verification
- Performance benchmarking

#### Usage Example:
```typescript
const helper = new CommandTestHelper(context);
helper.registerMockCommand('test.command', mockImplementation);

const result = await helper.testCommand({
  commandId: 'test.command',
  expectedArgs: ['arg1', 'arg2']
});
```

### 3. `webview-test-utilities.ts`
**Utilities for testing webview panels and UI components**

#### Key Classes:
- **`WebviewTestHelper`**: Helper for creating and testing webview panels
- **`ReadmeToCICDWebviewScenarios`**: Predefined webview scenarios for the extension
- **`WebviewTestUtils`**: Utility functions for webview testing patterns

#### Features:
- Webview panel creation and management
- Message communication testing
- HTML content validation
- Webview lifecycle testing
- Mock webview API for testing

#### Usage Example:
```typescript
const helper = new WebviewTestHelper(context);
const panel = helper.createWebviewPanel({
  viewType: 'test.webview',
  title: 'Test Panel',
  enableMessageHandling: true
});

await helper.sendMessageToWebview('test.webview', {
  command: 'test',
  data: { value: 'hello' }
});
```

### 4. `window-mock-utils.ts` (Enhanced)
**Enhanced utilities for VSCode window API testing**

#### Key Classes:
- **`WindowMockHelper`**: Helper for configuring and verifying window interactions
- **`WindowMockScenarios`**: Predefined scenarios for common user interaction patterns

#### Features:
- Message dialog configuration and verification
- Quick pick and input box simulation
- User interaction flow testing
- Scenario-based testing (confirm all, cancel all, etc.)
- Interaction history tracking

### 5. Test Files
- **`extension-test-utilities.test.ts`**: Comprehensive tests for all utilities
- **`test-utilities-simple.test.ts`**: Simple validation tests

## Key Features

### 1. **Comprehensive VSCode API Mocking**
- Complete workspace API mocking
- Window API with configurable responses
- Commands API with registration tracking
- File system operations simulation
- Configuration management

### 2. **Extension-Specific Testing**
- README-to-CICD command scenarios
- Workflow generation testing
- Framework detection simulation
- Configuration webview testing

### 3. **User Interaction Simulation**
- Information/warning/error messages
- Quick pick dialogs
- Input boxes with validation
- Progress reporting
- File dialogs

### 4. **Performance and Error Testing**
- Command execution timing
- Memory usage tracking
- Error scenario simulation
- Recovery testing
- Timeout handling

### 5. **Test Organization**
- Modular utility classes
- Predefined scenarios
- Decorator pattern support
- Automatic setup/cleanup
- Resource management

## Usage Patterns

### Basic Extension Testing
```typescript
const suite = ExtensionTestUtils.createReadmeToCICDTestSuite();
const context = await suite.setup();

// Test extension activation
const activation = await suite.testActivation();
assert.ok(activation.success);

// Test command execution
const command = await suite.testCommandExecution('readme-to-cicd.generate');
assert.ok(command.success);

suite.teardown();
```

### Command Testing with User Interaction
```typescript
const helper = new CommandTestHelper(context);
const result = await helper.testCommandWithUserInteraction(
  'readme-to-cicd.generate',
  [
    { type: 'quickPick', response: ['ci', 'cd'] },
    { type: 'inputBox', response: 'my-workflow' }
  ]
);
```

### Webview Testing
```typescript
const webviewHelper = new WebviewTestHelper(context);
const panel = ReadmeToCICDWebviewScenarios.createWorkflowPreviewWebview(webviewHelper);

await webviewHelper.testMessageFlow('readme-to-cicd.workflowPreview', 
  [{ command: 'generate', data: { type: 'all' } }],
  [{ command: 'updateWorkflows', data: mockWorkflows }]
);
```

### Decorator Pattern
```typescript
@withExtensionTestContext({ mockReadmeContent: mockReadmeContent.nodejs })
async function testFunction(context: ExtensionTestContext) {
  // Test implementation
  const result = await context.executeCommand('test.command');
  return result;
}
```

## Test Configuration Options

### ExtensionTestConfig
```typescript
interface ExtensionTestConfig {
  enableVSCodeMock?: boolean;
  enableFileSystemMock?: boolean;
  enableWindowMock?: boolean;
  simulateUserInteraction?: boolean;
  mockReadmeContent?: string;
  mockWorkspaceFolder?: string;
  mockWorkflowFiles?: Record<string, string>;
  extensionConfig?: Record<string, any>;
}
```

### Predefined Configurations
- **Minimal**: Basic VSCode mocking only
- **Integration**: Full mocking with file system and user interaction
- **README-to-CICD**: Extension-specific configuration with mock data

## Benefits

1. **Comprehensive Testing**: Covers all aspects of VSCode extension functionality
2. **Easy Setup**: Simple API for creating test contexts and scenarios
3. **Realistic Simulation**: Accurate mocking of VSCode APIs and user interactions
4. **Performance Tracking**: Built-in performance monitoring and benchmarking
5. **Error Handling**: Comprehensive error scenario testing
6. **Maintainable**: Modular design with clear separation of concerns
7. **Extensible**: Easy to add new scenarios and test patterns

## Integration with Existing Tests

These utilities integrate with the existing test infrastructure:
- Uses existing VSCode mock setup from `test/setup/vscode-mock.ts`
- Extends existing mock implementations from `test/mocks/vscode-extension-mocks.ts`
- Compatible with existing window mock utilities from `test/utils/window-mock-utils.ts`
- Works with the current test runner and configuration

## Requirements Satisfied

This implementation satisfies the requirements from task 28:

✅ **Implement test utilities for VSCode extension testing**
- Created comprehensive `ExtensionTestContext` and `ExtensionTestSuite` classes
- Provided utilities for all major VSCode extension testing scenarios

✅ **Add helper functions for extension test setup**
- `ExtensionTestUtils.createReadmeToCICDTestSuite()` for extension-specific setup
- `ExtensionTestUtils.createMinimalTestContext()` for basic testing
- `ExtensionTestUtils.createIntegrationTestContext()` for full integration testing
- Automatic setup and cleanup methods

✅ **Write tests for VSCode extension test utilities**
- Created `extension-test-utilities.test.ts` with comprehensive test coverage
- Created `test-utilities-simple.test.ts` for basic validation
- Tests cover all major utility classes and functions
- Validates proper setup, execution, and cleanup

The utilities provide a robust foundation for testing the README-to-CICD VSCode extension, enabling comprehensive validation of all extension functionality while maintaining clean, maintainable test code.