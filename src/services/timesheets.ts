import { HubstaffHttpClient } from "../core/http";
import { TimeReportFilters, TimesheetRow } from "../types";

/** timesheets endpoints (reporting) */
export class TimesheetsService {
  constructor(private readonly http: HubstaffHttpClient) {}

  list(
    filters: TimeReportFilters
  ): Promise<{ timesheets: TimesheetRow[]; pagination?: any }> {
    return this.http.get(this.http.v(`/timesheets`), {
      start_date: filters.date.start,
      end_date: filters.date.stop,
      user_ids: filters.user_ids,
      project_ids: filters.project_ids,
      task_ids: filters.task_ids,
      team_ids: filters.team_ids,
      page_start_id: filters.page_start_id,
      page_limit: filters.page_limit,
    });
  }
}
