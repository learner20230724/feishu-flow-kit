import { fetchTenantAccessToken } from './fetch-tenant-access-token.js';

const DEFAULT_REFRESH_BUFFER_SECONDS = 60;

interface CachedTenantAccessTokenEntry {
  token: string;
  expiresAt: number;
}

const tenantAccessTokenCache = new Map<string, CachedTenantAccessTokenEntry>();

export interface GetTenantAccessTokenOptions {
  appId: string;
  appSecret: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  refreshBufferSeconds?: number;
}

function buildCacheKey(appId: string, appSecret: string) {
  return `${appId.trim()}::${appSecret.trim()}`;
}

function shouldReuseCachedToken(
  entry: CachedTenantAccessTokenEntry | undefined,
  nowMs: number,
  refreshBufferSeconds: number,
) {
  if (!entry) return false;
  return entry.expiresAt - refreshBufferSeconds * 1000 > nowMs;
}

export async function getTenantAccessToken(
  options: GetTenantAccessTokenOptions,
): Promise<string> {
  const now = options.now ?? Date.now;
  const refreshBufferSeconds = options.refreshBufferSeconds ?? DEFAULT_REFRESH_BUFFER_SECONDS;
  const nowMs = now();
  const cacheKey = buildCacheKey(options.appId, options.appSecret);
  const cached = tenantAccessTokenCache.get(cacheKey);

  if (shouldReuseCachedToken(cached, nowMs, refreshBufferSeconds) && cached) {
    return cached.token;
  }

  const result = await fetchTenantAccessToken({
    appId: options.appId,
    appSecret: options.appSecret,
    fetchImpl: options.fetchImpl,
  });

  tenantAccessTokenCache.set(cacheKey, {
    token: result.token,
    expiresAt: nowMs + result.expireSeconds * 1000,
  });

  return result.token;
}

export function clearTenantAccessTokenCache() {
  tenantAccessTokenCache.clear();
}
