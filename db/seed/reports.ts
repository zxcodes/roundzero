// @ts-nocheck
import { clampScore, closeSql, makeUuidFromSeed, pick, sql } from "./util";

const recommendations = ["strong_yes", "yes", "lean_no", "no"] as const;

const strengthPool = [
  "Strong system design fundamentals",
  "Clear communication under ambiguity",
  "High ownership and follow-through",
  "Thoughtful tradeoff analysis",
  "Good test strategy and quality mindset",
  "Pragmatic product sense",
] as const;

const weaknessPool = [
  "Needs stronger depth in distributed systems",
  "Can improve query optimization patterns",
  "Limited examples of mentoring scale",
  "Occasional over-index on implementation details",
  "Needs clearer prioritization in ambiguous scenarios",
] as const;

const insightPool = [
  "Performs best when scope and ownership are explicit",
  "Likely to ramp quickly in TypeScript-heavy codebases",
  "Would benefit from onboarding into incident response practices",
  "Demonstrates collaborative behavior with cross-functional teams",
  "Shows strong curiosity and coachability",
] as const;

async function seedReports() {
  const completed = await sql<{ id: string; application_id: string }[]>`
    SELECT i.id, i.application_id
    FROM interviews i
    JOIN applications a ON a.id = i.application_id
    JOIN users u ON u.id = a.candidate_id
    WHERE i.status = 'completed'
      AND u.google_id LIKE 'rz-seed-candidate-google-%'
    ORDER BY i.created_at ASC
    LIMIT 20
  `;

  if (completed.length < 20) {
    throw new Error("Expected at least 20 completed seeded interviews. Run interviews seed first.");
  }

  const reports = completed.map((interview, index) => {
    const recommendation = pick(recommendations, index);
    const communication = clampScore(7 + (index % 3) * 0.3);
    const problemSolving = clampScore(6.8 + (index % 4) * 0.2);
    const ownership = clampScore(6.5 + (index % 2) * 0.4);
    const roleFit = clampScore(7.1 + (index % 3) * 0.25);

    return {
      id: makeUuidFromSeed(`rz-seed-report-${interview.id}`),
      interviewId: interview.id,
      applicationId: interview.application_id,
      summary:
        "Candidate demonstrated solid fundamentals and structured reasoning across technical and behavioral prompts. Performance indicates readiness for scoped ownership with support on domain-specific ramp-up.",
      strengths: [pick(strengthPool, index), pick(strengthPool, index + 2)],
      weaknesses: [pick(weaknessPool, index)],
      insights: [pick(insightPool, index), pick(insightPool, index + 1)],
      evidence: [
        {
          competency: "system_design",
          note: "Provided a coherent service decomposition and data model with clear API boundaries.",
        },
        {
          competency: "collaboration",
          note: "Asked clarifying questions and validated assumptions before implementation choices.",
        },
      ],
      scores: {
        communication,
        problemSolving,
        ownership,
        roleFit,
        overall: clampScore((communication + problemSolving + ownership + roleFit) / 4),
      },
      recommendation,
    };
  });

  for (const report of reports) {
    await sql`
      INSERT INTO reports (
        id,
        interview_id,
        application_id,
        summary,
        strengths,
        weaknesses,
        insights,
        evidence,
        scores,
        recommendation
      )
      VALUES (
        ${report.id},
        ${report.interviewId},
        ${report.applicationId},
        ${report.summary},
        ${sql.json(report.strengths)},
        ${sql.json(report.weaknesses)},
        ${sql.json(report.insights)},
        ${sql.json(report.evidence)},
        ${sql.json(report.scores)},
        ${report.recommendation}
      )
      ON CONFLICT (interview_id) DO UPDATE
      SET
        application_id = EXCLUDED.application_id,
        summary = EXCLUDED.summary,
        strengths = EXCLUDED.strengths,
        weaknesses = EXCLUDED.weaknesses,
        insights = EXCLUDED.insights,
        evidence = EXCLUDED.evidence,
        scores = EXCLUDED.scores,
        recommendation = EXCLUDED.recommendation
    `;
  }

  console.log(`Reports seeded/upserted: ${reports.length}`);
}

try {
  await seedReports();
} finally {
  await closeSql();
}