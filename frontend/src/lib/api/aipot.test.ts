import { afterEach, expect, it, vi } from "vitest";

import { getAipotApi } from "./aipot";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function feedbackResponse() {
  return new Response(JSON.stringify({
    number: 1, earned: 2, possible: 2, correct: true, correct_answer: "1", missing: [], choice_feedback: [],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

it("keeps ordinary choice feedback compatible with the answer-only API contract", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
  const fetchMock = vi.fn().mockResolvedValue(feedbackResponse());
  vi.stubGlobal("fetch", fetchMock);

  await getAipotApi().feedback("source-round-01", 1, "1");

  expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ answer: "1" });
});

it("sends the confirmation flag only for an explicit image evaluation", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "http");
  const fetchMock = vi.fn().mockResolvedValue(feedbackResponse());
  vi.stubGlobal("fetch", fetchMock);

  await getAipotApi().feedback("source-round-01", 40, "image prompt", true);

  expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ answer: "image prompt", confirm_media: true });
});
