import Anthropic from '@anthropic-ai/sdk';

// Primary and secondary Anthropic clients
let primaryClient: Anthropic | null = null;
let secondaryClient: Anthropic | null = null;
let useSecondary = false;

function getPrimaryClient(): Anthropic | null {
  if (!primaryClient && process.env.ANTHROPIC_API_KEY_PRIMARY) {
    primaryClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY_PRIMARY,
    });
  }
  return primaryClient;
}

function getSecondaryClient(): Anthropic | null {
  if (!secondaryClient && process.env.ANTHROPIC_API_KEY_SECONDARY) {
    secondaryClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY_SECONDARY,
    });
  }
  return secondaryClient;
}

// Get the current active client (primary or secondary)
export function getAnthropicClient(): Anthropic {
  if (useSecondary) {
    const secondary = getSecondaryClient();
    if (secondary) return secondary;
  }

  const primary = getPrimaryClient();
  if (primary) return primary;

  // Fallback to default client (uses ANTHROPIC_API_KEY env var)
  return new Anthropic();
}

// Switch to secondary client (called on rate limit)
export function switchToSecondaryClient(): boolean {
  const secondary = getSecondaryClient();
  if (secondary) {
    console.log('Switching to secondary Anthropic API key');
    useSecondary = true;
    return true;
  }
  return false;
}

// Reset to primary client (can be called periodically or manually)
export function resetToPrimaryClient(): void {
  useSecondary = false;
}

// Retry helper with exponential backoff for rate limits and automatic key fallback
export async function withRetry<T>(
  fn: (client: Anthropic) => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> {
  let lastError: Error | null = null;
  let triedSecondary = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const client = getAnthropicClient();

    try {
      return await fn(client);
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error (429)
      if (error?.status === 429) {
        // If we haven't tried the secondary key yet, switch to it
        if (!triedSecondary && !useSecondary && switchToSecondaryClient()) {
          console.log('Rate limited on primary key, trying secondary key immediately');
          triedSecondary = true;
          // Don't count this as a retry, try immediately with secondary
          attempt--;
          continue;
        }

        // If we still have retries left, wait and retry
        if (attempt < maxRetries) {
          const retryAfter = error?.headers?.get?.('retry-after');
          const delay = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : baseDelay * Math.pow(2, attempt);

          console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      // For non-rate-limit errors, throw immediately
      throw error;
    }
  }

  throw lastError;
}
