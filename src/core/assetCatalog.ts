import type { AssetMention } from '../domain/types.js';

interface KnownAsset {
  name: string;
  type: AssetMention['type'];
  googleFinanceQuote: string;
}

const KNOWN_ASSETS: Record<string, KnownAsset> = {
  COIN: { name: 'Coinbase', type: 'equity', googleFinanceQuote: 'COIN:NASDAQ' },
  MSTR: { name: 'MicroStrategy', type: 'equity', googleFinanceQuote: 'MSTR:NASDAQ' },
  NVDA: { name: 'NVIDIA', type: 'equity', googleFinanceQuote: 'NVDA:NASDAQ' },
  TSLA: { name: 'Tesla', type: 'equity', googleFinanceQuote: 'TSLA:NASDAQ' },
  HOOD: { name: 'Robinhood', type: 'equity', googleFinanceQuote: 'HOOD:NASDAQ' },
  BTC: { name: 'Bitcoin', type: 'crypto', googleFinanceQuote: 'BTC-USD' },
  ETH: { name: 'Ethereum', type: 'crypto', googleFinanceQuote: 'ETH-USD' },
  SOL: { name: 'Solana', type: 'crypto', googleFinanceQuote: 'SOL-USD' }
};

const STOPWORDS = new Set(['I', 'A', 'AN', 'THE', 'X', 'RT', 'CEO', 'USD', 'USDT', 'NFA']);

export function extractAsset(text: string): AssetMention | null {
  const cashtag = text.match(/\$([A-Z][A-Z0-9.]{1,9})\b/);
  const upperToken = text.match(/\b([A-Z]{2,5})(?:\b|\/USD\b)/);
  const symbol = cashtag?.[1] ?? (upperToken?.[1] && !STOPWORDS.has(upperToken[1]) ? upperToken[1] : null);

  if (!symbol) {
    return null;
  }

  const ticker = symbol.toUpperCase();
  const known = KNOWN_ASSETS[ticker];
  return {
    ticker,
    name: known?.name ?? ticker,
    type: known?.type ?? 'unknown',
    financeUrl: buildGoogleFinanceUrl(ticker)
  };
}

export function buildGoogleFinanceUrl(ticker: string): string {
  const cleanTicker = ticker.replace(/^\$/, '').toUpperCase();
  const known = KNOWN_ASSETS[cleanTicker];
  if (known) {
    return `https://www.google.com/finance/quote/${encodeURIComponent(known.googleFinanceQuote)}`;
  }

  return `https://www.google.com/finance/search?q=${encodeURIComponent(cleanTicker)}`;
}
