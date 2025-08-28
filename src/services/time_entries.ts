import { HubstaffHttpClient } from "../core/http";
import { TimeEntry } from "../types";

/** time_entries endpoints */
export class TimeEntriesService {
  constructor(private readonly http: HubstaffHttpClient) {}

  list(params: {
    start_time: string;
    stop_time: string;
    user_ids?: number[];
    project_ids?: number[];
    task_ids?: number[];
    page_start_id?: number | string;
    page_limit?: number;
  }): Promise<{ time_entries: TimeEntry[]; pagination?: any }> {
    return this.http.get(this.http.v(`/time_entries`), {
      start_time: params.start_time,
      stop_time: params.stop_time,
      user_ids: params.user_ids,
      project_ids: params.project_ids,
      task_ids: params.task_ids,
      page_start_id: params.page_start_id,
      page_limit: params.page_limit,
    });
  }
}
