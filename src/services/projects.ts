import { HubstaffHttpClient } from "../core/http";
import { CreateProjectInput, Project, Pagination } from "../types";

/** Project endpoints */
export class ProjectsService {
  constructor(private readonly http: HubstaffHttpClient) {}

  create(input: CreateProjectInput): Promise<{ project: Project }> {
    return this.http.post(
      this.http.v(`/organizations/${input.organization_id}/projects`),
      { name: input.name }
    );
  }

  list(
    organization_id: number,
    pagination?: Pagination
  ): Promise<{ projects: Project[] }> {
    return this.http.get(
      this.http.v(`/organizations/${organization_id}/projects`),
      {
        page_start_id: pagination?.page_start_id,
        page_limit: pagination?.page_limit,
      }
    );
  }

  /** Create project with full payload and optional query. */
  createRaw(
    organization_id: number,
    body: Record<string, any>,
    query?: Record<string, any>
  ): Promise<{ project: Project }> {
    const qs = query ? this.http.buildQuery(query) : "";
    return this.http.post(
      this.http.v(`/organizations/${organization_id}/projects`) + qs,
      body
    );
  }

  /** Update project by id with full or partial body via PUT. */
  update(
    project_id: number,
    body: Record<string, any>,
    query?: Record<string, any>
  ): Promise<{ project: Project }> {
    const qs = query ? this.http.buildQuery(query) : "";
    return this.http.put(this.http.v(`/projects/${project_id}`) + qs, body);
  }
}
