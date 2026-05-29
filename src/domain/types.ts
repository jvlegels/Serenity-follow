export type SignalLevel = 'high' | 'possible' | 'none';
export type SourceKind = 'x' | 'mock' | 'manual';

export interface MonitoredAccount {
  id: string;
  source: SourceKind;
  handle: string;
  displayName: string;
  profileUrl: string;
  enabled: boolean;
}

export interface SourcePost {
  id: string;
  accountId: string;
  source: SourceKind;
  authorHandle: string;
  text: string;
  url: string;
  postedAt: string;
}

export interface AssetMention {
  name: string;
  ticker: string | null;
  type: 'equity' | 'crypto' | 'unknown';
  financeUrl: string | null;
}

export interface SignalEvidence {
  label: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
}

export interface SignalAnalysis {
  id: string;
  postId: string;
  level: SignalLevel;
  asset: AssetMention | null;
  confidence: number;
  summary: string;
  reasoning: string;
  uncertainty: string;
  evidence: SignalEvidence[];
  createdAt: string;
  modelVersion: string;
}

export interface SignalRecord {
  post: SourcePost;
  analysis: SignalAnalysis;
}

export interface WidgetState {
  color: 'green' | 'amber' | 'grey';
  title: string;
  summary: string;
  signalId: string | null;
  updatedAt: string;
}

export interface AppSettings {
  notifyHighConfidence: boolean;
  notifyPossibleSignals: boolean;
  highConfidenceThreshold: number;
  possibleSignalThreshold: number;
  pollIntervalMinutes: number;
}

export interface AdviceResponse {
  records: SignalRecord[];
  latestSignal: SignalRecord | null;
  widget: WidgetState;
  settings: AppSettings;
  sourceStatus: {
    mode: 'mock' | 'live' | 'error';
    message: string;
    checkedAt: string;
  };
}
