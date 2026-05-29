import { serenityAccount } from '../data/mockSerenityPosts.js';
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;
const DEFAULT_USERNAME = 'aleabitoreddit';
let cachedUserId = process.env.X_USER_ID;
export function hasXApiCredentials() {
    return Boolean(X_BEARER_TOKEN);
}
export async function fetchSerenityPostsFromX() {
    if (!X_BEARER_TOKEN) {
        throw new Error('Missing X_BEARER_TOKEN. The app can run with mock data, but live public X monitoring requires an X API bearer token.');
    }
    const username = configuredUsername();
    const userId = await resolveUserId(username);
    const url = new URL(`https://api.x.com/2/users/${userId}/tweets`);
    url.searchParams.set('max_results', '10');
    url.searchParams.set('tweet.fields', 'created_at');
    url.searchParams.set('exclude', 'retweets,replies');
    const response = await fetch(url, { headers: { Authorization: `Bearer ${X_BEARER_TOKEN}` } });
    if (!response.ok) {
        throw new Error(`X timeline request failed with ${response.status}: ${await response.text()}`);
    }
    const payload = await response.json();
    return (payload.data ?? []).map((tweet) => ({
        id: tweet.id,
        accountId: serenityAccount.id,
        source: 'x',
        authorHandle: username,
        text: tweet.text,
        url: `https://x.com/${username}/status/${tweet.id}`,
        postedAt: tweet.created_at ?? new Date().toISOString()
    }));
}
async function resolveUserId(username) {
    if (cachedUserId) {
        return cachedUserId;
    }
    const response = await fetch(`https://api.x.com/2/users/by/username/${username}`, {
        headers: { Authorization: `Bearer ${X_BEARER_TOKEN}` }
    });
    if (!response.ok) {
        throw new Error(`X username lookup failed with ${response.status}: ${await response.text()}`);
    }
    const payload = await response.json();
    if (!payload.data?.id) {
        throw new Error(`X username lookup did not return a user id for @${username}.`);
    }
    cachedUserId = payload.data.id;
    return cachedUserId;
}
function configuredUsername() {
    return (process.env.X_USERNAME ?? DEFAULT_USERNAME).replace(/^@/, '');
}
