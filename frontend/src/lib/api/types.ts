import type { components } from "@/lib/api/generated";

export type ApiSchemas = components["schemas"];
export type ApiError = ApiSchemas["ErrorEnvelope"];
export type AppMeta = ApiSchemas["HealthMeta"];
export type SampleStatus = ApiSchemas["SampleSummary"]["status"];
export type SampleSummary = ApiSchemas["SampleSummary"];
export type SampleDetail = ApiSchemas["SampleDetail"];
export type SampleListResponse = ApiSchemas["SampleListResponse"];
export type ActionRequest = ApiSchemas["ActionRequest"];
export type ActionResponse = ApiSchemas["ActionResponse"];

export type SortOption = "updated" | "score" | "title";

export interface ListSamplesInput {
  q?: string;
  status?: SampleStatus;
  sort?: SortOption;
}

export interface SampleApi {
  getMeta(): Promise<AppMeta>;
  listSamples(input?: ListSamplesInput): Promise<SampleListResponse>;
  getSample(id: string): Promise<SampleDetail>;
  runAction(id: string, input: ActionRequest): Promise<ActionResponse>;
}
