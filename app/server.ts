import * as Sentry from "@sentry/cloudflare";
import { wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler from "@tanstack/react-start/server-entry";

import { handlePolarWebhook } from "./features/billing/webhook";
import { getDb } from "./shared/db";
import { isDev } from "./shared/env.app";
import { sentryOptions } from "./shared/sentry";
import { escapeXml, PUBLIC_STATIC_SITEMAP_ENTRIES } from "./shared/seo";

declare global {
  interface CacheStorage {
    readonly default: Cache;
  }
}

export { AccountCleanupWorkflow } from "./workflows/account-cleanup/workflow";
export { BatchOrchestrationWorkflow } from "./workflows/batch-orchestration/workflow";
export { EvalRetryWorkflow } from "./workflows/eval-retry/workflow";
export { PoolCheckWorkflow } from "./workflows/pool-check/workflow";
export { PostEvaluationWorkflow } from "./workflows/post-evaluation/workflow";
export { PreEvaluationWorkflow } from "./workflows/pre-evaluation/workflow";
export { JobMatchingWorkflow } from "./workflows/job-matching/workflow";
export { MatchDigestWorkflow } from "./workflows/match-digest/workflow";
export { MatchReconciliationWorkflow } from "./workflows/match-reconciliation/workflow";

function getCacheKey(request: Request) {
  const url = new URL(request.url);
  url.search = "";
  return new Request(url, { method: "GET" });
}

async function createCachedTextResponse(body: string, contentType: string, maxAge: number) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  const etag = `"${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}"`;

  return new Response(body, {
    headers: {
      "Cache-Control": `public, max-age=${maxAge}`,
      "Content-Type": contentType,
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function getCachedResponse(request: Request) {
  const key = getCacheKey(request);
  const matchRequest = new Request(key, { headers: request.headers });
  return await caches.default.match(matchRequest);
}

function cacheResponse(request: Request, response: Response, ctx: ExecutionContext) {
  ctx.waitUntil(caches.default.put(getCacheKey(request), response.clone()));
}

async function serveAsset(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/assets/")) {
    return null;
  }

  let key: string;
  try {
    key = decodeURIComponent(url.pathname.slice("/api/assets/".length));
  } catch (error) {
    if (error instanceof URIError) {
      return new Response("Invalid asset path", { status: 400 });
    }
    throw error;
  }
  const object = await env.RESUMES.get(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response("body" in object ? object.body : undefined, {
    headers,
  });
}

const appHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const isCacheableRead = request.method === "GET" || request.method === "HEAD";

    if (url.pathname === "/api/polar/webhook" && request.method === "POST") {
      return handlePolarWebhook(request);
    }

    const assetResponse = await serveAsset(request, env);
    if (assetResponse) return assetResponse;

    if (isCacheableRead && url.pathname === "/robots.txt") {
      const cached = await getCachedResponse(request);
      if (cached) return cached;

      const siteUrl = env.APP_URL.replace(/\/$/, "");
      const body = `User-agent: *
Allow: /
Disallow: /api/interview-chat
Disallow: /api/voice-webhook
Disallow: /api/polar/

Sitemap: ${siteUrl}/sitemap.xml
`;
      const response = await createCachedTextResponse(body, "text/plain; charset=utf-8", 86_400);
      cacheResponse(request, response, ctx);
      return response;
    }

    if (isCacheableRead && url.pathname === "/sitemap.xml") {
      const cached = await getCachedResponse(request);
      if (cached) return cached;

      const sql = getDb();
      const [jobs, companies] = await Promise.all([
        import("./features/jobs/queries/queries_sql").then((m) => m.getOpenJobs(sql)),
        import("./features/companies/queries/queries_sql").then((m) => m.getAllCompanies(sql)),
      ]);

      const siteUrl = env.APP_URL.replace(/\/$/, "");
      const escapedSiteUrl = escapeXml(siteUrl);
      const indexableCompanies = companies.filter(
        (company) =>
          company.openJobCount > 0 ||
          (typeof company.description === "string" && company.description.trim().length > 0),
      );
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_STATIC_SITEMAP_ENTRIES.map((entry) => `  <url><loc>${escapedSiteUrl}${entry.path}</loc>${"lastModified" in entry ? `<lastmod>${entry.lastModified}</lastmod>` : ""}</url>`).join("\n")}

${jobs.map((j) => `  <url><loc>${escapedSiteUrl}/jobs/${escapeXml(j.id)}</loc><lastmod>${new Date(j.updatedAt).toISOString()}</lastmod></url>`).join("\n")}
${indexableCompanies.map((c) => `  <url><loc>${escapedSiteUrl}/companies/${escapeXml(c.slug)}</loc><lastmod>${new Date(c.updatedAt).toISOString()}</lastmod></url>`).join("\n")}
</urlset>`;
      const response = await createCachedTextResponse(xml, "application/xml; charset=utf-8", 300);
      cacheResponse(request, response, ctx);
      return response;
    }

    return (handler.fetch as (req: Request, env: Env, ctx: ExecutionContext) => Promise<Response>)(
      request,
      env,
      ctx,
    );
  },
};

export default isDev
  ? appHandler
  : Sentry.withSentry(
      () => sentryOptions,
      // @ts-expect-error - handler is not typed as a Cloudflare handler
      wrapFetchWithSentry(appHandler),
    );
