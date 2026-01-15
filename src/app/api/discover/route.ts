import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Source, SourceType } from '@/types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const anthropic = new Anthropic();

interface DiscoverRequest {
  niche: string;
  product: string;
  strategy: 'translocate' | 'direct';
  categories: string[];
  sourceTypes: SourceType[];
  page: number;
}

// Format duration from seconds to MM:SS or HH:MM:SS
function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// YouTube search using yt-dlp (no API key needed)
async function searchYouTube(query: string, isPodcast: boolean = false): Promise<Source[]> {
  try {
    const searchQuery = isPodcast
      ? `${query} podcast interview episode`
      : query;

    // Use yt-dlp to search YouTube
    const searchCount = 15;
    const escapedQuery = searchQuery.replace(/"/g, '\\"');
    const { stdout } = await execAsync(
      `yt-dlp "ytsearch${searchCount}:${escapedQuery}" --flat-playlist -J`,
      { timeout: 30000 }
    );

    const data = JSON.parse(stdout);
    const entries = data.entries || [];

    const videos: Source[] = [];

    for (const entry of entries) {
      const videoId = entry.id;
      const title = entry.title || 'Untitled';
      const author = entry.channel || entry.uploader || 'Unknown';
      const views = entry.view_count || 0;
      const durationSecs = entry.duration || 0;
      const duration = formatDuration(durationSecs);

      // For podcasts, filter for longer videos (over 20 minutes)
      if (isPodcast) {
        const totalMinutes = durationSecs / 60;
        if (totalMinutes < 20) continue;
      }

      videos.push({
        id: `${isPodcast ? 'podcast' : 'youtube'}-${videoId}`,
        type: isPodcast ? 'podcast' : 'youtube',
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        views,
        author,
        duration,
      });

      if (videos.length >= 10) break;
    }

    return videos;
  } catch (error) {
    console.error('YouTube search error:', error);
    return [];
  }
}

// Reddit API search
async function searchReddit(query: string): Promise<Source[]> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn('Reddit API credentials not configured');
    return [];
  }

  try {
    // Get OAuth token
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) throw new Error('Reddit auth failed');
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Search posts - sort by relevance
    const searchResponse = await fetch(
      `https://oauth.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'AngleFinder/1.0',
        },
      }
    );

    if (!searchResponse.ok) throw new Error('Reddit search failed');
    const searchData = await searchResponse.json();

    return searchData.data.children.map((post: any) => ({
      id: `reddit-${post.data.id}`,
      type: 'reddit' as SourceType,
      title: post.data.title,
      url: `https://www.reddit.com${post.data.permalink}`,
      views: post.data.score,
      engagement: post.data.num_comments,
      subreddit: post.data.subreddit,
      author: post.data.author,
    }));
  } catch (error) {
    console.error('Reddit search error:', error);
    return [];
  }
}

// PubMed search (no API key required, but need to identify ourselves)
async function searchPubMed(query: string): Promise<Source[]> {
  try {
    // NCBI recommends identifying your tool
    const toolParams = 'tool=AngleFinder&email=contact@anglefinder.app';

    // Search for article IDs
    const searchResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=10&retmode=json&sort=relevance&${toolParams}`
    );
    if (!searchResponse.ok) {
      console.error('PubMed search status:', searchResponse.status, searchResponse.statusText);
      return [];
    }
    const searchData = await searchResponse.json();
    const ids = searchData.esearchresult?.idlist || [];

    if (ids.length === 0) return [];

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 350));

    // Get article summaries - use POST for reliability
    const summaryResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&${toolParams}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `id=${ids.join(',')}`,
      }
    );

    if (!summaryResponse.ok) {
      console.error('PubMed summary status:', summaryResponse.status, summaryResponse.statusText);
      // Return basic results without full metadata if summary fails
      return ids.map((id: string) => ({
        id: `pubmed-${id}`,
        type: 'pubmed' as SourceType,
        title: `PubMed Article ${id}`,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        author: 'Unknown',
      }));
    }

    const summaryData = await summaryResponse.json();

    return ids.map((id: string) => {
      const article = summaryData.result?.[id];
      if (!article) return null;
      return {
        id: `pubmed-${id}`,
        type: 'pubmed' as SourceType,
        title: article.title || 'Untitled',
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        author: article.authors?.[0]?.name || 'Unknown',
        publishDate: article.pubdate,
      };
    }).filter(Boolean) as Source[];
  } catch (error) {
    console.error('PubMed search error:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: DiscoverRequest = await request.json();
    const { niche, product, strategy, categories, sourceTypes, page } = body;

    // Use Claude to generate optimal search queries
    const queryPrompt = `Generate ${Math.max(sourceTypes.length * 2, 4)} specific search queries to find content about these topics.

Categories to explore: ${categories.join(', ')}
Niche context: ${niche}
Product: ${product}
Strategy: ${strategy === 'translocate' ? 'Find content from UNRELATED fields that could provide unique, unexpected marketing angles' : 'Find content directly related to this niche with scientific backing'}

For each query, specify which source type it's best suited for based on what the user selected: ${sourceTypes.join(', ')}

Return ONLY a valid JSON array with this exact format (no other text):
[{"query": "specific search terms", "sourceType": "${sourceTypes[0]}"}]

Guidelines:
- Make queries specific and likely to surface surprising, counterintuitive content
- For YouTube/podcasts: use terms that would find expert discussions, interviews, or educational content
- For Reddit: include relevant subreddit-style terms or community language
- For PubMed: use scientific/medical terminology
- ${strategy === 'translocate' ? 'Focus on unexpected connections from unrelated fields' : 'Focus on cutting-edge research and expert insights'}`;

    const queryResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: queryPrompt }],
    });

    let searchQueries: { query: string; sourceType: SourceType }[] = [];
    const queryText = queryResponse.content[0].type === 'text' ? queryResponse.content[0].text : '';

    try {
      const jsonMatch = queryText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        searchQueries = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse Claude response:', e);
      // Fallback queries if parsing fails
      searchQueries = categories.flatMap(cat =>
        sourceTypes.map(type => ({
          query: `${cat} ${niche} ${strategy === 'translocate' ? 'insights surprising' : 'research science'}`,
          sourceType: type,
        }))
      ).slice(0, 6);
    }

    console.log('Generated search queries:', searchQueries);

    // Execute searches in parallel
    const searchPromises: Promise<Source[]>[] = [];

    for (const sq of searchQueries) {
      if (sq.sourceType === 'youtube' && sourceTypes.includes('youtube')) {
        searchPromises.push(searchYouTube(sq.query, false));
      }
      if (sq.sourceType === 'podcast' && sourceTypes.includes('podcast')) {
        searchPromises.push(searchYouTube(sq.query, true));
      }
      if (sq.sourceType === 'reddit' && sourceTypes.includes('reddit')) {
        searchPromises.push(searchReddit(sq.query));
      }
      if (sq.sourceType === 'pubmed' && sourceTypes.includes('pubmed')) {
        searchPromises.push(searchPubMed(sq.query));
      }
    }

    const results = await Promise.all(searchPromises);
    let allSources = results.flat();

    console.log(`Found ${allSources.length} total sources`);

    // Remove duplicates by URL
    const seen = new Set<string>();
    allSources = allSources.filter(source => {
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    });

    // Paginate - 20 per page
    const startIndex = (page - 1) * 20;
    const paginatedSources = allSources.slice(startIndex, startIndex + 20);

    return NextResponse.json({ sources: paginatedSources });
  } catch (error) {
    console.error('Discover API error:', error);
    return NextResponse.json(
      { error: 'Failed to discover sources' },
      { status: 500 }
    );
  }
}
