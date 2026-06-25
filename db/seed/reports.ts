// @ts-nocheck
import {
  buildReportContent,
  makeScoresFromOverall,
  spreadScores,
} from "./demo-data";
import { closeSql, makeUuidFromSeed, sql } from "./util";

async function seedReports() {
  const completed = await sql<
    { id: string; application_id: string; status: string; candidate_name: string; job_title: string }[]
  >`
    SELECT
      i.id,
      i.application_id,
      a.status,
      u.name AS candidate_name,
      j.title AS job_title
    FROM interviews i
    JOIN applications a ON a.id = i.application_id
    JOIN jobs j ON j.id = a.job_id
    JOIN users u ON u.id = a.candidate_id
    JOIN companies c ON c.id = j.company_id
    JOIN users owner ON owner.id = c.owner_id
    WHERE i.status = 'completed'
      AND u.google_id LIKE 'rz-seed-candidate-google-%'
      AND owner.google_id LIKE 'rz-seed-company-google-%'
    ORDER BY i.created_at ASC
  `;

  if (completed.length < 15) {
    throw new Error("Expected at least 15 completed seeded interviews. Run interviews seed first.");
  }

  const releasedScores = spreadScores(
    completed.filter((row) => row.status !== "evaluated_held").length,
    9.2,
    4.5,
  );
  let releasedIndex = 0;

  for (let index = 0; index < completed.length; index++) {
    const interview = completed[index]!;
    const releaseReport = interview.status !== "evaluated_held";
    const overall = releaseReport
      ? releasedScores[releasedIndex++]!
      : spreadScores(1, 7.4, 7.4)[0]!;

    const reportContent = buildReportContent({
      candidateName: interview.candidate_name,
      jobTitle: interview.job_title,
      overall,
      index,
    });
    const scores = makeScoresFromOverall(overall, interview.id);
    const completedAt = new Date(Date.now() - (index + 1) * 86_400_000);
    const releasedAt = releaseReport
      ? new Date(completedAt.getTime() + 2 * 60 * 60 * 1000)
      : null;

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
        screening_answers,
        scores,
        recommendation,
        model,
        prompt_version,
        refine_version,
        released_at,
        created_at
      )
      VALUES (
        ${makeUuidFromSeed(`rz-seed-report-${interview.id}`)},
        ${interview.id},
        ${interview.application_id},
        ${reportContent.summary},
        ${sql.json(reportContent.strengths)},
        ${sql.json(reportContent.weaknesses)},
        ${sql.json(reportContent.insights)},
        ${sql.json(reportContent.evidence)},
        ${sql.json(reportContent.screeningAnswers)},
        ${sql.json(scores)},
        ${reportContent.recommendation},
        ${"seed/demo"},
        ${"1.0.0"},
        ${"1.0.0"},
        ${releasedAt},
        ${completedAt}
      )
      ON CONFLICT (interview_id) DO UPDATE
      SET
        application_id = EXCLUDED.application_id,
        summary = EXCLUDED.summary,
        strengths = EXCLUDED.strengths,
        weaknesses = EXCLUDED.weaknesses,
        insights = EXCLUDED.insights,
        evidence = EXCLUDED.evidence,
        screening_answers = EXCLUDED.screening_answers,
        scores = EXCLUDED.scores,
        recommendation = EXCLUDED.recommendation,
        model = EXCLUDED.model,
        prompt_version = EXCLUDED.prompt_version,
        refine_version = EXCLUDED.refine_version,
        released_at = EXCLUDED.released_at
    `;
  }

  console.log(`Reports seeded/upserted: ${completed.length}`);
}

try {
  await seedReports();
} finally {
  await closeSql();
}