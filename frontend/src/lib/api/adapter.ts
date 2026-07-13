import { sampleDetails } from "@/mocks/samples";

import type {
  ActionResponse,
  AppMeta,
  ListSamplesInput,
  SampleApi,
  SampleDetail,
  SampleListResponse,
} from "./types";

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function toQuery(input: ListSamplesInput = {}): string {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.status) params.set("status", input.status);
  if (input.sort) params.set("sort", input.sort);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

class RequestError extends Error {
  readonly retryable: boolean;
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;

  constructor(message: string, options: { retryable?: boolean; status?: number; code?: string; requestId?: string } = {}) {
    super(message);
    this.name = "RequestError";
    this.retryable = options.retryable ?? false;
    this.status = options.status ?? 0;
    this.code = options.code;
    this.requestId = options.requestId;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string; retryable?: boolean; code?: string; request_id?: string }
      | null;
    throw new RequestError(body?.message ?? "The request could not be completed.", {
      retryable: body?.retryable,
      status: response.status,
      code: body?.code,
      requestId: body?.request_id,
    });
  }
  return (await response.json()) as T;
}

const httpApi: SampleApi = {
  getMeta: () => request<AppMeta>("/api/v1/meta"),
  listSamples: (input) => request<SampleListResponse>(`/api/v1/samples${toQuery(input)}`),
  getSample: (id) => request<SampleDetail>(`/api/v1/samples/${encodeURIComponent(id)}`),
  runAction: (id, input) =>
    request<ActionResponse>(`/api/v1/samples/${encodeURIComponent(id)}/actions`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const mockApi: SampleApi = {
  async getMeta() {
    await delay(80);
    return {
      app_name: "overnight-web-agent-kit-api",
      version: "0.1.0",
      generated_at: "2026-07-10T12:00:00Z",
      features: ["typed-contract", "mock-compatible", "representative-action"],
    };
  },
  async listSamples(input = {}) {
    await delay(110);
    const query = input.q?.trim().toLocaleLowerCase();
    let items = sampleDetails.map((detail) => ({
      id: detail.id,
      title: detail.title,
      subtitle: detail.subtitle,
      status: detail.status,
      tags: detail.tags,
      updated_at: detail.updated_at,
      owner: detail.owner,
      score: detail.score,
      missing_fields: detail.missing_fields,
    }));
    if (query) {
      items = items.filter(
        (item) =>
          item.title.toLocaleLowerCase().includes(query) ||
          (item.subtitle ?? "").toLocaleLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLocaleLowerCase().includes(query)),
      );
    }
    if (input.status) items = items.filter((item) => item.status === input.status);
    if (input.sort === "score") items.sort((a, b) => b.score - a.score);
    if (input.sort === "title") items.sort((a, b) => a.title.localeCompare(b.title));
    if (!input.sort || input.sort === "updated") {
      items.sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
    }
    return {
      items: clone(items),
      total: items.length,
      partial: items.some((item) => item.id === "inventory-reconciliation"),
      missing_sources: items.some((item) => item.id === "inventory-reconciliation")
        ? ["optional image metadata"]
        : [],
    };
  },
  async getSample(id) {
    await delay(90);
    const detail = sampleDetails.find((item) => item.id === id);
    if (!detail) throw new RequestError("The requested item was not found.", { status: 404 });
    return clone(detail);
  },
  async runAction(id, input): Promise<ActionResponse> {
    await delay(700);
    const detail = sampleDetails.find((item) => item.id === id);
    if (!detail) throw new RequestError("The requested item was not found.", { status: 404 });
    if (input.force_failure) {
      return {
        item_id: id,
        action: input.action ?? "validate",
        status: "failed",
        message: "The representative action failed safely. You can retry without losing context.",
        result: { reason: "forced_failure", attempt: 1 },
        completed_at: new Date().toISOString(),
      };
    }
    return {
      item_id: id,
      action: input.action ?? "validate",
      status: "succeeded",
      message: "Validation completed and the input contract is healthy.",
      result: { validated_records: 1248, confidence: 0.992, duration_ms: 642 },
      completed_at: new Date().toISOString(),
    };
  },
};

export function getSampleApi(): SampleApi {
  return process.env.NEXT_PUBLIC_DATA_SOURCE === "http" ? httpApi : mockApi;
}

export { RequestError };
