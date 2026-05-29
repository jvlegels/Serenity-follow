const KNOWN_ASSETS = {
    COIN: { name: 'Coinbase', type: 'equity' },
    MSTR: { name: 'MicroStrategy', type: 'equity' },
    NVDA: { name: 'NVIDIA', type: 'equity' },
    TSLA: { name: 'Tesla', type: 'equity' },
    HOOD: { name: 'Robinhood', type: 'equity' },
    BTC: { name: 'Bitcoin', type: 'crypto' },
    ETH: { name: 'Ethereum', type: 'crypto' },
    SOL: { name: 'Solana', type: 'crypto' }
};
const STOPWORDS = new Set(['I', 'A', 'AN', 'THE', 'X', 'RT', 'CEO', 'USD', 'USDT', 'NFA']);
export function extractAsset(text) {
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
        financeUrl: `https://www.google.com/finance/search?q=${encodeURIComponent(ticker)}`
    };
}
