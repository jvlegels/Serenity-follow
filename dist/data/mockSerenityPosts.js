export const serenityAccount = {
    id: 'acct_serenity_x',
    source: 'x',
    handle: 'aleabitoreddit',
    displayName: 'Serenity',
    profileUrl: 'https://x.com/aleabitoreddit',
    enabled: true
};
export function createMockSerenityPosts(now = new Date()) {
    const minute = 60_000;
    return [
        createPost('mock_006', 'Added a starter position in $COIN here. Clean setup, strong relative strength.', 12 * minute, now),
        createPost('mock_005', 'Watching $MSTR if it breaks the range. No entry yet.', 44 * minute, now),
        createPost('mock_004', 'If $NVDA reclaims yesterday high I may add, but not chasing this candle.', 86 * minute, now),
        createPost('mock_003', 'Bought $TSLA calls for a tactical trade. Small size, defined risk.', 132 * minute, now),
        createPost('mock_002', 'Market still messy today. Patience beats forcing trades.', 180 * minute, now),
        createPost('mock_001', 'Taking profit on part of $HOOD. Great move, but this is not a fresh buy for me.', 230 * minute, now)
    ];
}
function createPost(id, text, ageMs, now) {
    return {
        id,
        accountId: serenityAccount.id,
        source: 'mock',
        authorHandle: serenityAccount.handle,
        text,
        url: `${serenityAccount.profileUrl}/status/${id}`,
        postedAt: new Date(now.getTime() - ageMs).toISOString()
    };
}
