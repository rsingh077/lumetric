'use client';

import React, { useState, useMemo, useRef } from 'react';
import { GlobeIcon, MaximizeIcon } from '@/components/icons';

export type GeographicGranularity = 'world' | 'us-states' | 'india-states' | 'state-districts';

export interface GeographicIntelligenceMapProps {
  rows: Record<string, string>[];
  allDatasetRows?: Record<string, string>[];
  columns?: { name: string; inferredType?: string }[];
  currentMetric: string;
  metricLabel?: string;
  isCurrency?: boolean;
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  className?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

interface GeoEntity {
  id: string;
  name: string;
  label: string;
  subLabel?: string;
  d: string;
  centroid: [number, number];
  aliases: string[];
  parentRegion?: string;
}

// ==========================================
// 1. WORLD MAP REAL BOUNDARIES (1000 x 500)
// ==========================================
const WORLD_ENTITIES: GeoEntity[] = [
  // North America
  {
    id: 'usa',
    name: 'United States',
    label: 'United States',
    subLabel: 'US / North America',
    centroid: [220, 185],
    d: 'M 160,140 L 260,135 L 295,155 L 295,200 L 265,225 L 245,215 L 230,240 L 195,235 L 170,200 L 155,160 Z M 70,60 L 140,45 L 165,80 L 125,115 L 70,105 Z M 105,225 L 120,230 L 110,238 Z',
    aliases: ['united states', 'usa', 'us', 'u.s.', 'u.s.a.', 'north america', 'na', 'americas'],
    parentRegion: 'North America',
  },
  {
    id: 'canada',
    name: 'Canada',
    label: 'Canada',
    subLabel: 'CA / North America',
    centroid: [220, 95],
    d: 'M 140,50 L 305,50 L 325,110 L 285,135 L 160,135 L 130,110 Z',
    aliases: ['canada', 'ca', 'can', 'north america', 'na'],
    parentRegion: 'North America',
  },
  {
    id: 'mexico',
    name: 'Mexico',
    label: 'Mexico',
    subLabel: 'MX / Latin America',
    centroid: [215, 245],
    d: 'M 175,205 L 235,218 L 245,260 L 220,270 L 190,230 Z',
    aliases: ['mexico', 'mx', 'mex', 'latin america', 'latam'],
    parentRegion: 'Latin America',
  },

  // South America
  {
    id: 'brazil',
    name: 'Brazil',
    label: 'Brazil',
    subLabel: 'BR / Latin America',
    centroid: [345, 315],
    d: 'M 310,250 L 385,270 L 400,320 L 360,370 L 320,330 L 300,280 Z',
    aliases: ['brazil', 'br', 'bra', 'brasil', 'latin america', 'latam', 'south america'],
    parentRegion: 'Latin America',
  },
  {
    id: 'argentina',
    name: 'Argentina',
    label: 'Argentina',
    subLabel: 'AR / South America',
    centroid: [325, 415],
    d: 'M 310,360 L 350,370 L 335,460 L 310,470 L 300,400 Z',
    aliases: ['argentina', 'ar', 'arg', 'latin america', 'latam', 'south america'],
    parentRegion: 'Latin America',
  },
  {
    id: 'latam_north',
    name: 'Andean & Northern LatAm',
    label: 'Colombia & Peru',
    subLabel: 'South America',
    centroid: [290, 290],
    d: 'M 285,245 L 315,255 L 305,340 L 290,440 L 280,350 L 275,270 Z',
    aliases: ['colombia', 'peru', 'chile', 'venezuela', 'ecuador', 'latin america', 'latam', 'south america'],
    parentRegion: 'Latin America',
  },

  // Europe
  {
    id: 'uk',
    name: 'United Kingdom',
    label: 'United Kingdom',
    subLabel: 'UK & Ireland / Europe',
    centroid: [465, 125],
    d: 'M 450,110 L 475,105 L 480,135 L 455,145 Z M 440,120 L 450,118 L 450,135 L 442,135 Z',
    aliases: ['united kingdom', 'uk', 'great britain', 'england', 'scotland', 'wales', 'ireland', 'europe', 'emea'],
    parentRegion: 'Europe',
  },
  {
    id: 'france',
    name: 'France',
    label: 'France',
    subLabel: 'FR / Western Europe',
    centroid: [485, 160],
    d: 'M 465,145 L 500,140 L 505,175 L 470,180 Z',
    aliases: ['france', 'fr', 'fra', 'europe', 'emea'],
    parentRegion: 'Europe',
  },
  {
    id: 'germany',
    name: 'Germany',
    label: 'Germany',
    subLabel: 'DE / Central Europe',
    centroid: [515, 145],
    d: 'M 500,130 L 530,130 L 530,165 L 498,165 Z',
    aliases: ['germany', 'de', 'deu', 'deutschland', 'europe', 'emea'],
    parentRegion: 'Europe',
  },
  {
    id: 'italy',
    name: 'Italy',
    label: 'Italy',
    subLabel: 'IT / Southern Europe',
    centroid: [530, 195],
    d: 'M 515,170 L 535,175 L 545,215 L 530,220 L 518,190 Z',
    aliases: ['italy', 'it', 'ita', 'italia', 'europe', 'emea'],
    parentRegion: 'Europe',
  },
  {
    id: 'spain',
    name: 'Spain & Portugal',
    label: 'Spain & Portugal',
    subLabel: 'Iberia / Europe',
    centroid: [455, 195],
    d: 'M 440,175 L 475,175 L 470,215 L 435,210 Z',
    aliases: ['spain', 'es', 'esp', 'portugal', 'pt', 'iberia', 'europe', 'emea'],
    parentRegion: 'Europe',
  },
  {
    id: 'nordics',
    name: 'Nordics & Scandinavia',
    label: 'Sweden & Norway',
    subLabel: 'Northern Europe',
    centroid: [530, 90],
    d: 'M 505,60 L 550,65 L 550,125 L 515,120 Z',
    aliases: ['sweden', 'norway', 'denmark', 'finland', 'nordic', 'scandinavia', 'europe', 'emea'],
    parentRegion: 'Europe',
  },
  {
    id: 'eastern_europe',
    name: 'Central & Eastern Europe',
    label: 'Poland & Eastern EU',
    subLabel: 'Europe',
    centroid: [560, 155],
    d: 'M 530,130 L 590,130 L 585,185 L 525,180 Z',
    aliases: ['poland', 'pl', 'pol', 'czech', 'hungary', 'austria', 'switzerland', 'romania', 'europe', 'emea'],
    parentRegion: 'Europe',
  },

  // Asia & Oceania
  {
    id: 'india',
    name: 'India',
    label: 'India',
    subLabel: 'IN / South Asia',
    centroid: [700, 245],
    d: 'M 670,205 L 730,205 L 725,255 L 700,295 L 675,255 Z',
    aliases: ['india', 'in', 'ind', 'bharat', 'asia', 'apac', 'south asia'],
    parentRegion: 'Asia Pacific',
  },
  {
    id: 'china',
    name: 'China',
    label: 'China',
    subLabel: 'CN / East Asia',
    centroid: [755, 185],
    d: 'M 680,140 L 830,145 L 820,230 L 740,245 L 685,200 Z',
    aliases: ['china', 'cn', 'chn', 'prc', 'asia', 'apac', 'east asia'],
    parentRegion: 'Asia Pacific',
  },
  {
    id: 'japan',
    name: 'Japan & Korea',
    label: 'Japan & South Korea',
    subLabel: 'East Asia / APAC',
    centroid: [860, 190],
    d: 'M 850,160 L 875,165 L 860,220 L 840,215 Z M 830,175 L 845,178 L 842,198 L 828,195 Z',
    aliases: ['japan', 'jp', 'jpn', 'korea', 'south korea', 'kr', 'asia', 'apac'],
    parentRegion: 'Asia Pacific',
  },
  {
    id: 'southeast_asia',
    name: 'Southeast Asia',
    label: 'ASEAN & Singapore',
    subLabel: 'APAC / SE Asia',
    centroid: [780, 290],
    d: 'M 740,250 L 820,260 L 840,320 L 760,330 Z',
    aliases: ['singapore', 'sg', 'indonesia', 'id', 'malaysia', 'my', 'thailand', 'vietnam', 'philippines', 'southeast asia', 'asean', 'apac'],
    parentRegion: 'Asia Pacific',
  },
  {
    id: 'australia',
    name: 'Australia & New Zealand',
    label: 'Australia & NZ',
    subLabel: 'Oceania / APAC',
    centroid: [840, 385],
    d: 'M 790,340 L 895,335 L 905,420 L 810,430 L 775,380 Z M 915,410 L 935,415 L 910,465 L 895,455 Z',
    aliases: ['australia', 'au', 'aus', 'new zealand', 'nz', 'oceania', 'anz', 'apac'],
    parentRegion: 'Asia Pacific',
  },

  // Middle East & Africa
  {
    id: 'middle_east',
    name: 'Middle East',
    label: 'Middle East & Gulf',
    subLabel: 'UAE, Saudi Arabia, Gulf',
    centroid: [615, 225],
    d: 'M 580,185 L 655,185 L 660,245 L 610,260 L 575,215 Z',
    aliases: ['middle east', 'uae', 'united arab emirates', 'dubai', 'saudi arabia', 'saudi', 'ksa', 'qatar', 'turkey', 'israel', 'emea'],
    parentRegion: 'Middle East',
  },
  {
    id: 'north_africa',
    name: 'North Africa',
    label: 'North Africa',
    subLabel: 'Egypt, Morocco, Maghreb',
    centroid: [520, 240],
    d: 'M 450,215 L 600,215 L 590,265 L 450,265 Z',
    aliases: ['egypt', 'morocco', 'north africa', 'maghreb', 'algeria', 'emea', 'africa'],
    parentRegion: 'Middle East',
  },
  {
    id: 'sub_saharan_africa',
    name: 'Sub-Saharan & South Africa',
    label: 'Sub-Saharan Africa',
    subLabel: 'South Africa, Nigeria, Kenya',
    centroid: [545, 345],
    d: 'M 460,265 L 620,265 L 590,430 L 525,425 L 500,345 Z',
    aliases: ['south africa', 'za', 'nigeria', 'kenya', 'africa', 'sub-saharan', 'emea'],
    parentRegion: 'Europe',
  },
  {
    id: 'russia_eurasia',
    name: 'Eurasia & Northern Asia',
    label: 'Eurasia / North',
    subLabel: 'Northern Continental',
    centroid: [710, 95],
    d: 'M 550,60 L 890,60 L 870,130 L 710,135 L 590,125 Z',
    aliases: ['russia', 'ru', 'eurasia', 'kazakhstan', 'emea'],
    parentRegion: 'Europe',
  },
];

// ==========================================
// 2. US STATES REAL BOUNDARIES (960 x 600)
// ==========================================
const US_STATES_ENTITIES: GeoEntity[] = [
  // West Coast
  {
    id: 'CA',
    name: 'California',
    label: 'California (CA)',
    subLabel: 'Silicon Valley, LA, Tech',
    centroid: [120, 280],
    d: 'M 58,175 L 158,188 L 135,310 L 210,400 L 170,415 L 115,340 L 58,230 Z',
    aliases: ['california', 'ca', 'calif', 'norcal', 'socal', 'san francisco', 'los angeles', 'silicon valley'],
  },
  {
    id: 'WA',
    name: 'Washington',
    label: 'Washington (WA)',
    subLabel: 'Seattle Metro & Pacific NW',
    centroid: [125, 75],
    d: 'M 80,40 L 175,55 L 165,115 L 85,100 Z',
    aliases: ['washington', 'wa', 'seattle'],
  },
  {
    id: 'OR',
    name: 'Oregon',
    label: 'Oregon (OR)',
    subLabel: 'Portland & Silicon Forest',
    centroid: [115, 145],
    d: 'M 70,105 L 168,118 L 160,185 L 60,170 Z',
    aliases: ['oregon', 'or', 'portland'],
  },
  {
    id: 'NV',
    name: 'Nevada',
    label: 'Nevada (NV)',
    subLabel: 'Las Vegas & Reno',
    centroid: [175, 250],
    d: 'M 160,185 L 225,195 L 205,320 L 138,308 Z',
    aliases: ['nevada', 'nv', 'las vegas'],
  },
  {
    id: 'AZ',
    name: 'Arizona',
    label: 'Arizona (AZ)',
    subLabel: 'Phoenix & Desert Silicon',
    centroid: [245, 375],
    d: 'M 205,320 L 295,330 L 280,440 L 205,410 L 210,395 Z',
    aliases: ['arizona', 'az', 'phoenix'],
  },
  {
    id: 'UT',
    name: 'Utah',
    label: 'Utah (UT)',
    subLabel: 'Salt Lake City & Silicon Slopes',
    centroid: [255, 260],
    d: 'M 225,195 L 305,205 L 295,325 L 210,315 Z',
    aliases: ['utah', 'ut', 'salt lake city'],
  },
  {
    id: 'ID',
    name: 'Idaho',
    label: 'Idaho (ID)',
    subLabel: 'Boise & Northwest Basin',
    centroid: [195, 130],
    d: 'M 175,55 L 220,60 L 205,145 L 245,150 L 230,205 L 168,190 L 175,115 Z',
    aliases: ['idaho', 'id', 'boise'],
  },

  // Mountain & Southwest
  {
    id: 'TX',
    name: 'Texas',
    label: 'Texas (TX)',
    subLabel: 'Austin, Dallas, Houston',
    centroid: [415, 450],
    d: 'M 345,355 L 415,355 L 420,395 L 495,395 L 505,455 L 465,540 L 410,510 L 365,475 L 315,415 L 340,390 Z',
    aliases: ['texas', 'tx', 'tex', 'austin', 'dallas', 'houston'],
  },
  {
    id: 'CO',
    name: 'Colorado',
    label: 'Colorado (CO)',
    subLabel: 'Denver & Boulder',
    centroid: [350, 275],
    d: 'M 295,230 L 420,240 L 410,320 L 290,310 Z',
    aliases: ['colorado', 'co', 'denver', 'boulder'],
  },
  {
    id: 'NM',
    name: 'New Mexico',
    label: 'New Mexico (NM)',
    subLabel: 'Albuquerque & Santa Fe',
    centroid: [345, 385],
    d: 'M 295,330 L 400,335 L 390,440 L 285,435 Z',
    aliases: ['new mexico', 'nm', 'albuquerque'],
  },
  {
    id: 'MT',
    name: 'Montana',
    label: 'Montana (MT)',
    subLabel: 'Northern Rockies',
    centroid: [290, 105],
    d: 'M 220,60 L 375,75 L 360,150 L 205,140 Z',
    aliases: ['montana', 'mt'],
  },
  {
    id: 'WY',
    name: 'Wyoming',
    label: 'Wyoming (WY)',
    subLabel: 'Central Rockies',
    centroid: [295, 190],
    d: 'M 245,150 L 360,160 L 350,235 L 235,225 Z',
    aliases: ['wyoming', 'wy'],
  },

  // Midwest & Plains
  {
    id: 'IL',
    name: 'Illinois',
    label: 'Illinois (IL)',
    subLabel: 'Chicago Metro Hub',
    centroid: [585, 255],
    d: 'M 555,205 L 610,210 L 595,310 L 565,305 Z',
    aliases: ['illinois', 'il', 'chicago'],
  },
  {
    id: 'MI',
    name: 'Michigan',
    label: 'Michigan (MI)',
    subLabel: 'Detroit & Great Lakes',
    centroid: [630, 155],
    d: 'M 590,110 L 665,120 L 660,195 L 605,190 Z',
    aliases: ['michigan', 'mi', 'detroit'],
  },
  {
    id: 'OH',
    name: 'Ohio',
    label: 'Ohio (OH)',
    subLabel: 'Columbus, Cleveland, Cincy',
    centroid: [680, 250],
    d: 'M 655,215 L 720,220 L 710,285 L 648,280 Z',
    aliases: ['ohio', 'oh', 'columbus', 'cleveland'],
  },
  {
    id: 'PA',
    name: 'Pennsylvania',
    label: 'Pennsylvania (PA)',
    subLabel: 'Philadelphia & Pittsburgh',
    centroid: [755, 230],
    d: 'M 715,205 L 805,210 L 795,255 L 705,250 Z',
    aliases: ['pennsylvania', 'pa', 'philadelphia', 'pittsburgh'],
  },
  {
    id: 'IN',
    name: 'Indiana',
    label: 'Indiana (IN)',
    subLabel: 'Indianapolis',
    centroid: [630, 255],
    d: 'M 610,210 L 655,215 L 645,295 L 605,290 Z',
    aliases: ['indiana', 'in', 'indianapolis'],
  },
  {
    id: 'WI',
    name: 'Wisconsin',
    label: 'Wisconsin (WI)',
    subLabel: 'Milwaukee & Madison',
    centroid: [575, 155],
    d: 'M 545,115 L 610,125 L 600,195 L 540,190 Z',
    aliases: ['wisconsin', 'wi', 'milwaukee', 'madison'],
  },
  {
    id: 'MN',
    name: 'Minnesota',
    label: 'Minnesota (MN)',
    subLabel: 'Twin Cities',
    centroid: [515, 130],
    d: 'M 480,85 L 560,90 L 545,175 L 470,175 Z',
    aliases: ['minnesota', 'mn', 'minneapolis'],
  },
  {
    id: 'MO',
    name: 'Missouri',
    label: 'Missouri (MO)',
    subLabel: 'St. Louis & Kansas City',
    centroid: [535, 315],
    d: 'M 495,270 L 575,275 L 570,360 L 515,365 L 490,335 Z',
    aliases: ['missouri', 'mo', 'st louis', 'kansas city'],
  },

  // Northeast & Mid-Atlantic
  {
    id: 'NY',
    name: 'New York',
    label: 'New York (NY)',
    subLabel: 'NYC Metro, Albany, Buffalo',
    centroid: [775, 175],
    d: 'M 735,130 L 825,140 L 815,215 L 730,205 Z',
    aliases: ['new york', 'ny', 'nyc', 'manhattan', 'brooklyn'],
  },
  {
    id: 'MA',
    name: 'Massachusetts',
    label: 'Massachusetts (MA)',
    subLabel: 'Boston Biotech Hub',
    centroid: [840, 150],
    d: 'M 815,135 L 865,130 L 860,170 L 815,165 Z',
    aliases: ['massachusetts', 'ma', 'boston', 'cambridge'],
  },
  {
    id: 'NJ',
    name: 'New Jersey',
    label: 'New Jersey (NJ)',
    subLabel: 'Pharma Corridor',
    centroid: [812, 235],
    d: 'M 805,210 L 825,215 L 815,265 L 800,260 Z',
    aliases: ['new jersey', 'nj', 'newark', 'princeton'],
  },
  {
    id: 'VA',
    name: 'Virginia',
    label: 'Virginia (VA)',
    subLabel: 'Northern Virginia Cloud Belt',
    centroid: [750, 315],
    d: 'M 705,295 L 805,300 L 795,340 L 700,335 Z',
    aliases: ['virginia', 'va', 'richmond', 'arlington'],
  },

  // Southeast
  {
    id: 'FL',
    name: 'Florida',
    label: 'Florida (FL)',
    subLabel: 'Miami, Orlando, Tampa',
    centroid: [710, 500],
    d: 'M 645,460 L 735,465 L 760,545 L 720,540 L 710,485 L 640,480 Z',
    aliases: ['florida', 'fl', 'fla', 'miami', 'orlando', 'tampa'],
  },
  {
    id: 'GA',
    name: 'Georgia',
    label: 'Georgia (GA)',
    subLabel: 'Atlanta Tech Corridor',
    centroid: [680, 410],
    d: 'M 655,365 L 720,370 L 700,460 L 645,455 Z',
    aliases: ['georgia', 'ga', 'atlanta'],
  },
  {
    id: 'NC',
    name: 'North Carolina',
    label: 'North Carolina (NC)',
    subLabel: 'Research Triangle & Charlotte',
    centroid: [755, 360],
    d: 'M 705,335 L 815,340 L 795,385 L 710,380 Z',
    aliases: ['north carolina', 'nc', 'charlotte', 'raleigh', 'durham'],
  },
  {
    id: 'TN',
    name: 'Tennessee',
    label: 'Tennessee (TN)',
    subLabel: 'Nashville & Memphis',
    centroid: [645, 345],
    d: 'M 575,325 L 725,330 L 715,365 L 570,360 Z',
    aliases: ['tennessee', 'tn', 'nashville', 'memphis'],
  },
];

// ==========================================
// 3. INDIA STATES REAL BOUNDARIES (700 x 800)
// ==========================================
const INDIA_STATES_ENTITIES: GeoEntity[] = [
  // West & Central
  {
    id: 'MH',
    name: 'Maharashtra',
    label: 'Maharashtra',
    subLabel: 'Mumbai, Pune, Industrial Hub',
    centroid: [260, 465],
    d: 'M 185,410 L 335,405 L 340,515 L 245,530 L 180,480 Z',
    aliases: ['maharashtra', 'mh', 'mumbai', 'pune', 'nagpur', 'nashik', 'thane'],
  },
  {
    id: 'GJ',
    name: 'Gujarat',
    label: 'Gujarat',
    subLabel: 'Ahmedabad, Surat, Gift City',
    centroid: [165, 380],
    d: 'M 120,335 L 210,330 L 215,415 L 145,430 L 115,385 Z',
    aliases: ['gujarat', 'gj', 'ahmedabad', 'surat', 'vadodara', 'gift city'],
  },
  {
    id: 'MP',
    name: 'Madhya Pradesh',
    label: 'Madhya Pradesh',
    subLabel: 'Indore, Bhopal',
    centroid: [310, 365],
    d: 'M 240,320 L 390,325 L 380,410 L 245,415 Z',
    aliases: ['madhya pradesh', 'mp', 'indore', 'bhopal'],
  },

  // South
  {
    id: 'KA',
    name: 'Karnataka',
    label: 'Karnataka',
    subLabel: 'Bengaluru Silicon Capital',
    centroid: [255, 565],
    d: 'M 215,505 L 295,500 L 285,630 L 225,620 Z',
    aliases: ['karnataka', 'ka', 'bengaluru', 'bangalore', 'mysuru', 'silicon valley of india'],
  },
  {
    id: 'TN',
    name: 'Tamil Nadu',
    label: 'Tamil Nadu',
    subLabel: 'Chennai Auto & SaaS Hub',
    centroid: [305, 660],
    d: 'M 275,600 L 345,595 L 325,725 L 265,725 Z',
    aliases: ['tamil nadu', 'tn', 'chennai', 'coimbatore', 'madurai'],
  },
  {
    id: 'TS',
    name: 'Telangana',
    label: 'Telangana',
    subLabel: 'Hyderabad Cyberabad Tech',
    centroid: [325, 480],
    d: 'M 285,445 L 365,440 L 355,515 L 280,510 Z',
    aliases: ['telangana', 'ts', 'tg', 'hyderabad', 'cyberabad'],
  },
  {
    id: 'AP',
    name: 'Andhra Pradesh',
    label: 'Andhra Pradesh',
    subLabel: 'Visakhapatnam, Amaravati',
    centroid: [350, 545],
    d: 'M 295,490 L 415,485 L 375,610 L 285,585 Z',
    aliases: ['andhra pradesh', 'ap', 'vizag', 'visakhapatnam', 'amaravati'],
  },
  {
    id: 'KL',
    name: 'Kerala',
    label: 'Kerala',
    subLabel: 'Kochi, Thiruvananthapuram',
    centroid: [255, 675],
    d: 'M 240,625 L 275,625 L 265,730 L 235,720 Z',
    aliases: ['kerala', 'kl', 'kochi', 'thiruvananthapuram', 'calicut'],
  },

  // North
  {
    id: 'DL',
    name: 'Delhi & NCR',
    label: 'Delhi (NCR)',
    subLabel: 'National Capital Region',
    centroid: [285, 235],
    d: 'M 265,210 L 315,215 L 305,265 L 255,255 Z',
    aliases: ['delhi', 'dl', 'new delhi', 'ncr', 'gurugram', 'noida'],
  },
  {
    id: 'UP',
    name: 'Uttar Pradesh',
    label: 'Uttar Pradesh',
    subLabel: 'Lucknow, Noida, Kanpur',
    centroid: [355, 285],
    d: 'M 295,235 L 435,245 L 420,335 L 275,325 Z',
    aliases: ['uttar pradesh', 'up', 'lucknow', 'kanpur', 'varanasi'],
  },
  {
    id: 'RJ',
    name: 'Rajasthan',
    label: 'Rajasthan',
    subLabel: 'Jaipur, Jodhpur',
    centroid: [215, 280],
    d: 'M 160,220 L 275,225 L 270,330 L 175,340 L 140,270 Z',
    aliases: ['rajasthan', 'rj', 'jaipur', 'jodhpur', 'udaipur'],
  },
  {
    id: 'PB',
    name: 'Punjab & Haryana',
    label: 'Punjab & Haryana',
    subLabel: 'Chandigarh, Ludhiana',
    centroid: [255, 190],
    d: 'M 235,160 L 285,165 L 275,225 L 225,215 Z',
    aliases: ['punjab', 'pb', 'haryana', 'hr', 'chandigarh', 'ludhiana'],
  },

  // East & North-East
  {
    id: 'WB',
    name: 'West Bengal',
    label: 'West Bengal',
    subLabel: 'Kolkata Commercial Port',
    centroid: [500, 385],
    d: 'M 485,325 L 535,330 L 515,445 L 465,420 Z',
    aliases: ['west bengal', 'wb', 'kolkata', 'calcutta'],
  },
  {
    id: 'OD',
    name: 'Odisha',
    label: 'Odisha',
    subLabel: 'Bhubaneswar, Mineral Basin',
    centroid: [425, 445],
    d: 'M 385,400 L 475,395 L 450,490 L 375,480 Z',
    aliases: ['odisha', 'orissa', 'bhubaneswar', 'cuttack'],
  },
  {
    id: 'NE',
    name: 'Assam & North-East',
    label: 'Assam & North-East',
    subLabel: 'Guwahati & Seven Sisters',
    centroid: [580, 300],
    d: 'M 520,265 L 640,260 L 630,340 L 530,340 Z',
    aliases: ['assam', 'guwahati', 'north east', 'meghalaya', 'tripura'],
  },
];

// ==============================================================
// 4. REAL-WORLD STATE SUB-DIVISIONS & DISTRICTS (Counties/Districts)
// ==============================================================
const STATE_DISTRICTS_REGISTRY: Record<
  string,
  { stateName: string; viewBox: string; entities: GeoEntity[] }
> = {
  california: {
    stateName: 'California (CA Counties & Metro Sub-Divisions)',
    viewBox: '0 0 600 700',
    entities: [
      {
        id: 'ca_la',
        name: 'Los Angeles County',
        label: 'Los Angeles County',
        subLabel: 'LA Metro, Long Beach, Pasadena',
        centroid: [290, 480],
        d: 'M 260,450 L 330,455 L 325,510 L 255,500 Z',
        aliases: ['los angeles', 'la', 'la county', 'los angeles county', 'long beach', 'pasadena', 'burbank'],
      },
      {
        id: 'ca_oc',
        name: 'Orange County',
        label: 'Orange County',
        subLabel: 'Irvine, Anaheim, Newport Beach',
        centroid: [300, 520],
        d: 'M 285,500 L 330,505 L 320,540 L 275,535 Z',
        aliases: ['orange county', 'oc', 'irvine', 'anaheim', 'santa ana', 'newport beach'],
      },
      {
        id: 'ca_sd',
        name: 'San Diego County',
        label: 'San Diego County',
        subLabel: 'San Diego, La Jolla, Biotech',
        centroid: [345, 565],
        d: 'M 315,530 L 385,535 L 375,595 L 305,590 Z',
        aliases: ['san diego', 'san diego county', 'sd', 'la jolla', 'chula vista'],
      },
      {
        id: 'ca_sv',
        name: 'Santa Clara County (Silicon Valley)',
        label: 'Santa Clara & Silicon Valley',
        subLabel: 'San Jose, Palo Alto, Sunnyvale',
        centroid: [180, 360],
        d: 'M 160,335 L 210,340 L 200,385 L 150,380 Z',
        aliases: ['santa clara', 'san jose', 'silicon valley', 'palo alto', 'mountain view', 'sunnyvale', 'cupertino'],
      },
      {
        id: 'ca_sf',
        name: 'San Francisco & Bay Area',
        label: 'San Francisco & East Bay',
        subLabel: 'SF, Oakland, Berkeley, Contra Costa',
        centroid: [170, 315],
        d: 'M 145,295 L 205,295 L 200,340 L 140,335 Z',
        aliases: ['san francisco', 'sf', 'oakland', 'berkeley', 'alameda', 'contra costa', 'bay area'],
      },
      {
        id: 'ca_ie',
        name: 'Inland Empire (Riverside & San Bernardino)',
        label: 'Riverside & San Bernardino',
        subLabel: 'Logistics Hub, Ontario, Palm Springs',
        centroid: [395, 435],
        d: 'M 330,390 L 470,395 L 465,540 L 325,535 Z',
        aliases: ['riverside', 'san bernardino', 'inland empire', 'ontario', 'palm springs'],
      },
      {
        id: 'ca_sac',
        name: 'Sacramento Capital Region',
        label: 'Sacramento County',
        subLabel: 'Sacramento, Davis, Roseville',
        centroid: [225, 270],
        d: 'M 195,240 L 265,245 L 255,300 L 185,295 Z',
        aliases: ['sacramento', 'sacramento county', 'sac', 'davis', 'roseville'],
      },
      {
        id: 'ca_cv',
        name: 'Central Valley (Fresno & Kern)',
        label: 'Fresno & Central Valley',
        subLabel: 'Fresno, Bakersfield, Agriculture',
        centroid: [275, 370],
        d: 'M 220,330 L 330,335 L 320,450 L 220,445 Z',
        aliases: ['fresno', 'kern', 'bakersfield', 'central valley', 'modesto', 'stockton'],
      },
      {
        id: 'ca_north',
        name: 'Northern California & Wine Country',
        label: 'North Coast & Wine Country',
        subLabel: 'Napa, Sonoma, Marin, Humboldt',
        centroid: [200, 135],
        d: 'M 140,80 L 275,85 L 265,240 L 140,235 Z',
        aliases: ['napa', 'sonoma', 'marin', 'wine country', 'redding', 'shasta'],
      },
    ],
  },

  texas: {
    stateName: 'Texas (TX Counties & Metro Sub-Divisions)',
    viewBox: '0 0 700 650',
    entities: [
      {
        id: 'tx_harris',
        name: 'Harris County (Houston Metro)',
        label: 'Harris County (Houston)',
        subLabel: 'Houston, Energy Corridor, Port',
        centroid: [475, 450],
        d: 'M 450,420 L 510,425 L 500,475 L 440,470 Z',
        aliases: ['harris', 'harris county', 'houston', 'woodlands', 'katy', 'baytown'],
      },
      {
        id: 'tx_dallas',
        name: 'Dallas & Collin Counties',
        label: 'Dallas & North Texas',
        subLabel: 'Dallas, Plano, Frisco, Tech Corridor',
        centroid: [395, 255],
        d: 'M 350,200 L 440,205 L 430,285 L 340,280 Z',
        aliases: ['dallas', 'collin', 'plano', 'frisco', 'richardson', 'irving'],
      },
      {
        id: 'tx_tarrant',
        name: 'Tarrant County (Fort Worth)',
        label: 'Tarrant County (Fort Worth)',
        subLabel: 'Fort Worth, Arlington, Aerospace',
        centroid: [340, 255],
        d: 'M 315,230 L 370,235 L 365,285 L 310,280 Z',
        aliases: ['tarrant', 'fort worth', 'ft worth', 'arlington'],
      },
      {
        id: 'tx_travis',
        name: 'Travis County (Austin Metro)',
        label: 'Travis County (Austin)',
        subLabel: 'Silicon Hills, Austin Tech',
        centroid: [370, 385],
        d: 'M 345,355 L 405,360 L 395,410 L 335,405 Z',
        aliases: ['travis', 'austin', 'round rock', 'silicon hills'],
      },
      {
        id: 'tx_bexar',
        name: 'Bexar County (San Antonio)',
        label: 'Bexar County (San Antonio)',
        subLabel: 'San Antonio, Cyber Security Hub',
        centroid: [330, 435],
        d: 'M 305,405 L 365,410 L 355,465 L 295,460 Z',
        aliases: ['bexar', 'san antonio', 'bexar county'],
      },
      {
        id: 'tx_west',
        name: 'El Paso & West Texas',
        label: 'El Paso & Permian Basin',
        subLabel: 'El Paso, Midland, Odessa',
        centroid: [100, 335],
        d: 'M 70,300 L 135,305 L 125,365 L 60,360 Z',
        aliases: ['el paso', 'midland', 'odessa', 'permian', 'west texas'],
      },
      {
        id: 'tx_valley',
        name: 'Rio Grande Valley',
        label: 'Rio Grande Valley',
        subLabel: 'McAllen, Brownsville',
        centroid: [350, 590],
        d: 'M 320,560 L 390,565 L 375,625 L 310,615 Z',
        aliases: ['rio grande', 'mcallen', 'brownsville', 'hidalgo', 'cameron'],
      },
    ],
  },

  maharashtra: {
    stateName: 'Maharashtra (India District Sub-Divisions)',
    viewBox: '0 0 700 650',
    entities: [
      {
        id: 'mh_mumbai',
        name: 'Mumbai Metro (City & Suburban)',
        label: 'Mumbai Metro',
        subLabel: 'Financial Capital, BKC, Nariman Point',
        centroid: [135, 305],
        d: 'M 115,280 L 155,280 L 150,335 L 110,335 Z',
        aliases: ['mumbai', 'bombay', 'mumbai suburban', 'mumbai city', 'bkc', 'navi mumbai'],
      },
      {
        id: 'mh_pune',
        name: 'Pune District',
        label: 'Pune District',
        subLabel: 'IT Hub, Hinjawadi, Auto Cluster',
        centroid: [220, 360],
        d: 'M 175,320 L 265,320 L 255,405 L 165,405 Z',
        aliases: ['pune', 'poona', 'hinjawadi', 'pcmc', 'pimpri'],
      },
      {
        id: 'mh_thane',
        name: 'Thane & Palghar',
        label: 'Thane & Palghar',
        subLabel: 'Industrial Corridor & Warehousing',
        centroid: [170, 270],
        d: 'M 140,240 L 205,240 L 195,305 L 135,300 Z',
        aliases: ['thane', 'palghar', 'kalyan', 'dombivli'],
      },
      {
        id: 'mh_nagpur',
        name: 'Nagpur & Vidarbha',
        label: 'Nagpur District',
        subLabel: 'Orange City, MIHAN Cargo Hub',
        centroid: [525, 205],
        d: 'M 480,160 L 575,160 L 565,245 L 470,240 Z',
        aliases: ['nagpur', 'vidarbha', 'mihan', 'wardha'],
      },
      {
        id: 'mh_nashik',
        name: 'Nashik District',
        label: 'Nashik District',
        subLabel: 'Wine Capital & Manufacturing',
        centroid: [220, 245],
        d: 'M 175,200 L 270,200 L 260,285 L 165,280 Z',
        aliases: ['nashik', 'nasik', 'deolali', 'sula'],
      },
      {
        id: 'mh_csn',
        name: 'Chhatrapati Sambhajinagar (Aurangabad)',
        label: 'Chhatrapati Sambhajinagar',
        subLabel: 'Industrial & Auto Hub',
        centroid: [315, 270],
        d: 'M 270,230 L 365,230 L 355,310 L 260,305 Z',
        aliases: ['aurangabad', 'chhatrapati sambhajinagar', 'sambhajinagar', 'waluj'],
      },
      {
        id: 'mh_kolhapur',
        name: 'Kolhapur & Sangli',
        label: 'Kolhapur & Sangli',
        subLabel: 'Foundry & Agro-Processing',
        centroid: [210, 500],
        d: 'M 175,460 L 250,460 L 240,535 L 165,530 Z',
        aliases: ['kolhapur', 'sangli', 'ichalkaranji'],
      },
    ],
  },
};

// ==========================================
// COLOR GENERATION FOR REAL CHOROPLETH
// ==========================================
function getChoroplethColor(
  intensity: number,
  hasData: boolean,
  isSelected: boolean,
  isDark: boolean
): string {
  if (isSelected) {
    return '#10B981'; // Vibrant Emerald
  }
  if (!hasData) {
    return isDark ? '#1E293B' : '#E2E8F0'; // Subtle slate
  }
  // Hue 158 (Emerald), lightness smoothly descending from 72% down to 28%
  const lightness = isDark
    ? Math.round(55 - intensity * 35)
    : Math.round(75 - intensity * 45);
  const saturation = Math.round(55 + intensity * 40);
  return `hsl(158, ${saturation}%, ${lightness}%)`;
}

// Format numbers compactly
function formatMetricVal(val: number, isCurrency = false): string {
  const prefix = isCurrency ? '$' : '';
  if (Math.abs(val) >= 1_000_000_000) {
    return `${prefix}${(val / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(val) >= 1_000_000) {
    return `${prefix}${(val / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(val) >= 1_000) {
    return `${prefix}${(val / 1_000).toFixed(1)}k`;
  }
  return `${prefix}${val.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
}

export function GeographicIntelligenceMap({
  rows,
  allDatasetRows = rows,
  columns = [],
  currentMetric,
  metricLabel,
  isCurrency = false,
  selectedRegion,
  onSelectRegion,
  className = '',
  isExpanded = false,
  onToggleExpand,
}: GeographicIntelligenceMapProps) {
  // Mode selection: user override or auto-detection
  const [userModeOverride, setUserModeOverride] = useState<GeographicGranularity | null>(null);
  const [selectedSubdivisionState, setSelectedSubdivisionState] = useState<string>('california');
  const [hoveredEntity, setHoveredEntity] = useState<{
    entity: GeoEntity;
    totalVal: number;
    count: number;
    share: number;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // 1. INTELLIGENT AUTO-DETECTION ENGINE
  const detectedGranularity = useMemo<{
    mode: GeographicGranularity;
    detectedState: string;
    reason: string;
    matchedCount: number;
  }>(() => {
    let worldScore = 0;
    let usStateScore = 0;
    let indiaStateScore = 0;
    let districtScore = 0;

    const sampleRows = allDatasetRows.slice(0, 200);

    // Identify candidate columns
    const geoColNames = columns
      .filter((c) => {
        const n = c.name.toLowerCase();
        return (
          n.includes('country') ||
          n.includes('state') ||
          n.includes('province') ||
          n.includes('district') ||
          n.includes('county') ||
          n.includes('city') ||
          n.includes('region') ||
          n.includes('location') ||
          n.includes('territory')
        );
      })
      .map((c) => c.name);

    // If no explicit geo columns found, test all string columns
    const targetCols = geoColNames.length > 0 ? geoColNames : Object.keys(sampleRows[0] || {});

    sampleRows.forEach((r) => {
      targetCols.forEach((col) => {
        const rawVal = (r[col] || '').toLowerCase().trim();
        if (!rawVal) return;

        // Check District / County matches
        Object.entries(STATE_DISTRICTS_REGISTRY).forEach(([stateKey, config]) => {
          config.entities.forEach((ent) => {
            if (ent.aliases.some((alias) => rawVal === alias || rawVal.includes(alias))) {
              districtScore += 3;
            }
          });
        });

        // Check US State matches
        US_STATES_ENTITIES.forEach((ent) => {
          if (ent.aliases.some((alias) => rawVal === alias || rawVal.includes(alias))) {
            usStateScore += 2;
          }
        });

        // Check India State matches
        INDIA_STATES_ENTITIES.forEach((ent) => {
          if (ent.aliases.some((alias) => rawVal === alias || rawVal.includes(alias))) {
            indiaStateScore += 2;
          }
        });

        // Check World matches
        WORLD_ENTITIES.forEach((ent) => {
          if (ent.aliases.some((alias) => rawVal === alias || rawVal.includes(alias))) {
            worldScore += 1;
          }
        });
      });
    });

    // Check if user has an active filter set
    if (selectedRegion && selectedRegion !== 'all') {
      const lower = selectedRegion.toLowerCase();
      if (lower.includes('california') || lower === 'ca') {
        return { mode: 'state-districts', detectedState: 'california', reason: 'Filtered by California', matchedCount: 1 };
      }
      if (lower.includes('texas') || lower === 'tx') {
        return { mode: 'state-districts', detectedState: 'texas', reason: 'Filtered by Texas', matchedCount: 1 };
      }
      if (lower.includes('maharashtra') || lower === 'mh') {
        return { mode: 'state-districts', detectedState: 'maharashtra', reason: 'Filtered by Maharashtra', matchedCount: 1 };
      }
    }

    // Determine highest score
    if (districtScore > 4) {
      return {
        mode: 'state-districts',
        detectedState: 'california',
        reason: 'Dataset contains County / District sub-divisions',
        matchedCount: districtScore,
      };
    }
    if (usStateScore >= indiaStateScore && usStateScore >= worldScore && usStateScore > 2) {
      return {
        mode: 'us-states',
        detectedState: 'california',
        reason: 'Dataset matches US State boundaries',
        matchedCount: usStateScore,
      };
    }
    if (indiaStateScore > usStateScore && indiaStateScore > worldScore && indiaStateScore > 2) {
      return {
        mode: 'india-states',
        detectedState: 'maharashtra',
        reason: 'Dataset matches India State boundaries',
        matchedCount: indiaStateScore,
      };
    }

    // Default to World view (e.g. Enterprise Global SaaS)
    return {
      mode: 'world',
      detectedState: 'california',
      reason: 'Global Continental & International entities detected',
      matchedCount: Math.max(worldScore, 1),
    };
  }, [allDatasetRows, columns, selectedRegion]);

  // Active granularity (override wins if set)
  const activeGranularity = userModeOverride || detectedGranularity.mode;
  const activeSubdivisionState =
    selectedSubdivisionState || detectedGranularity.detectedState || 'california';

  // 2. ACTIVE ENTITY REGISTRY FOR CHOSEN GRANULARITY
  const currentRegistry = useMemo<{
    entities: GeoEntity[];
    viewBox: string;
    mapTitle: string;
  }>(() => {
    if (activeGranularity === 'world') {
      return {
        entities: WORLD_ENTITIES,
        viewBox: '0 0 1000 500',
        mapTitle: 'World Sovereign Boundaries & Continental Choropleth',
      };
    }
    if (activeGranularity === 'us-states') {
      return {
        entities: US_STATES_ENTITIES,
        viewBox: '0 0 960 600',
        mapTitle: 'United States Geographic State Choropleth',
      };
    }
    if (activeGranularity === 'india-states') {
      return {
        entities: INDIA_STATES_ENTITIES,
        viewBox: '0 0 700 800',
        mapTitle: 'India National & State Regional Boundary Map',
      };
    }
    // 'state-districts'
    const reg = STATE_DISTRICTS_REGISTRY[activeSubdivisionState] || STATE_DISTRICTS_REGISTRY.california;
    return {
      entities: reg.entities,
      viewBox: reg.viewBox,
      mapTitle: reg.stateName,
    };
  }, [activeGranularity, activeSubdivisionState]);

  // 3. COMPUTE DYNAMIC METRICS PER ENTITY (Live Real Choropleth Data Binding)
  const entityDataMap = useMemo(() => {
    const map = new Map<
      string,
      { entity: GeoEntity; totalVal: number; count: number; share: number; intensity: number }
    >();

    let totalDatasetMetric = 0;

    // First sum total dataset metric
    rows.forEach((r) => {
      const v = parseFloat(r[currentMetric]);
      if (!isNaN(v)) totalDatasetMetric += v;
    });

    let maxEntityVal = 0;
    let minEntityVal = Infinity;

    // Match each entity against rows
    currentRegistry.entities.forEach((ent) => {
      let entSum = 0;
      let entCount = 0;

      rows.forEach((r) => {
        const val = parseFloat(r[currentMetric]) || 0;

        // Check all columns in row for alias matches
        const matches = Object.values(r).some((cell) => {
          const c = String(cell).toLowerCase().trim();
          if (!c) return false;
          return ent.aliases.some((alias) => c === alias || c.includes(alias) || alias.includes(c));
        });

        if (matches) {
          entSum += val;
          entCount += 1;
        }
      });

      if (entSum > maxEntityVal) maxEntityVal = entSum;
      if (entSum > 0 && entSum < minEntityVal) minEntityVal = entSum;

      map.set(ent.id, {
        entity: ent,
        totalVal: entSum,
        count: entCount,
        share: totalDatasetMetric > 0 ? (entSum / totalDatasetMetric) * 100 : 0,
        intensity: 0,
      });
    });

    // Compute normalized intensity (0.0 to 1.0)
    const range = maxEntityVal - (minEntityVal === Infinity ? 0 : minEntityVal) || 1;
    map.forEach((item, id) => {
      if (item.totalVal > 0) {
        const intensity = Math.max(0.15, Math.min(1.0, (item.totalVal - (minEntityVal === Infinity ? 0 : minEntityVal)) / range));
        map.set(id, { ...item, intensity });
      }
    });

    return { map, maxVal: maxEntityVal, minVal: minEntityVal === Infinity ? 0 : minEntityVal, totalMetric: totalDatasetMetric };
  }, [rows, currentMetric, currentRegistry]);

  // Top performing entity in view
  const topEntity = useMemo<{ name: string; val: number; share: number } | null>(() => {
    let top: { name: string; val: number; share: number } | null = null;
    entityDataMap.map.forEach((data) => {
      if (data.totalVal > 0) {
        if (!top || data.totalVal > top.val) {
          top = { name: data.entity.name, val: data.totalVal, share: data.share };
        }
      }
    });
    return top;
  }, [entityDataMap]);

  // Handle entity hover
  const handleMouseEnter = (ent: GeoEntity, e: React.MouseEvent<SVGPathElement>) => {
    const data = entityDataMap.map.get(ent.id);
    if (!data) return;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setHoveredEntity({
        entity: ent,
        totalVal: data.totalVal,
        count: data.count,
        share: data.share,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGPathElement>) => {
    if (hoveredEntity && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setHoveredEntity((prev) =>
        prev
          ? {
              ...prev,
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            }
          : null
      );
    }
  };

  const handleMouseLeave = () => {
    setHoveredEntity(null);
  };

  // Check if an entity is currently filtered/selected
  const isEntitySelected = (ent: GeoEntity) => {
    if (!selectedRegion || selectedRegion === 'all') return false;
    const lowerSel = selectedRegion.toLowerCase();
    return ent.aliases.some((alias) => lowerSel === alias || lowerSel.includes(alias));
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col justify-between select-none ${className}`}
    >
      {/* 1. MAP HEADER & LEVEL CONTROLS */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 mb-2 border-b border-[var(--lm-border-default)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <GlobeIcon className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-[var(--lm-text-primary)] tracking-tight">
                {currentRegistry.mapTitle}
              </h3>
            </div>
            <p className="text-[11px] text-[var(--lm-text-tertiary)] mt-0.5 flex items-center gap-1.5">
              <span>
                {userModeOverride ? 'Manual View' : `⚡ Auto: ${detectedGranularity.reason}`}
              </span>
              <span>•</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {metricLabel || currentMetric}
              </span>
            </p>
          </div>

          {/* Granularity Switcher Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl text-[11px] font-medium border border-slate-200 dark:border-slate-700/80">
            <button
              onClick={() => setUserModeOverride(null)}
              className={`px-2 py-1 rounded-lg transition-all ${
                userModeOverride === null
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Automatically select granularity based on dataset columns and row tokens"
            >
              🤖 Auto
            </button>
            <button
              onClick={() => setUserModeOverride('world')}
              className={`px-2 py-1 rounded-lg transition-all ${
                activeGranularity === 'world' && userModeOverride !== null
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🌐 World
            </button>
            <button
              onClick={() => setUserModeOverride('us-states')}
              className={`px-2 py-1 rounded-lg transition-all ${
                activeGranularity === 'us-states' && userModeOverride !== null
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🇺🇸 US States
            </button>
            <button
              onClick={() => setUserModeOverride('india-states')}
              className={`px-2 py-1 rounded-lg transition-all ${
                activeGranularity === 'india-states' && userModeOverride !== null
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🇮🇳 India
            </button>
            <button
              onClick={() => setUserModeOverride('state-districts')}
              className={`px-2 py-1 rounded-lg transition-all ${
                activeGranularity === 'state-districts' && userModeOverride !== null
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              📍 Districts
            </button>

            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                title={isExpanded ? 'Collapse Map' : 'Expand Map to Full Width'}
              >
                <MaximizeIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sub-division selector when in state-districts mode */}
        {activeGranularity === 'state-districts' && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-[10px] font-semibold text-slate-500">Target State:</span>
            <select
              value={activeSubdivisionState}
              onChange={(e) => setSelectedSubdivisionState(e.target.value)}
              className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="california">California (Counties & Bay Area)</option>
              <option value="texas">Texas (Counties & Houston/Austin)</option>
              <option value="maharashtra">Maharashtra (Districts & Mumbai/Pune)</option>
            </select>
          </div>
        )}
      </div>

      {/* 2. REAL SVG GEOGRAPHIC MAP CONTAINER */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden bg-slate-50/70 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center p-3 transition-all ${
          isExpanded ? 'h-[440px]' : 'h-64'
        }`}
      >
        <svg
          viewBox={currentRegistry.viewBox}
          className="w-full h-full max-h-full drop-shadow-sm transition-all duration-300"
        >
          <defs>
            <filter id="activeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10B981" floodOpacity="0.5" />
            </filter>
            <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="transparent" stopOpacity="0" />
              <stop offset="100%" stopColor="rgba(16, 185, 129, 0.03)" />
            </linearGradient>
          </defs>

          {/* SVG Map Background fill */}
          <rect width="100%" height="100%" fill="url(#oceanGradient)" rx="12" />

          {/* Real Boundary Polygons */}
          {currentRegistry.entities.map((ent) => {
            const data = entityDataMap.map.get(ent.id);
            const hasData = (data?.totalVal || 0) > 0 || (data?.count || 0) > 0;
            const isSelected = isEntitySelected(ent);
            const intensity = data?.intensity || 0;

            // Compute dynamic fill color
            const fillColor = getChoroplethColor(intensity, hasData, isSelected, false);

            return (
              <path
                key={ent.id}
                d={ent.d}
                fill={fillColor}
                stroke={isSelected ? '#059669' : hasData ? '#10B981' : '#94A3B8'}
                strokeWidth={isSelected ? 2.5 : hasData ? 1.25 : 0.75}
                strokeOpacity={hasData ? 0.9 : 0.3}
                filter={isSelected ? 'url(#activeGlow)' : undefined}
                className={`transition-all duration-200 ${
                  hasData
                    ? 'cursor-pointer hover:filter hover:brightness-110 hover:stroke-white dark:hover:stroke-slate-100 hover:stroke-[2px]'
                    : 'cursor-default opacity-40 hover:opacity-60'
                }`}
                onMouseEnter={(e) => handleMouseEnter(ent, e)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={() => {
                  if (hasData || isSelected) {
                    onSelectRegion(isSelected ? 'all' : ent.name);
                  }
                }}
              />
            );
          })}

          {/* Centroid Data Badges for Top Entities */}
          {currentRegistry.entities.map((ent) => {
            const data = entityDataMap.map.get(ent.id);
            if (!data || data.totalVal <= 0) return null;
            const isSelected = isEntitySelected(ent);

            return (
              <g
                key={`badge-${ent.id}`}
                transform={`translate(${ent.centroid[0]}, ${ent.centroid[1]})`}
                className="pointer-events-none select-none transition-transform"
              >
                <circle
                  r={isSelected ? 7 : Math.max(4, Math.min(8, 4 + data.intensity * 4))}
                  fill={isSelected ? '#10B981' : '#059669'}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  className={isSelected ? 'animate-pulse' : ''}
                />
                <text
                  y={13}
                  textAnchor="middle"
                  className="text-[9px] font-bold fill-slate-800 dark:fill-slate-100 drop-shadow-sm font-sans"
                >
                  {ent.id.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>

        {/* 3. FLOATING TOOLTIP ON HOVER */}
        {hoveredEntity && (
          <div
            className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-900/95 text-white p-3 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700/80 text-xs min-w-[190px]"
            style={{
              left: `${hoveredEntity.x}px`,
              top: `${hoveredEntity.y}px`,
            }}
          >
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
              <span className="font-bold text-emerald-400">{hoveredEntity.entity.label}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {hoveredEntity.entity.id.toUpperCase()}
              </span>
            </div>
            {hoveredEntity.entity.subLabel && (
              <p className="text-[10px] text-slate-400 mb-2 leading-tight">
                {hoveredEntity.entity.subLabel}
              </p>
            )}

            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total {metricLabel || currentMetric}:</span>
                <span className="font-bold font-mono text-emerald-300">
                  {formatMetricVal(hoveredEntity.totalVal, isCurrency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Active Records:</span>
                <span className="font-semibold font-mono text-slate-200">
                  {hoveredEntity.count} rows
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Dataset Share:</span>
                <span className="font-semibold font-mono text-cyan-400">
                  {hoveredEntity.share.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] text-emerald-400/90 text-center font-medium">
              {isEntitySelected(hoveredEntity.entity)
                ? '✕ Click to clear region filter'
                : '⚡ Click to filter dashboard to this region'}
            </div>
          </div>
        )}
      </div>

      {/* 4. FOOTER STATS & CHOROPLETH SCALE LEGEND */}
      <div className="mt-2.5 pt-2 border-t border-[var(--lm-border-default)] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {topEntity && (
            <span className="text-slate-600 dark:text-slate-300 text-[11px]">
              Top: <strong>{topEntity.name}</strong> ({formatMetricVal(topEntity.val, isCurrency)} •{' '}
              {topEntity.share.toFixed(1)}%)
            </span>
          )}
          {selectedRegion && selectedRegion !== 'all' && (
            <button
              onClick={() => onSelectRegion('all')}
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              Filtered: {selectedRegion} ✕
            </button>
          )}
        </div>

        {/* Gradient Intensity Scale */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span>Min (0)</span>
          <div className="w-16 h-2 rounded-full bg-gradient-to-r from-emerald-100 via-emerald-400 to-emerald-700" />
          <span>Max ({formatMetricVal(entityDataMap.maxVal, isCurrency)})</span>
        </div>
      </div>
    </div>
  );
}
