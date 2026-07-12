export function normalizeRedisUrl(redisUrl: string): string {
  const url = new URL(redisUrl);
  if (url.hostname === 'localhost') {
    url.hostname = '127.0.0.1';
  }
  return url.toString();
}

export function redisConnectionOptions(redisUrl: string) {
  const url = new URL(normalizeRedisUrl(redisUrl));
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname && url.pathname !== '/' ? Number(url.pathname.slice(1)) : 0,
    tls: url.protocol === 'rediss:' ? {} : undefined,
  };
}
