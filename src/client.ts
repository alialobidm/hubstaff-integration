import { HubstaffHttpClient } from "./core/http";
import { ActivitiesService } from "./services/activities";
import { OrganizationsService } from "./services/organizations";
import { ProjectsService } from "./services/projects";
import { TasksService } from "./services/tasks";
import { TimeEntriesService } from "./services/time_entries";
import { TimesheetsService } from "./services/timesheets";
import {
  HubstaffClientOptions,
  CreateOrganizationInput,
  Organization,
  CreateProjectInput,
  Project,
  CreateTaskInput,
  Task,
  TimeEntry,
  Activity,
  TimeReportFilters,
  TimesheetRow,
  Pagination,
} from "./types";

/** Root client composing category services by docs sections. */
export class HubstaffClient {
  /** Low-level HTTP/auth client. */
  readonly http: HubstaffHttpClient;
  /** users, organizations, ... */
  readonly organizations: OrganizationsService;
  /** projects endpoints */
  readonly projects: ProjectsService;
  /** tasks endpoints */
  readonly tasks: TasksService;
  /** time_entries endpoints */
  readonly time_entries: TimeEntriesService;
  /** activities endpoints */
  readonly activities: ActivitiesService;
  /** timesheets (reporting) endpoints */
  readonly timesheets: TimesheetsService;

  constructor(opts: HubstaffClientOptions) {
    this.http = new HubstaffHttpClient(opts);
    this.organizations = new OrganizationsService(this.http);
    this.projects = new ProjectsService(this.http);
    this.tasks = new TasksService(this.http);
    this.time_entries = new TimeEntriesService(this.http);
    this.activities = new ActivitiesService(this.http);
    this.timesheets = new TimesheetsService(this.http);
  }

  // Backward-compatible convenience wrappers
  createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    return this.organizations.create(input).then((r) => r.organization);
  }
  listOrganizations(pagination?: Pagination): Promise<Organization[]> {
    return this.organizations.list(pagination).then((r) => r.organizations);
  }
  createProject(input: CreateProjectInput): Promise<Project> {
    return this.projects.create(input).then((r) => r.project);
  }
  listProjects(
    organization_id: number,
    pagination?: Pagination
  ): Promise<Project[]> {
    return this.projects
      .list(organization_id, pagination)
      .then((r) => r.projects);
  }
  createTask(input: CreateTaskInput): Promise<Task> {
    return this.tasks.create(input).then((r) => r.task);
  }
  listTasks(project_id: number, pagination?: Pagination): Promise<Task[]> {
    return this.tasks.list(project_id, pagination).then((r) => r.tasks);
  }
  getTimeEntries(params: {
    start_time: string;
    stop_time: string;
    user_ids?: number[];
    project_ids?: number[];
    task_ids?: number[];
    page_start_id?: number | string;
    page_limit?: number;
  }): Promise<TimeEntry[]> {
    return this.time_entries.list(params).then((r) => r.time_entries);
  }
  getActivities(params: {
    start_time: string;
    stop_time: string;
    user_ids?: number[];
    project_ids?: number[];
    task_ids?: number[];
    page_start_id?: number | string;
    page_limit?: number;
  }): Promise<Activity[]> {
    return this.activities.list(params).then((r) => r.activities);
  }
  getTimesheets(filters: TimeReportFilters): Promise<TimesheetRow[]> {
    return this.timesheets.list(filters).then((r) => r.timesheets);
  }
}

export default HubstaffClient;
