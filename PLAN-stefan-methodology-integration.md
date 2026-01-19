# Plan: Stefan's Methodology Integration

## Overview

Deeply integrate Stefan Georgi's Breakthrough Ideas methodology throughout the Angle Finder product. This includes updating all AI prompts, adding new features, and ensuring the product teaches and applies Stefan's frameworks at every step.

---

## Part 1: Key Teachings to Integrate

### From the CA Pro Training & Presentation

| Concept | What It Means | Where to Apply |
|---------|---------------|----------------|
| **Ideas = Building Blocks** | Any idea is a combination of two older ideas | Hook display, generation prompts |
| **Big Idea Criteria** | Instantly comprehensible, important, exciting, beneficial, leads to selling product | Hook scoring, generation prompts |
| **7-Step Process** | Formulate → Rephrase → Search → Modify → Categorize → Organize → Rank | Source discovery flow |
| **Modifiers** | Surprising, Real Reason, Breakthrough, New Discovery, etc. | Search query generation |
| **Hidden/Emerging/Known** | Categorize ideas by market awareness | Claim classification (see other plan) |
| **Sweet Spot = Hidden + Momentum + Virality** | Focus on primed ideas | Claim/hook prioritization |
| **Virality Checklist** | Easy to understand, Emotional, Curiosity-inducing, Contrarian, Provable | Already in product, verify alignment |
| **The Bar Test** | "Would someone share this at a dinner party?" | Add as evaluation criteria |

### From the Tyler Yeo Conversation

| Concept | What It Means | Where to Apply |
|---------|---------------|----------------|
| **Translocate Ideas** | Take ideas from unrelated fields and apply them | Already in product, enhance prompts |
| **Podcast Transcript Mining** | Pull transcripts, ask for surprising claims | Source analysis prompts |
| **Science Daily as Source** | Use for weird/surprising discoveries | Already a source type |
| **Differentiation Research** | "Why most X doesn't work" angles | New prompt pattern, hook generation |
| **TAM for Pain Points** | Find pain points, figure out how many people suffer | Could add to claim analysis |

### From the Huberman Notes (Stefan's Annotation Style)

| Concept | What It Means | Where to Apply |
|---------|---------------|----------------|
| **SPG Questions** | Ask "Could this work for X offer?" | User prompts, creative guidance |
| **Multi-Niche Ideation** | One claim → hooks for multiple niches | New feature: Translocate Claim |
| **Mechanism Hunting** | Look for scientific mechanisms as proof elements | Claim extraction prompts |
| **Big Idea Headlines** | Generate multiple headline variations | Hook generation (already does this) |
| **Proof Element Identification** | Flag mechanisms usable as proof | Add to claim analysis |

---

## Part 2: Prompt Updates

### 2.1 Source Discovery Prompts (`/api/discover`)

**Current**: Generates basic search queries for the category/niche.

**Update to include**:

```
STEFAN'S MODIFIER FRAMEWORK:
When generating search queries, incorporate these modifiers to find HIDDEN ideas:
- "surprising [topic]"
- "real reason [problem]"
- "breakthrough [discovery]"
- "new research [topic] 2024"
- "science behind [issue]"
- "shocking link [topic]"
- "new discovery [topic]"
- "new data [problem]"

Generate queries that would uncover ideas NOT yet in mainstream awareness.
Prioritize finding content that discusses:
- Recent studies or findings (last 2 years)
- Mechanisms most people don't know about
- Contrarian or paradigm-shifting perspectives
- Hidden causes of common problems
```

### 2.2 Claim Extraction Prompts (`/api/analyze`)

**Current**: Extracts claims with surprise score, exact quote, mechanism.

**Update to include**:

```
STEFAN'S BIG IDEA FRAMEWORK:

For each claim, identify:

1. THE MECHANISM: What is the underlying scientific/logical mechanism?
   - Is this mechanism usable as a "proof element" in copy?
   - How visual/metaphor-friendly is this mechanism?

2. BUILDING BLOCK ANALYSIS:
   - Block A: The core factual claim or mechanism
   - Block B: The angle/frame that makes it compelling
   - Combined: How these create a "Big Idea"

3. AWARENESS CLASSIFICATION:
   - Hidden: Only specialists know this
   - Emerging: Starting to gain traction
   - Known: Already saturated in market

4. MOMENTUM SIGNALS:
   - Recent studies supporting this?
   - Multiple independent sources?
   - Growing coverage?

5. DIFFERENTIATION POTENTIAL:
   - Could this support a "why most X doesn't work" angle?
   - Does it reveal something wrong with common approaches?

6. TRANSLOCATE POTENTIAL:
   - What OTHER niches could this claim support?
   - (e.g., a gut mechanism could apply to: weight loss, energy, skin, mood)
```

### 2.3 Hook Generation Prompts (`/api/analyze` hook section)

**Current**: Generates hooks with headline, bridge, angle types, virality score.

**Update to include**:

```
STEFAN'S BIG IDEA CRITERIA:

Every hook must be:
1. INSTANTLY COMPREHENSIBLE - Can someone grasp it immediately?
2. IMPORTANT - Does it matter to the target audience?
3. EXCITING - Is there genuine excitement or intrigue?
4. BENEFICIAL - Is the benefit clear?
5. LEADS TO PRODUCT - Does it naturally lead to wanting the solution?

BUILDING BLOCKS STRUCTURE:
For each hook, explicitly identify:
- Building Block A: [The factual/mechanism component]
- Building Block B: [The angle/frame component]
- Combined Big Idea: [How they create something new]

THE BAR TEST:
Ask: "If someone heard this at a dinner party, would they:
- Immediately understand it?
- Find it interesting enough to remember?
- Want to share it to sound smart?"

VIRALITY CHECKLIST (score each 1-10):
1. Easy to Understand: Is it intuitive? Visual? Metaphor-friendly?
2. Emotional: Is it shocking, scary, or exciting enough to share?
3. Curiosity-Inducing: Does it create an open loop?
4. Contrarian/Paradigm-Shifting: Does it challenge beliefs?
5. Provable: Can it be backed up with data, studies, or demonstrations?

DIFFERENTIATION ANGLES:
Consider these hook patterns from Stefan:
- "Why most [product category] doesn't work (and what does)"
- "The hidden [cause/factor] behind [problem]"
- "What [authority figures] won't tell you about [topic]"
- "The [location/source] secret to [benefit]"
- "The real reason [common approach] fails"
```

### 2.4 Hook Variation Prompts (`/api/variation`)

**Current**: Generates variations based on user feedback.

**Update to include**:

```
When generating variations, consider Stefan's frameworks:

ANGLE TYPE VARIATIONS:
- Hidden Cause: What's secretly causing the problem?
- Deficiency: What are they missing/lacking?
- Contamination: What toxic thing is harming them?
- Timing/Method: Is there a better when/how?
- Differentiation: Why is this version different/better?
- Identity: How does this connect to who they are?
- Contrarian: What's the opposite of common belief?

BUILDING BLOCK REMIX:
- Keep Block A (mechanism), change Block B (angle)
- Keep Block B (angle), apply to different Block A
- Combine with a different Block B entirely

NICHE TRANSLOCATE:
If requested, take the core mechanism and reframe for a different audience/product.
```

### 2.5 Generate Hook from Claim (`/api/generate-hook`)

**Current**: Generates a hook from a specific claim.

**Update to include**:

```
STEFAN'S PROCESS FOR CLAIM → HOOK:

1. IDENTIFY THE BUILDING BLOCKS:
   - Block A: The core claim/mechanism from the source
   - Block B: The most compelling angle for this niche/product

2. APPLY THE BIG IDEA CRITERIA:
   - Must be instantly comprehensible
   - Must feel important, exciting, beneficial
   - Must lead naturally to wanting the product

3. CHECK AGAINST VIRALITY ELEMENTS:
   - Easy to understand (visual, metaphor-friendly)
   - Emotional (shocking, scary, exciting)
   - Curiosity-inducing
   - Contrarian or paradigm-shifting
   - Provable with evidence

4. THE DINNER PARTY TEST:
   Would someone share this to sound smart? If not, make it more shareable.

5. GENERATE MULTIPLE APPROACHES:
   - A "Hidden Cause" version
   - A "Contrarian" version
   - A "Differentiation" version
```

---

## Part 3: New Features to Add

### 3.1 Building Blocks Display

**Location**: HookCard expanded view

**What**: Show the deconstruction of how the Big Idea was formed.

```
🧱 BUILDING BLOCKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Block A (Mechanism):
"Endogenous opioids are released during playful activities"

Block B (Angle):
"Hidden internal process → peak performance"

= Big Idea:
"Your brain floods with natural opioids when you do this—
and it's the secret behind elite performers"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3.2 Translocate Claim Feature

**Location**: Button on ClaimCard

**What**: Take any claim and generate hooks for 3-5 different niches.

```
"Translocate This Claim"
→ Generates hooks for:
  - Health/Supplements angle
  - Dating/Relationships angle
  - Personal Development angle
  - Business/Productivity angle
  - [User's current niche]
```

### 3.3 SPG Creative Prompts

**Location**: Sidebar or panel when viewing claims

**What**: Stefan-style questions to spark creative thinking.

```
💭 CREATIVE PROMPTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• What other products could this mechanism support?
• What's the "hidden cause" version of this angle?
• How could this be flipped to contrarian?
• What metaphor would make this instantly visual?
• Is there a "most people think X but actually Y" here?
• Would you share this at a dinner party? Why/why not?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Save My Notes] [Generate Hook from These Ideas]
```

### 3.4 Differentiation Research Mode

**Location**: New option in source discovery or separate flow

**What**: Specifically search for "why most X doesn't work" angles.

```
Differentiation Research for: [Product/Ingredient]

Searches for:
- Bioavailability issues
- Quality/sourcing problems
- Common mistakes in formulation
- Why cheap versions don't work
- What makes premium versions different

Output: Claims specifically about differentiation angles
```

### 3.5 The Bar Test Indicator

**Location**: On each hook, simple yes/no or score

**What**: Quick evaluation of shareability.

```
🍺 BAR TEST: Would someone share this to sound smart?
[Strong Yes] [Maybe] [Probably Not]
```

Could be AI-evaluated or user-rated.

### 3.6 Education Mode Toggle

**Location**: Global setting or per-section toggle

**What**: Show explanatory content about WHY things work.

When enabled, hooks show:
- Why this angle type was chosen
- Why this bridge distance
- What makes this viral (or not)
- Tips from Stefan's methodology

---

## Part 4: UI Enhancements

### 4.1 Hook Card Updates

Add to expanded view:
- Building Blocks breakdown
- Bar Test indicator
- Momentum score (if inherited from claim)
- "Translocate to Other Niches" button

### 4.2 Claim Card Updates

Add:
- Awareness level badge (Hidden/Emerging/Known)
- Momentum score
- "Proof Element" indicator if mechanism is strong
- Translocate button
- SPG Prompts panel

### 4.3 Results Summary Updates

Add to Research Summary:
- Count of Hidden vs Emerging vs Known claims
- Average momentum score
- "Sweet Spots Found: X"

### 4.4 New Filter/Sort Options

- Filter by awareness level
- Filter by Sweet Spot only
- Sort by momentum score
- Sort by virality score

---

## Part 5: Implementation Phases

### Phase 1: Prompt Overhaul (Core)
1. Update `/api/discover` with modifiers
2. Update `/api/analyze` claim extraction with full framework
3. Update `/api/analyze` hook generation with Big Idea criteria
4. Update `/api/generate-hook` with Stefan's process
5. Update `/api/variation` with angle type variations

### Phase 2: Data Model Updates
6. Add new fields to Claim type (building blocks, awareness, momentum)
7. Add new fields to Hook type (building blocks, bar test)
8. Update parsing logic for new API response structure

### Phase 3: Building Blocks Display
9. Add Building Blocks section to HookCard
10. Add Building Blocks section to ClaimCard (showing what blocks are available)

### Phase 4: Classification & Indicators
11. Add awareness badges to ClaimCard
12. Add momentum indicators
13. Add Sweet Spot highlighting
14. Add Bar Test indicator to HookCard

### Phase 5: New Features
15. Implement Translocate Claim feature
16. Implement SPG Creative Prompts panel
17. Implement Differentiation Research mode (optional)

### Phase 6: Education Mode
18. Add Learn Mode toggle
19. Add explanatory overlays
20. Add tips/guidance throughout

---

## Part 6: Prompt Templates

### Master Claim Extraction Prompt

See Section 2.2 above for full prompt additions.

### Master Hook Generation Prompt

See Section 2.3 above for full prompt additions.

### Translocate Prompt (New)

```
TRANSLOCATE CLAIM TO MULTIPLE NICHES

Original Claim: {claim}
Original Mechanism: {mechanism}
Original Niche: {niche}

Stefan's Translocate Approach:
Take this mechanism and create compelling Big Idea hooks for each of these niches:

1. HEALTH & SUPPLEMENTS
2. DATING & RELATIONSHIPS
3. PERSONAL DEVELOPMENT
4. BUSINESS & PRODUCTIVITY
5. FINANCE & INVESTING

For each niche:
- Identify how this mechanism applies
- Create Building Block A (mechanism reframed for niche)
- Create Building Block B (most compelling angle for that audience)
- Generate a headline that passes the Bar Test
- Ensure it's instantly comprehensible, exciting, and beneficial
```

### Differentiation Research Prompt (New)

```
DIFFERENTIATION RESEARCH

Product/Ingredient: {product}
Niche: {niche}

Find claims that support "why most {product} doesn't work" angles:

Look for:
1. BIOAVAILABILITY ISSUES
   - Absorption problems
   - What blocks effectiveness

2. QUALITY/SOURCING ISSUES
   - Geographic differences
   - Processing differences
   - Purity issues

3. FORMULATION MISTAKES
   - Missing co-factors
   - Wrong forms
   - Inadequate doses

4. TIMING/METHOD ISSUES
   - Wrong time of day
   - Wrong way to take it
   - Interactions that reduce effectiveness

For each finding, provide:
- The differentiation claim
- Supporting evidence
- How this could position {product} as different/better
```

---

## Part 7: Success Criteria

- All AI outputs feel aligned with Stefan's thinking
- Users learn the methodology through using the product
- Building Blocks make hook construction understandable
- Translocate feature enables cross-niche creativity
- Sweet Spot claims are clearly identifiable
- Users report hooks feel more "Big Idea" quality

---

## Part 8: Files to Modify

| File | Changes |
|------|---------|
| `/api/discover/route.ts` | Add modifiers to search query generation |
| `/api/analyze/route.ts` | Major prompt updates for claims + hooks |
| `/api/generate-hook/route.ts` | Add Stefan's claim→hook process |
| `/api/variation/route.ts` | Add angle type variations |
| `src/types/index.ts` | Add new fields to Claim and Hook |
| `src/components/results/ClaimCard.tsx` | Add building blocks, badges, SPG prompts |
| `src/components/results/HookCard.tsx` | Add building blocks, bar test |
| `src/components/wizard/Step7Results.tsx` | Add new filters, summary stats |
| NEW: `/api/translocate/route.ts` | New endpoint for translocate feature |
| NEW: `src/components/results/TranslocateModal.tsx` | UI for translocate results |

---

## Open Questions

1. How much of the methodology should be visible vs. invisible? (Education vs. just better outputs)
2. Should Building Blocks be shown by default or behind a toggle?
3. How many niches should Translocate generate for?
4. Should we add a "Stefan's Tips" section with direct quotes from trainings?
5. Do we want to track which methodology-driven features users engage with most?
