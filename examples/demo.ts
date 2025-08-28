import { HubstaffClient } from "../src";

async function main() {
  const patRefreshToken = process.env.HUBSTAFF_PAT_REFRESH_TOKEN;
  if (!patRefreshToken) {
    console.error(
      "Set HUBSTAFF_PAT_REFRESH_TOKEN to your Hubstaff PAT refresh token."
    );
    process.exit(1);
  }

  const client = new HubstaffClient({
    patRefreshToken,
    onTokenUpdate: (t) => {
      // In a real app, persist t.refreshToken and t.expiresAt safely
      console.log(
        "Token rotated. ExpiresAt:",
        new Date(t.expiresAt * 1000).toISOString()
      );
    },
  });

  // List orgs
  const orgs = await client.listOrganizations();
  console.log("Orgs:", orgs);

  if (orgs.length === 0) {
    console.log(
      "No organizations available for this token. Create one in Hubstaff UI."
    );
    return;
  }

  const org = orgs[0];

  // Create a project with minimal required data
  const project = await client.createProject({
    organization_id: org.id,
    name: "Sample Project " + Date.now(),
  });
  console.log("Created project:", project);

  // Create a task
  const task = await client.createTask({
    project_id: project.id,
    summary: "First task",
  });
  console.log("Created task:", task);

  // Fetch recent time entries for last 24h
  const stop = new Date();
  const start = new Date(Date.now() - 24 * 3600 * 1000);
  const timeEntries = await client.getTimeEntries({
    start_time: start.toISOString(),
    stop_time: stop.toISOString(),
    project_ids: [project.id],
  });
  console.log("Time entries:", timeEntries.length);

  // Fetch activities
  const activities = await client.getActivities({
    start_time: start.toISOString(),
    stop_time: stop.toISOString(),
    project_ids: [project.id],
  });
  console.log("Activities:", activities.length);

  // Fetch timesheets
  const timesheets = await client.getTimesheets({
    date: {
      start: start.toISOString().slice(0, 10),
      stop: stop.toISOString().slice(0, 10),
    },
    project_ids: [project.id],
  });
  console.log("Timesheets rows:", timesheets.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
