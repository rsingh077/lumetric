// ========== Core Entity Types ==========

export type UserRole = 'owner' | 'administrator' | 'builder' | 'reviewer' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  ownerId: string;
  members: WorkspaceMember[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  userId: string;
  role: UserRole;
  joinedAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  objective?: string;
  status: ProjectStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'active' | 'archived' | 'draft';

// ========== Data & Requirement Ingestion Types ==========

export type ColumnType = 'string' | 'number' | 'integer' | 'float' | 'boolean' | 'date' | 'datetime' | 'unknown';

export type ColumnSemanticRole =
  | 'identifier' // Primary or foreign keys
  | 'metric'     // Quantitative measures, revenues, counts
  | 'dimension'  // Categorical segments, cohorts, regions
  | 'temporal'   // Date, timestamp, period anchor
  | 'target'     // Outcome variable to forecast or predict
  | 'feature'    // Model input covariate
  | 'excluded';  // Disregarded or quarantined column

export interface ColumnProfile {
  name: string;
  inferredType: ColumnType;
  semanticRole: ColumnSemanticRole;
  totalCount: number;
  nullCount: number;
  uniqueCount: number;
  sampleValues: string[];
  // Numeric stats (when applicable)
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  // String stats (when applicable)
  minLength?: number;
  maxLength?: number;
  // Date stats (when applicable)
  earliestDate?: string;
  latestDate?: string;
}

export interface DatasetRequirements {
  businessGrain: string;        // e.g. "One row per customer per monthly snapshot"
  primaryKey: string;           // e.g. "customer_id"
  timestampColumn: string;      // e.g. "date" or "None"
  currency: string;             // e.g. "USD ($)", "EUR (€)", "GBP (£)", "None"
  unitScale: string;            // e.g. "Exact 1.0", "Thousands (x1,000)", "Millions (x1,000,000)"
  periodicity: string;          // e.g. "Monthly", "Daily", "Quarterly", "Snapshot"
  dataClassification: string;   // e.g. "Internal Business", "PII / Restricted", "Public"
  intendedDecision: string;     // e.g. "Analyze enterprise retention and forecast ARR"
}

export interface QualityCheckResult {
  rule: string;
  category: 'Uniqueness' | 'Completeness' | 'Domain Range' | 'Cadence' | 'Integrity';
  status: 'passed' | 'warning' | 'failed';
  details: string;
  quarantinedCount: number;
  metricAssertion: string;
}

export interface DatasetProfile {
  id: string;
  fileName: string;
  fileSize: number;
  sha256: string;
  version: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  requirements: DatasetRequirements;
  qualityChecks: QualityCheckResult[];
  quarantinedRowsCount: number;
  uploadedAt: string;
  parseWarnings: string[];
  status: 'profiling' | 'complete' | 'error';
  errorMessage?: string;
}

// ========== Navigation Types ==========

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: string | number;
  children?: NavItem[];
  requiredRole?: UserRole;
}

// ========== Screen State Types ==========

export type ScreenState = 'loading' | 'empty' | 'validating' | 'running' | 'partial' | 'failed' | 'stale' | 'denied' | 'completed';

export interface AsyncState<T> {
  data: T | null;
  status: ScreenState;
  error?: string;
  lastUpdated?: string;
}

// ========== Active View Router Type ==========
export type ActiveView =
  | 'home'
  | 'projects'
  | 'data'
  | 'pipelines'
  | 'analysis'
  | 'models'
  | 'dashboards'
  | 'stories'
  | 'operations'
  | 'settings';

// ========== Document & File Analysis Treatment Types ==========

export type DocumentType = 'pdf' | 'docx' | 'txt' | 'markdown' | 'json' | 'csv' | 'xml' | 'html';

export interface DocumentEntity {
  text: string;
  category: 'ORGANIZATION' | 'PERSON' | 'LOCATION' | 'METRIC' | 'DATE' | 'IDENTIFIER' | 'TECHNICAL';
  confidence: number;
  frequency: number;
}

export interface DocumentSummary {
  executiveSummary: string;
  keyTakeaways: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'analytical';
  sentimentScore: number;
  wordCount: number;
  readingTimeMinutes: number;
  readabilityScore: number;
  complexityLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
}

export interface DocumentTreatmentResult {
  treatmentType: 'pii_redaction' | 'summarization' | 'entity_extraction' | 'schema_normalization' | 'token_profiling' | 'doc_diff';
  status: 'completed' | 'in_progress' | 'failed';
  processedAt: string;
  metrics: {
    charactersProcessed: number;
    tokensParsed: number;
    entitiesDetected: number;
    piiMaskedCount?: number;
    processingTimeMs: number;
  };
  outputContent?: string;
  entities?: DocumentEntity[];
  summary?: DocumentSummary;
}

export interface DocumentFileProfile {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: DocumentType;
  uploadedAt: string;
  sha256: string;
  rawTextPreview: string;
  wordCount: number;
  tokenCount: number;
  language: string;
  treatments: DocumentTreatmentResult[];
  status: 'ready' | 'processing' | 'error';
}

// ========== Application Language Localization ==========
export type AppLanguage = 'en' | 'fr' | 'es' | 'de';

// ========== Individual User Profile Database & Data Separation ==========
export interface UserProfileDatabase {
  userId: string;
  userEmail: string;
  datasets: DatasetProfile[];
  activeDatasetId: string | null;
  datasetRows: Record<string, Record<string, string>[]>; // datasetId -> rows
  documentFiles: DocumentFileProfile[];
  activeDocumentId: string | null;
  projects: Project[];
  workspaces: Workspace[];
  storageFootprintBytes: number;
  lastSyncedAt: string;
}


