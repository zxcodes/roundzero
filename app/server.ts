import * as Sentry from "@sentry/cloudflare";
import { wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler from "@tanstack/react-start/server-entry";
import { handlePolarWebhook } from "./features/billing/webhook";
import { getDb } from "./shared/db";
import { isDev } from "./shared/env.app";
import { disposeRpcResource } from "./shared/workflow-rpc";

export { BatchOrchestrationWorkflow } from "./workflows/batch-orchestration/workflow";
export { EvalRetryWorkflow } from "./workflows/eval-retry/workflow";
export { PoolCheckWorkflow } from "./workflows/pool-check/workflow";
export { PostEvaluationWorkflow } from "./workflows/post-evaluation/workflow";
export { PreEvaluationWorkflow } from "./workflows/pre-evaluation/workflow";

async function serveAsset(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/assets/")) {
    return null;
  }

  const key = decodeURIComponent(url.pathname.slice("/api/assets/".length));
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

    if (url.pathname === "/api/polar/webhook" && request.method === "POST") {
      return handlePolarWebhook(request);
    }

    const assetResponse = await serveAsset(request, env);
    if (assetResponse) return assetResponse;

    if (url.pathname === "/sitemap.xml") {
      const sql = getDb();
      const [jobs, companies] = await Promise.all([
        import("./features/jobs/queries/queries_sql").then((m) => m.getOpenJobs(sql)),
        import("./features/companies/queries/queries_sql").then((m) => m.getAllCompanies(sql)),
      ]);

      const siteUrl = env.APP_URL;
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}/</loc><priority>1.0</priority></url>
  <url><loc>${siteUrl}/jobs</loc><priority>0.9</priority></url>
  <url><loc>${siteUrl}/companies</loc><priority>0.9</priority></url>
${jobs.map((j) => `  <url><loc>${siteUrl}/jobs/${j.id}</loc><lastmod>${new Date(j.updatedAt).toISOString()}</lastmod><priority>0.8</priority></url>`).join("\n")}
${companies.map((c) => `  <url><loc>${siteUrl}/companies/${c.slug}</loc><lastmod>${new Date(c.updatedAt).toISOString()}</lastmod><priority>0.7</priority></url>`).join("\n")}
  <url><loc>${siteUrl}/privacy</loc><priority>0.3</priority></url>
  <url><loc>${siteUrl}/tos</loc><priority>0.3</priority></url>
</urlset>`;

      return new Response(xml, {
        headers: { "Content-Type": "application/xml" },
      });
    }

    return (handler.fetch as (req: Request, env: Env, ctx: ExecutionContext) => Promise<Response>)(
      request,
      env,
      ctx,
    );
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    switch (event.cron) {
      case "0 */6 * * *": {
        ctx.waitUntil(
          env.POOL_CHECK.create({ id: `pool-check-${event.scheduledTime}` }).then((instance) => {
            disposeRpcResource(instance);
          }),
        );
        break;
      }
      case "0 */3 * * *": {
        ctx.waitUntil(
          env.EVAL_RETRY.create({ id: `eval-retry-${event.scheduledTime}` }).then((instance) => {
            disposeRpcResource(instance);
          }),
        );
        break;
      }
    }
  },
};

// biome-ignore lint/style/noDefaultExport: worker entrypoint
export default isDev
  ? appHandler
  : Sentry.withSentry(
      () => ({
        dsn: "https://93220926b2dbb8136dfb5e8d25f7a3fd@o4511527312687104.ingest.us.sentry.io/4511527318388736",
        sendDefaultPii: true,
        tracesSampleRate: 1.0,
      }),
      // @ts-expect-error - handler is not typed as a Cloudflare handler
      wrapFetchWithSentry(appHandler),
    );
