export const JOB_TYPE_SCHEMA = {
  type: "object",
  properties: {
    roleType: {
      type: "string",
      enum: ["technical", "customer_facing", "creative", "operations", "leadership", "general"],
    },
    reasoning: { type: "string" },
  },
  required: ["roleType", "reasoning"],
} as const;

export const CLASSIFY_JOB_SYSTEM_PROMPT = `You are a job classifier. Given a job title and description, classify the role into one of these categories:

- technical: Engineering, data science, DevOps, security, architecture, etc.
- customer_facing: Sales, support, success, account management, etc.
- creative: Design, content, marketing, copywriting, etc.
- operations: HR, finance, legal, admin, supply chain, etc.
- leadership: Executive, VP, director, head of department
- general: Roles that don't clearly fit above (e.g., generalist, consultant)`;
