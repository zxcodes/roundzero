import type { CandidateMatchingProfile, JobMatchingProfile } from "../schemas";

export const candidateProfile: CandidateMatchingProfile = {
  summary: "Senior software engineer building reliable web products and service integrations.",
  roleIdentities: [{ id: "role-1", label: "Full-stack software engineer" }],
  experienceYearsBucket: "6-9",
  seniority: "senior",
  primaryFunctionalFamily: "software_engineering",
  adjacentFunctionalFamilies: ["data_ai"],
  capabilities: [
    {
      id: "capability-1",
      label: "Web product delivery",
      context: "Owns frontend and backend delivery",
    },
  ],
  technologies: [
    {
      id: "technology-1",
      label: "React",
      context: "Builds production interfaces",
      proficiency: "advanced",
    },
  ],
  domains: [],
};

export const jobProfile: JobMatchingProfile = {
  roleIdentity: {
    id: "role-1",
    label: "Frontend product engineer",
    summary: "Owns modern customer-facing web applications",
  },
  functionalFamilies: ["software_engineering"],
  seniority: "senior",
  responsibilities: [
    {
      id: "responsibility-1",
      label: "Deliver web interfaces",
      context: "Own features from design through release",
    },
  ],
  requiredCapabilities: [
    {
      id: "required-capability-1",
      label: "Product engineering",
      context: "Ships maintainable customer-facing features",
    },
  ],
  preferredCapabilities: [],
  requiredTechnologies: [
    {
      id: "required-technology-1",
      label: "React",
      context: "Primary interface framework",
    },
  ],
  preferredTechnologies: [],
  domains: [],
};
