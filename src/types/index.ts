/**
 * A pair of tokens used to access Hubstaff.
 * - accessToken: short-lived Bearer token for API calls
 * - refreshToken: long-lived token for renewing the access token (rotates)
 * - expiresAt: UNIX epoch seconds when the access token expires
 */
export type TokenSet = {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number; // epoch seconds
};

/**
 * Options for constructing the Hubstaff client.
 */
export type HubstaffClientOptions = {
  /**
   * The long-lived refresh token string from a Hubstaff Personal Access Token (PAT).
   * Used to obtain and rotate access tokens.
   */
  patRefreshToken: string;
  /**
   * Optional pre-existing tokenSet you persist and reload between runs.
   */
  tokenSet?: TokenSet;
  /**
   * Authentication base URL. Defaults to https://account.hubstaff.com
   */
  authBaseUrl?: string;
  /**
   * API base URL. Defaults to https://api.hubstaff.com
   */
  apiBaseUrl?: string;
  /**
   * Hubstaff API version prefix used in paths. Defaults to 'v2'.
   * Example: 'v2' -> requests go to /v2/... endpoints.
   */
  apiVersion?: string;
  /**
   * Fetch implementation. Node >=18 has global fetch; provide one for older runtimes.
   */
  fetchImpl?: typeof fetch;
  /**
   * Hook invoked when tokens rotate. Persist the provided token set.
   */
  onTokenUpdate?: (tokenSet: TokenSet) => void | Promise<void>;
  /**
   * Default timeout (ms) for API calls. Default: 30000.
   */
  timeoutMs?: number;
  /**
   * How to encode arrays in query string.
   * - 'comma' => key=1,2,3 (default)
   * - 'repeat' => key[]=1&key[]=2
   */
  arrayFormat?: "comma" | "repeat";
};

/** Minimal fields to create an organization. */
export type CreateOrganizationInput = { name: string };

/** Organization entity. */
export type Organization = { readonly id: number; readonly name: string };

/** Minimal fields to create a project. */
export type CreateProjectInput = { organization_id: number; name: string };

/** Project entity. */
export type Project = {
  readonly id: number;
  readonly name: string;
  readonly status?: string;
  readonly organization_id: number;
};

/** Minimal fields to create a task. */
export type CreateTaskInput = { project_id: number; summary: string };

/** Task entity. */
export type Task = {
  readonly id: number;
  readonly summary: string;
  readonly project_id: number;
  readonly status?: string;
};

/** Time entry record. */
export type TimeEntry = {
  readonly id: number;
  readonly user_id: number;
  readonly project_id?: number;
  readonly task_id?: number;
  readonly starts_at: string; // ISO8601 datetime
  readonly stops_at: string; // ISO8601 datetime
  readonly duration: number; // seconds
};

/** Activity record (e.g., keyboard/mouse/screenshot metrics). */
export type Activity = {
  readonly id: number;
  readonly type: string;
  readonly recorded_at: string; // ISO8601 datetime
  readonly project_id?: number;
  readonly task_id?: number;
  readonly user_id: number;
  readonly activity: number; // 0-100
};

/** Filters for timesheets endpoint (reporting). */
export type TimeReportFilters = {
  /** Date range; often date-only (YYYY-MM-DD) for timesheets. */
  date: { start: string; stop: string };
  user_ids?: number[];
  project_ids?: number[];
  task_ids?: number[];
  team_ids?: number[];
  page_start_id?: number | string;
  page_limit?: number;
};

/** Summarized timesheet row. */
export type TimesheetRow = {
  readonly date: string; // YYYY-MM-DD
  readonly user_id: number;
  readonly project_id?: number;
  readonly task_id?: number;
  readonly duration: number; // seconds
};

/** Generic pagination options. */
// Hubstaff V2 pagination uses cursor-style params
// - page_start_id: continue from the id provided by response.pagination.next_page_start_id
// - page_limit: how many records to return (default 100, endpoint-restricted)
export type Pagination = {
  page_start_id?: number | string;
  page_limit?: number;
};

/**
 * Error type thrown by the client for non-OK responses or auth failures.
 */
export class HubstaffError extends Error {
  /** HTTP status code, if available. */
  status?: number;
  /** Optional error code, if provided by Hubstaff. */
  code?: string;
  /** Raw error payload or text from Hubstaff response. */
  details?: unknown;
  constructor(
    message: string,
    opts?: { status?: number; code?: string; details?: unknown }
  ) {
    super(message);
    this.name = "HubstaffError";
    this.status = opts?.status;
    this.code = opts?.code;
    this.details = opts?.details;
  }
}
