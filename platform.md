---

# AI Hiring Platform – Product & System Specification

## 0. Overview

This platform replaces the **first round of hiring** with an AI-driven, structured, adaptive interview system.

Instead of filtering resumes, the system:

* conducts async interviews with candidates
* evaluates them across multiple dimensions
* produces **structured, explainable candidate reports**
* delivers ranked candidates to companies

### Core Value Proposition

> “Skip resume screening and initial interviews. Get pre-evaluated candidates you can trust.”

---

## 1. Core Principles

### 1.1 Decision Engine, Not Job Board

* The platform is not just listing jobs
* It produces **hiring decisions / recommendations**

### 1.2 Explainability Over Black Box

* Every score must be backed by evidence
* Companies must understand *why* a candidate is ranked

### 1.3 Depth Over Volume

* Fewer candidates, higher quality
* Replace shallow filtering with deep evaluation

### 1.4 Adaptive Interviews

* Questions change based on responses
* System probes deeper where needed

---

## 2. Users

### 2.1 Candidates

* Apply to jobs
* Participate in async AI interviews
* Receive feedback (optional later)

### 2.2 Companies

* Post jobs
* Receive ranked candidates
* Review detailed reports
* Decide who to interview

---

## 3. System Flow

## 3.1 High-Level Flow

```
Job Posted → Candidate Applies → AI Interview Loop → Evaluation → Candidate Report → Ranking → Company Dashboard
```

---

## 4. Candidate Experience

### 4.1 Application

* Candidate sees job listing
* Clicks “Apply”
* Uploads:

  * Resume
  * Optional links (GitHub, portfolio)

---

### 4.2 Interview Mode (IMPORTANT DECISION)

#### ✅ Recommended: In-App Async Chat (NOT Email)

**Why:**

* Real-time context retention
* Better UX
* Easier orchestration
* Faster iteration
* Avoids email latency + fragmentation

#### UX:

* Chat-like interface
* “Interview session” feel
* Progress indicator (optional)
* Estimated time: 20–40 minutes

---

### 4.3 Interview Flow

#### Step 1: Resume Analysis

* Extract:

  * skills
  * experience
  * projects
  * inconsistencies

#### Step 2: Initial Questions

* Based on role + resume
* Example:

  * “Tell me about a system you designed recently”
  * “How do you handle X scenario?”

#### Step 3: Adaptive Probing

* Follow-ups based on responses:

  * go deeper into weak areas
  * validate strong claims
  * challenge vague answers

#### Step 4: Contradiction Checks

* Detect inconsistencies
* Ask clarification questions

#### Step 5: Scenario / Problem Questions

* Real-world situations
* Not trivia
* Example:

  * “How would you scale this system to 1M users?”

---

## 5. Agent Architecture

## 5.1 Key Idea

Not many random agents.
Instead: **specialized evaluators + orchestrated flow**

---

### 5.2 Agent Types

#### 1. Resume Analyzer Agent

* Extracts structured data
* Identifies gaps and claims

---

#### 2. Interview Orchestrator Agent (Core Brain)

* Controls flow
* Decides next questions
* Routes to specialized evaluators

---

#### 3. Skill Evaluation Agent

* Assesses technical depth
* Evaluates correctness + reasoning

---

#### 4. Communication Agent

* Evaluates:

  * clarity
  * structure
  * articulation

---

#### 5. Experience Validation Agent

* Validates:

  * past work claims
  * ownership vs contribution

---

#### 6. Consistency Checker Agent

* Tracks contradictions
* Flags mismatches
* Triggers follow-ups

---

#### 7. Scoring Agent

* Aggregates all signals
* Produces final scores

---

## 5.3 Interview Graph (Critical)

Instead of linear flow:

```
Resume → Initial Questions → (Branch)
   ├── Strong Area → Deep Dive
   ├── Weak Area → Probe
   ├── Inconsistency → Clarify
   └── Generic → Scenario Test
```

Dynamic, not fixed.

---

## 6. Data Model (Conceptual)

### Candidate Profile (Generated)

* Basic Info
* Skills (structured)
* Experience Summary
* Verified Claims
* Communication Score
* Technical Score
* Behavioral Insights
* Flags (inconsistencies, concerns)

---

### Interview Data

* Full conversation log
* Extracted insights
* Evaluated responses

---

### Candidate Report (FINAL OUTPUT)

This is the most important artifact.

---

## 7. Candidate Report Structure

### 7.1 Header

* Name
* Role Applied
* Final Score (e.g. 8.2 / 10)

---

### 7.2 Summary

* 2–3 sentence overview

---

### 7.3 Strengths

* Bullet points
* Evidence-backed

---

### 7.4 Weaknesses

* Honest, specific
* Not generic

---

### 7.5 Skill Breakdown

* Technical: X/10
* Communication: X/10
* Experience Depth: X/10

---

### 7.6 Key Insights

Examples:

* “Strong system design intuition”
* “Struggles with edge case handling”
* “Good at explaining tradeoffs”

---

### 7.7 Evidence

* Selected answers
* Summarized reasoning

---

### 7.8 Recommendation

* ✅ Strong Hire
* ⚖️ Consider
* ❌ Not Recommended

---

## 8. Company Experience

### 8.1 Dashboard

* Job listing
* Ranked candidates
* Filters:

  * score
  * skills
  * experience

---

### 8.2 Candidate View

* Report (primary)
* Full interview transcript (optional)
* Resume

---

### 8.3 Trust Features (VERY IMPORTANT)

* Show **why** candidate is ranked
* Allow:

  * “View next candidates”
  * optional access to broader pool

---

## 9. Ranking System

### Inputs:

* Technical score
* Communication score
* Experience validation
* Consistency signals

### Output:

* Weighted final score
* Ranked list per job

---

## 10. MVP Scope (STRICT)

### Must Have:

* Job posting
* Candidate apply
* Chat-based interview
* Basic evaluation agents
* Candidate report
* Company dashboard (simple)

---

### Not Needed Initially:

* Video interviews
* Fancy UI
* Complex analytics
* Full automation perfection

---

## 11. Key Risks

### 1. Low Signal Quality

* If output = resume-level insights → failure

---

### 2. Inconsistent Evaluation

* Same candidate → different results
* Needs calibration

---

### 3. Candidate Drop-off

* Too long / repetitive interviews

---

### 4. Trust Gap (Companies)

* Must provide explainability

---

## 12. Success Criteria

You’ve validated the product if:

* Companies say:

  > “I would interview these candidates without screening them myself”

* Or:

  > “This saves me real time”

---

## 13. Future Extensions

* Feedback loops (hire outcomes → improve scoring)
* Domain-specific interview packs
* Company-specific evaluation tuning
* Candidate feedback reports

---

## 14. One-Line Definition

> “An AI system that conducts structured, adaptive interviews and produces explainable candidate evaluations that companies can directly act on.”

---

If you want next step, I can convert this into:

* actual system architecture (services, queues, db schema)
* or break this into build phases (week-by-week execution plan)
