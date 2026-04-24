// @ts-nocheck
import { closeSql, copycat, makeUuid, pick, randomInt, sql } from "./util";

const applicationStatuses = ["applied", "interviewing", "evaluated", "rejected"] as const;

const portfolioDomains = ["dev", "engineering", "portfolio", "studio"] as const;

function buildRoleAwareLinks(input: {
  nameSlug: string;
  githubHandle: string;
  linkedInSlug: string;
  portfolioDomain: string;
  title: string;
  seed: string;
}): { linkedin?: string; portfolio?: string; github?: string; kaggle?: string; dribbble?: string; stackoverflow?: string } {
  const normalized = input.title.toLowerCase();

  const base = {
    linkedin: `https://www.linkedin.com/in/${input.linkedInSlug}`,
    portfolio: `https://${input.nameSlug}.${input.portfolioDomain}`,
  };

  if (normalized.includes("data") || normalized.includes("machine learning")) {
    return {
      ...base,
      kaggle: `https://www.kaggle.com/${input.githubHandle}`,
      github: `https://github.com/${input.githubHandle}/tree/main/ml-projects`,
    };
  }

  if (normalized.includes("frontend") || normalized.includes("mobile") || normalized.includes("designer")) {
    return {
      ...base,
      github: `https://github.com/${input.githubHandle}`,
      dribbble: `https://dribbble.com/${input.githubHandle}`,
    };
  }

  if (normalized.includes("devops") || normalized.includes("site reliability") || normalized.includes("platform")) {
    return {
      ...base,
      github: `https://github.com/${input.githubHandle}`,
      stackoverflow: `https://stackoverflow.com/users/${randomInt(`${input.seed}-so`, 100000, 999999)}/${input.githubHandle}`,
    };
  }

  return { ...base, github: `https://github.com/${input.githubHandle}` };
}

async function seedApplications() {
  const candidates = await sql<{ id: string; name: string }[]>`
    SELECT id, name
    FROM users
    WHERE role = 'candidate'
      AND google_id LIKE 'rz-seed-candidate-google-%'
    ORDER BY created_at ASC
    LIMIT 20
  `;

  const openJobs = await sql<{ id: string; title: string }[]>`
    SELECT id, title
    FROM jobs
    WHERE status = 'open'
    ORDER BY created_at ASC
    LIMIT 40
  `;

  if (candidates.length < 20) {
    throw new Error("Expected at least 20 candidates. Run users seed first.");
  }

  if (openJobs.length < 20) {
    throw new Error("Expected at least 20 open jobs. Run jobs seed first.");
  }

  const applications = [] as Array<{
    id: string;
    jobId: string;
    candidateId: string;
    resumeKey: string | null;
    metadata: Record<string, unknown>;
    status: (typeof applicationStatuses)[number];
  }>;

  for (let i = 0; i < 20; i++) {
    const candidate = candidates[i]!;
    const baseSlug = candidate.name.toLowerCase().replaceAll(" ", "-");
    const githubHandle = copycat.username(`rz-seed-gh-${candidate.id}`);
    const linkedInSlug = `${baseSlug}-${randomInt(`rz-seed-li-${candidate.id}`, 10, 99)}`;
    const portfolioDomain = pick(portfolioDomains, i);

    const jobA = openJobs[i % openJobs.length]!;
    const jobB = openJobs[(i + 11) % openJobs.length]!;

    applications.push({
      id: makeUuid("rz-seed-application", i * 2 + 1),
      jobId: jobA.id,
      candidateId: candidate.id,
      resumeKey: `resumes/${candidate.id}/${baseSlug}-resume.pdf`,
      metadata: {
        links: buildRoleAwareLinks({
          nameSlug: baseSlug,
          githubHandle,
          linkedInSlug,
          portfolioDomain,
          title: jobA.title,
          seed: `rz-seed-links-${candidate.id}-a`,
        }),
      },
      status: pick(applicationStatuses, i),
    });

    applications.push({
      id: makeUuid("rz-seed-application", i * 2 + 2),
      jobId: jobB.id,
      candidateId: candidate.id,
      resumeKey:
        i % 4 === 0
          ? null
          : `resumes/${candidate.id}/${baseSlug}-resume-v2.pdf`,
      metadata: {
        links: buildRoleAwareLinks({
          nameSlug: baseSlug,
          githubHandle,
          linkedInSlug,
          portfolioDomain,
          title: jobB.title,
          seed: `rz-seed-links-${candidate.id}-b`,
        }),
      },
      status: pick(applicationStatuses, i + 2),
    });
  }

  for (const application of applications) {
    await sql`
      INSERT INTO applications (id, job_id, candidate_id, resume_key, metadata, status)
      VALUES (
        ${application.id},
        ${application.jobId},
        ${application.candidateId},
        ${application.resumeKey},
        ${sql.json(application.metadata)},
        ${application.status}
      )
      ON CONFLICT (id) DO UPDATE
      SET
        job_id = EXCLUDED.job_id,
        candidate_id = EXCLUDED.candidate_id,
        resume_key = EXCLUDED.resume_key,
        metadata = EXCLUDED.metadata,
        status = EXCLUDED.status
    `;
  }

  console.log(`Applications seeded/upserted: ${applications.length}`);
}

try {
  await seedApplications();
} finally {
  await closeSql();
}
