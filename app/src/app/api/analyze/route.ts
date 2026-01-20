import { NextRequest, NextResponse } from 'next/server';
import { Supadata } from '@supadata/js';
import { Source, AnalysisResult, Claim, Hook, ViralityScore, BridgeDistance, AngleType, AwarenessLevel, SourceType } from '@/types';
import { logError, getCachedContent, setCachedContent } from '@/lib/db';
import { withRetry, ANALYSIS_SYSTEM_PROMPT } from '@/lib/anthropic';

// Initialize Supadata client for YouTube transcripts
const supadata = process.env.SUPADATA_API_KEY
  ? new Supadata({ apiKey: process.env.SUPADATA_API_KEY })
  : null;

// Attempt to repair and parse malformed JSON from Claude
function repairAndParseJSON(text: string): any {
  // First, try to extract JSON block
  let jsonStr = text;

  // Look for JSON code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  } else {
    // Find the outermost JSON object
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      jsonStr = text.slice(startIdx, endIdx + 1);
    }
  }

  // Try parsing as-is first
  try {
    return JSON.parse(jsonStr);
  } catch (firstError) {
    console.log('Initial JSON parse failed, attempting repair...');
  }

  // Common repairs for Claude's JSON output issues
  let repaired = jsonStr;

  // Fix trailing commas before closing brackets
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

  // Fix missing commas between array elements or object properties
  // Pattern: "value" followed by whitespace then "key" or opening bracket
  repaired = repaired.replace(/"(\s*)\n(\s*)"(?=[a-zA-Z])/g, '",\n$2"');
  repaired = repaired.replace(/}(\s*)\n(\s*){/g, '},\n$2{');
  repaired = repaired.replace(/](\s*)\n(\s*)\[/g, '],\n$2[');

  // Fix missing commas after numbers followed by quotes
  repaired = repaired.replace(/(\d)(\s*)\n(\s*)"(?=[a-zA-Z])/g, '$1,\n$3"');

  // Fix unclosed strings at end of lines (add closing quote)
  repaired = repaired.replace(/"([^"]*?)(\n\s*["},\]])/g, '"$1"$2');

  // Second attempt with repairs
  try {
    return JSON.parse(repaired);
  } catch (secondError) {
    console.log('Repaired JSON parse also failed, trying aggressive cleanup...');
  }

  // More aggressive cleanup
  // Remove any control characters except newlines and tabs
  repaired = repaired.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // Try to balance brackets
  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/]/g) || []).length;

  // Add missing closing braces/brackets
  for (let i = 0; i < openBraces - closeBraces; i++) {
    repaired += '}';
  }
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    repaired += ']';
  }

  // Final attempt
  try {
    return JSON.parse(repaired);
  } catch (finalError) {
    // Log the problematic area
    const errorMatch = (finalError as Error).message.match(/position (\d+)/);
    if (errorMatch) {
      const pos = parseInt(errorMatch[1]);
      const start = Math.max(0, pos - 100);
      const end = Math.min(repaired.length, pos + 100);
      console.error(`JSON error near position ${pos}:`);
      console.error(`Context: ...${repaired.slice(start, end)}...`);
    }
    throw new Error(`Failed to parse JSON after repairs: ${(finalError as Error).message}`);
  }
}

interface AnalyzeRequest {
  source: Source;
  niche: string;
  product: string;
  strategy: 'translocate' | 'direct';
}

// Get YouTube video transcript using Supadata API
async function getYouTubeTranscript(videoId: string): Promise<string | null> {
  if (!supadata) {
    console.log('Supadata API key not configured, skipping transcript fetch');
    return null;
  }

  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`Fetching transcript via Supadata for: ${videoId}`);

    const result = await supadata.transcript({
      url: videoUrl,
      lang: 'en',
      text: true, // Return plain text instead of structured segments
      mode: 'auto', // Try native captions first, fall back to auto-generated
    });

    // Handle job-based response for longer videos
    if ('jobId' in result) {
      console.log(`Supadata returned job ID: ${result.jobId}, polling for result...`);

      // Poll for job completion (max 30 seconds)
      const maxAttempts = 10;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

        const jobResult = await supadata.transcript.getJobStatus(result.jobId);

        if (jobResult.status === 'completed' && jobResult.result) {
          const transcriptData = jobResult.result;
          const transcript = typeof transcriptData.content === 'string'
            ? transcriptData.content
            : transcriptData.content.map((s: any) => s.text).join(' ');
          console.log(`Transcript fetched via job: ${transcript.length} chars`);
          return transcript;
        } else if (jobResult.status === 'failed') {
          console.log(`Supadata job failed for ${videoId}: ${jobResult.error?.message || 'Unknown error'}`);
          return null;
        }
        // Continue polling if still processing
      }
      console.log(`Supadata job timed out for ${videoId}`);
      return null;
    }

    // Handle direct response
    if (result.content) {
      const transcript = typeof result.content === 'string'
        ? result.content
        : Array.isArray(result.content)
          ? result.content.map((s: any) => s.text).join(' ')
          : null;

      if (transcript) {
        console.log(`Transcript fetched: ${transcript.length} chars`);
        return transcript;
      }
    }

    console.log(`No transcript content returned for ${videoId}`);
    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Supadata transcript fetch failed for ${videoId}: ${errorMessage}`);
    return null;
  }
}

// Get YouTube video metadata as fallback
async function getYouTubeMetadata(videoId: string): Promise<string | null> {
  try {
    console.log(`Fetching YouTube metadata for video: ${videoId}`);

    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!pageResponse.ok) {
      console.log(`Failed to fetch YouTube page: ${pageResponse.status}`);
      return null;
    }

    const pageHtml = await pageResponse.text();
    const contentParts: string[] = [];

    // Extract video title
    const titleMatch = pageHtml.match(/<meta name="title" content="([^"]+)"/);
    if (titleMatch) {
      contentParts.push(`Title: ${decodeHtmlEntities(titleMatch[1])}`);
    }

    // Extract channel name
    const channelMatch = pageHtml.match(/"ownerChannelName":"([^"]+)"/);
    if (channelMatch) {
      contentParts.push(`Channel: ${channelMatch[1]}`);
    }

    // Extract video description
    const descMatch = pageHtml.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
    if (descMatch) {
      const description = descMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      if (description.length > 50) {
        contentParts.push(`\nDescription:\n${description}`);
      }
    }

    // Extract view count
    const viewMatch = pageHtml.match(/"viewCount":"(\d+)"/);
    if (viewMatch) {
      contentParts.push(`\nViews: ${parseInt(viewMatch[1]).toLocaleString()}`);
    }

    if (contentParts.length === 0) {
      return null;
    }

    const content = contentParts.join('\n');
    console.log(`YouTube metadata fetched: ${content.length} chars`);
    return content;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`YouTube metadata fetch failed for ${videoId}: ${errorMessage}`);
    return null;
  }
}

// Get YouTube content - transcript first, falls back to metadata
async function getYouTubeContent(videoId: string): Promise<string | null> {
  // Try to get transcript via Supadata
  const transcript = await getYouTubeTranscript(videoId);
  if (transcript && transcript.length > 100) {
    return `Transcript:\n${transcript}`;
  }

  // Fall back to metadata if transcript not available
  console.log(`No transcript available for ${videoId}, using metadata fallback`);
  return await getYouTubeMetadata(videoId);
}

// Decode HTML entities in text
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Get Reddit post content and top comments
async function getRedditContent(url: string): Promise<string | null> {
  try {
    // Append .json to get JSON data
    const jsonUrl = url.endsWith('/') ? `${url}.json` : `${url}/.json`;

    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'AngleFinder/1.0',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();

    // Get post content
    const post = data[0]?.data?.children?.[0]?.data;
    let content = `Title: ${post?.title || ''}\n\n`;
    content += `Post: ${post?.selftext || ''}\n\n`;

    // Get top 20 comments
    const comments = data[1]?.data?.children || [];
    content += 'Top Comments:\n';

    let commentCount = 0;
    for (const comment of comments) {
      if (commentCount >= 20) break;
      if (comment.data?.body) {
        content += `- ${comment.data.body}\n\n`;
        commentCount++;
      }
    }

    return content;
  } catch (error) {
    console.error('Reddit content error:', error);
    return null;
  }
}

// Get PubMed article abstract
async function getPubMedAbstract(pmid: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=text`
    );

    if (!response.ok) return null;

    return await response.text();
  } catch (error) {
    console.error('PubMed fetch error:', error);
    return null;
  }
}

// Get ScienceDaily article content
async function getScienceDailyContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AngleFinder/1.0' },
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Extract article content
    const titleMatch = html.match(/<h1[^>]*id="headline"[^>]*>([\s\S]*?)<\/h1>/i);
    const contentMatch = html.match(/<div[^>]*id="story_text"[^>]*>([\s\S]*?)<\/div>/i);

    let content = '';
    if (titleMatch) {
      content += `Title: ${titleMatch[1].replace(/<[^>]+>/g, '').trim()}\n\n`;
    }
    if (contentMatch) {
      content += contentMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return content || null;
  } catch (error) {
    console.error('ScienceDaily fetch error:', error);
    return null;
  }
}

// Get content from academic sources (uses stored abstract/snippet)
function getAcademicContent(source: Source): string | null {
  const parts: string[] = [];

  if (source.title) {
    parts.push(`Title: ${source.title}`);
  }
  if (source.author) {
    parts.push(`Author: ${source.author}`);
  }
  if (source.abstract) {
    parts.push(`\nAbstract:\n${source.abstract}`);
  } else if (source.snippet) {
    parts.push(`\nSummary:\n${source.snippet}`);
  }
  if (source.publishDate) {
    parts.push(`\nPublished: ${source.publishDate}`);
  }

  return parts.length > 0 ? parts.join('\n') : null;
}

// Main analysis function using Claude with prompt caching
async function analyzeContent(
  content: string,
  source: Source,
  niche: string,
  product: string,
  strategy: string
): Promise<{ claims: Claim[]; hooks: Hook[] }> {
  // Determine source type priors for awareness classification
  const sourceTypePrior = {
    arxiv: 'hidden',
    preprint: 'hidden',
    scholar: 'hidden',
    research: 'hidden',
    podcast: 'emerging',
    sciencedaily: 'emerging',
    youtube: source.views && source.views > 1000000 ? 'known' : source.views && source.views > 100000 ? 'emerging' : 'hidden',
    reddit: source.engagement && source.engagement > 10000 ? 'emerging' : 'hidden',
  }[source.type] || 'emerging';

  // Dynamic user message (changes per request)
  const userMessage = `CONTENT SOURCE: ${source.title}
SOURCE TYPE: ${source.type}
SOURCE URL: ${source.url}
${source.views ? `VIEWS/ENGAGEMENT: ${source.views}` : ''}
${source.publishDate ? `PUBLISH DATE: ${source.publishDate}` : ''}
SOURCE TYPE PRIOR: This source type (${source.type}) has a baseline prior of "${sourceTypePrior}".

NICHE: ${niche}
PRODUCT DESCRIPTION: ${product}
STRATEGY: ${strategy === 'translocate' ? 'Find UNEXPECTED connections from this unrelated content' : 'Find DIRECT applications to this niche'}

CONTENT TO ANALYZE:
${content.slice(0, 15000)}

---

EXTRACT 3-5 SURPRISING CLAIMS and 3-5 MARKETING HOOKS.

For each CLAIM, provide:
1. The claim itself (one compelling sentence)
2. Exact quote from the content (verbatim)
3. Surprise score (1-10, how unexpected/counterintuitive)
4. Mechanism (explain WHY it works - the underlying process)
5. Awareness level ("hidden", "emerging", or "known")
6. Awareness reasoning (brief explanation of why this classification)
7. Momentum score (1-10)
8. Momentum signals (array of evidence points)

For each HOOK, provide:
1. Hook headline (specific, intriguing headline for an ad)
2. Source claim (the surprising claim from content)
3. The bridge (the "aha!" connection between the source and the product)
4. Bridge distance: "Aggressive" (wild leap), "Moderate" (interesting but believable), or "Conservative" (clear logical through-line)
5. Angle types (one or more: Hidden Cause, Deficiency, Contamination, Timing/Method, Differentiation, Identity, Contrarian)
6. Big idea summary (one paragraph explaining the core concept)
7. Virality scores (each 1-10):
   - Easy to understand (intuitive, visual, metaphor-friendly)
   - Emotional (shocking, scary, or exciting enough to share)
   - Curiosity inducing (creates an open loop)
   - Contrarian/Paradigm shifting (challenges beliefs)
   - Provable (can be backed up with data, studies, demonstrations)
8. Sample ad opener (3-4 sentences ready to use)
9. Awareness level ("hidden", "emerging", or "known") - classify the HOOK's angle independently, not just the underlying claim
10. Awareness reasoning (brief explanation of why this classification for the hook specifically)
11. Momentum score (1-10) - for the hook's angle
12. Momentum signals (array of evidence points)

${strategy === 'translocate' ? 'Make sure to create UNEXPECTED, CREATIVE bridges between this seemingly unrelated content and the product. Think laterally! Translocated hooks often have "hidden" awareness even if the source claim is known, because the APPLICATION is novel.' : 'Focus on scientifically-backed, credible connections that can be directly applied.'}

Include a MIX of bridge distances (some Aggressive, some Moderate, some Conservative).
AIM FOR AT LEAST 1-2 "HIDDEN" CLAIMS/HOOKS with strong momentum (Sweet Spots).

Return your response as valid JSON with this exact structure:
{
  "claims": [
    {
      "claim": "string",
      "exactQuote": "string",
      "surpriseScore": number,
      "mechanism": "string",
      "awarenessLevel": "hidden" | "emerging" | "known",
      "awarenessReasoning": "string",
      "momentumScore": number,
      "momentumSignals": ["string"]
    }
  ],
  "hooks": [
    {
      "headline": "string",
      "sourceClaim": "string",
      "bridge": "string",
      "bridgeDistance": "Aggressive" | "Moderate" | "Conservative",
      "angleTypes": ["string"],
      "bigIdeaSummary": "string",
      "viralityScore": {
        "easyToUnderstand": number,
        "emotional": number,
        "curiosityInducing": number,
        "contrarian": number,
        "provable": number,
        "total": number
      },
      "sampleAdOpener": "string",
      "awarenessLevel": "hidden" | "emerging" | "known",
      "awarenessReasoning": "string",
      "momentumScore": number,
      "momentumSignals": ["string"]
    }
  ]
}`;

  // Use prompt caching: system prompt is cached, user message is dynamic
  const response = await withRetry(
    (client) =>
      client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: [
          {
            type: 'text',
            text: ANALYSIS_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userMessage }],
      }),
    { endpoint: '/api/analyze' }
  );

  const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse JSON from response with repair logic
  if (!responseText.includes('{')) {
    throw new Error('No JSON object found in response');
  }

  const parsed = repairAndParseJSON(responseText);

  // Validate the parsed structure
  if (!parsed.claims || !Array.isArray(parsed.claims)) {
    parsed.claims = [];
    console.warn('No valid claims array found, using empty array');
  }
  if (!parsed.hooks || !Array.isArray(parsed.hooks)) {
    parsed.hooks = [];
    console.warn('No valid hooks array found, using empty array');
  }

  // Generate unique IDs for claims and hooks with robust validation
  const claims: Claim[] = parsed.claims
    .filter((claim: any) => claim && typeof claim === 'object' && claim.claim)
    .map((claim: any, i: number) => {
      const awarenessLevel = (['hidden', 'emerging', 'known'].includes(claim.awarenessLevel)
        ? claim.awarenessLevel
        : 'emerging') as AwarenessLevel;
      const momentumScore = typeof claim.momentumScore === 'number'
        ? Math.min(10, Math.max(1, claim.momentumScore))
        : 5;
      const isSweetSpot = awarenessLevel === 'hidden' && momentumScore >= 7;

      return {
        id: `${source.id}-claim-${i}-${Date.now()}`,
        sourceId: source.id,
        claim: String(claim.claim || ''),
        exactQuote: String(claim.exactQuote || ''),
        surpriseScore: typeof claim.surpriseScore === 'number' ? claim.surpriseScore : 5,
        mechanism: String(claim.mechanism || ''),
        awarenessLevel,
        awarenessReasoning: String(claim.awarenessReasoning || ''),
        momentumScore,
        momentumSignals: Array.isArray(claim.momentumSignals) ? claim.momentumSignals : [],
        isSweetSpot,
      };
    });

  const hooks: Hook[] = parsed.hooks
    .filter((hook: any) => hook && typeof hook === 'object' && hook.headline)
    .map((hook: any, i: number) => {
      const awarenessLevel = (['hidden', 'emerging', 'known'].includes(hook.awarenessLevel)
        ? hook.awarenessLevel
        : 'emerging') as AwarenessLevel;
      const momentumScore = typeof hook.momentumScore === 'number'
        ? Math.min(10, Math.max(1, hook.momentumScore))
        : 5;
      const isSweetSpot = awarenessLevel === 'hidden' && momentumScore >= 7;

      // Safely extract virality scores with defaults
      const vs = hook.viralityScore || {};
      const easyToUnderstand = typeof vs.easyToUnderstand === 'number' ? vs.easyToUnderstand : 5;
      const emotional = typeof vs.emotional === 'number' ? vs.emotional : 5;
      const curiosityInducing = typeof vs.curiosityInducing === 'number' ? vs.curiosityInducing : 5;
      const contrarian = typeof vs.contrarian === 'number' ? vs.contrarian : 5;
      const provable = typeof vs.provable === 'number' ? vs.provable : 5;

      return {
        id: `${source.id}-hook-${i}-${Date.now()}`,
        sourceId: source.id,
        headline: String(hook.headline || ''),
        sourceClaim: String(hook.sourceClaim || ''),
        bridge: String(hook.bridge || ''),
        bridgeDistance: (['Aggressive', 'Moderate', 'Conservative'].includes(hook.bridgeDistance)
          ? hook.bridgeDistance
          : 'Moderate') as BridgeDistance,
        angleTypes: (Array.isArray(hook.angleTypes) ? hook.angleTypes : ['Contrarian']) as AngleType[],
        bigIdeaSummary: String(hook.bigIdeaSummary || ''),
        viralityScore: {
          easyToUnderstand,
          emotional,
          curiosityInducing,
          contrarian,
          provable,
          total: easyToUnderstand + emotional + curiosityInducing + contrarian + provable,
        },
        sampleAdOpener: String(hook.sampleAdOpener || ''),
        awarenessLevel,
        awarenessReasoning: String(hook.awarenessReasoning || ''),
        momentumScore,
        momentumSignals: Array.isArray(hook.momentumSignals) ? hook.momentumSignals : [],
        isSweetSpot,
      };
    });

  return { claims, hooks };
}

export async function POST(request: NextRequest) {
  let body: AnalyzeRequest | null = null;
  try {
    body = await request.json();
    const { source, niche, product, strategy } = body!;

    console.log(`Analyzing source: ${source.id} (${source.type})`);

    // Check cache first
    let content: string | null = null;
    let cacheHit = false;
    const cachedResult = await getCachedContent(source.url);

    if (cachedResult) {
      content = cachedResult.content;
      cacheHit = true;
      console.log(`[CACHE HIT] ${source.id}: Using cached content (${content.length} chars, hit #${cachedResult.hitCount})`);
    } else {
      console.log(`[CACHE MISS] ${source.id}: Fetching fresh content`);

      // Track fetch start time for cache stats
      const fetchStartTime = Date.now();

      // Get content based on source type
      if (source.type === 'youtube' || source.type === 'podcast') {
        const videoId = source.url.match(/(?:v=|\/)([\w-]{11})/)?.[1];
        if (videoId) {
          content = await getYouTubeContent(videoId);
        }
      } else if (source.type === 'reddit') {
        content = await getRedditContent(source.url);
      } else if (source.type === 'research' || source.type === 'scholar' || source.type === 'arxiv' || source.type === 'preprint') {
        // Academic sources - use stored abstract/snippet first
        content = getAcademicContent(source);

        // Fallback: fetch PubMed abstract if not stored
        if ((!content || content.length < 100) && source.type === 'research') {
          const pmid = source.url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/)?.[1] ||
                       source.url.match(/\/(\d+)\/?$/)?.[1];
          if (pmid) {
            content = await getPubMedAbstract(pmid);
          }
        }
      } else if (source.type === 'sciencedaily') {
        content = await getScienceDailyContent(source.url);
      }

      const fetchDurationMs = Date.now() - fetchStartTime;

      // Cache the content if we got valid content
      if (content && content.length >= 100) {
        console.log(`[CACHE STORE] ${source.id}: Caching content (${content.length} chars, fetched in ${fetchDurationMs}ms)`);
        await setCachedContent(source.url, source.type as SourceType, content, fetchDurationMs);
      }
    }

    // If we couldn't get content, use Claude to analyze based on title/metadata
    // (Don't cache metadata fallbacks as they're not real content)
    if (!content || content.length < 100) {
      console.log(`No content found for ${source.id}, using title/metadata fallback`);
      content = `Title: ${source.title}\nSource: ${source.url}\nType: ${source.type}`;

      // Ask Claude to use its knowledge to analyze
      const metaPrompt = `The following is a ${source.type} source that I need to analyze for marketing angles:
Title: "${source.title}"
URL: ${source.url}
${source.author ? `Author/Channel: ${source.author}` : ''}

Based on this title and your knowledge of this topic, provide an analysis as if you had access to the full content.`;

      content = metaPrompt;
    } else if (!cacheHit) {
      console.log(`Content found for ${source.id}: ${content.length} chars`);
    }

    // Run the analysis
    const { claims, hooks } = await analyzeContent(content, source, niche, product, strategy);

    const result: AnalysisResult = {
      sourceId: source.id,
      sourceName: source.title,
      sourceType: source.type,
      sourceUrl: source.url,
      claims,
      hooks,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Analyze API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error?.status || 500;

    // Log error to database
    await logError({
      endpoint: '/api/analyze',
      errorType: error?.status === 429 ? 'rate_limit' : 'analysis_error',
      message: errorMessage,
      statusCode,
      requestData: { sourceId: body?.source?.id, sourceType: body?.source?.type },
    });

    return NextResponse.json(
      { error: `Failed to analyze source: ${errorMessage}` },
      { status: 500 }
    );
  }
}
