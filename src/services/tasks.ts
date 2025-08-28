import { HubstaffHttpClient } from "../core/http";
import { CreateTaskInput, Task, Pagination } from "../types";

/** Task endpoints */
export class TasksService {
  constructor(private readonly http: HubstaffHttpClient) {}

  create(input: CreateTaskInput): Promise<{ task: Task }> {
    return this.http.post(this.http.v(`/projects/${input.project_id}/tasks`), {
      summary: input.summary,
    });
  }

  list(
    project_id: number,
    pagination?: Pagination
  ): Promise<{ tasks: Task[]; pagination?: any }> {
    return this.http.get(this.http.v(`/projects/${project_id}/tasks`), {
      page_start_id: pagination?.page_start_id,
      page_limit: pagination?.page_limit,
    });
  }

  /** Create task with full payload and optional query params. */
  createRaw(
    project_id: number,
    body: Record<string, any>,
    query?: Record<string, any>
  ): Promise<{ task: Task }> {
    const qs = query ? this.http.buildQuery(query) : "";
    return this.http.post(
      this.http.v(`/projects/${project_id}/tasks`) + qs,
      body
    );
  }

  /** Update a task by id with full or partial body via PUT. */
  update(
    task_id: number,
    body: Record<string, any>,
    query?: Record<string, any>
  ): Promise<{ task: Task }> {
    const qs = query ? this.http.buildQuery(query) : "";
    return this.http.put(this.http.v(`/tasks/${task_id}`) + qs, body);
  }
}
