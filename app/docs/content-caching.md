# Content Caching System

This document describes the Content Caching system used in the Angle Finder application to optimize performance and reduce redundant content fetching.

## Overview

Content Caching stores the raw fetched content (transcripts, articles, abstracts, etc.) from sources so that subsequent analyses of the same source don't need to re-fetch the content. This is particularly valuable for:

- **YouTube/Podcast transcripts** - Fetching via Supadata API can take 5-30 seconds
- **Reddit posts** - API calls have rate limits
- **Research papers** - Multiple users may analyze the same popular papers
- **News articles** - Fetching and parsing HTML takes time

**Important**: This system only caches the *raw content*, not Claude's analysis. Each user still gets a personalized analysis based on their niche, product, and strategy settings.

## Architecture

### Database Table

The `source_content_cache` table in PostgreSQL stores cached content:

```sql
CREATE TABLE source_content_cache (
  id UUID PRIMARY KEY,
  source_url TEXT NOT NULL UNIQUE,
  source_type VARCHAR(50) NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  content_length INTEGER NOT NULL DEFAULT 0,
  fetch_duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL
)
```

### Cache TTLs by Source Type

Different source types have different cache lifetimes based on how frequently their content changes:

| Source Type | TTL (Days) | Rationale |
|-------------|------------|-----------|
| YouTube | 30 | Video transcripts rarely change after upload |
| Podcast | 30 | Podcast transcripts are static |
| Research | 90 | Academic papers are stable once published |
| Scholar | 90 | Google Scholar results are stable |
| arXiv | 90 | Preprints are stable once posted |
| Preprint | 90 | bioRxiv/medRxiv content is stable |
| ScienceDaily | 14 | News articles may get minor updates |
| Reddit | 7 | Posts can receive new comments |

## How It Works

### Cache Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    /api/analyze endpoint                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Check cache for │
                    │   source URL    │
                    └─────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
     ┌─────────────────┐             ┌─────────────────┐
     │   CACHE HIT     │             │   CACHE MISS    │
     │                 │             │                 │
     │ Return cached   │             │ Fetch content   │
     │ content         │             │ from source     │
     │                 │             │                 │
     │ Update hit_count│             │ Store in cache  │
     │ & last_accessed │             │                 │
     └─────────────────┘             └─────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Send content to │
                    │ Claude for      │
                    │ analysis        │
                    └─────────────────┘
```

### Code Example

From `/api/analyze/route.ts`:

```typescript
// Check cache first
const cachedResult = await getCachedContent(source.url);

if (cachedResult) {
  content = cachedResult.content;
  console.log(`[CACHE HIT] Using cached content`);
} else {
  console.log(`[CACHE MISS] Fetching fresh content`);

  // Fetch content based on source type
  const fetchStartTime = Date.now();
  content = await fetchContentForSourceType(source);
  const fetchDurationMs = Date.now() - fetchStartTime;

  // Store in cache for future requests
  if (content && content.length >= 100) {
    await setCachedContent(source.url, source.type, content, fetchDurationMs);
  }
}
```

## API Endpoints

### GET /api/cache

Returns cache statistics for the admin dashboard.

**Response:**
```json
{
  "totalEntries": 150,
  "totalSizeBytes": 5242880,
  "totalHits": 423,
  "bySourceType": {
    "youtube": { "count": 80, "sizeBytes": 3145728, "hits": 250 },
    "reddit": { "count": 45, "sizeBytes": 1048576, "hits": 120 },
    "research": { "count": 25, "sizeBytes": 1048576, "hits": 53 }
  },
  "avgFetchDurationMs": 8500,
  "oldestEntry": "2025-01-01T00:00:00Z",
  "newestEntry": "2025-01-19T12:00:00Z",
  "expiredCount": 5
}
```

### POST /api/cache

Cleans up expired cache entries.

**Response:**
```json
{
  "cleared": 5
}
```

### DELETE /api/cache

Clears all cached content. Use with caution - all sources will need to be re-fetched.

**Response:**
```json
{
  "success": true
}
```

## Admin Dashboard

The Cache tab in the admin dashboard (`/admin`) provides:

1. **Overview Stats**
   - Total cached sources
   - Total storage size
   - Total cache hits
   - Average fetch duration saved

2. **Breakdown by Source Type**
   - Count per type
   - Size per type
   - Hits per type

3. **Cache Timeline**
   - Oldest cached entry
   - Newest cached entry

4. **Management Actions**
   - Cleanup expired entries
   - Clear all cache

## Performance Benefits

### Time Savings

| Source Type | Typical Fetch Time | With Cache |
|-------------|-------------------|------------|
| YouTube transcript | 5-30 seconds | ~50ms |
| Reddit post + comments | 1-3 seconds | ~50ms |
| PubMed abstract | 1-2 seconds | ~50ms |
| ScienceDaily article | 2-4 seconds | ~50ms |

### Cost Savings

While content caching doesn't directly reduce Claude API costs (the analysis still happens), it:
- Reduces Supadata API calls for YouTube transcripts
- Reduces load on external APIs (Reddit, PubMed, etc.)
- Improves user experience with faster response times

## Monitoring

### Console Logs

The analyze endpoint logs cache activity:

```
[CACHE HIT] youtube-abc123: Using cached content (45230 chars, hit #5)
[CACHE MISS] reddit-xyz789: Fetching fresh content
[CACHE STORE] reddit-xyz789: Caching content (12500 chars, fetched in 2340ms)
```

### Database Queries

Check cache status directly:

```sql
-- Total cache size
SELECT COUNT(*), SUM(content_length) as total_bytes
FROM source_content_cache
WHERE expires_at > NOW();

-- Most accessed content
SELECT source_url, source_type, hit_count, content_length
FROM source_content_cache
ORDER BY hit_count DESC
LIMIT 10;

-- Cache by source type
SELECT source_type, COUNT(*), SUM(content_length), SUM(hit_count)
FROM source_content_cache
WHERE expires_at > NOW()
GROUP BY source_type;
```

## Maintenance

### Automatic Expiration

Cached entries automatically expire based on their TTL. Expired entries are:
- Excluded from cache lookups (via `expires_at > NOW()` check)
- Cleaned up via the "Cleanup Expired" button or POST /api/cache

### Manual Cleanup

From the admin dashboard:
1. Go to `/admin`
2. Click the "Cache" tab
3. Use "Cleanup Expired" to remove stale entries
4. Use "Clear All Cache" for a full reset (use sparingly)

### Storage Considerations

- Average transcript size: 10-50 KB
- 1000 cached sources ≈ 10-50 MB
- Railway PostgreSQL can easily handle this load
- Monitor via admin dashboard if storage becomes a concern

## Future Improvements

Potential enhancements:
- LRU eviction for very old, low-hit entries
- Compression for large transcripts
- Background refresh for popular sources nearing expiration
- Cache warming for trending/popular sources
