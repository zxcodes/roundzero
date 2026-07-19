# Personalized Candidate Job Matching Plan

## Outcome

Give candidates a personalized **For you** jobs feed and a daily digest of new strong matches based primarily on their resume. Matching recommends jobs only: it never applies, changes application status, affects company-side candidate ranking, or hides the existing **All jobs** feed.

Keep matching free. Candidate billing is out of scope until measured usage demonstrates a real need.

## Screening decision

Do not build reusable screening answers, a common-question catalog, application-time screening snapshots, or country-specific work-authorization logic.

RoundZero targets startups that generally want to evaluate skills first. The existing optional `jobs.screening_questions` system already covers companies with genuine logistical constraints:

- companies can add any must-know question while creating or editing a job;
- Zero asks those questions early in the interview;
- answers and concerns already appear in the report.

Preserve that complete path unchanged. Do not add candidate profile fields for authorization, sponsorship, relocation, workplace preference, or availability. Do not modify application, interview, or report schemas for common answers.

The only screening change is to make AI-created jobs less presumptive:

1. Stop automatically generating 2–4 logistics/eligibility questions.
2. AI-generated job drafts should default `screeningQuestions` to an empty array.
3. Keep the existing company form for manually adding optional questions.
4. Update its helper copy to recommend only must-know constraints and show examples such as time-zone overlap, onsite attendance, work authorization, or start date.

This avoids repeatedly asking candidates questions that the company never explicitly required while retaining flexibility for startups that do have a constraint.

## Candidate experience

The candidate jobs page defaults to two tabs:

- **For you**: persisted personalized matches ordered by internal fit score;
- **All jobs**: the existing searchable and filterable listing.

The For you feed excludes jobs that are closed, archived, expired, owned by deleted users, dismissed by the candidate, or already applied to. All jobs remains available so the recommendation system never limits candidate choice.

Match cards show:

- **Strong match**, **Good match**, or **Potential match**;
- two or three evidence-backed reasons;
- at most one material consideration;
- when the match was refreshed;
- the normal job information and explicit **View job** action.

Do not show a percentage until scores have demonstrated calibration. Do not use language such as “perfect match,” “qualified,” or “guaranteed interview.” Candidates can dismiss a recommendation as not relevant; dismissal suppresses that candidate/job pair but does not train a model automatically.

### Alerts

Add an email-match preference to candidate settings. The daily email is sent only when alerting is enabled and new, unviewed strong matches exist. One digest contains multiple jobs; never send one email per job. Feed recomputation itself does not create a notification.

States:

- no generated feed: explain that recommendations are being prepared and link to All jobs;
- no strong matches: show broader good/potential matches;
- matching failure: retain the previous successful feed and mark its refresh date;
- stale resume: suggest updating the resume without blocking job discovery.

## Matching architecture

Use a hybrid pipeline:

1. Extract a structured candidate matching profile when a resume changes.
2. Extract a structured job matching profile when a job is published or materially edited.
3. Use deterministic qualification overlap to retrieve at most 15–25 plausible jobs.
4. Use one cheap DeepSeek V4 Flash request to rerank that bounded set and generate concise reasons.
5. Persist one complete feed generation atomically.
6. Recompute immediately for resume changes, lazily on stale feed visits, and daily for candidates with alerts enabled.

Do not add vector infrastructure in the MVP. Structured retrieval is simpler, explainable, and sufficient for the current catalog size. Revisit embeddings only when measured retrieval quality or catalog scale requires them.

## Data model

Create one additive dbmate migration. Keep AI-produced documents versioned and validated with strict Zod schemas.

### `candidate_profiles`

Add:

- `matching_profile JSONB NULL`;
- `matching_profile_source_hash TEXT NULL`;
- `matching_profile_version TEXT NULL`;
- `matching_status TEXT NOT NULL DEFAULT 'pending'`;
- `matching_error TEXT NULL`;
- `serving_match_generation UUID NULL`;
- `match_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE`;
- `match_refresh_claimed_at TIMESTAMPTZ NULL`.

The AI-derived profile contains job-relevant evidence only:

- role families and recent titles;
- skills with supporting resume evidence;
- relevant years of experience;
- seniority indicators;
- industries and domains;
- responsibilities performed;
- education and certifications explicitly present.

It excludes name, email, authorization, nationality, inferred age, gender, and other protected attributes.

### `job_matching_profiles`

Create a one-to-one internal table keyed by `job_id` containing:

- source hash and source version;
- extraction status and error;
- structured matching profile;
- model and prompt version;
- completion timestamp and normal timestamps.

Do not put internal matching profiles on `jobs`: current listing queries select `j.*`, which would leak and inflate every public job response.

The structured job profile contains role family, required and preferred skills, seniority, experience, responsibilities, industry/domain, and explicit education or certification requirements.

### `candidate_job_matches`

Create a table with unique `(candidate_id, job_id)` and indexes for feed reads and digest selection. Store:

- `generation_id`;
- candidate- and job-profile source versions;
- internal score and code-derived band;
- evidence-backed reasons and optional consideration;
- algorithm, threshold, prompt, and model versions;
- matched and first-strong timestamps;
- viewed, dismissed, and digest-notified timestamps;
- normal timestamps.

Preserve viewed, dismissed, first-strong, and notified timestamps across reranks. A score leaving and returning to the strong band must not become a new match again.

Update account erasure to clear the candidate matching profile, matching errors, reasons, and match rows.

## Profile extraction

Extract the existing PDF/DOCX-to-text logic from pre-evaluation into a server-only shared helper so pre-evaluation and matching use identical sanitization and limits.

Add a dedicated `job_matching` task to `app/shared/openrouter.ts`. In production use DeepSeek V4 Flash explicitly in non-reasoning mode with a small output cap, strict structured output, and response healing. Do not inherit the Sonnet-first default chain. Add a cheap cross-provider fallback only after evaluation demonstrates acceptable output quality.

### Candidate extraction

1. Read the current resume version and calculate a source hash.
2. Fetch and extract raw resume text inside one workflow step.
3. Generate and validate the candidate matching profile.
4. Persist only the structured profile; never return raw resume text as workflow state or write it to logs or Sentry.
5. Abort stale work if the resume changed before persistence.
6. Skip extraction and reranking when the source hash is unchanged.

### Job extraction

Generate the job profile when a job is published or when matching-relevant fields of an open job change. Draft edits do not need matching work. A job event extracts only that job and must not immediately fan out to every candidate.

## Retrieval and reranking

Candidate refresh starts from live, open, unexpired, unapplied-to jobs with successful job matching profiles.

Use deterministic qualification scoring to retrieve at most 15–25 jobs:

- role family and responsibility alignment;
- required-skill evidence;
- seniority and experience alignment;
- domain alignment;
- preferred-skill evidence.

Absence from a resume is unknown, not proof that the candidate lacks something. Missing certification evidence, a non-matching title, location, workplace type, or other logistics must not hard-exclude a role in the MVP.

DeepSeek reranks qualification fit only. Existing job location and workplace type may be attached afterward as factual considerations, not eligibility decisions. Validate that model output contains only supplied job IDs, no duplicates, and all required results. Derive display bands in application code from versioned calibrated thresholds; never accept a separately generated model band.

Publish each feed atomically:

1. Create a new `generation_id`.
2. Upsert all valid match rows in one transaction.
3. Advance `candidate_profiles.serving_match_generation` only after the complete set is valid.
4. On failure, leave the previous generation active.

Feed reads select only the serving generation and always recheck current job status, expiry, application existence, owner deletion, and dismissal. If one job profile becomes stale, hide that job without discarding the rest of the previous feed.

## Workflow design

Use bounded workflow instances rather than one candidate-by-job sweep.

### `JobMatchingWorkflow`

One instance handles exactly one versioned unit:

- `candidate_refresh`: extract the candidate profile if needed, retrieve jobs, rerank, and publish one feed generation;
- `job_extract`: extract and persist one job profile.

Resume save starts a candidate refresh after the profile mutation commits. Job publish or relevant open-job edit starts one job extraction after commit. Use unique versioned instance IDs and idempotent database writes.

### `MatchReconciliationWorkflow`

Run daily as a bounded coordinator:

1. Claim alert-enabled candidates in pages using leases or `FOR UPDATE SKIP LOCKED`.
2. Start candidate-refresh workflow instances in batches.
3. Cap candidates per run and stop when the configured daily budget is reached.
4. Release expired claims so failed work can retry.

It must not load the full candidate/job corpus into workflow state. Candidates without alerts refresh lazily when opening a stale For you feed, while receiving the previous feed immediately.

### `MatchDigestWorkflow`

Run after the reconciliation window. Digest creation is transactionally deduplicated:

1. Lock eligible unnotified strong matches.
2. Create one canonical `job_match_digest` notification keyed by candidate and UTC digest date.
3. Mark included rows notified in the same transaction.
4. Send one email through the existing retryable delivery path after commit.

Only current, unviewed, undismissed matches with a first-strong timestamp qualify. Email retry must not create another notification.

Add all three bindings/schedules for development, staging, and production in `wrangler.jsonc`, export the workflow classes from `app/server.ts`, and regenerate Worker binding types.

## Application integration

Create a focused `app/features/job-matching/` module for schemas, queries, server functions, configuration, and candidate-only UI pieces.

Branch the candidate loader in `app/routes/_authenticated/dashboard/jobs/index.tsx` by tab so each loader phase calls only one server function. Preserve the company jobs path and the existing All jobs filters. A stale-feed read may start a refresh asynchronously but must return the current feed in the same response.

Add matching status, alert preference, and a refresh action to candidate settings. Company-facing APIs must never expose candidate recommendation scores, reasons, profiles, or feed data.

The screening cleanup is localized to AI job creation and helper copy. Do not modify the application workflow, interview runtime, screening coverage, post-evaluation refinement, or report UI.

## Cost and billing

At current DeepSeek V4 Flash pricing (approximately $0.09/M input and $0.18/M output), a compact 15–25 job rerank should cost about $0.0003–$0.001 per candidate refresh. Track actual input/output tokens, model, latency, and refreshed-candidate count through AI Gateway analytics and structured workflow metrics.

Set operational limits before enabling email:

- maximum cost per candidate refresh;
- maximum daily matching spend;
- maximum candidates claimed per reconciliation run;
- alerts paused when the daily budget is reached while existing feeds remain available.

Do not add candidate subscriptions. Existing Polar customers, webhook ownership, entitlements, checkout, and billing UI are company-scoped, so candidate billing would be a separate large project. Free matching should increase candidate activity and applications, strengthening the existing company-paid side. Revisit monetization only after measuring cost and demand.

## Delivery phases

### Phase 1: screening cleanup and matching foundation

- Stop AI job creation from generating default screening questions.
- Update existing screening helper copy without changing its data flow.
- Add the migration, strict matching schemas, SQLC queries, account-erasure changes, model task, shared resume extraction, and workflow bindings.
- Backfill matching profiles for open jobs and candidates with resumes in bounded batches.

### Phase 2: shadow evaluation

- Generate persisted matches without exposing candidate bands, feed, notifications, or email.
- Build and independently review a 100–200 pair evaluation set.
- Calibrate band thresholds and compare deterministic ordering with hybrid reranking.
- Measure cost, latency, malformed outputs, and workflow reliability.

### Phase 3: candidate feed

- Enable For you while preserving All jobs.
- Add view and dismissal feedback.
- Keep digest disabled.
- Monitor precision, stale feeds, failures, bias indicators, and cost.

### Phase 4: daily digest

- Enable only after precision, privacy, cost, concurrency, and deduplication gates pass.
- Start with a bounded candidate cohort, then expand.

## Verification

### Screening regression

- AI-created jobs have no screening questions unless a company adds them.
- Manually added screening questions retain existing ordering, interview coverage, report answers, and concern behavior.
- Existing jobs and reports require no migration or conversion.

### Matching correctness

- Unchanged hashes do not invoke extraction or reranking.
- Older workflow versions cannot overwrite newer candidate/job profiles.
- Concurrent refreshes expose one complete serving generation, never a partial mix.
- Invented, missing, or duplicate model job IDs do not publish.
- Sparse resumes, absent certifications, title differences, location, and workplace type do not become hard exclusions.
- Applied, dismissed, expired, closed, archived, and deleted-owner jobs are filtered at read time.
- Viewed, dismissed, first-strong, and notified timestamps survive reranking.
- Scheduled claims are bounded and safe under overlap and retry.
- Digest notification creation is atomic and email retry cannot duplicate it.
- Raw resumes never appear in workflow state, logs, Sentry, or persisted match rows.
- Company-facing APIs cannot access candidate matching data.
- Each candidate jobs loader path uses one server-function round trip.

### Quality and rollout gates

Before feed beta, define and meet:

- a reviewed precision target for the Strong match band;
- no confirmed false hard exclusions, because qualification uncertainty remains soft;
- counterfactual checks showing names and protected attributes are absent from reranking inputs;
- explicit review of school/employer prestige, graduation dates, and career-gap effects;
- a candidate-feed freshness SLO;
- maximum cost per refresh and daily budget;
- acceptable malformed-output and workflow-failure rates.

Run focused matching/workflow tests, the full test suite, `bun run check`, and a Wrangler dry-run before rollout.

## Explicit non-goals

- Reusable screening answers or a standard screening catalog.
- Work-authorization, sponsorship, relocation, workplace, or availability fields on candidate profiles.
- Auto-apply or applying without candidate action.
- Employer-visible candidate recommendations from this matching system.
- Changing pre-evaluation, interview eligibility, company applicant ranking, or report quota based on job matches.
- Candidate subscriptions or candidate Polar customers.
- Vector infrastructure, collaborative filtering, or model fine-tuning in the MVP.
- Verification of immigration status or collection of supporting documents.
