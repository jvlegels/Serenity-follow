export function createSamplePosts() {
  return [
    {
      id: 'demo-3',
      text: 'Added a starter position in $COIN here. Clean setup, strong relative strength.',
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      url: 'https://x.com/aleabitoreddit'
    },
    {
      id: 'demo-2',
      text: 'Watching $MSTR if it breaks the range. No entry yet.',
      createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      url: 'https://x.com/aleabitoreddit'
    },
    {
      id: 'demo-1',
      text: 'Market still messy today. Patience beats forcing trades.',
      createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      url: 'https://x.com/aleabitoreddit'
    }
  ];
}
