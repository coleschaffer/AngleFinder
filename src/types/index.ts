// Core types for the Angle Finder application

export type Niche =
  | 'health-supplements'
  | 'skincare-beauty'
  | 'fitness-performance'
  | 'biz-opp'
  | 'coaching-self-help'
  | 'spirituality-astrology'
  | 'pet-products'
  | 'home-lifestyle'
  | 'medical-devices'
  | 'finance-insurance'
  | 'other';

export type SourceStrategy = 'translocate' | 'direct';

export type SourceType =
  | 'youtube'
  | 'podcast'
  | 'reddit'
  | 'research'      // Renamed from pubmed - combines PubMed + NIH ODS + NCBI
  | 'sciencedaily'
  | 'scholar'       // Google Scholar via SerpApi
  | 'arxiv'
  | 'preprint';     // bioRxiv + medRxiv

export type SortBy = 'views' | 'engagement';

export type AngleType =
  | 'Hidden Cause'
  | 'Deficiency'
  | 'Contamination'
  | 'Timing/Method'
  | 'Differentiation'
  | 'Identity'
  | 'Contrarian';

export type BridgeDistance = 'Aggressive' | 'Moderate' | 'Conservative';

export interface SourceCategory {
  id: string;
  name: string;
  isCustom?: boolean;
}

export interface Source {
  id: string;
  type: SourceType;
  title: string;
  url: string;
  views?: number;
  engagement?: number;
  subreddit?: string;
  author?: string;
  publishDate?: string;
  duration?: string;
  abstract?: string;      // For academic sources (arXiv, preprints, scholar)
  snippet?: string;       // Short description/excerpt
  failed?: boolean;
  failureReason?: string;
}

export interface SavedProductURL {
  id: string;
  url: string;
  productName: string;
  detectedNiche: Niche;
  customNiche: string;
  productDescription: string;
  lastUsed: string;
}

export interface Claim {
  id: string;
  sourceId: string;
  claim: string;
  exactQuote: string;
  surpriseScore: number;
  mechanism: string;
  isFavorite?: boolean;
}

export interface ViralityScore {
  easyToUnderstand: number;
  emotional: number;
  curiosityInducing: number;
  contrarian: number;
  provable: number;
  total: number;
}

export interface Hook {
  id: string;
  sourceId: string;
  headline: string;
  sourceClaim: string;
  bridge: string;
  bridgeDistance: BridgeDistance;
  angleTypes: AngleType[];
  bigIdeaSummary: string;
  viralityScore: ViralityScore;
  sampleAdOpener: string;
  isFavorite?: boolean;
  isVariation?: boolean;
  parentHookId?: string;
  isGenerated?: boolean;
  fromClaimId?: string;
  sourceName?: string;
  sourceType?: SourceType;
  sourceUrl?: string;
}

export interface AnalysisResult {
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  sourceUrl: string;
  claims: Claim[];
  hooks: Hook[];
}

export interface Session {
  id: string;
  date: string;
  niche: Niche;
  customNiche?: string;
  productDescription: string;
  strategy: SourceStrategy;
  categories: string[];
  sourceTypes: SourceType[];
  sources: Source[]; // The actual sources that were analyzed
  results: AnalysisResult[];
}

export interface AnalysisProgress {
  stage: 'searching' | 'fetching' | 'transcribing' | 'analyzing' | 'generating' | 'complete' | 'error';
  message: string;
  sourceId?: string;
  sourceName?: string;
  progress?: number; // 0-100
}

export interface WizardState {
  step: number;
  niche: Niche | null;
  customNiche: string;
  productDescription: string;
  strategy: SourceStrategy | null;
  selectedCategories: string[];
  selectedSourceTypes: SourceType[];
  sortBy: SortBy;
  discoveredSources: Source[];
  selectedSources: string[];
  isAnalyzing: boolean;
  analysisProgress: AnalysisProgress | null;
  results: AnalysisResult[];
}
