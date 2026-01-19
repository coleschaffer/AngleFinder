import { Niche } from '@/types';

export interface NicheInfo {
  id: Niche;
  name: string;
  placeholderProduct: string;
}

export const NICHES: NicheInfo[] = [
  {
    id: 'health-supplements',
    name: 'Health & Supplements',
    placeholderProduct: 'I sell a testosterone boosting supplement for men 35+. Main ingredients are Tongkat Ali and Fadogia. Target audience cares about energy, libido, and maintaining muscle as they age.',
  },
  {
    id: 'skincare-beauty',
    name: 'Skincare & Beauty',
    placeholderProduct: 'I sell an anti-aging serum with retinol and peptides for women 40+. Target audience wants to reduce fine lines and restore youthful skin without invasive procedures.',
  },
  {
    id: 'fitness-performance',
    name: 'Fitness & Performance',
    placeholderProduct: 'I sell a pre-workout supplement with natural caffeine and beta-alanine. Target audience is gym-goers who want clean energy and better pumps without the crash.',
  },
  {
    id: 'biz-opp',
    name: 'Biz Opp & Make Money',
    placeholderProduct: 'I sell a course teaching people how to start an Amazon FBA business. Target audience is people with 9-5 jobs looking for side income or to eventually quit their jobs.',
  },
  {
    id: 'coaching-self-help',
    name: 'Coaching & Self-Help',
    placeholderProduct: 'I sell a productivity coaching program for entrepreneurs. Target audience is business owners who feel overwhelmed and want to 10x their output while working less.',
  },
  {
    id: 'spirituality-astrology',
    name: 'Spirituality & Astrology',
    placeholderProduct: 'I sell personalized astrology readings and a monthly membership for cosmic guidance. Target audience is spiritually curious women seeking purpose and direction.',
  },
  {
    id: 'pet-products',
    name: 'Pet Products',
    placeholderProduct: 'I sell a joint supplement for dogs with glucosamine and MSM. Target audience is pet owners whose older dogs have mobility issues or arthritis.',
  },
  {
    id: 'home-lifestyle',
    name: 'Home & Lifestyle',
    placeholderProduct: 'I sell an air purifier with HEPA filtration for homes. Target audience is health-conscious families concerned about indoor air quality and allergies.',
  },
  {
    id: 'medical-devices',
    name: 'Medical Devices',
    placeholderProduct: 'I sell a red light therapy device for pain relief and muscle recovery. Target audience is athletes and people with chronic pain looking for drug-free solutions.',
  },
  {
    id: 'finance-insurance',
    name: 'Finance & Insurance',
    placeholderProduct: 'I sell life insurance policies for families. Target audience is parents in their 30s-40s who want to protect their families financially if something happens to them.',
  },
  {
    id: 'other',
    name: 'Other',
    placeholderProduct: 'Describe your product, target audience, key benefits, and what makes it unique...',
  },
];
