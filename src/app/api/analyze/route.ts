import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Source, AnalysisResult, Claim, Hook, ViralityScore, BridgeDistance, AngleType } from '@/types';

const anthropic = new Anthropic();

interface AnalyzeRequest {
  source: Source;
  niche: string;
  product: string;
  strategy: 'translocate' | 'direct';
}

// Get YouTube transcript using YouTube's captions API
async function getYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    // Try to get captions through a transcript service or API
    // For now, we'll use a simplified approach - in production you'd use yt-dlp or similar

    // Attempt to fetch from YouTube's timedtext API (may not always work)
    const response = await fetch(
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`
    );

    if (response.ok) {
      const xml = await response.text();
      // Parse XML to extract text
      const textMatches = xml.match(/<text[^>]*>([^<]+)<\/text>/g);
      if (textMatches) {
        return textMatches
          .map(match => {
            const text = match.replace(/<[^>]+>/g, '');
            return decodeHTMLEntities(text);
          })
          .join(' ');
      }
    }

    return null;
  } catch (error) {
    console.error('Transcript error:', error);
    return null;
  }
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
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

// Main analysis function using Claude
async function analyzeContent(
  content: string,
  source: Source,
  niche: string,
  product: string,
  strategy: string
): Promise<{ claims: Claim[]; hooks: Hook[] }> {
  const analysisPrompt = `You are an expert marketing strategist trained in Stefan Georgi's "Breakthrough Ideas" framework. Analyze the following content and extract marketing angles.

CONTENT SOURCE: ${source.title}
SOURCE TYPE: ${source.type}
SOURCE URL: ${source.url}

NICHE: ${niche}
PRODUCT DESCRIPTION: ${product}
STRATEGY: ${strategy === 'translocate' ? 'Find UNEXPECTED connections from this unrelated content' : 'Find DIRECT applications to this niche'}

CONTENT TO ANALYZE:
${content.slice(0, 15000)}

---

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

---

EXTRACT 3-5 SURPRISING CLAIMS and 3-5 MARKETING HOOKS.

For each CLAIM, provide:
1. The claim itself (one compelling sentence)
2. Exact quote from the content (verbatim)
3. Surprise score (1-10, how unexpected/counterintuitive)
4. Mechanism (explain WHY it works - the underlying process)

For each HOOK, provide:
1. Hook headline (specific, intriguing headline for an ad)
2. Source claim (the surprising claim from content)
3. The bridge (the "aha!" connection between the source and the product)
4. Bridge distance: "Aggressive" (wild leap), "Moderate" (interesting but believable), or "Conservative" (clear logical through-line)
5. Angle types (one or more: Hidden Cause, Deficiency, Contamination, Timing/Method, Differentiation, Identity, Contrarian)
6. Big idea summary (one paragraph explaining the core concept)
7. Virality scores (each 1-10):
   - Easy to understand
   - Emotional
   - Curiosity inducing
   - Contrarian/Paradigm shifting
   - Provable
8. Sample ad opener (3-4 sentences ready to use)

${strategy === 'translocate' ? 'Make sure to create UNEXPECTED, CREATIVE bridges between this seemingly unrelated content and the product. Think laterally!' : 'Focus on scientifically-backed, credible connections that can be directly applied.'}

Include a MIX of bridge distances (some Aggressive, some Moderate, some Conservative).

Return your response as valid JSON with this exact structure:
{
  "claims": [
    {
      "claim": "string",
      "exactQuote": "string",
      "surpriseScore": number,
      "mechanism": "string"
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
      "sampleAdOpener": "string"
    }
  ]
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514', // Using Sonnet for cost efficiency, can switch to Opus
    max_tokens: 4096,
    messages: [{ role: 'user', content: analysisPrompt }],
  });

  const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON in response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Generate unique IDs for claims and hooks
  const claims: Claim[] = parsed.claims.map((claim: any, i: number) => ({
    id: `${source.id}-claim-${i}-${Date.now()}`,
    sourceId: source.id,
    claim: claim.claim,
    exactQuote: claim.exactQuote,
    surpriseScore: claim.surpriseScore,
    mechanism: claim.mechanism,
  }));

  const hooks: Hook[] = parsed.hooks.map((hook: any, i: number) => ({
    id: `${source.id}-hook-${i}-${Date.now()}`,
    sourceId: source.id,
    headline: hook.headline,
    sourceClaim: hook.sourceClaim,
    bridge: hook.bridge,
    bridgeDistance: hook.bridgeDistance as BridgeDistance,
    angleTypes: hook.angleTypes as AngleType[],
    bigIdeaSummary: hook.bigIdeaSummary,
    viralityScore: {
      easyToUnderstand: hook.viralityScore.easyToUnderstand,
      emotional: hook.viralityScore.emotional,
      curiosityInducing: hook.viralityScore.curiosityInducing,
      contrarian: hook.viralityScore.contrarian,
      provable: hook.viralityScore.provable,
      total: hook.viralityScore.easyToUnderstand +
             hook.viralityScore.emotional +
             hook.viralityScore.curiosityInducing +
             hook.viralityScore.contrarian +
             hook.viralityScore.provable,
    },
    sampleAdOpener: hook.sampleAdOpener,
  }));

  return { claims, hooks };
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { source, niche, product, strategy } = body;

    // Get content based on source type
    let content: string | null = null;

    if (source.type === 'youtube' || source.type === 'podcast') {
      const videoId = source.url.match(/(?:v=|\/)([\w-]{11})/)?.[1];
      if (videoId) {
        content = await getYouTubeTranscript(videoId);
      }
    } else if (source.type === 'reddit') {
      content = await getRedditContent(source.url);
    } else if (source.type === 'pubmed') {
      const pmid = source.url.match(/\/(\d+)\/?$/)?.[1];
      if (pmid) {
        content = await getPubMedAbstract(pmid);
      }
    }

    // If we couldn't get content, use Claude to analyze based on title/metadata
    if (!content || content.length < 100) {
      content = `Title: ${source.title}\nSource: ${source.url}\nType: ${source.type}`;

      // Ask Claude to use its knowledge to analyze
      const metaPrompt = `The following is a ${source.type} source that I need to analyze for marketing angles:
Title: "${source.title}"
URL: ${source.url}
${source.author ? `Author/Channel: ${source.author}` : ''}

Based on this title and your knowledge of this topic, provide an analysis as if you had access to the full content.`;

      content = metaPrompt;
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
  } catch (error) {
    console.error('Analyze API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze source' },
      { status: 500 }
    );
  }
}
