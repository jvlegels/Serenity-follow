const DEFAULT_X_USERNAME = 'aleabitoreddit';
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;

let resolvedUserId = process.env.X_USER_ID;

export function hasXCredentials() {
  return Boolean(X_BEARER_TOKEN);
}

export async function fetchSerenityPosts() {
  if (!hasXCredentials()) {
    throw new Error('Set X_BEARER_TOKEN to fetch live public Serenity posts from the X API. X_USER_ID is optional when X_USERNAME is set.');
  }

  const userId = await getSerenityUserId();
  const url = new URL(`https://api.x.com/2/users/${userId}/tweets`);
  url.searchParams.set('max_results', '10');
  url.searchParams.set('tweet.fields', 'created_at');
  url.searchParams.set('exclude', 'retweets,replies');

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${X_BEARER_TOKEN}`
    }
  });

  if (!response.ok) {
    throw new Error(`X API request failed with ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  return (payload.data ?? []).map((tweet) => ({
    id: tweet.id,
    text: tweet.text,
    createdAt: tweet.created_at ?? new Date().toISOString(),
    url: `https://x.com/${getConfiguredUsername()}/status/${tweet.id}`
  }));
}

async function getSerenityUserId() {
  if (resolvedUserId) {
    return resolvedUserId;
  }

  const username = getConfiguredUsername();
  const url = new URL(`https://api.x.com/2/users/by/username/${username}`);
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${X_BEARER_TOKEN}`
    }
  });

  if (!response.ok) {
    throw new Error(`X username lookup failed with ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  if (!payload.data?.id) {
    throw new Error(`X username lookup did not return a user id for @${username}.`);
  }

  resolvedUserId = payload.data.id;
  return resolvedUserId;
}

function getConfiguredUsername() {
  return (process.env.X_USERNAME ?? DEFAULT_X_USERNAME).replace(/^@/, '');
}
