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

// Research search - combines PubMed, NIH ODS, and PMC
async function searchResearch(query: string): Promise<Source[]> {
  const results: Source[] = [];
  const ncbiApiKey = process.env.NCBI_API_KEY;
  const apiKeyParam = ncbiApiKey ? `&api_key=${ncbiApiKey}` : '';

  try {
    // NCBI recommends identifying your tool
    const toolParams = `tool=AngleFinder&email=contact@anglefinder.app${apiKeyParam}`;

    // Search PubMed for article IDs
    const searchResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=8&retmode=json&sort=relevance&${toolParams}`
    );
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const ids = searchData.esearchresult?.idlist || [];

      if (ids.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 350));

        const summaryResponse = await fetch(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&${toolParams}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `id=${ids.join(',')}`,
          }
        );

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          for (const id of ids) {
            const article = summaryData.result?.[id];
            if (article) {
              results.push({
                id: `research-pubmed-${id}`,
                type: 'research' as SourceType,
                title: article.title || 'Untitled',
                url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
                author: article.authors?.[0]?.name || 'Unknown',
                publishDate: article.pubdate,
              });
            }
          }
        }
      }
    }

    // Also search PMC (PubMed Central) for open access articles
    await new Promise(resolve => setTimeout(resolve, 350));
    const pmcResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(query)}&retmax=5&retmode=json&sort=relevance&${toolParams}`
    );
    if (pmcResponse.ok) {
      const pmcData = await pmcResponse.json();
      const pmcIds = pmcData.esearchresult?.idlist || [];

      if (pmcIds.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 350));
        const pmcSummaryResponse = await fetch(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pmc&retmode=json&${toolParams}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `id=${pmcIds.join(',')}`,
          }
        );

        if (pmcSummaryResponse.ok) {
          const pmcSummaryData = await pmcSummaryResponse.json();
          for (const id of pmcIds) {
            const article = pmcSummaryData.result?.[id];
            if (article) {
              results.push({
                id: `research-pmc-${id}`,
                type: 'research' as SourceType,
                title: article.title || 'Untitled',
                url: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${id}/`,
                author: article.authors?.[0]?.name || 'Unknown',
                publishDate: article.pubdate,
              });
            }
          }
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Research search error:', error);
    return results;
  }
}

// ScienceDaily search via RSS feed
async function searchScienceDaily(query: string): Promise<Source[]> {
  try {
    // Fetch the RSS feed
    const response = await fetch('https://www.sciencedaily.com/rss/all.xml', {
      headers: { 'User-Agent': 'AngleFinder/1.0' },
    });

    if (!response.ok) return [];

    const xml = await response.text();

    // Parse RSS items
    const items: Source[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
      const itemXml = match[1];

      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                         itemXml.match(/<title>(.*?)<\/title>/);
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
      const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ||
                        itemXml.match(/<description>(.*?)<\/description>/);
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);

      const title = titleMatch?.[1] || '';
      const description = descMatch?.[1] || '';
      const combined = (title + ' ' + description).toLowerCase();

      // Filter by query terms
      const matchCount = queryTerms.filter(term => combined.includes(term)).length;
      if (matchCount >= Math.min(2, queryTerms.length)) {
        items.push({
          id: `sciencedaily-${Date.now()}-${items.length}`,
          type: 'sciencedaily' as SourceType,
          title: title.replace(/<[^>]+>/g, ''),
          url: linkMatch?.[1] || '',
          snippet: description.replace(/<[^>]+>/g, '').slice(0, 200),
          publishDate: pubDateMatch?.[1],
          author: 'ScienceDaily',
        });
      }
    }

    return items;
  } catch (error) {
    console.error('ScienceDaily search error:', error);
    return [];
  }
}

// Google Scholar search via SerpApi
async function searchGoogleScholar(query: string): Promise<Source[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    console.warn('SerpApi API key not configured');
    return [];
  }

  try {
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_scholar&q=${encodeURIComponent(query)}&num=10&api_key=${apiKey}`
    );

    if (!response.ok) {
      console.error('Google Scholar search failed:', response.status);
      return [];
    }

    const data = await response.json();
    const results = data.organic_results || [];

    return results.map((result: any, index: number) => ({
      id: `scholar-${result.result_id || index}`,
      type: 'scholar' as SourceType,
      title: result.title || 'Untitled',
      url: result.link || '',
      author: result.publication_info?.summary?.split(' - ')?.[0] || 'Unknown',
      snippet: result.snippet || '',
      publishDate: result.publication_info?.summary?.match(/\d{4}/)?.[0],
    }));
  } catch (error) {
    console.error('Google Scholar search error:', error);
    return [];
  }
}

// arXiv search via Atom API
async function searchArxiv(query: string): Promise<Source[]> {
  try {
    const response = await fetch(
      `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=10`
    );

    if (!response.ok) return [];

    const xml = await response.text();
    const entries: Source[] = [];

    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1];

      const idMatch = entryXml.match(/<id>http:\/\/arxiv\.org\/abs\/([\d.]+)(v\d+)?<\/id>/);
      const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/);
      const authorMatch = entryXml.match(/<author>[\s\S]*?<name>(.*?)<\/name>/);
      const publishedMatch = entryXml.match(/<published>(.*?)<\/published>/);

      const arxivId = idMatch?.[1] || '';
      const title = titleMatch?.[1]?.replace(/\s+/g, ' ').trim() || 'Untitled';
      const abstract = summaryMatch?.[1]?.replace(/\s+/g, ' ').trim() || '';

      entries.push({
        id: `arxiv-${arxivId}`,
        type: 'arxiv' as SourceType,
        title,
        url: `https://arxiv.org/abs/${arxivId}`,
        author: authorMatch?.[1] || 'Unknown',
        publishDate: publishedMatch?.[1]?.slice(0, 10),
        abstract,
        snippet: abstract.slice(0, 200),
      });
    }

    return entries;
  } catch (error) {
    console.error('arXiv search error:', error);
    return [];
  }
}

// Preprints search (bioRxiv and medRxiv)
async function searchPreprints(query: string): Promise<Source[]> {
  const results: Source[] = [];
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

  try {
    // Fetch recent preprints from both servers (last 30 days)
    const servers = ['biorxiv', 'medrxiv'];

    for (const server of servers) {
      try {
        const response = await fetch(
          `https://api.${server}.org/details/${server}/30d/0/json`
        );

        if (!response.ok) continue;

        const data = await response.json();
        const collection = data.collection || [];

        // Filter by query terms
        for (const item of collection) {
          if (results.length >= 10) break;

          const title = (item.title || '').toLowerCase();
          const abstract = (item.abstract || '').toLowerCase();
          const combined = title + ' ' + abstract;

          const matchCount = queryTerms.filter(term => combined.includes(term)).length;
          if (matchCount >= Math.min(2, queryTerms.length)) {
            results.push({
              id: `preprint-${server}-${item.doi?.replace(/\//g, '-') || Date.now()}`,
              type: 'preprint' as SourceType,
              title: item.title || 'Untitled',
              url: `https://www.${server}.org/content/${item.doi}`,
              author: item.authors?.split(';')?.[0] || 'Unknown',
              publishDate: item.date,
              abstract: item.abstract,
              snippet: (item.abstract || '').slice(0, 200),
            });
          }
        }
      } catch (serverError) {
        console.error(`${server} search error:`, serverError);
      }
    }

    return results;
  } catch (error) {
    console.error('Preprints search error:', error);
    return results;
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
- For Research/PubMed: use scientific/medical terminology
- For ScienceDaily: use science news-style terms
- For Google Scholar: use academic terminology
- For arXiv: use technical/scientific terminology
- For Preprints: use biomedical research terms
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
      if (sq.sourceType === 'research' && sourceTypes.includes('research')) {
        searchPromises.push(searchResearch(sq.query));
      }
      if (sq.sourceType === 'sciencedaily' && sourceTypes.includes('sciencedaily')) {
        searchPromises.push(searchScienceDaily(sq.query));
      }
      if (sq.sourceType === 'scholar' && sourceTypes.includes('scholar')) {
        searchPromises.push(searchGoogleScholar(sq.query));
      }
      if (sq.sourceType === 'arxiv' && sourceTypes.includes('arxiv')) {
        searchPromises.push(searchArxiv(sq.query));
      }
      if (sq.sourceType === 'preprint' && sourceTypes.includes('preprint')) {
        searchPromises.push(searchPreprints(sq.query));
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
