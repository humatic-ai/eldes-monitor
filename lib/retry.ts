/**
 * Retry utility for handling transient network errors
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNRESET',
    'EAI_AGAIN',
    'fetch failed',
    'network',
  ],
};

/**
 * Check if an error is retryable (transient network error)
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorMessage = error.message.toLowerCase();
  const errorName = error.name.toLowerCase();
  const errorCode = (error as any).code?.toLowerCase() || '';

  // Check error message, name, and code
  const errorString = `${errorMessage} ${errorName} ${errorCode}`.toLowerCase();

  return DEFAULT_OPTIONS.retryableErrors.some((retryableError) =>
    errorString.includes(retryableError.toLowerCase())
  );
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff for transient network errors
 * 
 * @param fn - Function to retry
 * @param options - Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | unknown;
  let delay = config.initialDelay;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if it's not a retryable error
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Log retry attempt
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(
        `[Retry] Attempt ${attempt + 1}/${config.maxRetries} failed: ${errorMessage}. Retrying in ${delay}ms...`
      );

      // Wait before retrying
      await sleep(delay);

      // Exponential backoff: increase delay for next attempt
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
    }
  }

  // All retries exhausted
  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
  console.error(`[Retry] All ${config.maxRetries + 1} attempts failed. Last error: ${errorMessage}`);
  throw lastError;
}

