/**
 * Minimal test to verify window mock concept
 */

// Create a simple mock object
const mockWindow = {
  _mockConfig: {},
  
  setMockConfig: function(config) {
    this._mockConfig = { ...this._mockConfig, ...config };
  },
  
  resetMockConfig: function() {
    this._mockConfig = {};
  },
  
  getMockConfig: function() {
    return { ...this._mockConfig };
  },
  
  showInformationMessage: async function(message, ...items) {
    console.log('DEBUG: Called showInformationMessage with config:', this._mockConfig);
    
    // Handle cancellation simulation
    if (this._mockConfig.simulateCancel) {
      console.log('DEBUG: Returning undefined (cancelled)');
      return undefined;
    }
    
    // Handle configured responses
    if (this._mockConfig.informationResponse !== undefined) {
      console.log('DEBUG: Returning configured response:', this._mockConfig.informationResponse);
      return this._mockConfig.informationResponse;
    }
    
    // Default behavior
    const result = items.length > 0 ? items[0] : 'OK';
    console.log('DEBUG: Returning default result:', result);
    return result;
  }
};

async function testMinimalMock() {
  console.log('Testing minimal mock...');
  
  // Test 1: Default behavior
  console.log('\nTest 1: Default behavior');
  const result1 = await mockWindow.showInformationMessage('Test', 'OK', 'Cancel');
  console.log('Result 1:', result1);
  
  // Test 2: Configured response
  console.log('\nTest 2: Configured response');
  mockWindow.setMockConfig({ informationResponse: 'Custom' });
  const result2 = await mockWindow.showInformationMessage('Test', 'OK', 'Cancel');
  console.log('Result 2:', result2);
  
  // Test 3: Cancellation
  console.log('\nTest 3: Cancellation');
  mockWindow.resetMockConfig();
  mockWindow.setMockConfig({ simulateCancel: true });
  const result3 = await mockWindow.showInformationMessage('Test', 'OK', 'Cancel');
  console.log('Result 3:', result3);
  
  if (result3 === undefined) {
    console.log('✓ Minimal mock works correctly');
  } else {
    console.log('❌ Minimal mock failed');
  }
}

testMinimalMock();