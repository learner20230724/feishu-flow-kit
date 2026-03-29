export interface FeishuTenantAccessTokenResponse {
  code?: number;
  msg?: string;
  tenant_access_token?: string;
  expire?: number;
}

export interface FetchTenantAccessTokenOptions {
  appId: string;
  appSecret: string;
  fetchImpl?: typeof fetch;
  cache?: FeishuTenantAccessTokenCache;
}

export interface FetchTenantAccessTokenResult {
  token: string;
  expireSeconds: number;
}

export interface FeishuTenantAccessTokenCacheEntry extends FetchTenantAccessTokenResult {
  expiresAt: number;
}

export interface FeishuTenantAccessTokenCache {
  get(cacheKey: string): FeishuTenantAccessTokenCacheEntry | undefined;
  set(cacheKey: string, value: FeishuTenantAccessTokenCacheEntry): void;
}

const DEFAULT_CACHE_SAFETY_SECONDS = 60;

function getCacheKey(appId: string, appSecret: string) {
  return `${appId}::${appSecret}`;
}

function getCurrentUnixSeconds() {
  return Math.floor(Date.now() / 1000);
}

function isCacheEntryUsable(entry: FeishuTenantAccessTokenCacheEntry | undefined) {
  if (!entry) return false;
  return entry.expiresAt > getCurrentUnixSeconds();
}

export class InMemoryFeishuTenantAccessTokenCache implements FeishuTenantAccessTokenCache {
  private readonly store = new Map<string, FeishuTenantAccessTokenCacheEntry>();

  get(cacheKey: string) {
    const entry = this.store.get(cacheKey);
    if (!isCacheEntryUsable(entry)) {
      this.store.delete(cacheKey);
      return undefined;
    }
    return entry;
  }

  set(cacheKey: string, value: FeishuTenantAccessTokenCacheEntry) {
    this.store.set(cacheKey, value);
  }
}

export async function fetchTenantAccessToken(
  options: FetchTenantAccessTokenOptions,
): Promise<FetchTenantAccessTokenResult> {
  const appId = options.appId.trim();
  const appSecret = options.appSecret.trim();

  if (!appId || !appSecret) {
    throw new Error('Missing FEISHU_APP_ID or FEISHU_APP_SECRET for outbound reply sending.');
  }

  const cacheKey = getCacheKey(appId, appSecret);
  const cached = options.cache?.get(cacheKey);
  if (cached) {
    return {
      token: cached.token,
      expireSeconds: Math.max(0, cached.expiresAt - getCurrentUnixSeconds()),
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
    }),
  });

  const payload = (await response.json()) as FeishuTenantAccessTokenResponse;

  if (!response.ok) {
    throw new Error(`Failed to fetch Feishu tenant access token: HTTP ${response.status}`);
  }

  if (payload.code !== 0 || !payload.tenant_access_token) {
    throw new Error(payload.msg || 'Failed to fetch Feishu tenant access token.');
  }

  const expireSeconds = payload.expire ?? 7200;
  const expiresAt = getCurrentUnixSeconds() + Math.max(0, expireSeconds - DEFAULT_CACHE_SAFETY_SECONDS);

  options.cache?.set(cacheKey, {
    token: payload.tenant_access_token,
    expireSeconds,
    expiresAt,
  });

  return {
    token: payload.tenant_access_token,
    expireSeconds,
  };
}
