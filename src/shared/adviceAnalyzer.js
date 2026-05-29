const BUY_PATTERNS = [
  /\b(buy|buying|bought|accumulate|add|adding|added|long|ape(?:ing)?|entry|load(?:ing)? up)\b/i,
  /\b(i(?:'|’)m in|i am in|position(?:ed)? in)\b/i
];

const HEDGE_PATTERNS = [
  /\b(not financial advice|nfa|watch(?:ing)?|if .* breaks|might|maybe|may|could|wait(?:ing)?|no entry|not chasing|do not buy|don't buy)\b/i,
  /\b(short|selling|sold|exit(?:ed)?|take profit|taking profit)\b/i
];

const STOPWORDS = new Set(['I', 'A', 'AN', 'THE', 'X', 'RT', 'CEO', 'USD', 'USDT', 'ETH', 'BTC']);

export function analyzeTweet(post) {
  const normalized = post.text.replace(/https?:\/\/\S+/g, '').trim();
  const hasBuyLanguage = BUY_PATTERNS.some((pattern) => pattern.test(normalized));
  const hasHedgeLanguage = HEDGE_PATTERNS.some((pattern) => pattern.test(normalized));
  const assets = extractAssets(normalized);

  let signal = 'ignore';
  let confidence = 0.12;

  if (hasBuyLanguage && assets.length > 0 && !hasHedgeLanguage) {
    signal = 'buy';
    confidence = 0.86;
  } else if ((hasBuyLanguage || assets.length > 0) && hasHedgeLanguage) {
    signal = 'watch';
    confidence = 0.48;
  } else if (hasBuyLanguage) {
    signal = 'watch';
    confidence = 0.4;
  }

  const assetLabels = assets.map((asset) => asset.label).join(', ');
  const headline = signal === 'buy'
    ? `Clear buy signal: ${assetLabels}`
    : signal === 'watch'
      ? `Needs review: ${assetLabels || 'no asset detected'}`
      : 'No actionable buying advice detected';

  return {
    id: post.id,
    signal,
    confidence,
    headline,
    summary: summarizeAdvice(normalized, signal, assets),
    assets,
    sourceTweetUrl: post.url ?? `https://x.com/aleabitoreddit/status/${post.id}`,
    createdAt: post.createdAt,
    originalText: post.text
  };
}

export function extractAssets(text) {
  const cashtags = Array.from(text.matchAll(/\$([A-Z][A-Z0-9.]{1,9})\b/g)).map((match) => match[1]);
  const uppercaseTokens = Array.from(text.matchAll(/\b([A-Z]{2,5})(?:\b|\/USD\b)/g))
    .map((match) => match[1])
    .filter((token) => !STOPWORDS.has(token));
  const tokens = [...new Set([...cashtags, ...uppercaseTokens])];

  return tokens.slice(0, 4).map((symbol) => ({
    symbol,
    label: `$${symbol}`,
    googleFinanceUrl: buildGoogleFinanceUrl(symbol)
  }));
}

export function buildGoogleFinanceUrl(symbol) {
  const clean = symbol.replace(/^\$/, '').toUpperCase();
  return `https://www.google.com/finance/search?q=${encodeURIComponent(clean)}`;
}

function summarizeAdvice(text, signal, assets) {
  const assetPhrase = assets.length > 0 ? assets.map((asset) => asset.label).join(', ') : 'an unspecified asset';
  const conciseText = text.length > 180 ? `${text.slice(0, 177)}...` : text;

  if (signal === 'buy') {
    return `Serenity appears to be giving direct buying advice for ${assetPhrase}. Review the original post before acting: “${conciseText}”`;
  }

  if (signal === 'watch') {
    return `The post mentions ${assetPhrase}, but the language is conditional, hedged, or missing a clear asset. Treat it as a watch item, not a buy alert.`;
  }

  return 'No clear buying instruction was found in this post.';
}
