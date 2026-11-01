/**
 * Lightweight Geo-Detection Dictionary
 * Minimal string arrays for heuristic territory detection (~4KB total)
 * without loading 850KB+ of SVG geometry.
 */

export interface GeoAliasRecord {
  id: string;
  code: string;
  name: string;
  aliases: string[];
}

export const INDIA_STATE_ALIASES: GeoAliasRecord[] = [
  { id: 'mh', code: 'MH', name: 'Maharashtra', aliases: ['maharashtra', 'mh', 'mumbai', 'pune', 'nagpur'] },
  { id: 'dl', code: 'DL', name: 'Delhi', aliases: ['delhi', 'dl', 'new delhi', 'ncr'] },
  { id: 'ka', code: 'KA', name: 'Karnataka', aliases: ['karnataka', 'ka', 'bengaluru', 'bangalore'] },
  { id: 'tn', code: 'TN', name: 'Tamil Nadu', aliases: ['tamil nadu', 'tn', 'chennai', 'madras'] },
  { id: 'tg', code: 'TG', name: 'Telangana', aliases: ['telangana', 'tg', 'ts', 'hyderabad'] },
  { id: 'gj', code: 'GJ', name: 'Gujarat', aliases: ['gujarat', 'gj', 'ahmedabad', 'surat', 'vadodara'] },
  { id: 'up', code: 'UP', name: 'Uttar Pradesh', aliases: ['uttar pradesh', 'up', 'noida', 'lucknow', 'kanpur'] },
  { id: 'wb', code: 'WB', name: 'West Bengal', aliases: ['west bengal', 'wb', 'kolkata', 'calcutta'] },
  { id: 'rj', code: 'RJ', name: 'Rajasthan', aliases: ['rajasthan', 'rj', 'jaipur', 'jodhpur', 'udaipur'] },
  { id: 'kl', code: 'KL', name: 'Kerala', aliases: ['kerala', 'kl', 'kochi', 'cochin', 'thiruvananthapuram'] },
  { id: 'mp', code: 'MP', name: 'Madhya Pradesh', aliases: ['madhya pradesh', 'mp', 'indore', 'bhopal'] },
  { id: 'pb', code: 'PB', name: 'Punjab', aliases: ['punjab', 'pb', 'ludhiana', 'amritsar'] },
  { id: 'hr', code: 'HR', name: 'Haryana', aliases: ['haryana', 'hr', 'gurugram', 'gurgaon', 'faridabad'] },
  { id: 'br', code: 'BR', name: 'Bihar', aliases: ['bihar', 'br', 'patna', 'gaya'] },
  { id: 'or', code: 'OR', name: 'Odisha', aliases: ['odisha', 'or', 'orissa', 'bhubaneswar'] },
  { id: 'ap', code: 'AP', name: 'Andhra Pradesh', aliases: ['andhra pradesh', 'ap', 'visakhapatnam', 'vijayawada'] },
  { id: 'jh', code: 'JH', name: 'Jharkhand', aliases: ['jharkhand', 'jh', 'ranchi', 'jamshedpur'] },
  { id: 'as', code: 'AS', name: 'Assam', aliases: ['assam', 'as', 'guwahati'] },
  { id: 'ct', code: 'CT', name: 'Chhattisgarh', aliases: ['chhattisgarh', 'ct', 'cg', 'raipur'] },
  { id: 'ut', code: 'UT', name: 'Uttarakhand', aliases: ['uttarakhand', 'ut', 'uk', 'dehradun'] },
  { id: 'hp', code: 'HP', name: 'Himachal Pradesh', aliases: ['himachal pradesh', 'hp', 'shimla', 'dharamshala'] },
  { id: 'jk', code: 'JK', name: 'Jammu and Kashmir', aliases: ['jammu and kashmir', 'jammu & kashmir', 'jk', 'srinagar', 'jammu'] },
  { id: 'ga', code: 'GA', name: 'Goa', aliases: ['goa', 'ga', 'panaji'] },
  { id: 'ch', code: 'CH', name: 'Chandigarh', aliases: ['chandigarh', 'ch'] },
  { id: 'la', code: 'LA', name: 'Ladakh', aliases: ['ladakh', 'la', 'leh', 'kargil'] }
];

export const US_STATE_ALIASES: GeoAliasRecord[] = [
  { id: 'ca', code: 'CA', name: 'California', aliases: ['california', 'ca', 'san francisco', 'los angeles', 'silicon valley'] },
  { id: 'ny', code: 'NY', name: 'New York', aliases: ['new york', 'ny', 'nyc', 'manhattan'] },
  { id: 'tx', code: 'TX', name: 'Texas', aliases: ['texas', 'tx', 'austin', 'houston', 'dallas'] },
  { id: 'fl', code: 'FL', name: 'Florida', aliases: ['florida', 'fl', 'miami', 'orlando', 'tampa'] },
  { id: 'il', code: 'IL', name: 'Illinois', aliases: ['illinois', 'il', 'chicago'] },
  { id: 'pa', code: 'PA', name: 'Pennsylvania', aliases: ['pennsylvania', 'pa', 'philadelphia', 'pittsburgh'] },
  { id: 'oh', code: 'OH', name: 'Ohio', aliases: ['ohio', 'oh', 'columbus', 'cleveland'] },
  { id: 'ga', code: 'GA', name: 'Georgia', aliases: ['georgia', 'ga', 'atlanta'] },
  { id: 'nc', code: 'NC', name: 'North Carolina', aliases: ['north carolina', 'nc', 'charlotte', 'raleigh'] },
  { id: 'mi', code: 'MI', name: 'Michigan', aliases: ['michigan', 'mi', 'detroit'] },
  { id: 'wa', code: 'WA', name: 'Washington', aliases: ['washington', 'wa', 'seattle'] },
  { id: 'ma', code: 'MA', name: 'Massachusetts', aliases: ['massachusetts', 'ma', 'boston', 'cambridge'] },
  { id: 'co', code: 'CO', name: 'Colorado', aliases: ['colorado', 'co', 'denver'] }
];

export const WORLD_COUNTRY_ALIASES: GeoAliasRecord[] = [
  { id: 'in', code: 'IN', name: 'India', aliases: ['india', 'in', 'bharat'] },
  { id: 'us', code: 'US', name: 'United States', aliases: ['united states', 'usa', 'us', 'america'] },
  { id: 'cn', code: 'CN', name: 'China', aliases: ['china', 'cn', 'prc'] },
  { id: 'jp', code: 'JP', name: 'Japan', aliases: ['japan', 'jp', 'nippon'] },
  { id: 'de', code: 'DE', name: 'Germany', aliases: ['germany', 'de', 'deutschland'] },
  { id: 'gb', code: 'GB', name: 'United Kingdom', aliases: ['united kingdom', 'uk', 'gb', 'britain', 'england'] },
  { id: 'fr', code: 'FR', name: 'France', aliases: ['france', 'fr'] },
  { id: 'ca', code: 'CA', name: 'Canada', aliases: ['canada', 'ca'] },
  { id: 'au', code: 'AU', name: 'Australia', aliases: ['australia', 'au'] },
  { id: 'sg', code: 'SG', name: 'Singapore', aliases: ['singapore', 'sg'] },
  { id: 'ae', code: 'AE', name: 'United Arab Emirates', aliases: ['united arab emirates', 'uae', 'dubai', 'ae'] },
  { id: 'br', code: 'BR', name: 'Brazil', aliases: ['brazil', 'brasil', 'br'] }
];
