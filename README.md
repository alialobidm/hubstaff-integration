# Hubstaff TypeScript Client (PAT)

A lightweight, framework-agnostic TypeScript client for Hubstaff API using Personal Access Tokens (PAT). Default API version is v2.

What you get:
- PAT auth flow: exchange long-lived refresh token for short-lived access tokens
- Fault-tolerant refresh rotation with single-flight lock and retry
- Minimal endpoints: organizations, projects, tasks
- Time data: time entries, activities, timesheets (reporting)

Note: Always review Hubstaff's docs for required scopes and endpoint availability.

## Install

From npm (recommended):

```bash
npm install hubstaff-integration
```

Local dev (in this repo):

```bash
npm install
npm run build
```

Requirements: Node.js >= 18 (for built-in fetch) or provide a `fetchImpl`.

## Usage

### 1) Create a Hubstaff Personal Access Token (PAT)
- Go to the Hubstaff developer portal and create a Personal Access Token.
- The value you receive IS a refresh_token (long-lived, ~90 days).
- Keep it secret. Use it only on the server (never in a browser).

### 2) Install and build

```bash
cd /Users/technext/hubstaff-integration
npm install
npm run build
```

### 3) Quick start

```ts
import { HubstaffClient } from 'hubstaff-integration';

const client = new HubstaffClient({
  patRefreshToken: process.env.HUBSTAFF_PAT_REFRESH_TOKEN!,
  onTokenUpdate: async (t) => {
    // Persist t.refreshToken and t.expiresAt for reuse across restarts
    // Example persistence is shown below.
  },
  // Optional: select API version (default is 'v2')
  // apiVersion: 'v2',
});

// List organizations
const orgs = await client.listOrganizations();

// Create a project (minimal required fields)
const project = await client.createProject({
  organization_id: orgs[0].id,
  name: 'My Project',
});

// Create a task (minimal required fields)
const task = await client.createTask({
  project_id: project.id,
  summary: 'First Task',
});

// Get time entries and activities for the last 24 hours
const stop = new Date();
const start = new Date(Date.now() - 24 * 3600 * 1000);
const timeEntries = await client.getTimeEntries({
  start_time: start.toISOString(),
  stop_time: stop.toISOString(),
  project_ids: [project.id],
});
const activities = await client.getActivities({
  start_time: start.toISOString(),
  stop_time: stop.toISOString(),
  project_ids: [project.id],
});

// Timesheets reporting (date range)
const timesheets = await client.getTimesheets({
  date: {
    start: start.toISOString().slice(0, 10),
    stop: stop.toISOString().slice(0, 10),
  },
  project_ids: [project.id],
});
```

### 4) Persisting token rotation (recommended)
The client rotates refresh/access tokens automatically. Use `onTokenUpdate` to save the new token set so you don’t re-auth every process start.

Node.js file-based example:

```ts
import { promises as fs } from 'fs';
import path from 'path';
import { HubstaffClient, TokenSet } from 'hubstaff-integration';

const tokensPath = path.join(process.cwd(), 'hubstaff.tokens.json');

async function loadTokenSet(): Promise<TokenSet | undefined> {
  try {
    const raw = await fs.readFile(tokensPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

async function saveTokenSet(t: TokenSet) {
  await fs.writeFile(tokensPath, JSON.stringify(t, null, 2));
}

const tokenSet = await loadTokenSet();
const client = new HubstaffClient({
  patRefreshToken: process.env.HUBSTAFF_PAT_REFRESH_TOKEN!,
  tokenSet,
  onTokenUpdate: saveTokenSet,
});
```

### 5) Common tasks

- Authenticate a third-party server app with PAT
  - Provide your PAT refresh token to `HubstaffClient({ patRefreshToken })`.
  - The client exchanges it via `grant_type=refresh_token` at `https://account.hubstaff.com/oauth/token` and stores new tokens in-memory.
  - Use `onTokenUpdate` to persist the rotated refresh token (long-lived).

- Create Organization, Project, Task (minimal)
  - Organization: `createOrganization({ name })`.
    - Note: May require specific account permissions; some accounts can’t create orgs via API.
  - Project: `createProject({ organization_id, name })`.
  - Task: `createTask({ project_id, summary })`.

- Get project/task time tracking information
  - Time entries: `getTimeEntries({ start_time, stop_time, user_ids?, project_ids?, task_ids? })`.
  - Activities: `getActivities({ start_time, stop_time, user_ids?, project_ids?, task_ids? })`.

- Reporting (timesheets)
  - `getTimesheets({ date: { start, stop }, user_ids?, project_ids?, task_ids?, team_ids? })`.

### 6) Error handling

The client throws `HubstaffError` with optional `status` and `details` from the API response.

```ts
try {
  const projects = await client.listProjects(123);
} catch (e) {
  if (e instanceof HubstaffError) {
    console.error('Hubstaff error', e.status, e.details);
  } else {
    console.error('Unexpected error', e);
  }
}
```

### 7) Rate limits and resilience
- Automatic retries on 401 (refresh + single-flight lock)
- Backoff and retry for 429 and 5xx (small capped retries)
- Consider adding your own queuing/throttling if you expect heavy load

### 8) Server-only usage
PAT is a long-lived refresh token; do NOT use it in browsers or ship it to clients. Keep it on your server.

## Example

Set env var and run the demo:

```
export HUBSTAFF_PAT_REFRESH_TOKEN="<your-refresh-token>"
npm run example
```

## API Notes

- Authentication
  - PAT gives you a refresh_token. Use grant_type=refresh_token at `https://account.hubstaff.com/oauth/token` to get an access token.
  - Send `Authorization: Bearer <access_token>` to `https://api.hubstaff.com`.
  - This client rotates refresh tokens automatically and retries on 401/429/5xx with backoff.

- Organizations
  - `createOrganization({ name })` may require specific account permissions/scopes.

- Projects
  - Minimal create payload: `{ name }` posted to `/{apiVersion}/organizations/{id}/projects`.

- Tasks
  - Minimal create payload: `{ summary }` posted to `/{apiVersion}/projects/{id}/tasks`.

- Time Data
  - `getTimeEntries({ start_time, stop_time, page_start_id?, page_limit?, ... })` -> `/{apiVersion}/time_entries`
  - `getActivities({ start_time, stop_time, page_start_id?, page_limit?, ... })` -> `/{apiVersion}/activities`
  - `getTimesheets({ date: { start, stop }, page_start_id?, page_limit?, ... })` -> `/{apiVersion}/timesheets`

### Selecting API version

- You can pass `apiVersion` to the client options to target a specific Hubstaff API version prefix.
  - Default: `v2`
  - Example: `{ apiVersion: 'v2' }` results in requests like `/v2/...`.
  - If you pass a fully versioned path to low-level methods, the client respects it and does not re-prefix.

## Troubleshooting
- 401 repeatedly: verify the PAT refresh token is valid and has access to the target org/projects; ensure system clock is correct.
- 403/404 on create: your PAT may not have permission or endpoint may be restricted to certain plans.
- Rate limits: client retries on 429, but consider adding your own backoff/queue.

## License
MIT
