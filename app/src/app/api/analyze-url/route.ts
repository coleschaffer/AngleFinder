import { NextResponse } from 'next/server';
import { Niche } from '@/types';
import { NICHES } from '@/data/niches';
import { withRetry } from '@/lib/anthropic';

interface AnalyzeURLRequest {
  url: string;
}

interface AnalyzeURLResponse {
  productName: string;
  detectedNiche: Niche;
  customNiche: string;
  productDescription: string;
}

// Extract text content from HTML
function extractTextFromHTML(html: string): {
  title: string;
  metaDescription: string;
  ogDescription: string;
  bodyText: string;
} {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch?.[1]?.trim() || '';

  // Extract meta description
  const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)
    || html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
  const metaDescription = metaDescMatch?.[1]?.trim() || '';

  // Extract OG description
  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i)
    || html.match(/<meta\s+content=["']([^"']*)["']\s+property=["']og:description["']/i);
  const ogDescription = ogDescMatch?.[1]?.trim() || '';

  // Remove scripts and styles
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');

  // Extract body text
  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch?.[1] || cleaned;

  // Remove HTML tags and clean whitespace
  const bodyText = bodyContent
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000); // Limit body text

  return { title, metaDescription, ogDescription, bodyText };
}

export async function POST(request: Request) {
  try {
    const body: AnalyzeURLRequest = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let validUrl: URL;
    try {
      validUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Fetch the page content
    const response = await fetch(validUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch page: ${response.status}` },
        { status: 400 }
      );
    }

    const html = await response.text();
    const extracted = extractTextFromHTML(html);

    // Build the niche list for Claude
    const nicheList = NICHES.filter(n => n.id !== 'other')
      .map(n => `- ${n.id}: ${n.name}`)
      .join('\n');

    // Use Claude to analyze the content
    const analysisPrompt = `You are an expert at analyzing product pages and categorizing products for marketing purposes.

AVAILABLE NICHES:
${nicheList}

EXTRACTED PAGE CONTENT:
Title: ${extracted.title}
Meta Description: ${extracted.metaDescription || extracted.ogDescription || 'N/A'}
Page Content: ${extracted.bodyText.slice(0, 4000)}

TASK:
1. Identify the product name from the page
2. Determine the best matching niche from the list above
3. If no niche is a good match, use "other" and provide a custom niche description
4. Write a concise 2-3 sentence product description suitable for marketing research (describe what the product is, who it's for, and key benefits)

Return ONLY valid JSON in this exact format:
{
  "productName": "Name of the product",
  "detectedNiche": "niche-id-from-list-or-other",
  "customNiche": "Only fill this if detectedNiche is 'other', otherwise empty string",
  "productDescription": "2-3 sentence description of the product for marketing purposes"
}`;

    const message = await withRetry(
      (client) =>
        client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 512,
          messages: [{ role: 'user', content: analysisPrompt }],
        }),
      { endpoint: '/api/analyze-url' }
    );

    // Parse Claude's response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Claude response');
    }

    const result: AnalyzeURLResponse = JSON.parse(jsonMatch[0]);

    // Validate the niche is valid
    const validNiches = NICHES.map(n => n.id);
    if (!validNiches.includes(result.detectedNiche)) {
      result.detectedNiche = 'other';
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error analyzing URL:', error);
    return NextResponse.json(
      { error: 'Failed to analyze URL' },
      { status: 500 }
    );
  }
}
