const normalizeCoingeckoId = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export { normalizeCoingeckoId };


