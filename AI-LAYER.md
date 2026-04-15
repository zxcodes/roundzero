# RoundZero AI Layer (High-Level Reference)

## Core Principle

Do **not** run a full AI interview for every application.

That wastes:
- compute
- money
- candidate time

Use a funnel:

Application → Pre-Evaluation → Selective Deep Evaluation → Company Review

---

# Overall Flow

1. Candidate applies to a job
2. System runs lightweight pre-evaluation
3. If candidate looks promising:
   - invite to RoundZero interview
4. If medium fit:
   - ask a few extra questions
5. If low fit:
   - keep under review / reject / talent pool
6. Company receives evaluated candidates with reports

---

# Stage 1: Pre-Evaluation (Cheap + Fast)

## Goal

Decide whether a candidate deserves deeper evaluation.

## Inputs

- Resume
- Candidate profile
- Job description
- Required skills
- Company custom questions

## Output

- Fit score
- Missing requirements
- Confidence
- Next step

## Example Output

- Score: 78
- Missing: AWS experience
- Confidence: High
- Next Step: Invite to RoundZero

## What It Should Check

- Relevant skills match
- Relevant experience
- Seniority fit
- Basic job alignment

---

# Stage 2: Decision Layer

## High Match

→ Invite to full AI interview

## Medium Match

→ Ask 2–3 clarifying questions first

## Low Match

→ Hold / reject / talent pool

---

# Stage 3: RoundZero Deep Evaluation

Only for selected candidates.

## Goal

Measure actual hiring signal beyond resume.

## What Happens

- Resume clarification
- Role-specific questions
- Problem solving
- Tradeoff / judgment questions
- Dynamic follow-ups

## Output

Structured candidate report

---

# Candidate Experience

## After Apply

### Strong Fit
"You’ve been invited to complete RoundZero for this role."

### Medium Fit
"A few additional questions will help evaluate your fit."

### Low Fit
"Application received and under review."

---

# Company Experience

Instead of raw applicants, companies see evaluated candidates.

## Candidate Card

- Name
- Score
- Strengths
- Concerns
- Status

## Full Report

- Overall score
- Summary
- Technical reasoning
- Communication
- Experience relevance
- Strengths
- Risks
- Resume
- Transcript (optional)

---

# Application Status Lifecycle (Decided)

> See **PLATFORM.md § 15.1** for the full decision.

**Decided:** Extend `applications.status` to include all 7 statuses in a single enum.

**Status Funnel:**
- `applied` → `pre_screening` → (`invited_roundzero` | other outcome) → `in_roundzero` → `evaluated` → (`shortlisted` | `rejected`)

**Transition Rules:**
- Only companies can move `evaluated` → `shortlisted` or `rejected`
- System auto-advances through `pre_screening` → `invited_roundzero` → `in_roundzero` → `evaluated`
- Companies can manually reject at any pre-evaluation stage

---

# Important Notes

## Pre-Evaluation should NOT decide final hiring

It only decides:

"Who deserves deeper evaluation?"

## Avoid keyword-only matching

Use semantic/contextual matching.

## Keep V1 Simple

Build:
- pre-screening
- selective AI interviews
- candidate reports

Skip for now:
- voice/video
- multiple visible agents
- advanced analytics
- over-engineered systems

---

# Long-Term Opportunity

Reusable candidate profile:

If a candidate completed RoundZero recently:
- reuse previous evaluation
- ask only role-specific delta questions

This reduces cost and improves UX.

---

# Product Decisions (Phase 3.5 Exit Criteria)

> All 5 product decisions are documented in **PLATFORM.md § 15**. Refer there for full context.

## Decided Decisions

| # | Decision | Status |
|---|----------|--------|
| 1 | Application Status Lifecycle | ✅ Extend single `applications.status` enum to all 7 statuses |
| 2 | Candidate-Facing Messaging | ✅ Hide pre-evaluation stages; show only 6 candidate-visible statuses |
| 3 | Medium-Fit Follow-Up | ✅ Use synchronous chat UI (same as full interview) with 2–3 questions |
| 4 | Company View Pre/Post AI | ✅ Show full pipeline, pre-eval candidates are read-only |
| 5 | Pre-Evaluation Output Format | ⏳ Pending validation with 5–10 real applications |

---

# One-Line Summary

RoundZero deeply evaluates the right candidates, not every candidate.