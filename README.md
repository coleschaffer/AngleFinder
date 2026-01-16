# Angle Finder

**Generate breakthrough marketing angles and hooks using Stefan Georgi's framework.**

Angle Finder is an AI-powered tool that helps marketers and copywriters discover unique, compelling angles for DTC ads by analyzing content from YouTube, podcasts, Reddit, and PubMed. Built for [Copy Accelerator (CA Pro)](https://copyaccelerator.com).

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Claude AI](https://img.shields.io/badge/Claude-Sonnet-orange)

## Features

- **Two Sourcing Strategies**
  - **Translocate**: Find angles from completely unrelated fields (quantum physics → supplements)
  - **Direct**: Find angles from directly related content (longevity research → supplements)

- **Multi-Source Discovery**: Search and analyze content from:
  - YouTube videos
  - Podcasts (long-form content)
  - Reddit discussions
  - PubMed scientific papers

- **AI-Powered Analysis**: Claude AI extracts:
  - **Claims**: Surprising facts with exact quotes, surprise scores, and mechanisms
  - **Hooks**: Complete marketing angles with headlines, bridges, virality scores, and sample ad openers

- **Stefan Georgi's Framework**: Built-in methodology including:
  - Big Idea criteria (emotionally compelling, built-in intrigue, easily understood)
  - Angle types (Hidden Cause, Deficiency, Contrarian, Timing/Method, etc.)
  - Bridge distances (Aggressive, Moderate, Conservative)
  - Virality scoring (5 dimensions, 50-point scale)

- **Session Management**: Auto-save history, favorites, and markdown export

- **Mobile-Optimized**: Fully responsive design with touch-friendly interface

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Anthropic API key

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/AngleFinder.git
cd AngleFinder

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
```

### Environment Variables

Add your API keys to `.env.local`:

```env
# Required
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional - for Reddit search
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret

# Optional - for Whisper transcription fallback
OPENAI_API_KEY=your_openai_api_key
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Select Your Niche**: Choose from 11 pre-defined niches or enter a custom one
2. **Describe Your Product**: Provide details about your product and target audience
3. **Choose Strategy**: Translocate (unrelated fields) or Direct (related content)
4. **Select Categories**: Pick 1+ topic categories to explore
5. **Choose Source Types**: YouTube, Podcasts, Reddit, and/or PubMed
6. **Discover Sources**: AI generates search queries and returns relevant content
7. **Analyze**: Claude extracts claims and generates hooks from selected sources
8. **Review Results**: Filter, sort, favorite, and export your findings

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: Claude API (Anthropic)
- **State**: React Context + localStorage
- **Icons**: Lucide React

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/      # Claude AI analysis endpoint
│   │   ├── discover/     # Source discovery endpoint
│   │   └── variation/    # Hook variation generator
│   ├── globals.css       # CA Pro branded styles
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Sidebar.tsx       # History sidebar
│   ├── results/          # Claim and Hook cards
│   └── wizard/           # 7-step wizard flow
├── context/
│   └── AppContext.tsx    # Global state management
├── data/
│   ├── categories.ts     # 12-15 categories per niche
│   └── niches.ts         # 11 niches with placeholders
├── hooks/
│   └── useLocalStorage.ts
└── types/
    └── index.ts
```

## Deployment

Deploy to Vercel:

```bash
npm run build
vercel deploy
```

Make sure to add your environment variables in the Vercel dashboard.

## Credits

- **Framework**: [Stefan Georgi's Breakthrough Ideas](https://www.stefanpaulgeorgi.com/)
- **Built for**: [Copy Accelerator (CA Pro)](https://copyaccelerator.com)

## License

MIT
