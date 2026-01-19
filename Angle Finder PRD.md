# Angle Finder PRD

I want to build a tool for a process for coming up with new angles/hooks/ideas for DTC ads. I am building this for Stefan Georgi ([https://www.stefanpaulgeorgi.com/](https://www.stefanpaulgeorgi.com/), [https://www.youtube.com/@StefanGeorgi1](https://www.youtube.com/@StefanGeorgi1), [https://x.com/StefanGeorgi](https://x.com/StefanGeorgi)) and his mastermind, CA Pro ([copyaccelerator.com](http://copyaccelerator.com)).

We want to reference his "breakthrough ideas" training, as well as his idea of "translocation" of ideas \- the idea that you can find a marketing idea or angle or hook from one ad, or find an interesting idea in a seemingly very unrelated niche, and then apply it to your product or niche.

This tool should essentially automate the generation of unique angles/hooks/big ideas using agentic capabilities and research.

---

## Technical Specifications

### Tech Stack
- **Framework**: Next.js Full-Stack (React frontend with API routes)
- **Deployment**: Vercel
- **AI Backend**: Claude API with Opus 4.5
- **Authentication**: None required (no auth, sessions stored locally)

### API Integrations
- **YouTube**: YouTube Data API for search, yt-dlp for transcript extraction
- **Transcription**: YouTube captions first, OpenAI Whisper API as fallback
- **Reddit**: Server-side API calls (credentials stored securely in Vercel env vars)
- **PubMed**: NCBI E-utilities API

### Security
- All API credentials stored server-side in environment variables
- Reddit API calls proxied through Next.js API routes (never exposed client-side)

---

## User Flow

### Step 1: Select Niche

User will have a dropdown menu for Selecting Their Niche:

-  Health & Supplements
-   Skincare & Beauty
-   Fitness & Performance
-   Biz Opp & Make Money
-   Coaching & Self-Help
-   Spirituality & Astrology
-   Pet Products
-   Home & Lifestyle
-   Medical Devices
-   Finance & Insurance
- Other
  - If other is selected, textarea for them to input their niche

### Step 2: Describe Product

They will also have a textarea to describe their specific product, e.g. "I sell a testosterone boosting supplement for men 35+. Main ingredients are Tongkat Ali and Fadogia. Target audience cares about energy, libido, and maintaining muscle as they age." \< please have a variation of placeholder text for whatever Niche the user selects.

### Step 3: Choose Sourcing Strategy

After they input that, they will choose their sourcing strategy for the analysis:

Here are the two types of strategies we want to support, with this example for the Health & Supplements Niche:

1) Translocate
   1) Purpose: Find marketing angles from completely UNRELATED fields to discover unique, unexpected connections your competitors will never find.
   2) Example for "Health & Supplements" niche:
      1) Quantum Physics & Reality
      2) Ancient Wisdom & Philosophy
      3) Mathematics & Patterns
      4) Economics & Markets
      5) Psychology & Behavior
      6) Spirituality & Consciousness
      7) Chaos Theory & Complexity
      8) Peak Performance
      9) AI & Technology
   3) Use case: You're selling a testosterone supplement. Instead of analyzing other health or testosterone-related podcasts (what everyone does), you analyze a quantum physics podcast and find a physicist talking about "observer effects" — then bridge that to "your testosterone levels change based on how you measure and track them."

2) Direct
   1) Purpose: Find angles from directly related fields — content that's already in your wheelhouse but may have angles you haven't explored.
   2)  Example for "Health & Supplements" niche:
      1) Neuroscience & Brain
      2) Genetics & Epigenetics
      3) Longevity & Anti-Aging
      4) Gut Microbiome
      5) Nutrition Science
      6) Sleep Science
      7) Hormones & Endocrinology
      8) Functional Medicine
      9) Biohacking & Optimization
   3) Use case: You're selling the same testosterone supplement. You mine a longevity podcast where David Sinclair discusses NAD+ and mitochondrial function — directly applicable scientific claims for your product.

### Step 4: Select Source Categories

After choosing source strategy, they will have to select source categories, which are dependent on which sourcing strategy they have chosen. Each niche should have unique Source Categories, dependent on if Translocate or Direct is selected.

**Category Count**: 12-15 categories per niche per strategy (AI-generated for all 11 niches)

The user can select 1 or more categories. They also have the option to add their own categories, which are saved for future use once selected.

**Custom Categories**: Private only - visible only to the user who created them (stored in localStorage)

### Step 5: Select Source Types

After choosing Source Categories, they'll see Source Options. We want to support:

1) YouTube
   1) We can use yt dlp
2) Podcast
   1) We could also use yt dlp with filtering to find podcasts on youtube, such as 30+ min duration, keywords like podcast, interview, episode, etc)
   2) We could also use RSS feeds of podcasts. There also may be Podcast APIs we can use, I haven't looked into this in-depth.
3) Reddit
   1) We can use our Reddit API creds to find posts from related (or unrelated subreddits), based on if user selects Translocate or Direct.
   2) Credentials:
      1) App name: summarizer
      2) Details: mobKKGQ5oNjLEEPaZLVcmg
      3) Secret: xz-sIeIOxn9MezyKyKr4XGnNqo7EdA
   3) Reddit API Docs: [https://www.reddit.com/dev/api/](https://www.reddit.com/dev/api/)
   4) A cool thing we can do with reddit posts is we can append "/.json" to the end of a post to get the full .json for the post and comment threads.
      1) E.g. [https://www.reddit.com/r/Supplements/comments/1qdpww9/psa\_webber\_naturals\_magnesium\_bisglycinate\_is\_not](https://www.reddit.com/r/Supplements/comments/1qdpww9/psa_webber_naturals_magnesium_bisglycinate_is_not) becomes [https://www.reddit.com/r/Supplements/comments/1qdpww9/psa\_webber\_naturals\_magnesium\_bisglycinate\_is\_not/.json](https://www.reddit.com/r/Supplements/comments/1qdpww9/psa_webber_naturals_magnesium_bisglycinate_is_not/.json)
4) PubMed
   1) API Docs here: [https://www.ncbi.nlm.nih.gov/home/develop/api/](https://www.ncbi.nlm.nih.gov/home/develop/api/)

If we need a good way to get accurate transcript for a source, we can use Whisper.

### Step 6: Source Discovery & Selection

**Discovery Method**: AI generates optimal search queries based on niche + selected categories using Claude

Users can select one Source or multiple. We should return 20 sources total, split between whatever Source(s) they select. Also filter for Sort By (Most Views, Most Engagement). We will then return the results tagged with Source, Title/Episode/Etc, Link, Views. Users can select one or more and then click Analyze to start analyzing.

**Pagination**: "Load More" button to fetch 20 additional sources on demand

**Failed Sources**: Skip unavailable sources and notify user inline, continue with remaining sources

---

## Analysis Processing

### Long Content Handling
- **Method**: Full transcription + chunked analysis
- **Transcription Priority**: YouTube captions first, Whisper API fallback for content without captions
- **Multi-Source Processing**: Parallel processing - analyze all selected sources simultaneously, combine results at end

### Reddit Analysis Depth
- Analyze original post + top 20 comments (discussion often contains valuable insights)

### PubMed Scientific Content
- Full paper analysis
- Translate scientific claims to layman terms
- Link to source + provide simplified summary
- Preserve academic credibility while making content usable

### Output Volume
- **3-5 Claims per source**
- **3-5 Hooks per source**
- If source lacks sufficient surprising claims, AI should work harder to find something - always output the requested quantity

### Loading State
Detailed step-by-step progress display:
- "Fetching transcript..."
- "Analyzing claims..."
- "Generating hooks..."
- Show progress for each source being processed

---

## Output: Claims

After analysis is complete, we want to have 2 sections: Claims, and Hooks.

Each Claim should be expandable, and include the following:

1) The Claim
   1) Example: Testing yourself BEFORE studying enhances memory more than traditional study methods through 'error-driven learning'
2) Exact Quote
   1) Example: you can even test yourself before you study and that can actually enhance memory too and so this is a method that I talk about in the book called error driven learning and the idea is is that when you actually force yourself to try to pull up information from memory and challenging circumstances what happens is when you do get the right answer essentially there's changes... that essentially there's parts of a cell assembly that gives rise to a memory that are not necessarily very helpful and adaptive and there's some that are very very effective
3) Surprise Score
   1) Example: 9
4) Mechanism
   1) Example: When the brain struggles to recall information before learning it, it creates stronger neural pathways by eliminating weak connections and strengthening effective ones. The struggle itself reconfigures memory networks for optimal performance.

---

## Output: Hooks

Each Hook should be expandable, and include the following:

1) Hook Headline
   1) A compelling headline that could open an ad or VSL. Should be specific and intriguing — not generic.
      1) Example: Harvard Neuroscientist Discovers Why Taking Supplements BEFORE You Need Them Makes Them 10X More Effective
2) Source Claim
   1) The original surprising/counterintuitive claim from the podcast. Distilled into your own words, backed by an exact quote.
      1) Example: Testing yourself BEFORE studying enhances memory more than traditional study methods through 'error-driven learning'
3) The Bridge
   1) The "aha\!" connection between the source claim and your product/niche. This is the magic — the unexpected but believable link.
      1) Example: Just like the brain gets stronger when challenged BEFORE learning new information, your body's cellular systems become dramatically more responsive to nutrients when they're in a 'challenged' or depleted state rather than an optimal one. This explains why most people see minimal results from supplements \- they're taking them when comfortable, not when primed.
4) **Bridge Distance** (NEW)
   1) Label indicating how bold the connection is:
      - **Aggressive**: Wild, unexpected leap (quantum physics → supplements)
      - **Moderate**: Interesting but believable connection
      - **Conservative**: Clear logical through-line
   2) Each analysis should produce a range of bridge distances across the generated hooks
5) Angle Type
   1) Can be one or more:
      1) Hidden Cause
      2) Deficiency
      3) Contamination
      4) Timing/Method
      5) Differentiation
      6) Identity
      7) Contrarian
         1) Example: Timing/Method \+ Contrarian

6) Big Idea Summary
   1) One paragraph explaining the core concept and why it works as a marketing angle.
      1) Example: The supplement industry has it backwards. Instead of taking nutrients when you feel good, neuroscience shows your body absorbs and utilizes compounds most effectively when taken during strategic challenge windows \- like before workouts, during fasting, or when slightly stressed. This 'pre-challenge priming' creates the biological equivalent of error-driven learning, where struggle enhances adaptation.
7) Virality Score (1-10 for each below)
   1) Easy To Understand
      1) Can average person grasp it in 5 seconds?
   2) Emotional
      1) Does it trigger curiosity, fear, excitement, or "aha\!"?
   3) Curiosity Inducing
      1) Does it create an open loop  or make them need to know more?
   4) Contrarian (Paradigm Shifting)
      1) Does it challenge conventional wisdom or shift paradigms?
   5) Provable
      1) Is it backed by studies, data, or demonstrable phenomena?
   6) Total
      1) Total up the score of all categories
8) Sample Ad Opener
   1) A 3-4 sentence ad opener using the angle. Should be compelling and specific — ready to use or adapt as the opening of an ad, VSL, or email.
      1) Example: A Harvard neuroscientist just proved that your brain learns 10X faster when you test yourself BEFORE studying, not after. Now researchers are applying this same 'challenge-first' principle to supplementation \- and the results are staggering. What if everything you knew about when to take your vitamins was completely backwards? Here's why taking supplements during your body's 'struggle windows' could be the missing key to finally seeing real results...

These examples are pulled from following inputs:

1) Source: [https://www.youtube.com/watch?v=\_uOLii9sDiE](https://www.youtube.com/watch?v=_uOLii9sDiE)
2) Niche: Health & Supplements
3) Source Strategy: Direct
4) Source Category: Neuroscience & Brain

---

## Results View Features

### Filtering & Sorting
- Sort by Virality Score (Total) - highest at top
- Filter by Angle Type (show only "Contrarian", "Hidden Cause", etc.)
- Group by source (organize results by which video/podcast they came from)
- Tags displayed on each Claim/Hook: Total score, Source type (YouTube/Reddit/PubMed), Angle Type

### Favorites
- Star button on each Claim and Hook
- Starred items appear in a dedicated Favorites section
- Favorites persist in localStorage

### Hook Variations
- "Generate Variation" button on each Hook
- Textarea for user to input feedback/direction
- AI generates a new variation based on user input

---

## Save & Export

Research sessions should automatically be saved in a sort of History accessible through left-side sidebar. Users can download individual Claims and Hooks as MD files. Users can also Download all Hooks as MD or all Claims as MD, or all Hooks \+ Claims as MD.

### History
- All sessions saved automatically to localStorage
- Retained indefinitely
- User-managed deletion (manual delete only)
- Sessions displayed in left sidebar with date and niche

### Export Format
- Markdown (MD) only

---

## UI/UX Specifications

### Design Direction
- Match CA Pro (Copy Accelerator) branding
- Fully responsive - equal experience on all devices (desktop, tablet, mobile)

### Onboarding
- None - interface should be self-explanatory

### Error Messages
- Direct and professional tone
- Example: "Video unavailable. Please try another source."

### Content Filtering
- No filtering of claims - surface everything, let user decide what to use

### Usage Limits
- No rate limiting or usage caps

---

## Stefan Georgi Methodology (For AI Prompts)

The following frameworks from Stefan's training should be incorporated into the AI analysis prompts:

### Big Idea Criteria

A "Big Idea" isn't just a good idea — it's the central, compelling concept that makes your entire ad work. Criteria:

1. **Emotionally Compelling** - Hits a deep desire or fear. Not intellectual — visceral.
2. **Contains Built-In Intrigue** - Creates an open loop. The reader needs to know more.
3. **Easily Understood** - Can be grasped in seconds. If you need to explain it, it's not big enough.
4. **Believable (but surprising)** - Novel enough to be interesting, credible enough to not get dismissed.
5. **Difficult to Steal** - Tied to your specific product/mechanism. Competitors can't just copy the headline.

### Mechanism-First Copywriting

The "mechanism" is the why it works — the specific process, ingredient, method, or system that makes your product deliver results.

Why it matters:
- Claims are commoditized ("lose weight fast")
- Mechanisms are differentiators ("the 3-second lymphatic flip that unlocks fat cells")

Structure:
1. Identify the core mechanism (real or named)
2. Make it the star of your copy
3. Tie all claims back to the mechanism
4. The mechanism answers "why is YOUR solution different?"

Example:
- Weak: "This supplement burns fat"
- Mechanism-first: "The Ethiopian Yellow Root that reactivates your body's dormant brown fat cells"

### Big Idea Categories

1. **Hidden Cause** — There's a secret reason behind your problem
2. **Emerging Opportunity** — New discovery/timing makes this possible now
3. **David vs Goliath** — Small/underdog solution beats the establishment
4. **Contrarian/Paradigm Shift** — Everything you've been told is wrong
5. **Crystal Ball** — Prediction-based, what's coming

---

## Interview Notes

Key decisions made during PRD review (January 2025):

### Technical Decisions
- Next.js full-stack chosen for seamless Vercel deployment and API route handling
- Claude Opus 4.5 selected for superior creative writing and analysis capabilities
- YouTube captions preferred over Whisper to reduce processing time/cost
- All API credentials server-side only for security

### Processing Decisions
- Full transcription + chunked analysis for long content (no smart sampling)
- Parallel processing for multi-source analysis
- 3-5 Claims and 3-5 Hooks per source (focused, high-quality)
- AI generates search queries based on niche + category selection

### UX Decisions
- Detailed step-by-step progress (not just progress bar)
- "Load More" button for additional sources beyond initial 20
- Skip failed sources with inline notification
- History stored indefinitely in localStorage
- Full sorting/filtering capabilities on results
- Star/favorites feature for Claims and Hooks
- "Generate Variation" with user feedback textarea

### Content Decisions
- Bridge distance range: generate Aggressive, Moderate, and Conservative bridges
- Reddit: analyze post + top 20 comments
- PubMed: full paper analysis with layman translation
- No compliance filtering - surface all claims
- No angle guidance - let users discover what works
- Always output requested 3-5 items even from weaker sources

### Design Decisions
- Match CA Pro branding
- Fully responsive (mobile, tablet, desktop)
- No onboarding needed - self-explanatory UI
- Direct/professional error messages
- No usage limits
