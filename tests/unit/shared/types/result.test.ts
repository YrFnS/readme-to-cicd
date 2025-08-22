import { describe, it, expect } from 'vitest';
import { Result, success, failure, isSuccess, isFailure } from '../../../../src/shared/types/result';

describe('Result Type', () => {
  describe('Result type definition', () => {
    it('should create a successful Result with data', () => {
      const result: Result<number> = { success: true, data: 42 };
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });

    it('should create a failed Result with error', () => {
      const result: Result<number, string> = { success: false, error: 'Something went wrong' };
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Something went wrong');
      }
    });

    it('should work with custom error types', () => {
      class CustomError {
        constructor(public message: string, public code: number) {}
      }

      const result: Result<string, CustomError> = { 
        success: false, 
        error: new CustomError('Custom error', 500) 
      };
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Custom error');
        expect(result.error.code).toBe(500);
      }
    });
  });

  describe('success helper function', () => {
    it('should create a successful Result', () => {
      const result = success(42);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(42);
    });

    it('should work with complex data types', () => {
      const data = { name: 'test', value: 123 };
      const result = success(data);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('should work with null and undefined', () => {
      const nullResult = success(null);
      const undefinedResult = success(undefined);
      
      expect(nullResult.success).toBe(true);
      expect(nullResult.data).toBe(null);
      
      expect(undefinedResult.success).toBe(true);
      expect(undefinedResult.data).toBe(undefined);
    });
  });

  describe('failure helper function', () => {
    it('should create a failed Result with string error', () => {
      const result = failure('Error message');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Error message');
    });

    it('should create a failed Result with Error object', () => {
      const error = new Error('Something went wrong');
      const result = failure(error);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.error.message).toBe('Something went wrong');
    });

    it('should work with custom error types', () => {
      const customError = { code: 404, message: 'Not found' };
      const result = failure(customError);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(customError);
    });
  });

  describe('isSuccess type guard', () => {
    it('should return true for successful Results', () => {
      const result = success(42);
      
      expect(isSuccess(result)).toBe(true);
      
      // Type narrowing test
      if (isSuccess(result)) {
        expect(result.data).toBe(42);
        // TypeScript should know result.data exists and is number
      }
    });

    it('should return false for failed Results', () => {
      const result = failure('Error');
      
      expect(isSuccess(result)).toBe(false);
    });

    it('should work with mixed Result types', () => {
      const results: Result<number, string>[] = [
        success(1),
        failure('error'),
        success(2)
      ];

      const successfulResults = results.filter(isSuccess);
      
      expect(successfulResults).toHaveLength(2);
      expect(successfulResults[0].data).toBe(1);
      expect(successfulResults[1].data).toBe(2);
    });
  });

  describe('isFailure type guard', () => {
    it('should return true for failed Results', () => {
      const result = failure('Error message');
      
      expect(isFailure(result)).toBe(true);
      
      // Type narrowing test
      if (isFailure(result)) {
        expect(result.error).toBe('Error message');
        // TypeScript should know result.error exists and is string
      }
    });

    it('should return false for successful Results', () => {
      const result = success(42);
      
      expect(isFailure(result)).toBe(false);
    });

    it('should work with mixed Result types', () => {
      const results: Result<number, string>[] = [
        success(1),
        failure('error1'),
        success(2),
        failure('error2')
      ];

      const failedResults = results.filter(isFailure);
      
      expect(failedResults).toHaveLength(2);
      expect(failedResults[0].error).toBe('error1');
      expect(failedResults[1].error).toBe('error2');
    });
  });

  describe('discriminated union behavior', () => {
    it('should provide type safety through discriminated union', () => {
      const result: Result<number, string> = Math.random() > 0.5 
        ? success(42) 
        : failure('Random error');

      if (result.success) {
        // TypeScript knows result.data exists and is number
        expect(typeof result.data).toBe('number');
        // @ts-expect-error - error property should not exist on success
        // expect(result.error).toBeUndefined();
      } else {
        // TypeScript knows result.error exists and is string
        expect(typeof result.error).toBe('string');
        // @ts-expect-error - data property should not exist on failure
        // expect(result.data).toBeUndefined();
      }
    });

    it('should work in switch statements', () => {
      const processResult = (result: Result<number, string>): string => {
        switch (result.success) {
          case true:
            return `Success: ${result.data}`;
          case false:
            return `Error: ${result.error}`;
        }
      };

      expect(processResult(success(42))).toBe('Success: 42');
      expect(processResult(failure('test error'))).toBe('Error: test error');
    });
  });

  describe('real-world usage patterns', () => {
    it('should work with async operations', async () => {
      const asyncOperation = async (shouldSucceed: boolean): Promise<Result<string, Error>> => {
        await new Promise(resolve => setTimeout(resolve, 1));
        
        if (shouldSucceed) {
          return success('Operation completed');
        } else {
          return failure(new Error('Operation failed'));
        }
      };

      const successResult = await asyncOperation(true);
      const failureResult = await asyncOperation(false);

      expect(isSuccess(successResult)).toBe(true);
      expect(isFailure(failureResult)).toBe(true);

      if (isSuccess(successResult)) {
        expect(successResult.data).toBe('Operation completed');
      }

      if (isFailure(failureResult)) {
        expect(failureResult.error.message).toBe('Operation failed');
      }
    });

    it('should chain operations safely', () => {
      const parseNumber = (input: string): Result<number, string> => {
        const num = parseInt(input, 10);
        if (isNaN(num)) {
          return failure(`Invalid number: ${input}`);
        }
        return success(num);
      };

      const doubleNumber = (num: number): Result<number, string> => {
        if (num > 1000) {
          return failure('Number too large to double');
        }
        return success(num * 2);
      };

      const processInput = (input: string): Result<number, string> => {
        const parseResult = parseNumber(input);
        if (!parseResult.success) {
          return parseResult;
        }

        return doubleNumber(parseResult.data);
      };

      expect(processInput('21')).toEqual(success(42));
      expect(processInput('abc')).toEqual(failure('Invalid number: abc'));
      expect(processInput('2000')).toEqual(failure('Number too large to double'));
    });
  });
});