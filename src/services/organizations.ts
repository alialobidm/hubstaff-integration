import { HubstaffHttpClient } from "../core/http";
import { CreateOrganizationInput, Organization, Pagination } from "../types";

/** Organization endpoints */
export class OrganizationsService {
  constructor(private readonly http: HubstaffHttpClient) {}

  create(
    input: CreateOrganizationInput
  ): Promise<{ organization: Organization }> {
    return this.http.post(this.http.v(`/organizations`), { name: input.name });
  }

  list(
    pagination?: Pagination
  ): Promise<{ organizations: Organization[]; pagination?: any }> {
    return this.http.get(this.http.v(`/organizations`), {
      page_start_id: pagination?.page_start_id,
      page_limit: pagination?.page_limit,
    });
  }

  /**
   * Create organization with full payload and optional query params (for future-proofing additional fields/scopes).
   */
  createRaw(
    body: Record<string, any>,
    query?: Record<string, any>
  ): Promise<{ organization: Organization }> {
    const qs = query ? this.http.buildQuery(query) : "";
    return this.http.post(this.http.v(`/organizations`) + qs, body);
  }

  /**
   * Update an organization via PUT, providing the organization id and full/partial body.
   */
  update(
    organization_id: number,
    body: Record<string, any>,
    query?: Record<string, any>
  ): Promise<{ organization: Organization }> {
    const qs = query ? this.http.buildQuery(query) : "";
    return this.http.put(
      this.http.v(`/organizations/${organization_id}`) + qs,
      body
    );
  }
}
