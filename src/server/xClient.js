const SERENITY_USER_ID = process.env.X_USER_ID;
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;

export function hasXCredentials() {
  return Boolean(SERENITY_USER_ID && X_BEARER_TOKEN);
}

export async function fetchSerenityPosts() {
  if (!hasXCredentials()) {
    throw new Error('Set X_USER_ID and X_BEARER_TOKEN to fetch live Serenity posts from X.');
  }

  const url = new URL(`https://api.x.com/2/users/${SERENITY_USER_ID}/tweets`);
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
    url: `https://x.com/aleabitoreddit/status/${tweet.id}`
  }));
}
