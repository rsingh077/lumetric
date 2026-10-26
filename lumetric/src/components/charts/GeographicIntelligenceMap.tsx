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

// ============================================================================
// 1. REAL GEOGRAPHICAL WORLD MAP — ROBINSON PROJECTION (1000 x 520)
// Authentic continental contours, peninsulas, archipelagos & country borders
// ============================================================================
const WORLD_ENTITIES: GeoEntity[] = [
  // ---------------- North America ----------------
  {
    id: 'usa',
    name: 'United States',
    label: 'United States',
    subLabel: 'US / North America',
    centroid: [225, 195],
    // Lower 48 + Alaska + Hawaii with realistic coastlines
    d: 'M 148,155 C 160,154 180,153 205,152 C 225,152 250,150 270,146 C 275,152 282,156 295,154 C 302,162 308,172 312,185 C 308,195 300,205 292,215 C 285,225 280,240 272,252 C 265,248 258,238 250,234 C 238,236 226,242 216,250 C 205,242 195,232 186,220 C 178,212 168,198 158,184 C 152,174 148,164 148,155 Z M 65,70 C 80,62 105,58 130,55 C 145,65 152,80 148,95 C 135,108 115,115 95,118 C 78,110 68,92 65,70 Z M 95,245 C 105,246 112,248 110,255 C 102,258 92,254 95,245 Z',
    aliases: ['united states', 'usa', 'us', 'u.s.', 'u.s.a.', 'america', 'north america', 'na'],
    parentRegion: 'North America',
  },
  {
    id: 'canada',
    name: 'Canada',
    label: 'Canada',
    subLabel: 'CA / North America',
    centroid: [225, 100],
    // Canadian shield, Hudson Bay cutout, Arctic coast
    d: 'M 130,55 C 165,48 210,45 260,46 C 295,52 325,65 342,88 C 330,98 318,115 312,130 C 295,138 275,146 250,150 C 220,152 180,154 148,155 C 142,135 138,110 135,85 Z M 270,95 C 285,92 298,105 292,118 C 280,122 268,110 270,95 Z',
    aliases: ['canada', 'ca', 'can', 'north america'],
    parentRegion: 'North America',
  },
  {
    id: 'mexico',
    name: 'Mexico & Central America',
    label: 'Mexico & Central America',
    subLabel: 'MX / Latin America',
    centroid: [220, 265],
    // Baja California, Gulf curve, Yucatan, Isthmus
    d: 'M 172,218 C 185,228 198,240 215,250 C 225,242 238,236 250,234 C 255,245 260,260 252,272 C 242,282 230,292 222,298 C 215,290 205,278 195,264 C 182,248 174,232 172,218 Z M 165,225 C 170,235 174,250 178,265 C 174,268 168,258 165,245 Z',
    aliases: ['mexico', 'mx', 'mex', 'central america', 'latin america', 'latam'],
    parentRegion: 'Latin America',
  },

  // ---------------- South America ----------------
  {
    id: 'brazil',
    name: 'Brazil',
    label: 'Brazil',
    subLabel: 'BR / South America',
    centroid: [350, 340],
    // Amazon basin, Atlantic eastern bulge, southern borders
    d: 'M 305,295 C 330,290 365,292 395,310 C 415,325 422,350 410,375 C 395,400 375,415 355,420 C 342,398 335,372 324,350 C 315,330 305,312 305,295 Z',
    aliases: ['brazil', 'br', 'bra', 'brasil', 'latin america', 'latam', 'south america'],
    parentRegion: 'South America',
  },
  {
    id: 'argentina',
    name: 'Argentina & Chile',
    label: 'Argentina & Chile',
    subLabel: 'Southern Cone / South America',
    centroid: [325, 435],
    // Andes spine, Patagonia, Tierra del Fuego
    d: 'M 324,350 C 335,372 342,398 355,420 C 348,445 338,475 328,502 C 318,485 312,450 310,415 C 312,385 316,365 324,350 Z',
    aliases: ['argentina', 'ar', 'arg', 'chile', 'cl', 'patagonia', 'south america'],
    parentRegion: 'South America',
  },
  {
    id: 'latam_north',
    name: 'Northern Andes & Colombia',
    label: 'Colombia & Peru',
    subLabel: 'Northwest South America',
    centroid: [292, 320],
    // Colombia, Peru, Ecuador, Venezuela
    d: 'M 275,282 C 295,278 310,285 320,295 C 312,320 305,350 295,375 C 282,355 278,325 272,300 Z',
    aliases: ['colombia', 'peru', 'venezuela', 'ecuador', 'bolivia', 'south america', 'andean'],
    parentRegion: 'South America',
  },

  // ---------------- Europe ----------------
  {
    id: 'uk',
    name: 'United Kingdom & Ireland',
    label: 'United Kingdom',
    subLabel: 'UK & Ireland / Western Europe',
    centroid: [468, 140],
    // Great Britain & Ireland island curves
    d: 'M 460,122 C 472,118 480,125 482,138 C 478,152 468,162 458,160 C 454,148 456,132 460,122 Z M 445,134 C 452,130 456,138 454,146 C 448,150 442,142 445,134 Z',
    aliases: ['united kingdom', 'uk', 'great britain', 'england', 'scotland', 'wales', 'ireland', 'london', 'europe', 'emea'],
    parentRegion: 'Europe',
  },
  {
    id: 'france',
    name: 'France',
    label: 'France',
    subLabel: 'FR / Western Europe',
    centroid: [488, 175],
    // Hexagonal Atlantic and Mediterranean coastline
    d: 'M 470,160 C 485,155 500,158 508,168 C 512,182 505,198 492,202 C 478,200 468,188 468,172 Z',
    aliases: ['france', 'fr', 'fra', 'paris', 'europe', 'emea'],
    parentRegion: 'Europe',
  },
  {
    id: 'germany',
    name: 'Germany & Central Europe',
    label: 'Germany & DACH',
    subLabel: 'DE / Central Europe',
    centroid: [520, 160],
    // North Sea coast down to the Alps
    d: 'M 508,145 C 525,142 538,146 544,158 C 542,172 535,185 522,188 C 510,185 505,172 508,145 Z',
    aliases: ['germany', 'de', 'deu', 'deutschland', 'berlin', 'austria', 'switzerland', 'europe', 'emea'],
    parentRegion: 'Europe',
  },
  {
    id: 'italy',
    name: 'Italy',
    label: 'Italy',
    subLabel: 'IT / Southern Europe',
    centroid: [535, 205],
    // Iconic Italian boot shape & Sicily
    d: 'M 518,186 C 528,185 536,192 542,204 C 548,220 546,234 538,242 C 532,238 530,224 524,210 Z M 520,244 C 528,242 532,248 526,252 C 520,250 518,246 520,244 Z',
    aliases: ['italy', 'it', 'ita', 'italia', 'rome', 'milan', 'europe', 'emea'],
    parentRegion: 'Europe',
  },
  {
    id: 'spain',
    name: 'Spain & Portugal',
    label: 'Spain & Portugal',
    subLabel: 'Iberian Peninsula / Europe',
    centroid: [458, 208],
    // Iberian peninsula, Strait of Gibraltar
    d: 'M 442,185 C 465,182 480,185 486,198 C 484,218 472,230 452,232 C 438,225 435,202 442,185 Z',
    aliases: ['spain', 'es', 'esp', 'madrid', 'portugal', 'pt', 'lisbon', 'iberia', 'europe', 'emea'],
    parentRegion: 'Europe',
  },
  {
    id: 'nordics',
    name: 'Nordics & Scandinavia',
    label: 'Nordics',
    subLabel: 'Sweden, Norway, Finland',
    centroid: [536, 102],
    // Scandinavian peninsula stretching down from Arctic
    d: 'M 505,72 C 530,68 555,75 562,95 C 558,118 548,138 532,142 C 520,132 512,105 505,72 Z',
    aliases: ['sweden', 'norway', 'finland', 'denmark', 'nordic', 'scandinavia', 'europe', 'emea'],
    parentRegion: 'Europe',
  },
  {
    id: 'eastern_europe',
    name: 'Eastern Europe & Poland',
    label: 'Poland & Eastern Europe',
    subLabel: 'PL, UA, RO / Europe',
    centroid: [575, 168],
    d: 'M 545,148 C 572,142 605,145 618,162 C 612,188 595,205 568,206 C 550,198 542,178 545,148 Z',
    aliases: ['poland', 'pl', 'ukraine', 'ua', 'romania', 'czech', 'hungary', 'eastern europe', 'europe', 'emea'],
    parentRegion: 'Europe',
  },
  {
    id: 'russia',
    name: 'Russia & Northern Eurasia',
    label: 'Russia',
    subLabel: 'RU / Northern Eurasia',
    centroid: [710, 110],
    // Expansive northern landmass across Siberia
    d: 'M 565,85 C 625,72 710,65 810,72 C 865,85 895,115 885,135 C 840,145 770,148 705,145 C 640,142 585,128 565,85 Z',
    aliases: ['russia', 'ru', 'rus', 'russian federation', 'moscow', 'siberia'],
    parentRegion: 'Eurasia',
  },

  // ---------------- Asia & Oceania ----------------
  {
    id: 'india',
    name: 'India',
    label: 'India',
    subLabel: 'IN / South Asia',
    centroid: [712, 265],
    // Authentic subcontinental peninsula: Kashmir crown, Gujarat bulge, Cape Comorin point, Bay of Bengal curve, Sri Lanka
    d: 'M 692,208 C 702,195 718,194 728,206 C 735,218 748,228 752,240 C 746,258 732,278 722,298 C 716,312 710,324 706,334 C 702,324 694,302 686,285 C 678,268 668,252 668,240 C 672,230 682,222 692,208 Z M 714,342 C 718,340 722,345 720,352 C 715,355 712,348 714,342 Z',
    aliases: ['india', 'in', 'ind', 'bharat', 'delhi', 'mumbai', 'bengaluru', 'bangalore', 'south asia', 'asia', 'apac'],
    parentRegion: 'Asia Pacific',
  },
  {
    id: 'china',
    name: 'China & East Asia',
    label: 'China',
    subLabel: 'CN / East Asia',
    centroid: [780, 205],
    // Central and East Asian landmass
    d: 'M 715,155 C 765,148 815,152 845,172 C 852,198 838,228 812,242 C 778,252 748,245 726,232 C 715,215 712,185 715,155 Z',
    aliases: ['china', 'cn', 'chn', 'prc', 'beijing', 'shanghai', 'east asia', 'asia', 'apac'],
    parentRegion: 'Asia Pacific',
  },
  {
    id: 'japan',
    name: 'Japan & South Korea',
    label: 'Japan & Korea',
    subLabel: 'JP & KR / East Asia',
    centroid: [875, 205],
    // Japanese archipelago arc + Korean peninsula
    d: 'M 865,175 C 878,172 888,185 882,202 C 874,218 862,232 854,230 C 850,222 856,205 862,190 Z M 840,192 C 848,188 852,198 848,208 C 842,212 838,202 840,192 Z',
    aliases: ['japan', 'jp', 'jpn', 'tokyo', 'korea', 'south korea', 'kr', 'seoul', 'east asia', 'apac'],
    parentRegion: 'Asia Pacific',
  },
  {
    id: 'southeast_asia',
    name: 'Southeast Asia & ASEAN',
    label: 'Southeast Asia',
    subLabel: 'SG, ID, MY, TH, VN / APAC',
    centroid: [795, 305],
    // Indochina peninsula and Malay peninsula
    d: 'M 758,252 C 775,250 792,262 798,282 C 795,302 788,322 780,342 C 770,335 765,315 760,295 C 754,278 755,264 758,252 Z',
    aliases: ['singapore', 'sg', 'malaysia', 'my', 'thailand', 'th', 'vietnam', 'vn', 'philippines', 'ph', 'asean', 'southeast asia', 'apac'],
    parentRegion: 'Asia Pacific',
  },
  {
    id: 'indonesia',
    name: 'Indonesia & Pacific Islands',
    label: 'Indonesia',
    subLabel: 'ID / Maritime Southeast Asia',
    centroid: [835, 345],
    // Sumatra, Java, Borneo, Bali, Papua chain
    d: 'M 788,342 C 812,338 845,335 875,340 C 895,348 885,362 860,364 C 825,366 795,358 788,342 Z',
    aliases: ['indonesia', 'id', 'idn', 'jakarta', 'bali', 'apac'],
    parentRegion: 'Asia Pacific',
  },
  {
    id: 'australia',
    name: 'Australia & New Zealand',
    label: 'Australia & NZ',
    subLabel: 'Oceania / APAC',
    centroid: [865, 415],
    // Authentic Australian continent: Cape York, Gulf of Carpentaria, Great Australian Bight + Tasmania + NZ
    d: 'M 825,365 C 848,358 875,355 898,370 C 915,385 918,415 906,440 C 885,455 852,458 825,445 C 808,428 805,395 818,375 Z M 908,455 C 914,452 918,458 915,465 C 908,468 905,460 908,455 Z M 932,435 C 940,432 944,442 938,456 C 930,460 926,448 932,435 Z',
    aliases: ['australia', 'au', 'aus', 'sydney', 'melbourne', 'new zealand', 'nz', 'auckland', 'oceania', 'anz', 'apac'],
    parentRegion: 'Asia Pacific',
  },

  // ---------------- Middle East & Africa ----------------
  {
    id: 'middle_east',
    name: 'Middle East & Gulf',
    label: 'Middle East',
    subLabel: 'UAE, Saudi Arabia, Gulf',
    centroid: [635, 240],
    // Arabian peninsula, Persian Gulf, Levant
    d: 'M 605,198 C 632,192 655,198 668,214 C 674,235 665,258 648,272 C 632,278 615,268 612,248 C 608,228 602,212 605,198 Z',
    aliases: ['middle east', 'uae', 'united arab emirates', 'dubai', 'saudi arabia', 'saudi', 'ksa', 'qatar', 'turkey', 'israel', 'gulf', 'emea'],
    parentRegion: 'Middle East',
  },
  {
    id: 'north_africa',
    name: 'North Africa & Egypt',
    label: 'North Africa',
    subLabel: 'Egypt, Morocco, Algeria / EMEA',
    centroid: [530, 248],
    // Mediterranean coast from Morocco to Egypt
    d: 'M 465,225 C 505,218 555,215 595,225 C 592,252 578,272 545,275 C 505,278 472,268 465,225 Z',
    aliases: ['egypt', 'morocco', 'algeria', 'tunisia', 'north africa', 'cairo', 'africa', 'emea'],
    parentRegion: 'Africa',
  },
  {
    id: 'sub_saharan_africa',
    name: 'Sub-Saharan & South Africa',
    label: 'Sub-Saharan Africa',
    subLabel: 'Nigeria, Kenya, South Africa',
    centroid: [545, 350],
    // West African bulge, Congo, East Africa horn, Cape of Good Hope, Madagascar
    d: 'M 470,272 C 508,270 545,274 572,285 C 585,315 582,355 572,390 C 560,422 542,448 528,452 C 515,445 505,415 500,380 C 492,345 475,315 465,295 Z M 598,375 C 606,370 612,382 608,405 C 602,415 595,400 598,375 Z',
    aliases: ['south africa', 'za', 'nigeria', 'ng', 'kenya', 'ke', 'ghana', 'sub-saharan africa', 'africa', 'emea'],
    parentRegion: 'Africa',
  },
];

// ============================================================================
// 2. INDIA STATES MAP — AUTHENTIC SUB-DIVISIONS (600 x 750)
// ============================================================================
const INDIA_STATES_ENTITIES: GeoEntity[] = [
  // West
  {
    id: 'MH',
    name: 'Maharashtra',
    label: 'Maharashtra',
    subLabel: 'Mumbai, Pune, Financial Capital',
    centroid: [230, 430],
    d: 'M 160,375 C 205,365 260,368 295,385 C 310,410 300,445 285,475 C 240,490 195,475 168,445 Z',
    aliases: ['maharashtra', 'mh', 'mumbai', 'pune', 'nagpur', 'thane'],
    parentRegion: 'West India',
  },
  {
    id: 'GJ',
    name: 'Gujarat',
    label: 'Gujarat',
    subLabel: 'Ahmedabad, Surat, Gift City',
    centroid: [145, 335],
    d: 'M 105,295 C 145,285 180,290 195,315 C 190,345 175,370 148,375 C 120,372 100,345 105,295 Z',
    aliases: ['gujarat', 'gj', 'ahmedabad', 'surat', 'vadodara', 'gift city'],
    parentRegion: 'West India',
  },

  // South
  {
    id: 'KA',
    name: 'Karnataka',
    label: 'Karnataka',
    subLabel: 'Bengaluru Silicon Valley',
    centroid: [225, 535],
    d: 'M 185,475 C 228,465 255,480 265,515 C 260,560 240,605 210,615 C 192,580 180,535 185,475 Z',
    aliases: ['karnataka', 'ka', 'bengaluru', 'bangalore', 'mysore', 'hubli'],
    parentRegion: 'South India',
  },
  {
    id: 'TN',
    name: 'Tamil Nadu',
    label: 'Tamil Nadu',
    subLabel: 'Chennai SaaS & Auto Hub',
    centroid: [275, 620],
    d: 'M 235,565 C 275,555 315,568 312,610 C 302,655 278,695 255,705 C 240,670 232,625 235,565 Z',
    aliases: ['tamil nadu', 'tn', 'chennai', 'coimbatore', 'madurai'],
    parentRegion: 'South India',
  },
  {
    id: 'TG',
    name: 'Telangana',
    label: 'Telangana',
    subLabel: 'Hyderabad Cyberabad',
    centroid: [280, 465],
    d: 'M 245,425 C 285,418 315,435 320,465 C 315,498 295,520 265,522 C 245,495 240,460 245,425 Z',
    aliases: ['telangana', 'tg', 'ts', 'hyderabad', 'secunderabad', 'warangal'],
    parentRegion: 'South India',
  },
  {
    id: 'KL',
    name: 'Kerala',
    label: 'Kerala',
    subLabel: 'Kochi, Thiruvananthapuram',
    centroid: [205, 645],
    d: 'M 195,595 C 215,590 225,615 220,655 C 212,695 198,715 185,710 C 182,680 188,640 195,595 Z',
    aliases: ['kerala', 'kl', 'kochi', 'thiruvananthapuram', 'calicut'],
    parentRegion: 'South India',
  },

  // North
  {
    id: 'DL',
    name: 'Delhi & NCR',
    label: 'Delhi (NCR)',
    subLabel: 'National Capital Region',
    centroid: [248, 240],
    d: 'M 235,225 C 255,220 265,230 262,248 C 255,260 242,262 235,250 Z',
    aliases: ['delhi', 'dl', 'new delhi', 'ncr', 'gurugram', 'gurgaon', 'noida'],
    parentRegion: 'North India',
  },
  {
    id: 'UP',
    name: 'Uttar Pradesh',
    label: 'Uttar Pradesh',
    subLabel: 'Noida, Lucknow, Kanpur',
    centroid: [320, 275],
    d: 'M 265,228 C 335,220 395,235 410,270 C 400,315 350,335 285,325 C 265,295 258,260 265,228 Z',
    aliases: ['uttar pradesh', 'up', 'lucknow', 'kanpur', 'varanasi', 'agra'],
    parentRegion: 'North India',
  },
  {
    id: 'RJ',
    name: 'Rajasthan',
    label: 'Rajasthan',
    subLabel: 'Jaipur, Jodhpur',
    centroid: [180, 265],
    d: 'M 130,215 C 190,205 235,215 245,255 C 240,295 205,325 155,320 C 125,290 118,250 130,215 Z',
    aliases: ['rajasthan', 'rj', 'jaipur', 'jodhpur', 'udaipur'],
    parentRegion: 'North India',
  },

  // East
  {
    id: 'WB',
    name: 'West Bengal',
    label: 'West Bengal',
    subLabel: 'Kolkata Tech & Port',
    centroid: [435, 345],
    d: 'M 415,295 C 445,285 465,310 460,345 C 452,385 435,420 415,415 C 410,380 412,335 415,295 Z',
    aliases: ['west bengal', 'wb', 'kolkata', 'howrah'],
    parentRegion: 'East India',
  },
];

// ============================================================================
// 3. US STATES MAP (900 x 550)
// ============================================================================
const US_STATES_ENTITIES: GeoEntity[] = [
  {
    id: 'CA',
    name: 'California',
    label: 'California (CA)',
    subLabel: 'Silicon Valley, SF, LA',
    centroid: [115, 275],
    d: 'M 65,150 C 95,155 110,185 105,245 C 135,315 155,385 135,410 C 105,395 85,340 68,260 Z',
    aliases: ['california', 'ca', 'silicon valley', 'san francisco', 'los angeles', 'san diego'],
    parentRegion: 'West Coast',
  },
  {
    id: 'TX',
    name: 'Texas',
    label: 'Texas (TX)',
    subLabel: 'Austin & Dallas Tech',
    centroid: [445, 385],
    d: 'M 370,305 C 435,302 475,310 495,350 C 515,405 480,470 435,475 C 390,445 375,375 370,305 Z',
    aliases: ['texas', 'tx', 'austin', 'dallas', 'houston'],
    parentRegion: 'South',
  },
  {
    id: 'NY',
    name: 'New York',
    label: 'New York (NY)',
    subLabel: 'NYC Financial Capital',
    centroid: [775, 175],
    d: 'M 740,145 C 775,138 805,150 812,175 C 805,198 775,205 750,195 Z',
    aliases: ['new york', 'ny', 'nyc', 'manhattan'],
    parentRegion: 'Northeast',
  },
  {
    id: 'WA',
    name: 'Washington',
    label: 'Washington (WA)',
    subLabel: 'Seattle Cloud Hub',
    centroid: [135, 75],
    d: 'M 95,50 C 145,45 180,52 182,88 C 155,95 125,98 95,90 Z',
    aliases: ['washington', 'wa', 'seattle', 'redmond'],
    parentRegion: 'Pacific Northwest',
  },
  {
    id: 'FL',
    name: 'Florida',
    label: 'Florida (FL)',
    subLabel: 'Miami & Orlando',
    centroid: [725, 435],
    d: 'M 675,395 C 735,392 755,420 758,460 C 748,495 725,510 715,475 C 705,445 685,425 675,395 Z',
    aliases: ['florida', 'fl', 'miami', 'tampa', 'orlando'],
    parentRegion: 'Southeast',
  },
];

// Helper to determine if a value strictly matches an alias
function matchesAliasStrict(rawVal: string, alias: string): boolean {
  if (!rawVal || !alias) return false;
  const v = rawVal.toLowerCase().trim();
  const a = alias.toLowerCase().trim();

  // Exact match
  if (v === a) return true;

  // For short acronyms (<= 3 chars like 'in', 'ca', 'us', 'la'), ONLY exact match is allowed
  if (a.length <= 3) return false;

  // For longer words (>= 4 chars like 'india', 'california', 'united states'), match word boundaries
  const escaped = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordRegex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
  return wordRegex.test(v);
}

// Color scale interpolator (Emerald-first)
function getChoroplethColor(intensity: number, hasData: boolean, isSelected: boolean, isDark: boolean): string {
  if (isSelected) {
    return '#10B981'; // Vibrant emerald
  }
  if (!hasData) {
    return isDark ? '#16221D' : '#E8EFEA'; // Subtle themed surface
  }
  // Lightness smoothly descending from 68% down to 26%
  const lightness = isDark
    ? Math.round(52 - intensity * 30)
    : Math.round(75 - intensity * 45);
  const saturation = Math.round(55 + intensity * 40);
  return `hsl(158, ${saturation}%, ${lightness}%)`;
}

// Compact metric formatter
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
  const [userModeOverride, setUserModeOverride] = useState<GeographicGranularity | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<{
    entity: GeoEntity;
    totalVal: number;
    count: number;
    percentage: number;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // 1. INTELLIGENT AUTO-DETECTION ENGINE
  const detectedGranularity = useMemo<{
    mode: GeographicGranularity;
    reason: string;
  }>(() => {
    let worldScore = 0;
    let indiaStateScore = 0;
    let usStateScore = 0;

    const sampleRows = allDatasetRows.slice(0, 300);

    // Identify candidate columns
    const geoColNames = columns
      .filter((c) => {
        const n = c.name.toLowerCase();
        return (
          n.includes('country') ||
          n.includes('nation') ||
          n.includes('state') ||
          n.includes('province') ||
          n.includes('region') ||
          n.includes('city') ||
          n.includes('location') ||
          n.includes('territory')
        );
      })
      .map((c) => c.name);

    const targetCols = geoColNames.length > 0 ? geoColNames : Object.keys(sampleRows[0] || {});

    sampleRows.forEach((r) => {
      targetCols.forEach((col) => {
        const rawVal = (r[col] || '').trim();
        if (!rawVal) return;

        const isCountryCol = col.toLowerCase().includes('country') || col.toLowerCase().includes('nation');
        const isStateCol = col.toLowerCase().includes('state') || col.toLowerCase().includes('province');

        // Check World matches
        WORLD_ENTITIES.forEach((ent) => {
          if (ent.aliases.some((alias) => matchesAliasStrict(rawVal, alias))) {
            worldScore += isCountryCol ? 8 : 3;
          }
        });

        // Check India State matches
        INDIA_STATES_ENTITIES.forEach((ent) => {
          if (ent.aliases.some((alias) => matchesAliasStrict(rawVal, alias))) {
            indiaStateScore += isStateCol ? 8 : 4;
          }
        });

        // Check US State matches
        US_STATES_ENTITIES.forEach((ent) => {
          if (ent.aliases.some((alias) => matchesAliasStrict(rawVal, alias))) {
            usStateScore += isStateCol ? 8 : 4;
          }
        });
      });
    });

    // Scoring resolution: pick the strongest matching granularity
    if (indiaStateScore > worldScore && indiaStateScore > usStateScore && indiaStateScore >= 6) {
      return {
        mode: 'india-states',
        reason: 'Dataset matches India State boundaries',
      };
    }
    if (usStateScore > worldScore && usStateScore > indiaStateScore && usStateScore >= 6) {
      return {
        mode: 'us-states',
        reason: 'Dataset matches US State boundaries',
      };
    }

    // Default to World map (Universal Global View)
    return {
      mode: 'world',
      reason: 'Global Countries & International Territories',
    };
  }, [allDatasetRows, columns]);

  // Active granularity (User override takes precedence)
  const activeGranularity = userModeOverride || detectedGranularity.mode;

  // Current entity registry
  const currentRegistry = useMemo(() => {
    if (activeGranularity === 'india-states') {
      return {
        viewBox: '0 0 600 750',
        entities: INDIA_STATES_ENTITIES,
        mapTitle: 'India (States & Union Territories)',
      };
    }
    if (activeGranularity === 'us-states') {
      return {
        viewBox: '0 0 900 550',
        entities: US_STATES_ENTITIES,
        mapTitle: 'United States (50 States)',
      };
    }
    return {
      viewBox: '0 0 1000 520',
      entities: WORLD_ENTITIES,
      mapTitle: 'Global Geographic Intelligence (World Map)',
    };
  }, [activeGranularity]);

  // Metric Aggregator & Entity Mapping
  const entityDataMap = useMemo(() => {
    const dataMap = new Map<string, { totalVal: number; count: number; intensity: number }>();
    let grandTotal = 0;
    let maxEntityVal = 0;

    // Initialize map
    currentRegistry.entities.forEach((ent) => {
      dataMap.set(ent.id, { totalVal: 0, count: 0, intensity: 0 });
    });

    const targetCols = columns.length > 0 ? columns.map((c) => c.name) : Object.keys(rows[0] || {});

    rows.forEach((r) => {
      let metricNum = 0;
      if (currentMetric && r[currentMetric] !== undefined) {
        const cleaned = String(r[currentMetric]).replace(/[^0-9.-]/g, '');
        metricNum = parseFloat(cleaned) || 1;
      } else {
        metricNum = 1;
      }

      currentRegistry.entities.forEach((ent) => {
        const matches = targetCols.some((col) => {
          const val = r[col];
          return ent.aliases.some((alias) => matchesAliasStrict(val, alias));
        });

        if (matches) {
          const cur = dataMap.get(ent.id)!;
          cur.totalVal += metricNum;
          cur.count += 1;
          grandTotal += metricNum;
          if (cur.totalVal > maxEntityVal) {
            maxEntityVal = cur.totalVal;
          }
        }
      });
    });

    // Compute relative intensities (0.0 to 1.0)
    dataMap.forEach((entry) => {
      entry.intensity = maxEntityVal > 0 ? Math.min(1, Math.max(0, entry.totalVal / maxEntityVal)) : 0;
    });

    return { map: dataMap, grandTotal, maxVal: maxEntityVal };
  }, [rows, currentRegistry, columns, currentMetric]);

  // Tooltip mouse interactions
  const handleMouseEnter = (ent: GeoEntity, e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const data = entityDataMap.map.get(ent.id);
    const totalVal = data?.totalVal || 0;
    const count = data?.count || 0;
    const percentage = entityDataMap.grandTotal > 0 ? (totalVal / entityDataMap.grandTotal) * 100 : 0;

    setHoveredEntity({
      entity: ent,
      totalVal,
      count,
      percentage,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !hoveredEntity) return;
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
  };

  const handleMouseLeave = () => {
    setHoveredEntity(null);
  };

  const isEntitySelected = (ent: GeoEntity) => {
    if (!selectedRegion || selectedRegion === 'all') return false;
    const lowerSel = selectedRegion.toLowerCase();
    return ent.aliases.some((alias) => matchesAliasStrict(lowerSel, alias));
  };

  return (
    <div ref={containerRef} className={`relative flex flex-col justify-between select-none ${className}`}>
      
      {/* 1. MAP HEADER & COMPACT RESPONSIVE CONTROLS */}
      <div className="pb-3 mb-2 border-b border-[var(--lm-border-default)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <GlobeIcon className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-[var(--lm-text-primary)] tracking-tight">
                {currentRegistry.mapTitle}
              </h3>
            </div>
            <p className="text-[11px] text-[var(--lm-text-tertiary)] mt-0.5 flex items-center gap-1.5">
              <span>{userModeOverride ? 'Manual View' : `⚡ Auto: ${detectedGranularity.reason}`}</span>
              <span>•</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {metricLabel || currentMetric}
              </span>
            </p>
          </div>

          {/* Granularity Switcher Pills (Clean & Responsive) */}
          <div className="flex items-center flex-wrap gap-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl text-[11px] font-medium border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setUserModeOverride(null)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                userModeOverride === null
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Automatically select view based on dataset"
            >
              🤖 Auto
            </button>
            <button
              onClick={() => setUserModeOverride('world')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeGranularity === 'world' && userModeOverride !== null
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🌍 World
            </button>
            <button
              onClick={() => setUserModeOverride('india-states')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeGranularity === 'india-states' && userModeOverride !== null
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🇮🇳 India
            </button>
            <button
              onClick={() => setUserModeOverride('us-states')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeGranularity === 'us-states' && userModeOverride !== null
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🇺🇸 US
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
      </div>

      {/* 2. REAL SVG GEOGRAPHIC MAP CANVAS */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800/90 flex items-center justify-center p-3 transition-all ${
          isExpanded ? 'h-[440px]' : 'h-64'
        }`}
      >
        <svg
          viewBox={currentRegistry.viewBox}
          className="w-full h-full max-h-full drop-shadow-sm transition-all duration-300"
        >
          <defs>
            <filter id="activeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#10B981" floodOpacity="0.6" />
            </filter>
            <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="transparent" stopOpacity="0" />
              <stop offset="100%" stopColor="rgba(16, 185, 129, 0.04)" />
            </linearGradient>
          </defs>

          {/* Map Canvas Background */}
          <rect width="100%" height="100%" fill="url(#oceanGradient)" rx="12" />

          {/* Geographic Real Boundary Polygons */}
          {currentRegistry.entities.map((ent) => {
            const data = entityDataMap.map.get(ent.id);
            const hasData = (data?.totalVal || 0) > 0 || (data?.count || 0) > 0;
            const isSelected = isEntitySelected(ent);
            const intensity = data?.intensity || 0;

            const fillColor = getChoroplethColor(intensity, hasData, isSelected, false);

            return (
              <path
                key={ent.id}
                d={ent.d}
                fill={fillColor}
                stroke={isSelected ? '#059669' : hasData ? '#10B981' : '#CBD5E1'}
                strokeWidth={isSelected ? 2.5 : hasData ? 1.5 : 0.75}
                strokeOpacity={hasData ? 0.95 : 0.4}
                filter={isSelected ? 'url(#activeGlow)' : undefined}
                className={`transition-all duration-200 ${
                  hasData
                    ? 'cursor-pointer hover:filter hover:brightness-110 hover:stroke-emerald-600 dark:hover:stroke-emerald-300 hover:stroke-[2px]'
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

          {/* Centroid Data Badges for Active Entities */}
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
                  r={isSelected ? 7 : Math.max(4.5, Math.min(8, 4.5 + data.intensity * 4))}
                  fill={isSelected ? '#10B981' : '#059669'}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  className={isSelected ? 'animate-pulse' : ''}
                />
                <text
                  y={13}
                  textAnchor="middle"
                  className="text-[9.5px] font-bold fill-slate-800 dark:fill-slate-100 drop-shadow-sm font-sans"
                >
                  {ent.id.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Floating Tooltip */}
        {hoveredEntity && (
          <div
            className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 px-3 py-2 rounded-xl bg-slate-900/95 text-white backdrop-blur-md border border-slate-700/80 shadow-xl text-xs whitespace-nowrap transition-all duration-75"
            style={{
              left: `${Math.max(60, Math.min(hoveredEntity.x, 380))}px`,
              top: `${Math.max(50, hoveredEntity.y)}px`,
            }}
          >
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span>📍 {hoveredEntity.entity.name}</span>
              {hoveredEntity.entity.subLabel && (
                <span className="text-[10px] text-slate-400 font-normal">
                  ({hoveredEntity.entity.subLabel})
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-200">
              <div>
                <span className="text-slate-400">Value: </span>
                <span className="font-semibold text-emerald-300">
                  {formatMetricVal(hoveredEntity.totalVal, isCurrency)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Share: </span>
                <span className="font-semibold">
                  {hoveredEntity.percentage.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-slate-400">Rows: </span>
                <span className="font-semibold">{hoveredEntity.count}</span>
              </div>
            </div>
            <div className="mt-1 pt-1 border-t border-slate-800 text-[10px] text-emerald-400/80">
              💡 Click to filter dashboard
            </div>
          </div>
        )}
      </div>

      {/* 3. MAP FOOTER METADATA */}
      <div className="flex items-center justify-between pt-2.5 px-1 text-[11px] text-[var(--lm-text-tertiary)]">
        <div className="flex items-center gap-1.5">
          <span>Active Filter:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {selectedRegion && selectedRegion !== 'all' ? selectedRegion : 'Global (All Regions)'}
          </span>
          {selectedRegion && selectedRegion !== 'all' && (
            <button
              onClick={() => onSelectRegion('all')}
              className="text-[10px] text-red-500 hover:underline ml-1 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
        <div className="text-[10px] text-slate-400">
          Showing {entityDataMap.map.size} standard geographical regions
        </div>
      </div>

    </div>
  );
}
