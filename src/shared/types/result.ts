/**
 * Result type for operations that can succeed or fail.
 * 
 * This type provides a standardized way to handle operations that might fail
 * without throwing exceptions. It uses a discriminated union to ensure type safety
 * and forces explicit error handling.
 * 
 * @template T The type of the success value
 * @template E The type of the error value (defaults to Error)
 * 
 * @example
 * ```typescript
 * // Function that returns a Result
 * function parseNumber(input: string): Result<number, string> {
 *   const num = parseInt(input, 10);
 *   if (isNaN(num)) {
 *     return { success: false, error: `Invalid number: ${input}` };
 *   }
 *   return { success: true, data: num };
 * }
 * 
 * // Using the Result
 * const result = parseNumber("42");
 * if (result.success) {
 *   console.log(`Parsed number: ${result.data}`); // TypeScript knows data exists
 * } else {
 *   console.error(`Parse error: ${result.error}`); // TypeScript knows error exists
 * }
 * ```
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Creates a successful Result with the provided data.
 * 
 * @template T The type of the success value
 * @param data The success value
 * @returns A successful Result containing the data
 * 
 * @example
 * ```typescript
 * const result = success(42);
 * // result is { success: true, data: 42 }
 * ```
 */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Creates a failed Result with the provided error.
 * 
 * @template E The type of the error value
 * @param error The error value
 * @returns A failed Result containing the error
 * 
 * @example
 * ```typescript
 * const result = failure(new Error("Something went wrong"));
 * // result is { success: false, error: Error("Something went wrong") }
 * ```
 */
export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Type guard to check if a Result is successful.
 * 
 * @template T The type of the success value
 * @template E The type of the error value
 * @param result The Result to check
 * @returns True if the Result is successful, false otherwise
 * 
 * @example
 * ```typescript
 * const result: Result<number, string> = success(42);
 * if (isSuccess(result)) {
 *   console.log(result.data); // TypeScript knows this is number
 * }
 * ```
 */
export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

/**
 * Type guard to check if a Result is a failure.
 * 
 * @template T The type of the success value
 * @template E The type of the error value
 * @param result The Result to check
 * @returns True if the Result is a failure, false otherwise
 * 
 * @example
 * ```typescript
 * const result: Result<number, string> = failure("Invalid input");
 * if (isFailure(result)) {
 *   console.error(result.error); // TypeScript knows this is string
 * }
 * ```
 */
export function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}