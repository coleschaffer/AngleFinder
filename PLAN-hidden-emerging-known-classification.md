# Plan: Hidden/Emerging/Known Classification + Momentum Evaluation

## Overview

Implement Stefan's "Sweet Spot" framework to categorize claims and evaluate which ideas are **primed to leap from Hidden → Emerging**. This helps users focus on the most valuable ideas—those with momentum and virality potential.

---

## Part 1: Defining the Categories

### Hidden Ideas
- Not yet in mainstream awareness
- Only known to specialists, researchers, or niche communities
- Little to no coverage in popular media
- Few or no existing ads/marketing using this angle
- **Signals**: Found in academic papers, obscure podcasts, specialist forums, recent studies not yet covered by mainstream press

### Emerging Ideas
- Starting to gain traction
- Some mainstream coverage beginning
- A few marketers/brands starting to use it
- Growing search volume
- **Signals**: Recent articles in Science Daily, trending on health/wellness sites, appearing in popular podcasts, some social media buzz

### Known Ideas
- Already saturated in the market
- Consumers are aware and possibly skeptical
- Many competitors using this angle
- High search volume, lots of content
- **Signals**: Wikipedia page exists, major brands advertising with this angle, appears in mainstream news regularly

---

## Part 2: Momentum Evaluation

### What is Momentum?
Evidence that an idea is starting to move from Hidden → Emerging. Stefan says: "We want to point to a handful of new studies, data points, or articles coming out in support of our Hidden Idea."

### Momentum Signals to Detect

| Signal | How to Detect | Weight |
|--------|---------------|--------|
| Recent studies (< 2 years) | Check publication dates from source | High |
| Multiple sources discussing it | Count unique sources mentioning the concept | High |
| Recent news coverage | Search news APIs for related terms | Medium |
| Growing search trends | Google Trends API (optional) | Medium |
| Social media mentions | Reddit engagement, Twitter/X mentions | Low |
| Podcast appearances | Multiple podcasts covering topic | Medium |

### Momentum Score Calculation
- **Strong Momentum (8-10)**: 3+ recent studies, news coverage starting, multiple independent sources
- **Moderate Momentum (5-7)**: 1-2 recent studies, found in multiple niche sources
- **Weak Momentum (1-4)**: Single source, old study, no corroborating evidence

---

## Part 3: Implementation Approach

### Option A: AI Classification (Recommended)

Update the `/api/analyze` prompt to have Claude classify each claim:

```
For each claim extracted, also provide:
1. awareness_level: "hidden" | "emerging" | "known"
2. awareness_reasoning: Brief explanation of why this classification
3. momentum_score: 1-10
4. momentum_signals: Array of evidence supporting momentum
   - e.g., ["Study published 2024", "Mentioned in 3 sources", "No mainstream coverage yet"]
```

**Pros**:
- Claude can reason about mainstream awareness based on its training
- Can evaluate the "freshness" and obscurity of concepts
- Single API call, no additional services needed

**Cons**:
- Classification based on Claude's knowledge cutoff
- May need to supplement with real-time data for accuracy

### Option B: Hybrid Approach (More Accurate)

1. Claude does initial classification based on the source content
2. Supplement with automated checks:
   - Google search result count for the concept
   - News API search for recent coverage
   - Optional: Google Trends data

**Pros**: More accurate, real-time data
**Cons**: More complex, additional API costs, slower

### Recommendation
Start with **Option A** (AI Classification) and iterate. Add Option B signals later if needed.

---

## Part 4: Data Model Changes

### Update Claim Interface

```typescript
export interface Claim {
  id: string;
  sourceId: string;
  claim: string;
  exactQuote: string;
  surpriseScore: number;
  mechanism: string;

  // NEW: Sweet Spot Classification
  awarenessLevel: 'hidden' | 'emerging' | 'known';
  awarenessReasoning: string;
  momentumScore: number;
  momentumSignals: string[];

  // NEW: Computed "Sweet Spot" indicator
  isSweetSpot?: boolean; // hidden + momentum >= 7
}
```

### Update Hook Interface (if classifying hooks too)

```typescript
export interface Hook {
  // ... existing fields

  // NEW: Inherited or computed from source claim
  awarenessLevel: 'hidden' | 'emerging' | 'known';
  momentumScore: number;
}
```

---

## Part 5: UI Changes

### Claims Tab Enhancements

1. **Awareness Badge** on each claim card:
   - 🟢 Hidden (green) - "Untapped"
   - 🟡 Emerging (yellow) - "Rising"
   - 🔴 Known (red) - "Saturated"

2. **Momentum Indicator**:
   - Visual meter or number showing momentum score
   - Hover/tap to see momentum signals

3. **Sweet Spot Highlight**:
   - Claims that are Hidden + High Momentum get special "Sweet Spot" badge
   - Optional: Filter to show only Sweet Spot claims

4. **Filter Options**:
   - Filter by awareness level
   - Sort by momentum score
   - "Show Sweet Spots Only" toggle

### Example Claim Card Addition

```
┌─────────────────────────────────────────────────────────┐
│ [Claim text here...]                                    │
│                                                         │
│ 🟢 HIDDEN          Momentum: ████████░░ 8/10           │
│ ⭐ SWEET SPOT                                           │
│                                                         │
│ Why Hidden: "This mechanism isn't discussed in         │
│ mainstream health media yet, only found in recent      │
│ academic research."                                     │
│                                                         │
│ Momentum Signals:                                       │
│ • Study published January 2024                          │
│ • Found in 2 independent podcast transcripts           │
│ • No major supplement brands using this angle yet      │
└─────────────────────────────────────────────────────────┘
```

---

## Part 6: Prompt Updates

### Updated Claim Extraction Prompt (Additions)

```
For each claim, also evaluate:

AWARENESS LEVEL:
- "hidden": This concept/mechanism is NOT widely known. It's only discussed in academic
  circles, specialist communities, or very niche content. The average consumer in the
  target market has never heard of this.
- "emerging": This concept is STARTING to gain traction. It may appear in some wellness
  blogs, popular podcasts, or recent mainstream articles, but isn't saturated yet.
- "known": This concept is WIDELY KNOWN. Consumers are aware of it, many brands use it,
  it appears in mainstream media regularly.

MOMENTUM SCORE (1-10):
How much evidence is there that this idea is gaining traction?
- Recent studies or data (within 2 years)
- Multiple sources discussing it independently
- Signs of growing interest or coverage

MOMENTUM SIGNALS:
List specific evidence points, e.g.:
- "Published in [Journal] in 2024"
- "Discussed in 3 different podcast episodes"
- "Recently covered by [News Source]"
- "No mainstream coverage found"
```

---

## Part 7: Implementation Order

### Phase 1: Core Classification
1. Update Claim type definition
2. Update `/api/analyze` prompt to include classification
3. Parse and store new fields in analysis results
4. Add awareness badge to ClaimCard component

### Phase 2: UI Enhancements
5. Add momentum indicator to ClaimCard
6. Add Sweet Spot badge logic
7. Add filter controls to results view
8. Add sort by momentum option

### Phase 3: Refinement
9. Test classification accuracy across different niches
10. Tune prompt if certain categories are over/under-represented
11. Consider adding real-time momentum signals (Option B)

---

## Part 8: Success Metrics

- Users can quickly identify "Sweet Spot" claims
- Classification feels accurate (user feedback)
- Hidden claims with high momentum convert to successful hooks
- Users spend less time sifting through Known/saturated ideas

---

## Open Questions

1. Should hooks also be classified, or inherit from their source claim?
2. Should we weight certain source types differently? (Academic = more likely hidden, Reddit = more likely emerging/known)
3. Should momentum signals be shown by default or hidden behind a toggle?
4. Do we want to track which Sweet Spot claims users favorite/export to validate the classification?
