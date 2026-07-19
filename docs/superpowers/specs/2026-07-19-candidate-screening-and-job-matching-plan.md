# Candidate Screening Profiles and Personalized Job Matching Plan

## Outcome

Build two candidate-facing improvements:

1. Candidates optionally save common work-preference and eligibility answers once. Jobs select typed common screening requirements, applications snapshot the relevant answers, and Zero asks only missing or ambiguous items. Existing company-authored screening questions continue unchanged.
2. Candidates get a personalized **For you** jobs feed and a daily digest of new strong matches. Matching recommends jobs only: it never applies, changes application status, affects company ranking, or hides the existing **All jobs** feed.

Personalized matching remains free. Candidate billing is out of scope until measured usage demonstrates a real need.

## Product rules

### Common screening answers

The optional candidate profile fields are:

- current country and city/region;
- country-scoped current work authorization;
- country-scoped need for employer sponsorship now or in the future;
- relocation willingness: yes, no, or depends;
- workplace preferences: remote, hybrid, and/or onsite;
- availability: immediate, two weeks, one month, two months, three-plus months, or negotiable.

Authorization and sponsorship are independent answers. Do not collect citizenship, nationality, visa type, immigration documents, document expiry, or permanent/temporary status. Never infer eligibility from a resume, name, location, or an LLM.

The company job form has two sections:

- **Common screening** uses RoundZero's approved, versioned catalog and typed requirements.
- **Additional questions** retains the current free-text question behavior.

The initial common catalog supports:

- work authorization for an explicitly selected employment country;
- whether sponsorship is available, unavailable, or considered case by case;
- relocation to the listed job location;
- confirmation of the job's workplace type;
- required or preferred start timeline.

Do not infer an employment country from the existing free-text job location. Companies must select it when enabling authorization screening. Standard wording is rendered by RoundZero and cannot be rewritten as a standard question. Companies remain free to add custom questions.

On the job detail/application panel, show the actual profile values that will be reused. Applying remains one click with those defaults. An optional **Change for this application** action allows a correction without forcing every candidate through a form; the correction may also update the reusable profile only with explicit consent.

### Personalized jobs

The candidate jobs page defaults to:

- **For you**: persisted personalized matches;
- **All jobs**: the existing searchable/filterable listing.

Match cards use **Strong match**, **Good match**, or **Potential match**, with two or three evidence-backed reasons and at most one material consideration. Do not show a percentage until scores have proven calibration. Candidates can dismiss an irrelevant recommendation.

The daily email is sent only when the candidate has alerting enabled and has new, unviewed strong matches. One digest contains multiple jobs. Feed recomputation itself does not create a notification.

## Data model

Create one additive dbmate migration. Keep all new application-facing documents versioned and validated by strict Zod schemas.

### `candidate_profiles`

Add:

- `common_answers JSONB NULL`;
- `common_answers_updated_at TIMESTAMPTZ NULL`;
- `matching_profile JSONB NULL`;
- `matching_profile_source_hash TEXT NULL`;
- `matching_profile_version TEXT NULL`;
- `matching_status TEXT NOT NULL DEFAULT 'pending'`;
- `matching_error TEXT NULL`;
- `serving_match_generation UUID NULL`;
- `match_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE`;
- `match_refresh_claimed_at TIMESTAMPTZ NULL`.

Use one server-generated freshness timestamp for the common-answer document. Do not claim per-answer freshness.

The AI-derived matching profile contains job-relevant evidence only: role families, recent titles, skills with resume evidence, relevant experience, seniority indicators, industries, responsibilities, and explicit education/certifications. It excludes identity and common eligibility answers.

### `jobs`

Add `screening_requirements JSONB NULL`. Use a discriminated list of stable catalog items rather than free-text strings. Each item stores its catalog version, typed requirement, and required/preferred semantics.

Do not put bulky internal matching data on `jobs`: current listing queries select `j.*`, so that would leak/inflate every public job response.

### `job_matching_profiles`

Create a one-to-one internal table keyed by `job_id` containing:

- source hash and source version;
- extraction status and error;
- structured matching profile;
- model and prompt version;
- completion timestamp and normal timestamps.

### `applications`

Add nullable `standard_screening_snapshot JSONB`. It is the canonical, immutable application-time record for standard requirements and answers. It contains:

- schema, catalog, wording, and concern-policy versions;
- capture timestamp;
- each selected requirement and rendered question;
- answered/missing state;
- source: profile or application override;
- the profile document's update timestamp when applicable.

Final job validation, candidate profile read, duplicate guard, snapshot construction, and application insert must occur in one transaction. Trigger pre-evaluation only after commit. Retain the database unique constraint as the authoritative duplicate-application guard.

Later profile edits affect future applications and matching only. Later job requirement edits affect future applications only. Reinvites reuse the same application snapshot.

### `candidate_job_matches`

Create a table with unique `(candidate_id, job_id)` and indexes for candidate generation, feed reads, and digest selection. Store:

- `generation_id`;
- candidate- and job-profile source versions;
- internal score and code-derived band;
- evidence-backed reasons and deterministic consideration;
- algorithm, threshold, prompt, and model versions;
- matched and first-strong timestamps;
- viewed, dismissed, and digest-notified timestamps;
- normal timestamps.

Preserve viewed, dismissed, first-strong, and notified timestamps across reranks. A score leaving and returning to the strong band must not become a new match again.

## Common screening implementation

### Schemas and SQL

1. Add strict versioned schemas under the candidate/job features and country-code validation in shared enums.
2. Extend candidate and job SQL queries; regenerate SQLC outputs.
3. Update account erasure to clear common answers, application snapshots, interview standard results, matching profiles/reasons, and match rows.
4. Treat legacy null documents as no common screening. Never fuzzy-convert existing custom questions.

### Candidate UX

Extend `app/features/candidates/components/candidate-settings.tsx` with **Work preferences and eligibility**. Keep every field optional and explain that only answers relevant to a submitted job are shared.

Add a dismissible candidate-dashboard prompt when the profile is incomplete. Onboarding may mention the section but must not add a required step.

The job apply panel shows selected common requirements, reused values, missing values, and the optional per-application correction. It must not expose unrelated profile answers.

### Company UX

Extend `app/features/jobs/components/job-form.tsx` and job schemas/server functions with **Common screening** above the existing free-text questions.

Update AI job creation to return typed common requirement suggestions separately. It must stop generating duplicate visa, relocation, workplace, or availability strings as custom questions. Existing custom questions remain supported and ordered.

Add concise compliance copy: answers are candidate attestations, RoundZero does not verify authorization, and employers remain responsible for jurisdiction-specific requirements. Obtain legal review of catalog wording before production, especially outside the US.

### Interview ownership

Keep the current custom-question pipeline intact:

- custom questions remain snapshotted at invite time in `interviews.metadata.jobSnapshot.customQuestions`;
- custom coverage remains the existing 1-based ordered map;
- reinvites continue to refresh custom questions and reset their evidence.

Load standard answers separately from `applications.standard_screening_snapshot`. Do not copy candidate answers into `jobSnapshot`, because account erasure currently preserves job snapshot data.

Derive pending standard questions from missing or ambiguous snapshot items. Add a dedicated validated `record_standard_screening_answer` tool keyed by stable catalog item ID and store results separately in `interviews.metadata.standardScreeningResults`. Already answered items are private context with an explicit **do not re-ask** instruction. Allow one clarification for `depends`, inconsistency, changed information, or materially ambiguous context.

### Reports

Do not rewrite the current LLM custom-answer pipeline. Continue generating, auditing, ordering, and refining custom answers exactly as today.

After custom refinement:

1. Build standard entries deterministically from the application snapshot and any validated interview clarification.
2. Compute standard concerns in code using a versioned policy.
3. Add server-owned `kind`, `source`, and catalog ID metadata.
4. Merge standard entries before custom entries.
5. Apply any standard dealbreaker recommendation cap after the report audit so a later model pass cannot undo it.

The report schema must continue parsing legacy four-field entries. Initial deterministic policies are:

- sponsorship required and unavailable: dealbreaker;
- relocation required and explicitly refused: dealbreaker;
- required onsite attendance and explicitly remote-only: dealbreaker;
- preferred start mismatch: minor;
- missing, unknown, or depends: clarification/no automatic failure.

## Personalized matching implementation

### Resume and job extraction

Extract the existing PDF/DOCX-to-text logic from pre-evaluation into a server-only shared helper so pre-evaluation and matching use identical sanitization and limits.

Add a dedicated `job_matching` task to `app/shared/openrouter.ts`. In production use DeepSeek V4 Flash explicitly in non-reasoning mode with a small output cap, strict structured output, and response healing. Do not inherit the Sonnet-first default chain. Select a cheap cross-provider fallback only after evaluation.

Resume refresh:

1. Read the current resume version and calculate a source hash.
2. Fetch and extract raw resume text inside one workflow step.
3. Generate and validate the candidate matching profile.
4. Persist only the structured profile; never return raw resume text as workflow state or write it to logs/Sentry.
5. Abort stale work if the resume version changed before persistence.

Job publish/material edit performs the equivalent extraction into `job_matching_profiles`. Draft edits need no match fan-out.

### Retrieval and reranking

Candidate refresh first queries live, open, unexpired, unapplied-to jobs with complete job matching profiles.

Use explicit candidate/company data for logistical handling. In the MVP, workplace, relocation, authorization, sponsorship, and availability are soft considerations rather than hidden hard exclusions. Unknown data and absence from an AI-extracted profile never prove ineligibility. Certification absence is not a hard filter.

Use deterministic qualification scoring to select at most 15–25 candidates for the LLM:

- role family and responsibility alignment;
- required-skill evidence;
- seniority and experience alignment;
- domain alignment;
- preferred-skill evidence.

DeepSeek reranks qualification fit only. Code attaches logistical considerations afterward. Validate that the output has only supplied job IDs, no duplicates, and all required results. Derive display bands in code from versioned calibrated thresholds; never accept an independent model-provided band.

Publish each complete feed atomically:

1. Create a new `generation_id`.
2. Upsert all valid match rows in one transaction.
3. Advance `candidate_profiles.serving_match_generation` only after the full set is valid.
4. On any failure, leave the previous generation active.

Feed reads select only the serving generation and always recheck live job status, expiry, application existence, owner deletion, and dismissal. A changed/stale individual job is hidden without discarding the rest of the last successful feed.

### Workflow shape

Add one `JobMatchingWorkflow` class/binding with discriminated modes, but use one bounded instance per candidate or job:

- `candidate_refresh`: immediate after a changed resume and lazy when a stale feed is opened;
- `job_extract`: immediate after publish or material open-job edit;
- `reconcile`: daily bounded coordinator;
- `digest`: daily bounded coordinator after reconciliation.

A job event extracts only that job; it must not synchronously fan out to every candidate.

Daily reconciliation:

1. Claims alert-enabled candidates in bounded pages using a lease/`FOR UPDATE SKIP LOCKED` pattern.
2. Starts versioned candidate refresh instances in batches.
3. Does not place the complete candidate/job corpus into workflow state.
4. Uses deterministic unique instance IDs and idempotent writes.
5. Releases expired claims so failures can retry.

Candidates without alerts refresh lazily on **For you** visits while receiving the last successful feed immediately.

### Feed, preferences, and digest

Branch the candidate loader in `app/routes/_authenticated/dashboard/jobs/index.tsx` by tab so each phase calls only one server function. Preserve the company jobs path and the existing **All jobs** filters.

Add matching status, source summary, alert preference, and refresh action to candidate settings. Add candidate-scoped server functions only; company APIs must never expose candidate recommendation scores, reasons, or feed data.

Digest creation is transactionally deduplicated:

1. Lock eligible unnotified strong matches.
2. Create one canonical `job_match_digest` notification keyed by candidate and UTC digest date.
3. Mark included rows notified in the same transaction.
4. Send one email through the existing retryable delivery path after commit.

Only current, unviewed, undismissed matches with a first-strong timestamp qualify.

## Cost and billing

At current DeepSeek V4 Flash pricing (approximately $0.09/M input and $0.18/M output), a compact 15–25 job rerank should cost about $0.0003–$0.001 per candidate refresh. Track actual input/output tokens, model, latency, and candidate count through AI Gateway analytics and structured workflow metrics.

Set operational budgets before enabling email:

- maximum cost per candidate refresh;
- maximum daily matching spend;
- maximum candidates claimed per reconciliation run;
- alerts paused automatically when the daily budget is reached while the existing feed remains available.

Do not add candidate subscriptions now. Existing Polar customers, webhook ownership, entitlements, checkout, and billing UI are company-scoped; candidate billing would be a separate large project. Matching should improve candidate activity and applications, strengthening the existing company-paid marketplace. Revisit monetization only after measuring cost and demand.

## Delivery phases

### Phase 1: common screening foundation

- Add migration, strict schemas, SQLC queries, and account-erasure updates.
- Add candidate settings and company common-screening controls.
- Make application snapshots atomic and expose apply-time values/optional override.
- Add interview skipping/clarification and deterministic report merge.
- Update AI job creation.
- Release the complete path together; do not expose company controls before interviews and reports consume them.

### Phase 2: matching profiles and shadow evaluation

- Add shared resume extraction, model task, job/candidate profile extraction, match storage, and workflow binding.
- Backfill open job profiles and candidates with resumes in bounded batches.
- Generate matches in shadow mode with no candidate bands, feed, notifications, or email.
- Build and review a 100–200 pair evaluation set.

### Phase 3: candidate feed

- Enable **For you**, preserve **All jobs**, and add dismiss/view feedback.
- Keep digest disabled.
- Monitor precision, stale feeds, workflow failures, malformed model output, and cost.

### Phase 4: daily digest

- Enable only after precision, privacy, cost, concurrency, and deduplication gates pass.
- Start with a bounded candidate cohort, then expand.

## Verification

### Common screening

- Legacy jobs/applications/interviews/reports behave unchanged.
- Concurrent profile/job edits cannot create a mixed application snapshot.
- Post-application edits do not mutate snapshots; reinvites retain standard answers but refresh custom questions.
- Answered standard questions are not re-asked; missing/depends answers can be clarified once.
- Custom coverage, ordering, audit, and report answers remain unchanged.
- Standard concern rules and final recommendation caps are deterministic.
- Invalid catalog IDs, country codes, and answer shapes fail validation.
- Companies never receive unrelated profile answers.
- Account erasure removes every candidate-owned answer and matching artifact.

### Matching and workflow

- Unchanged hashes do not invoke extraction or reranking.
- Older workflow versions cannot overwrite newer profile/job versions.
- Concurrent refreshes expose one complete serving generation, never a partial mix.
- Invented, missing, or duplicate model job IDs do not publish.
- Soft preferences, sparse resumes, and absent certifications do not become exclusions.
- Applied, dismissed, expired, closed, archived, and deleted-owner jobs are filtered at read time.
- Interaction/notified timestamps survive reranking.
- Scheduled claims are bounded and safe under overlap/retry.
- Digest notification creation is atomic and email retry cannot duplicate it.
- Raw resumes and common eligibility answers never appear in matching prompts, workflow state, logs, or Sentry.
- Company-facing APIs cannot access candidate matching data.
- Each candidate jobs loader path uses one server-function round trip.

### Quality and rollout gates

Before feed beta, agree on and meet:

- a reviewed precision target for the **Strong match** band;
- zero confirmed false exclusions in authorization, location, relocation, and sparse-data cases;
- counterfactual checks showing names and protected attributes are absent from reranking inputs;
- explicit review of school/employer prestige, graduation dates, and career-gap effects;
- a candidate-feed freshness SLO;
- maximum cost per refresh and daily budget;
- acceptable malformed-output and workflow-failure rates.

Run focused feature/workflow tests, the full test suite, `bun run check`, and a Wrangler dry-run. Complete legal/privacy review of reusable authorization wording and AI data processing before production rollout.

## Explicit non-goals

- Auto-apply or applying without candidate action.
- Employer-visible candidate recommendations from this matching system.
- Changing pre-evaluation, interview eligibility, company applicant ranking, or report quota based on candidate job matches.
- Candidate subscriptions or candidate Polar customers.
- Vector infrastructure, collaborative filtering, or model fine-tuning in the MVP.
- Fuzzy conversion of existing custom screening questions.
- Verification of immigration status or collection of supporting documents.
