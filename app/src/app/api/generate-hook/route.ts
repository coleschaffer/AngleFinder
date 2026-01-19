import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Claim, SourceType, Hook, BridgeDistance, AngleType } from '@/types';

const anthropic = new Anthropic();

interface GenerateHookRequest {
  claim: Claim;
  sourceName: string;
  sourceType: SourceType;
  sourceUrl: string;
  niche: string;
  product: string;
  strategy: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateHookRequest = await request.json();
    const { claim, sourceName, sourceType, sourceUrl, niche, product, strategy } = body;

    const prompt = `You are an expert marketing strategist. Generate a marketing hook based on the following claim.

CLAIM: ${claim.claim}

EXACT QUOTE: "${claim.exactQuote}"

MECHANISM: ${claim.mechanism}

SOURCE: ${sourceName} (${sourceType})

NICHE: ${niche}
PRODUCT: ${product}
STRATEGY: ${strategy === 'translocate' ? 'Create UNEXPECTED, CREATIVE connections' : 'Focus on DIRECT, credible applications'}

Generate ONE compelling marketing hook with:
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

Return your response as valid JSON with this exact structure:
{
  "hook": {
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
      "provable": number
    },
    "sampleAdOpener": "string"
  }
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const hookData = parsed.hook;

    // Inherit awareness from claim or use generated values
    const awarenessLevel = hookData.awarenessLevel || claim.awarenessLevel || 'emerging';
    const momentumScore = hookData.momentumScore || claim.momentumScore || 5;
    const isSweetSpot = awarenessLevel === 'hidden' && momentumScore >= 7;

    const hook: Hook = {
      id: `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceId: claim.sourceId,
      headline: hookData.headline,
      sourceClaim: hookData.sourceClaim,
      bridge: hookData.bridge,
      bridgeDistance: hookData.bridgeDistance as BridgeDistance,
      angleTypes: hookData.angleTypes as AngleType[],
      bigIdeaSummary: hookData.bigIdeaSummary,
      viralityScore: {
        easyToUnderstand: hookData.viralityScore.easyToUnderstand,
        emotional: hookData.viralityScore.emotional,
        curiosityInducing: hookData.viralityScore.curiosityInducing,
        contrarian: hookData.viralityScore.contrarian,
        provable: hookData.viralityScore.provable,
        total: hookData.viralityScore.easyToUnderstand +
               hookData.viralityScore.emotional +
               hookData.viralityScore.curiosityInducing +
               hookData.viralityScore.contrarian +
               hookData.viralityScore.provable,
      },
      sampleAdOpener: hookData.sampleAdOpener,
      isGenerated: true,
      fromClaimId: claim.id,
      // Sweet Spot Classification - inherited from claim
      awarenessLevel,
      awarenessReasoning: hookData.awarenessReasoning || claim.awarenessReasoning || 'Inherited from source claim',
      momentumScore,
      momentumSignals: hookData.momentumSignals || claim.momentumSignals || [],
      isSweetSpot,
    };

    return NextResponse.json({ hook });
  } catch (error) {
    console.error('Generate hook error:', error);
    return NextResponse.json(
      { error: 'Failed to generate hook' },
      { status: 500 }
    );
  }
}
