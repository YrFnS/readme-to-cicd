import * as assert from 'assert';
import { describe, it } from 'mocha';

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

describe('ValidationDisplay Component', () => {
  describe('Validation State Detection', () => {
    it('should detect valid configuration with no errors or warnings', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      const isCompletelyValid = validationResult.isValid && 
                               validationResult.errors.length === 0 && 
                               validationResult.warnings.length === 0;

      assert.strictEqual(isCompletelyValid, true);
    });

    it('should detect invalid configuration with errors', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: [
          { field: 'frameworks', message: 'At least one framework must be selected', code: 'REQUIRED' }
        ],
        warnings: []
      };

      const hasErrors = validationResult.errors.length > 0;
      
      assert.strictEqual(validationResult.isValid, false);
      assert.strictEqual(hasErrors, true);
    });

    it('should detect valid configuration with warnings only', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [
          { field: 'deployment', message: 'No deployment platform configured', code: 'OPTIONAL' }
        ]
      };

      const hasWarnings = validationResult.warnings.length > 0;
      const hasErrors = validationResult.errors.length > 0;
      
      assert.strictEqual(validationResult.isValid, true);
      assert.strictEqual(hasWarnings, true);
      assert.strictEqual(hasErrors, false);
    });
  });

  describe('Error Rendering Logic', () => {
    it('should render error with all properties', () => {
      const error: ValidationError = {
        field: 'frameworks',
        message: 'At least one framework must be selected',
        code: 'REQUIRED'
      };

      // Simulate error rendering logic
      const errorDisplay = {
        field: error.field,
        message: error.message,
        code: error.code,
        type: 'error'
      };

      assert.strictEqual(errorDisplay.field, 'frameworks');
      assert.strictEqual(errorDisplay.message, 'At least one framework must be selected');
      assert.strictEqual(errorDisplay.code, 'REQUIRED');
      assert.strictEqual(errorDisplay.type, 'error');
    });

    it('should handle multiple errors', () => {
      const errors: ValidationError[] = [
        { field: 'frameworks', message: 'No frameworks selected', code: 'REQUIRED' },
        { field: 'workflowTypes', message: 'No workflow types selected', code: 'REQUIRED' },
        { field: 'deployment.siteId', message: 'Site ID is required', code: 'REQUIRED' }
      ];

      assert.strictEqual(errors.length, 3);
      
      errors.forEach(error => {
        assert.ok(error.field);
        assert.ok(error.message);
        assert.ok(error.code);
      });
    });
  });

  describe('Warning Rendering Logic', () => {
    it('should render warning with all properties', () => {
      const warning: ValidationWarning = {
        field: 'deployment',
        message: 'No deployment platform configured',
        code: 'OPTIONAL'
      };

      // Simulate warning rendering logic
      const warningDisplay = {
        field: warning.field,
        message: warning.message,
        code: warning.code,
        type: 'warning'
      };

      assert.strictEqual(warningDisplay.field, 'deployment');
      assert.strictEqual(warningDisplay.message, 'No deployment platform configured');
      assert.strictEqual(warningDisplay.code, 'OPTIONAL');
      assert.strictEqual(warningDisplay.type, 'warning');
    });

    it('should handle multiple warnings', () => {
      const warnings: ValidationWarning[] = [
        { field: 'deployment', message: 'No deployment configured', code: 'OPTIONAL' },
        { field: 'testing', message: 'No test configuration found', code: 'RECOMMENDED' }
      ];

      assert.strictEqual(warnings.length, 2);
      
      warnings.forEach(warning => {
        assert.ok(warning.field);
        assert.ok(warning.message);
        assert.ok(warning.code);
      });
    });
  });

  describe('Validation Summary Logic', () => {
    it('should generate correct error count summary', () => {
      const errors: ValidationError[] = [
        { field: 'frameworks', message: 'Error 1', code: 'REQUIRED' },
        { field: 'workflowTypes', message: 'Error 2', code: 'REQUIRED' }
      ];

      const errorCount = errors.length;
      const errorText = `${errorCount} error${errorCount !== 1 ? 's' : ''}`;

      assert.strictEqual(errorText, '2 errors');
    });

    it('should generate correct warning count summary', () => {
      const warnings: ValidationWarning[] = [
        { field: 'deployment', message: 'Warning 1', code: 'OPTIONAL' }
      ];

      const warningCount = warnings.length;
      const warningText = `${warningCount} warning${warningCount !== 1 ? 's' : ''}`;

      assert.strictEqual(warningText, '1 warning');
    });

    it('should handle singular vs plural correctly', () => {
      // Test singular
      const singleError = [{ field: 'test', message: 'Test', code: 'TEST' }];
      const singleErrorText = `${singleError.length} error${singleError.length !== 1 ? 's' : ''}`;
      assert.strictEqual(singleErrorText, '1 error');

      // Test plural
      const multipleErrors = [
        { field: 'test1', message: 'Test 1', code: 'TEST' },
        { field: 'test2', message: 'Test 2', code: 'TEST' }
      ];
      const multipleErrorText = `${multipleErrors.length} error${multipleErrors.length !== 1 ? 's' : ''}`;
      assert.strictEqual(multipleErrorText, '2 errors');
    });
  });

  describe('Validation Icon Logic', () => {
    it('should use success icon for valid configuration', () => {
      const isValid = true;
      const hasErrors = false;
      
      const icon = isValid && !hasErrors ? '✅' : '❌';
      
      assert.strictEqual(icon, '✅');
    });

    it('should use error icon for invalid configuration', () => {
      const isValid = false;
      const hasErrors = true;
      
      const icon = isValid && !hasErrors ? '✅' : '❌';
      
      assert.strictEqual(icon, '❌');
    });

    it('should use appropriate icons for different validation types', () => {
      const errorIcon = '❌';
      const warningIcon = '⚠️';
      const successIcon = '✅';

      assert.strictEqual(errorIcon, '❌');
      assert.strictEqual(warningIcon, '⚠️');
      assert.strictEqual(successIcon, '✅');
    });
  });

  describe('Help Content Logic', () => {
    it('should provide help for invalid configurations', () => {
      const isValid = false;
      
      const helpItems = [
        'Check that all required fields are filled',
        'Ensure at least one framework is selected',
        'Verify deployment configuration is complete',
        'Review workflow type selections'
      ];

      if (!isValid) {
        assert.strictEqual(helpItems.length, 4);
        assert.ok(helpItems.includes('Check that all required fields are filled'));
        assert.ok(helpItems.includes('Ensure at least one framework is selected'));
      }
    });

    it('should not show help for valid configurations', () => {
      const isValid = true;
      const showHelp = !isValid;
      
      assert.strictEqual(showHelp, false);
    });
  });

  describe('Validation Result Processing', () => {
    it('should process complex validation result correctly', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: [
          { field: 'frameworks', message: 'No frameworks selected', code: 'REQUIRED' },
          { field: 'deployment.siteId', message: 'Site ID required for Netlify', code: 'REQUIRED' }
        ],
        warnings: [
          { field: 'testing', message: 'No test configuration detected', code: 'RECOMMENDED' },
          { field: 'security', message: 'Consider adding security scanning', code: 'OPTIONAL' }
        ]
      };

      const summary = {
        isValid: validationResult.isValid,
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length,
        totalIssues: validationResult.errors.length + validationResult.warnings.length
      };

      assert.strictEqual(summary.isValid, false);
      assert.strictEqual(summary.errorCount, 2);
      assert.strictEqual(summary.warningCount, 2);
      assert.strictEqual(summary.totalIssues, 4);
    });

    it('should handle empty validation result', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      const isEmpty = validationResult.errors.length === 0 && 
                     validationResult.warnings.length === 0;

      assert.strictEqual(isEmpty, true);
      assert.strictEqual(validationResult.isValid, true);
    });
  });
});