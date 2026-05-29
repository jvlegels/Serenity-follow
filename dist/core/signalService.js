import { classifyPost } from './signalClassifier.js';
import { toPercent } from './confidence.js';
export const defaultSettings = {
    notifyHighConfidence: true,
    notifyPossibleSignals: false,
    highConfidenceThreshold: 0.68,
    possibleSignalThreshold: 0.32,
    pollIntervalMinutes: 5
};
export function analyzePosts(posts) {
    return posts
        .map((post) => ({ post, analysis: classifyPost(post) }))
        .sort((left, right) => Date.parse(right.post.postedAt) - Date.parse(left.post.postedAt));
}
export function latestNoteworthySignal(records) {
    return records.find((record) => record.analysis.level === 'high')
        ?? records.find((record) => record.analysis.level === 'possible')
        ?? null;
}
export function createWidgetState(records, now = new Date()) {
    const signal = latestNoteworthySignal(records);
    if (!signal) {
        return {
            color: 'grey',
            title: 'No recent signal',
            summary: 'No potential buying signal detected in the latest Serenity posts.',
            signalId: null,
            updatedAt: now.toISOString()
        };
    }
    const ticker = signal.analysis.asset?.ticker ? `$${signal.analysis.asset.ticker}` : signal.analysis.asset?.name ?? 'asset';
    const confidence = toPercent(signal.analysis.confidence);
    return {
        color: signal.analysis.level === 'high' ? 'green' : 'amber',
        title: signal.analysis.level === 'high' ? 'Potential signal detected' : 'Possible signal — review',
        summary: `${ticker} · ${confidence}% confidence`,
        signalId: signal.analysis.id,
        updatedAt: now.toISOString()
    };
}
