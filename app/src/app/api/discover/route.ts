import { NextRequest, NextResponse } from 'next/server';
import { Source, SourceType, SEARCH_MODIFIERS } from '@/types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logError } from '@/lib/db';
import { withRetry } from '@/lib/anthropic';

const execAsync = promisify(exec);

interface DiscoverRequest {
  niche: string;
  product: string;
  strategy: 'translocate' | 'direct';
  categories: string[];
  sourceTypes: SourceType[];
  page: number;
  useModifiers?: boolean; // When true, searches with Stefan's modifiers
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

// Reddit API search - optionally within specific subreddits
async function searchReddit(query: string, subreddits?: string[]): Promise<Source[]> {
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

    // Build search URL - if subreddits provided, search within them
    let searchUrl: string;
    if (subreddits && subreddits.length > 0) {
      const subredditPath = subreddits.slice(0, 10).join('+'); // Max 10 subreddits
      searchUrl = `https://oauth.reddit.com/r/${subredditPath}/search.json?q=${encodeURIComponent(query)}&restrict_sr=true&sort=relevance&limit=15`;
      console.log(`Searching Reddit in subreddits: ${subredditPath}`);
    } else {
      searchUrl = `https://oauth.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=10`;
    }

    const searchResponse = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'AngleFinder/1.0',
      },
    });

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

          // Also fetch abstracts for these articles
          await new Promise(resolve => setTimeout(resolve, 350));
          const abstractResponse = await fetch(
            `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&rettype=abstract&retmode=text&${toolParams}`
          );
          const abstractsText = abstractResponse.ok ? await abstractResponse.text() : '';
          // Parse abstracts - they're separated by double newlines
          const abstractsMap = new Map<string, string>();
          const abstractBlocks = abstractsText.split(/\n\n(?=\d+\. )/);
          for (const block of abstractBlocks) {
            const pmidMatch = block.match(/PMID: (\d+)/);
            if (pmidMatch) {
              const abstractMatch = block.match(/Abstract\n([\s\S]*?)(?=\n\n|PMID:|$)/i);
              if (abstractMatch) {
                abstractsMap.set(pmidMatch[1], abstractMatch[1].trim());
              }
            }
          }

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
                abstract: abstractsMap.get(id) || '',
                snippet: (abstractsMap.get(id) || '').slice(0, 200),
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

      // Match both new format (YYMM.NNNNN) and old format (archive/YYMMNNN like hep-th/9901001)
      const idMatch = entryXml.match(/<id>http:\/\/arxiv\.org\/abs\/([^\s<]+?)(v\d+)?<\/id>/);
      const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/);
      const authorMatch = entryXml.match(/<author>[\s\S]*?<name>(.*?)<\/name>/);
      const publishedMatch = entryXml.match(/<published>(.*?)<\/published>/);

      const arxivId = idMatch?.[1]?.trim() || '';

      // Skip entries without valid arXiv ID
      if (!arxivId) continue;
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
        // Add 8 second timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(
          `https://api.${server}.org/details/${server}/30d/0/json`,
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

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
  let body: DiscoverRequest | null = null;
  try {
    body = await request.json();
    const { niche, product, strategy, categories, sourceTypes, page, useModifiers = false } = body!;

    // If Reddit is selected, get targeted subreddits from Claude
    let targetSubreddits: string[] = [];
    if (sourceTypes.includes('reddit')) {
      const subredditPrompt = `Suggest 8-12 relevant subreddits for finding interesting discussions and insights about:

Niche: ${niche}
Product: ${product}
Topics: ${categories.join(', ')}
Strategy: ${strategy === 'translocate' ? 'Looking for unexpected connections from unrelated fields' : 'Looking for direct, evidence-based content'}

Return ONLY a JSON array of subreddit names (without r/ prefix), like: ["nutrition", "science", "askscience"]

Focus on:
- Active communities with quality discussions
- Mix of niche-specific and broader science/research subreddits
- ${strategy === 'translocate' ? 'Include subreddits from tangentially related or surprising fields' : 'Focus on subreddits directly about this topic'}
- Avoid meme/low-quality subreddits`;

      try {
        const subredditResponse = await withRetry((client) =>
          client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 256,
            messages: [{ role: 'user', content: subredditPrompt }],
          })
        );

        const subredditText = subredditResponse.content[0].type === 'text' ? subredditResponse.content[0].text : '';
        const subredditMatch = subredditText.match(/\[[\s\S]*?\]/);
        if (subredditMatch) {
          targetSubreddits = JSON.parse(subredditMatch[0]);
          console.log('Target subreddits:', targetSubreddits);
        }
      } catch (e) {
        console.error('Failed to get subreddits:', e);
        // Will fall back to site-wide search
      }
    }

    // Use Claude to generate optimal search queries
    // Ensure at least one query per source type, plus extras for variety
    const queriesPerType = useModifiers ? 1 : 2; // Fewer base queries when using modifiers (modifiers multiply them)
    const totalQueries = sourceTypes.length * queriesPerType;

    // When using modifiers, we'll apply Stefan's methodology modifiers to the queries
    const modifiersToUse = useModifiers ? SEARCH_MODIFIERS : [];
    const modifierContext = useModifiers
      ? `\n\nIMPORTANT: These queries will have Stefan Georgi's search modifiers (like "Surprising", "Breakthrough", "New Research") applied to them. Generate base queries that work well with these modifiers to uncover hidden angles.`
      : '';

    const queryPrompt = `Generate exactly ${totalQueries} specific search queries to find content about these topics.

Categories to explore: ${categories.join(', ')}
Niche context: ${niche}
Product: ${product}
Strategy: ${strategy === 'translocate' ? 'Find content from UNRELATED fields that could provide unique, unexpected marketing angles' : 'Find content directly related to this niche with scientific backing'}${modifierContext}

IMPORTANT: You MUST generate exactly ${queriesPerType} queries for EACH of these source types: ${sourceTypes.join(', ')}

Return ONLY a valid JSON array with this exact format (no other text):
[{"query": "specific search terms", "sourceType": "youtube"}]

Guidelines for each source type:
- youtube: conversational terms, expert names, "explained", "how to"
- podcast: interview topics, expert discussions, long-form content terms
- reddit: community language, question formats, discussion topics
- research: scientific terminology, study types, medical terms
- sciencedaily: science news angles, discovery terms, breakthrough language
- scholar: academic terminology, paper titles, formal research terms
- arxiv: technical/mathematical terms, preprint topics, CS/physics/math terms
- preprint: biomedical research terms, clinical study language

Strategy guidance: ${strategy === 'translocate' ? 'Focus on unexpected connections from unrelated fields that could provide surprising marketing angles' : 'Focus on cutting-edge research and expert insights directly about this topic'}`;

    const queryResponse = await withRetry((client) =>
      client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: queryPrompt }],
      })
    );

    let searchQueries: { query: string; sourceType: SourceType; modifier?: string }[] = [];
    const queryText = queryResponse.content[0].type === 'text' ? queryResponse.content[0].text : '';

    try {
      const jsonMatch = queryText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const baseQueries = JSON.parse(jsonMatch[0]) as { query: string; sourceType: SourceType }[];

        if (useModifiers) {
          // Apply each modifier to each base query - this creates modifier-enhanced queries
          // Cycle through modifiers to get variety
          for (const baseQuery of baseQueries) {
            for (const modifier of modifiersToUse) {
              searchQueries.push({
                query: `${modifier} ${baseQuery.query}`,
                sourceType: baseQuery.sourceType,
                modifier: modifier,
              });
            }
          }
        } else {
          searchQueries = baseQueries;
        }
      }
    } catch (e) {
      console.error('Failed to parse Claude response:', e);
      // Fallback: generate queries per source type to ensure coverage
      const baseQueries = sourceTypes.flatMap(type =>
        categories.slice(0, queriesPerType).map(cat => ({
          query: `${cat} ${niche} ${strategy === 'translocate' ? 'insights' : 'research'}`,
          sourceType: type,
        }))
      );

      if (useModifiers) {
        for (const baseQuery of baseQueries) {
          for (const modifier of modifiersToUse) {
            searchQueries.push({
              query: `${modifier} ${baseQuery.query}`,
              sourceType: baseQuery.sourceType,
              modifier: modifier,
            });
          }
        }
      } else {
        searchQueries = baseQueries;
      }
    }

    console.log(`Generated ${searchQueries.length} search queries${useModifiers ? ' with modifiers' : ''}:`, searchQueries.slice(0, 5));

    // Execute searches in parallel, tracking which modifier was used
    const searchPromises: Promise<{ sources: Source[]; modifier?: string }>[] = [];

    for (const sq of searchQueries) {
      const wrapWithModifier = async (searchFn: () => Promise<Source[]>): Promise<{ sources: Source[]; modifier?: string }> => {
        const sources = await searchFn();
        return { sources, modifier: sq.modifier };
      };

      if (sq.sourceType === 'youtube' && sourceTypes.includes('youtube')) {
        searchPromises.push(wrapWithModifier(() => searchYouTube(sq.query, false)));
      }
      if (sq.sourceType === 'podcast' && sourceTypes.includes('podcast')) {
        searchPromises.push(wrapWithModifier(() => searchYouTube(sq.query, true)));
      }
      if (sq.sourceType === 'reddit' && sourceTypes.includes('reddit')) {
        searchPromises.push(wrapWithModifier(() => searchReddit(sq.query, targetSubreddits)));
      }
      if (sq.sourceType === 'research' && sourceTypes.includes('research')) {
        searchPromises.push(wrapWithModifier(() => searchResearch(sq.query)));
      }
      if (sq.sourceType === 'sciencedaily' && sourceTypes.includes('sciencedaily')) {
        searchPromises.push(wrapWithModifier(() => searchScienceDaily(sq.query)));
      }
      if (sq.sourceType === 'scholar' && sourceTypes.includes('scholar')) {
        searchPromises.push(wrapWithModifier(() => searchGoogleScholar(sq.query)));
      }
      if (sq.sourceType === 'arxiv' && sourceTypes.includes('arxiv')) {
        searchPromises.push(wrapWithModifier(() => searchArxiv(sq.query)));
      }
      if (sq.sourceType === 'preprint' && sourceTypes.includes('preprint')) {
        searchPromises.push(wrapWithModifier(() => searchPreprints(sq.query)));
      }
    }

    const results = await Promise.all(searchPromises);

    // Flatten results and tag with modifier info
    let allSources: Source[] = [];
    for (const result of results) {
      for (const source of result.sources) {
        allSources.push({
          ...source,
          modified: useModifiers && !!result.modifier,
          modifierUsed: result.modifier,
        });
      }
    }

    console.log(`Found ${allSources.length} total sources`);

    // Remove duplicates by URL
    const seen = new Set<string>();
    allSources = allSources.filter(source => {
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    });

    // Log what we got from each source type for debugging
    const rawTypeCounts: Record<string, number> = {};
    for (const source of allSources) {
      rawTypeCounts[source.type] = (rawTypeCounts[source.type] || 0) + 1;
    }
    console.log('Raw results by source type:', rawTypeCounts);
    console.log('Selected source types:', sourceTypes);

    // Check which selected types returned no results
    const missingTypes = sourceTypes.filter(type => !rawTypeCounts[type]);
    if (missingTypes.length > 0) {
      console.warn('No results from source types:', missingTypes);
    }

    // Group sources by type and score within each group
    const sourcesByType: Record<string, Source[]> = {};
    for (const source of allSources) {
      if (!sourcesByType[source.type]) {
        sourcesByType[source.type] = [];
      }
      sourcesByType[source.type].push(source);
    }

    // Score sources within each type (for ordering within the type)
    const scoreSource = (source: Source): number => {
      let score = 0;
      if (source.views) {
        score += Math.min(Math.log10(source.views + 1) * 2, 10);
      }
      if (source.engagement) {
        score += Math.min(Math.log10(source.engagement + 1) * 1.5, 5);
      }
      if (source.abstract || source.snippet) {
        score += 2;
      }
      return score;
    };

    // Sort each type's sources by score
    for (const type of Object.keys(sourcesByType)) {
      sourcesByType[type].sort((a, b) => scoreSource(b) - scoreSource(a));
    }

    // Interleave sources round-robin style for diversity
    // This ensures each source type gets fair representation
    const interleavedSources: Source[] = [];
    const typeQueues = Object.entries(sourcesByType).map(([type, sources]) => ({
      type,
      sources: [...sources],
      index: 0,
    }));

    // Keep going until we've taken all sources
    let hasMore = true;
    while (hasMore) {
      hasMore = false;
      for (const queue of typeQueues) {
        if (queue.index < queue.sources.length) {
          interleavedSources.push(queue.sources[queue.index]);
          queue.index++;
          hasMore = true;
        }
      }
    }

    // Log diversity stats
    const finalTypeCounts: Record<string, number> = {};
    for (const source of interleavedSources.slice(0, 20)) {
      finalTypeCounts[source.type] = (finalTypeCounts[source.type] || 0) + 1;
    }
    console.log('Source type distribution in first 20:', finalTypeCounts);

    // Paginate - 20 per page
    const startIndex = (page - 1) * 20;
    const paginatedSources = interleavedSources.slice(startIndex, startIndex + 20);

    return NextResponse.json({ sources: paginatedSources });
  } catch (error: any) {
    console.error('Discover API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error?.status || 500;

    // Log error to database
    await logError({
      endpoint: '/api/discover',
      errorType: error?.status === 429 ? 'rate_limit' : 'discover_error',
      message: errorMessage,
      statusCode,
      requestData: { niche: body?.niche, sourceTypes: body?.sourceTypes, useModifiers: body?.useModifiers },
    });

    return NextResponse.json(
      { error: 'Failed to discover sources' },
      { status: 500 }
    );
  }
}
