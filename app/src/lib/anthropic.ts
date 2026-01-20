import Anthropic from '@anthropic-ai/sdk';
import { trackUsage } from './db';

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

// Check which key is currently active
export function getCurrentApiKey(): 'primary' | 'secondary' {
  return useSecondary ? 'secondary' : 'primary';
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

// Options for withRetry with usage tracking
export interface WithRetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  endpoint?: string;
  sessionId?: string;
}

// Retry helper with exponential backoff for rate limits and automatic key fallback
// Now also tracks usage metrics
export async function withRetry<T>(
  fn: (client: Anthropic) => Promise<T>,
  optionsOrMaxRetries?: WithRetryOptions | number,
  baseDelay?: number
): Promise<T> {
  // Handle backward compatibility with old signature
  const options: WithRetryOptions = typeof optionsOrMaxRetries === 'number'
    ? { maxRetries: optionsOrMaxRetries, baseDelay }
    : optionsOrMaxRetries || {};

  const maxRetries = options.maxRetries ?? 3;
  const delay = options.baseDelay ?? 2000;
  const endpoint = options.endpoint || 'unknown';
  const sessionId = options.sessionId;

  let lastError: Error | null = null;
  let triedSecondary = false;
  let wasRateLimited = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const client = getAnthropicClient();
    const startTime = Date.now();
    const apiKeyUsed = getCurrentApiKey();

    try {
      const result = await fn(client);

      // Extract usage from response if it's a message response
      const response = result as any;
      if (response?.usage) {
        const duration = Date.now() - startTime;
        trackUsage({
          endpoint,
          model: response.model || 'unknown',
          inputTokens: response.usage.input_tokens || 0,
          outputTokens: response.usage.output_tokens || 0,
          cacheReadTokens: response.usage.cache_read_input_tokens || 0,
          cacheCreationTokens: response.usage.cache_creation_input_tokens || 0,
          requestDurationMs: duration,
          apiKeyUsed,
          wasRateLimited,
          sessionId,
        });
      }

      return result;
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error (429)
      if (error?.status === 429) {
        wasRateLimited = true;

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
          const retryDelay = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : delay * Math.pow(2, attempt);

          console.log(`Rate limited, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
      }

      // For non-rate-limit errors, throw immediately
      throw error;
    }
  }

  throw lastError;
}

// ============================================
// Prompt Caching Support
// ============================================

// Static system prompt for analysis - this will be cached
export const ANALYSIS_SYSTEM_PROMPT = `You are an expert marketing strategist trained in Stefan Georgi's "Breakthrough Ideas" framework. Analyze content and extract marketing angles.

STEFAN GEORGI'S FRAMEWORK:

Big Idea Criteria:
1. Emotionally Compelling - Hits a deep desire or fear
2. Contains Built-In Intrigue - Creates an open loop
3. Easily Understood - Can be grasped in seconds
4. Believable (but surprising) - Novel yet credible
5. Difficult to Steal - Tied to specific mechanism

Angle Types to consider:
- Hidden Cause: A secret reason behind a problem
- Deficiency: Something missing that explains the problem
- Contamination: Something harmful causing the problem
- Timing/Method: Wrong approach or timing
- Differentiation: Why this solution is unique
- Identity: Tied to who the person is/wants to be
- Contrarian: Challenges conventional wisdom

SWEET SPOT CLASSIFICATION (Stefan's "Hidden → Emerging" Framework):

For EVERY claim AND hook, you must classify the AWARENESS LEVEL:

AWARENESS LEVELS:
- "hidden": This concept/mechanism is NOT widely known. It's only discussed in academic circles, specialist communities, or very niche content. The average consumer in the target market has NEVER heard of this. No major brands are using this angle.

- "emerging": This concept is STARTING to gain traction. It may appear in some wellness blogs, popular podcasts, or recent mainstream articles, but isn't saturated yet. A few marketers/brands might be starting to use it.

- "known": This concept is WIDELY KNOWN. Consumers are aware of it, many brands use it, it appears in mainstream media regularly. Wikipedia probably has a page on it. Examples: probiotics, intermittent fasting, collagen, etc.

MOMENTUM SCORE (1-10):
Evaluate how much evidence there is that this idea is gaining traction:
- 8-10 (Strong): Multiple recent studies (within 2 years), growing news coverage, multiple independent sources discussing it
- 5-7 (Moderate): 1-2 recent studies or findings, found in multiple niche sources
- 1-4 (Weak): Single source, older study, no corroborating evidence, not gaining traction

MOMENTUM SIGNALS:
List specific evidence points supporting momentum, e.g.:
- "Study published in [year]"
- "Discussed in multiple podcast episodes"
- "Recently covered by [News Source]"
- "No mainstream coverage found"
- "Growing interest in biohacking community"

THE "SWEET SPOT": Hidden ideas with momentum score >= 7 are "Sweet Spots" - these are primed to leap from hidden to emerging and are the most valuable.`;

// Create a message with prompt caching enabled for the system prompt
export interface CachedMessageOptions {
  model: string;
  maxTokens: number;
  systemPrompt?: string;
  userMessage: string;
  endpoint?: string;
  sessionId?: string;
}

export async function createCachedMessage(options: CachedMessageOptions): Promise<Anthropic.Message> {
  const {
    model,
    maxTokens,
    systemPrompt = ANALYSIS_SYSTEM_PROMPT,
    userMessage,
    endpoint = 'unknown',
    sessionId,
  } = options;

  return withRetry(
    (client) =>
      client.messages.create({
        model,
        max_tokens: maxTokens,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userMessage }],
      }),
    { endpoint, sessionId }
  );
}
