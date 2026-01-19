import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Hook, BridgeDistance, AngleType } from '@/types';

const anthropic = new Anthropic();

interface VariationRequest {
  hook: Hook;
  feedback: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VariationRequest = await request.json();
    const { hook, feedback } = body;

    const prompt = `You are an expert marketing strategist. Generate a VARIATION of the following hook based on the user's feedback.

ORIGINAL HOOK:
- Headline: ${hook.headline}
- Source Claim: ${hook.sourceClaim}
- Bridge: ${hook.bridge}
- Bridge Distance: ${hook.bridgeDistance}
- Angle Types: ${hook.angleTypes.join(', ')}
- Big Idea Summary: ${hook.bigIdeaSummary}
- Sample Ad Opener: ${hook.sampleAdOpener}

USER FEEDBACK FOR VARIATION:
${feedback}

Generate a NEW variation of this hook that incorporates the user's feedback while maintaining the core insight. Make meaningful changes - don't just slightly rephrase.

Return your response as valid JSON with this exact structure:
{
  "headline": "string",
  "sourceClaim": "string",
  "bridge": "string",
  "bridgeDistance": "Aggressive" | "Moderate" | "Conservative",
  "angleTypes": ["string"],
  "bigIdeaSummary": "string",
  "viralityScore": {
    "easyToUnderstand": number (1-10),
    "emotional": number (1-10),
    "curiosityInducing": number (1-10),
    "contrarian": number (1-10),
    "provable": number (1-10),
    "total": number (sum of above)
  },
  "sampleAdOpener": "string (3-4 sentences)"
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

    // Inherit awareness from parent hook
    const awarenessLevel = hook.awarenessLevel || 'emerging';
    const momentumScore = hook.momentumScore || 5;
    const isSweetSpot = awarenessLevel === 'hidden' && momentumScore >= 7;

    const newHook: Hook = {
      id: `${hook.id}-variation-${Date.now()}`,
      sourceId: hook.sourceId,
      headline: parsed.headline,
      sourceClaim: parsed.sourceClaim,
      bridge: parsed.bridge,
      bridgeDistance: parsed.bridgeDistance as BridgeDistance,
      angleTypes: parsed.angleTypes as AngleType[],
      bigIdeaSummary: parsed.bigIdeaSummary,
      viralityScore: {
        easyToUnderstand: parsed.viralityScore.easyToUnderstand,
        emotional: parsed.viralityScore.emotional,
        curiosityInducing: parsed.viralityScore.curiosityInducing,
        contrarian: parsed.viralityScore.contrarian,
        provable: parsed.viralityScore.provable,
        total: parsed.viralityScore.easyToUnderstand +
               parsed.viralityScore.emotional +
               parsed.viralityScore.curiosityInducing +
               parsed.viralityScore.contrarian +
               parsed.viralityScore.provable,
      },
      sampleAdOpener: parsed.sampleAdOpener,
      // Sweet Spot Classification - inherited from parent hook
      awarenessLevel,
      awarenessReasoning: hook.awarenessReasoning || 'Inherited from parent hook',
      momentumScore,
      momentumSignals: hook.momentumSignals || [],
      isSweetSpot,
    };

    return NextResponse.json({ hook: newHook });
  } catch (error) {
    console.error('Variation API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate variation' },
      { status: 500 }
    );
  }
}
