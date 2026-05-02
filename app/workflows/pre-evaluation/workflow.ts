import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { createWorkflowLogger } from "../../shared/logger";
import {
  classifyJobType,
  decideNextStep,
  detectSlop,
  fetchAndExtractResume,
  type PreEvaluationPayload,
  readApplicationData,
  runAiPreEvaluation,
  writePreEvaluation,
} from "./steps";

export class PreEvaluationWorkflow extends WorkflowEntrypoint<Env, PreEvaluationPayload> {
  async run(event: WorkflowEvent<PreEvaluationPayload>, step: WorkflowStep) {
    const { applicationId } = event.payload;
    const log = createWorkflowLogger("pre-eval", applicationId);
    log.info("Starting pre-evaluation workflow");

    const applicationData = await step.do(
      "read_application_data",
      readApplicationData(applicationId, log),
    );

    const resumeText = await step.do(
      "fetch_and_extract_resume",
      fetchAndExtractResume(applicationId, applicationData.application.resumeKey, this.env, log),
    );

    const jobClassification = await step.do(
      "classify_job_type",
      classifyJobType(applicationData.job.title, applicationData.job.description, this.env, log),
    );

    const slopCheck = await step.do(
      "detect_slop",
      detectSlop(applicationData.application.metadata ?? {}, resumeText, this.env, log),
    );

    const aiResult = await step.do(
      "run_ai_pre_evaluation",
      runAiPreEvaluation(
        {
          title: applicationData.job.title,
          description: applicationData.job.description,
          requirements: applicationData.job.requirements,
        },
        resumeText,
        applicationData.application.metadata ?? {},
        jobClassification.roleType,
        this.env,
        log,
      ),
    );

    await step.do(
      "write_pre_evaluation",
      writePreEvaluation(applicationId, aiResult, slopCheck, log),
    );

    const decision = await step.do(
      "decide_next_step",
      decideNextStep(
        applicationId,
        aiResult,
        slopCheck,
        applicationData,
        resumeText,
        this.env,
        log,
      ),
    );

    log.info(
      `Workflow complete: score=${aiResult.result.score}, modelNextStep=${aiResult.result.modelNextStep}, decision=${decision.action}`,
    );
    return { applicationId, result: aiResult.result };
  }
}
