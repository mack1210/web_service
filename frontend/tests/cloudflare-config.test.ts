import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "..");
const workspaceRoot = resolve(frontendRoot, "..");

describe("Cloudflare Workers deployment configuration", () => {
  it("deploys the OpenNext worker and generated static assets", () => {
    const config = JSON.parse(
      readFileSync(resolve(frontendRoot, "wrangler.jsonc"), "utf8"),
    ) as Record<string, unknown>;

    expect(config).toMatchObject({
      main: ".open-next/worker.js",
      compatibility_flags: expect.arrayContaining(["nodejs_compat"]),
      assets: {
        directory: ".open-next/assets",
        binding: "ASSETS",
      },
    });
  });

  it("keeps Cloudflare commands local to the locked frontend toolchain", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(frontendRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string>; devDependencies: Record<string, string> };

    expect(manifest.devDependencies).toMatchObject({
      "@opennextjs/cloudflare": "1.20.1",
      wrangler: "4.123.0",
    });
    expect(manifest.scripts["cloudflare:deploy"]).toBe(
      "pnpm cloudflare:build && opennextjs-cloudflare deploy",
    );

    const workspaceManifest = JSON.parse(
      readFileSync(resolve(workspaceRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(workspaceManifest.scripts["cloudflare:deploy"]).toBe(
      "pnpm --dir frontend install --frozen-lockfile && pnpm --dir frontend cloudflare:deploy",
    );
  });
});
