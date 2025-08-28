import { HubstaffClientOptions, TokenSet, HubstaffError } from "../types";

const DEFAULT_AUTH_BASE = "https://account.hubstaff.com";
const DEFAULT_API_BASE = "https://api.hubstaff.com";
const TOKEN_ENDPOINT_PATH = "/oauth/token";

export class HubstaffHttpClient {
  private readonly patRefreshToken: string;
  private tokenSet?: TokenSet;
  private readonly authBaseUrl: string;
  private readonly apiBaseUrl: string;
  private readonly apiVersion: string;
  private readonly onTokenUpdate?: HubstaffClientOptions["onTokenUpdate"];
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private refreshLock?: Promise<TokenSet>;
  private readonly arrayFormat: HubstaffClientOptions["arrayFormat"];

  constructor(opts: HubstaffClientOptions) {
    if (!opts.patRefreshToken) throw new Error("patRefreshToken is required");
    this.patRefreshToken = opts.patRefreshToken;
    this.tokenSet = opts.tokenSet;
    this.authBaseUrl = opts.authBaseUrl ?? DEFAULT_AUTH_BASE;
    this.apiBaseUrl = opts.apiBaseUrl ?? DEFAULT_API_BASE;
    this.apiVersion = opts.apiVersion ?? "v2";
    this.onTokenUpdate = opts.onTokenUpdate;
    this.timeoutMs = opts.timeoutMs ?? 30000;
    this.fetchImpl = opts.fetchImpl ?? (globalThis.fetch as any);
    this.arrayFormat = opts.arrayFormat ?? "comma";
    if (!this.fetchImpl)
      throw new Error(
        "No fetch implementation found. Provide fetchImpl in options on Node <18."
      );
  }

  get apiBase() {
    return this.apiBaseUrl;
  }

  /** Prefix a path with the configured API version unless already versioned. */
  v(path: string): string {
    const p = path.startsWith("/") ? path : "/" + path;
    // If caller already passed a versioned path like /v2/..., leave it as-is
    if (p.startsWith("/v")) return p;
    return `/${this.apiVersion}${p}`;
  }

  async get<T>(path: string, query?: Record<string, any>): Promise<T> {
    const qs = query ? this.buildQuery(query) : "";
    return this.api<T>(path + qs);
  }
  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.api<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.api<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private async api<T>(
    path: string,
    init?: RequestInit,
    attempt = 0
  ): Promise<T> {
    const token = await this.ensureAccessToken();
    const res = await this.fetchWithTimeout(this.apiBaseUrl + path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init?.headers || {}),
      },
    });
    if (res.status === 401) {
      if (!this.refreshLock) {
        this.refreshLock = this.refreshWithRetry(
          this.tokenSet?.refreshToken ?? this.patRefreshToken
        ).finally(() => {
          this.refreshLock = undefined;
        });
      }
      const newToken = await this.refreshLock;
      this.tokenSet = newToken;
      await this.onTokenUpdate?.(newToken);
      const retry = await this.fetchWithTimeout(this.apiBaseUrl + path, {
        ...init,
        headers: {
          Authorization: `Bearer ${newToken.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(init?.headers || {}),
        },
      });
      const retryData = await this.safeJson(retry);
      if (!retry.ok)
        throw new HubstaffError("Hubstaff API error", {
          status: retry.status,
          details: retryData,
        });
      return retryData as T;
    }
    if (
      (res.status === 429 || (res.status >= 500 && res.status <= 599)) &&
      attempt < 2
    ) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "0", 10);
      const backoffMs =
        retryAfter > 0 ? retryAfter * 1000 : 250 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, backoffMs));
      return this.api<T>(path, init, attempt + 1);
    }
    const data = await this.safeJson(res);
    if (!res.ok)
      throw new HubstaffError("Hubstaff API error", {
        status: res.status,
        details: data,
      });
    return data as T;
  }

  private async ensureAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (!this.tokenSet || now >= this.tokenSet.expiresAt - 30) {
      const refreshToken = this.tokenSet?.refreshToken ?? this.patRefreshToken;
      if (!this.refreshLock) {
        this.refreshLock = this.refreshWithRetry(refreshToken).finally(() => {
          this.refreshLock = undefined;
        });
      }
      const newSet = await this.refreshLock;
      this.tokenSet = newSet;
      await this.onTokenUpdate?.(newSet);
    }
    return this.tokenSet!.accessToken;
  }

  private async refreshWithRetry(
    refreshToken: string,
    attempt = 0
  ): Promise<TokenSet> {
    try {
      return await this.doRefresh(refreshToken);
    } catch (err) {
      if (attempt < 1) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        return this.refreshWithRetry(refreshToken, attempt + 1);
      }
      throw err;
    }
  }

  private async doRefresh(refreshToken: string): Promise<TokenSet> {
    const url = this.authBaseUrl + TOKEN_ENDPOINT_PATH;
    const res = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    });
    const data = await this.safeJson(res);
    if (!res.ok)
      throw new HubstaffError("Failed to refresh token", {
        status: res.status,
        details: data,
      });
    const accessToken: string = (data as any).access_token;
    const expiresIn: number = (data as any).expires_in;
    const newRefresh: string = (data as any).refresh_token;
    const expiresAt = Math.floor(Date.now() / 1000) + (expiresIn ?? 3600);
    return { accessToken, refreshToken: newRefresh, expiresAt };
  }

  private async fetchWithTimeout(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(input, {
        ...(init || {}),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async safeJson(res: Response): Promise<unknown> {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return text;
    }
  }

  buildQuery(params: Record<string, any>): string {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        if (this.arrayFormat === "repeat") {
          const base = key.endsWith("[]") ? key : `${key}[]`;
          for (const v of value) qs.append(base, String(v));
        } else {
          qs.set(key, value.join(","));
        }
      } else {
        qs.set(key, String(value));
      }
    }
    const s = qs.toString();
    return s ? `?${s}` : "";
  }
}
