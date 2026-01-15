import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Source, SourceType, SortBy } from '@/types';

const anthropic = new Anthropic();

interface DiscoverRequest {
  niche: string;
  product: string;
  strategy: 'translocate' | 'direct';
  categories: string[];
  sourceTypes: SourceType[];
  sortBy: SortBy;
  page: number;
}

// YouTube Data API search
async function searchYouTube(query: string, isPodcast: boolean = false): Promise<Source[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('YouTube API key not configured');
    return [];
  }

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: isPodcast ? `${query} podcast interview episode` : query,
      type: 'video',
      maxResults: '10',
      order: 'viewCount',
      key: apiKey,
      videoDuration: isPodcast ? 'long' : 'medium', // long = >20min for podcasts
    });

    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    if (!response.ok) throw new Error('YouTube search failed');

    const data = await response.json();

    // Get video statistics for view counts
    const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
    const statsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${apiKey}`
    );
    const statsData = await statsResponse.json();
    const statsMap = new Map<string, { views: number; duration: string }>(
      statsData.items?.map((item: any) => [
        item.id,
        {
          views: parseInt(item.statistics?.viewCount || '0'),
          duration: item.contentDetails?.duration || '',
        },
      ]) || []
    );

    return data.items.map((item: any) => {
      const stats = statsMap.get(item.id.videoId) ?? { views: 0, duration: '' };
      return {
        id: `youtube-${item.id.videoId}`,
        type: isPodcast ? 'podcast' as SourceType : 'youtube' as SourceType,
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        views: stats.views,
        author: item.snippet.channelTitle,
        publishDate: item.snippet.publishedAt,
        duration: formatDuration(stats.duration),
      };
    });
  } catch (error) {
    console.error('YouTube search error:', error);
    return [];
  }
}

// Format ISO 8601 duration to human readable
function formatDuration(isoDuration: string): string {
  if (!isoDuration) return '';
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Reddit API search
async function searchReddit(query: string, strategy: string): Promise<Source[]> {
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

    // Search posts
    const searchResponse = await fetch(
      `https://oauth.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=top&limit=10`,
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

// PubMed search
async function searchPubMed(query: string): Promise<Source[]> {
  try {
    // Search for article IDs
    const searchResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=10&retmode=json`
    );
    if (!searchResponse.ok) throw new Error('PubMed search failed');
    const searchData = await searchResponse.json();
    const ids = searchData.esearchresult?.idlist || [];

    if (ids.length === 0) return [];

    // Get article summaries
    const summaryResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`
    );
    if (!summaryResponse.ok) throw new Error('PubMed summary failed');
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
    }).filter(Boolean);
  } catch (error) {
    console.error('PubMed search error:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: DiscoverRequest = await request.json();
    const { niche, product, strategy, categories, sourceTypes, sortBy, page } = body;

    // Use Claude to generate optimal search queries
    const queryPrompt = `Generate ${sourceTypes.length * 2} specific search queries to find content about these topics:

Categories: ${categories.join(', ')}
Niche context: ${niche}
Product: ${product}
Strategy: ${strategy === 'translocate' ? 'Find content from UNRELATED fields that could provide unique marketing angles' : 'Find content directly related to this niche'}

Return ONLY a JSON array of search query objects with format:
[{"query": "search query text", "sourceType": "youtube|podcast|reddit|pubmed"}]

Make queries specific, interesting, and likely to surface surprising/counterintuitive content. For translocate strategy, focus on finding connections from unrelated fields. For direct strategy, focus on cutting-edge research and expert insights.`;

    const queryResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: queryPrompt }],
    });

    let searchQueries: { query: string; sourceType: SourceType }[] = [];
    const queryText = queryResponse.content[0].type === 'text' ? queryResponse.content[0].text : '';

    try {
      const jsonMatch = queryText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        searchQueries = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback queries if parsing fails
      searchQueries = categories.flatMap(cat =>
        sourceTypes.map(type => ({
          query: `${cat} ${niche} ${strategy === 'translocate' ? 'insights' : 'research'}`,
          sourceType: type,
        }))
      ).slice(0, 6);
    }

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
        searchPromises.push(searchReddit(sq.query, strategy));
      }
      if (sq.sourceType === 'pubmed' && sourceTypes.includes('pubmed')) {
        searchPromises.push(searchPubMed(sq.query));
      }
    }

    const results = await Promise.all(searchPromises);
    let allSources = results.flat();

    // Remove duplicates by URL
    const seen = new Set<string>();
    allSources = allSources.filter(source => {
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    });

    // Sort by views or engagement
    allSources.sort((a, b) => {
      if (sortBy === 'engagement') {
        return (b.engagement || b.views || 0) - (a.engagement || a.views || 0);
      }
      return (b.views || 0) - (a.views || 0);
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
