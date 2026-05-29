import type { SignalAnalysis, SignalEvidence, SignalLevel, SourcePost } from '../domain/types.js';
import { extractAsset } from './assetCatalog.js';
import { clampConfidence } from './confidence.js';

const MODEL_VERSION = 'rules-v1.0.0';

const POSITIVE_PATTERNS = [
  { pattern: /\b(buy|buying|bought|added|adding|add|accumulate|starter position|long|entry here|entered|position(?:ed)?)\b/i, label: 'Direct buying or position language', weight: 0.38 },
  { pattern: /\b(i(?:'|’)m in|i am in|loaded|loading up)\b/i, label: 'Personal position language', weight: 0.3 }
];

const UNCERTAIN_PATTERNS = [
  { pattern: /\b(watching|watch|if|may|might|could|wait|waiting|breaks?|reclaims?|not chasing|no entry|maybe)\b/i, label: 'Conditional or uncertain wording', weight: -0.24 },
  { pattern: /\b(nfa|not financial advice)\b/i, label: 'Explicit uncertainty disclaimer', weight: -0.12 }
];

const NEGATIVE_PATTERNS = [
  { pattern: /\b(sold|selling|trimmed|taking profit|take profit|exited|exit|short|not a fresh buy|do not buy|don't buy)\b/i, label: 'Selling, profit-taking, or non-buy wording', weight: -0.5 }
];

export function classifyPost(post: SourcePost): SignalAnalysis {
  const evidence: SignalEvidence[] = [];
  const normalized = post.text.replace(/https?:\/\/\S+/g, '').trim();
  const asset = extractAsset(normalized);
  let score = 0.08;

  if (asset) {
    score += asset.ticker ? 0.22 : 0.12;
    evidence.push({ label: asset.ticker ? `Ticker detected: ${asset.ticker}` : `Asset detected: ${asset.name}`, impact: 'positive', weight: 0.22 });
  } else {
    score -= 0.18;
    evidence.push({ label: 'No clear asset detected', impact: 'negative', weight: -0.18 });
  }

  for (const rule of POSITIVE_PATTERNS) {
    if (rule.pattern.test(normalized)) {
      score += rule.weight;
      evidence.push({ label: rule.label, impact: 'positive', weight: rule.weight });
    }
  }

  for (const rule of UNCERTAIN_PATTERNS) {
    if (rule.pattern.test(normalized)) {
      score += rule.weight;
      evidence.push({ label: rule.label, impact: 'negative', weight: rule.weight });
    }
  }

  for (const rule of NEGATIVE_PATTERNS) {
    if (rule.pattern.test(normalized)) {
      score += rule.weight;
      evidence.push({ label: rule.label, impact: 'negative', weight: rule.weight });
    }
  }

  const confidence = clampConfidence(score);
  const level = determineLevel(confidence, evidence, Boolean(asset));
  const assetLabel = asset?.ticker ? `$${asset.ticker}` : asset?.name ?? 'an unspecified asset';

  return {
    id: `sig_${post.id}`,
    postId: post.id,
    level,
    asset,
    confidence,
    summary: createSummary(level, assetLabel),
    reasoning: createReasoning(level, evidence),
    uncertainty: 'Confidence measures whether the text appears to mention a buying opportunity. It does not evaluate trade quality, timing, risk, or whether the post is still actionable.',
    evidence,
    createdAt: new Date().toISOString(),
    modelVersion: MODEL_VERSION
  };
}

function determineLevel(confidence: number, evidence: SignalEvidence[], hasAsset: boolean): SignalLevel {
  const hasPositive = evidence.some((item) => item.impact === 'positive' && !item.label.startsWith('Ticker detected'));
  const hasUncertainty = evidence.some((item) => item.label === 'Conditional or uncertain wording');
  const hasNonBuy = evidence.some((item) => item.label.includes('Selling'));

  if (hasNonBuy || !hasAsset) {
    return confidence >= 0.45 && hasPositive ? 'possible' : 'none';
  }

  if (confidence >= 0.68 && hasPositive) {
    return 'high';
  }

  if (confidence >= 0.32 || (hasAsset && hasUncertainty)) {
    return 'possible';
  }

  return 'none';
}

function createSummary(level: SignalLevel, assetLabel: string): string {
  if (level === 'high') {
    return `Potential buying signal detected for ${assetLabel}. Review the original post before making any decision.`;
  }

  if (level === 'possible') {
    return `Possible but uncertain signal involving ${assetLabel}. Treat this as a watch item and verify context.`;
  }

  return 'No recent buying signal detected in this post.';
}

function createReasoning(level: SignalLevel, evidence: SignalEvidence[]): string {
  const positives = evidence.filter((item) => item.impact === 'positive').map((item) => item.label);
  const negatives = evidence.filter((item) => item.impact === 'negative').map((item) => item.label);
  const base = level === 'high' ? 'The post includes stronger buying-signal language.' : level === 'possible' ? 'The post contains some signal evidence but also uncertainty.' : 'The post does not contain enough evidence for a buying signal.';
  const positiveText = positives.length ? ` Positive evidence: ${positives.join('; ')}.` : '';
  const negativeText = negatives.length ? ` Uncertainty: ${negatives.join('; ')}.` : '';
  return `${base}${positiveText}${negativeText}`;
}
