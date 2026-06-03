## TODO


- voice interview still doesnt end the call on its own. and even after the interview, if I refresh, the entire session is lost. it just gets back to square one."start assessment" perhaps we should have a manual submit similar to text interview?
- the final report should be based on the candidate's response to each and every question. like it should be a deciding factor.
- check what should happen if an interview is expired while being in progress.
<!--- add a cron to detect failed workflows (evaluation_failed) in the entire ai layer? and then it should update their statuses accordingly. (DONE — new EvalRetryWorkflow runs every 30 min, sweeps applications stranded in evaluation_failed past the 15 min cool-down, capped at 3 auto-retries via metadata.evalRetryCount. Re-triggers PRE_EVALUATION or restarts POST_EVALUATION via get/status/restart.)-->
- validate open router models using their api key in prod ci so we detect non existent models beforehand.
<!--- detect failures in the whole pipeline and give candidates or companies an option to retry. make as failure proof as possible. specifically in model responses. (DONE — "Retry evaluation" button on the applicant detail page for evaluation_failed apps (manual = uncapped). Backed by retryApplicationEvaluation server fn + shared retryEvaluation service. Same path the cron uses.)-->
- think more about the duration from first report to last report generation bc it will depend on the candidate. think if we need to add an expiry or something and pass it to the next candidate? (BATCH WORKFLOW TEST)
- check all resend templates for all notifications exist, if they link to proper paths etc. (I see no_lean in report, also rn individual reports are being sent? see if batch report template exists and also need to test it manually.)
- check for leaking info in api calls (emails, ids etc)
- for company full report, they should also see what they did in the chat, detecting ai responses (should maybe see something like: potential ai written answer?)
- add a feedback option for people or requesting features etc.
- add score breakdown. 
- add a really good resume and candidate test suite to pass thru the ai.


<!--- if pre-eval fails for some reason, the manual review doesn't let me move the application to interview invited or other states. it only allows me to reject/withdraw. (DONE — added interview_invited to evaluation_failed transitions in enums.ts; existing workflow already handles the side-effects.)-->
<!--- company logo doesn't reflect after uploading until I refresh. (DONE — root cause was form.reset() reverting to stale defaults because TanStack Form skips defaultValue updates when isTouched=true. Fixed in both company-settings and candidate-settings by resetting with form.state.values as the new baseline.)-->
<!--- full report page sucks. flashes twice on refresh, the evidence section has huge gaps between sections. overall sucks 10/10.
- we need a polished report for easy review by company instead of what we have right now. additionally full report can still exist for everything that happened but the actual report should be very nice, evidence backed, nicely summarized, and we should be able to cycle thru each batch with next and prev buttons. (DONE — polished summary at /applicant-reports/$id with batch prev/next, audit timeline at /applicant-reports/$id/full. Fixed double-fade flash. Removed dead submitted-profile snapshot.)-->
<!--- the voice interview experience is still not good enough. check using better models (dedicated for voice) and see.-->
<!--- update relevant docs. almost every doc is stale.-->
<!--- swap the entire interview flow (voice & text) from cf to something else better.-->
<!--- history disappears if I refresh and I speak. keeps disconnecting in between. starts recording as soon as I refresh the page. the voice recording animation and the placeholder text that is shown before a message is committed doesn't seem to be in sync. overall it sucks.-->
<!--- think about sub agents that can actually be useful for candidate profile research in the bg and provide context to main agent.-->
<!--- ready for decision shows no applications even if applications are evaluated. (not a bug, check later)-->
<!--- company dashboard needs a big overhaul. graphs, charts, recent reports, etc (overhaul done but still sucks.)-->
<!--- think about how previous evaluations and candidate profiles affect future score. helps with fabrication since we will have the candidate's work history and helps us maintain a consistent score when they apply to diff jobs.-->
<!--- need to hugely improve on messaging such as (dont worry about ai generated answers from candidates, we have guard rails, and how much human effort it eliminates by talking to multiple candidates and clearing a lot of things such as salary expectations, relocation, etc which would waste a lot of human time otherwise)-->
<!--- think about using actual tools such as web fetch etc to assess technical skills etc?-->
<!--- you just post a job and you will be notified with the reports. (include in landing page messaging)-->
<!--- need to redefine the landing and product branding: (resumes are outdated, yoe is just a number now, cracked people exist, ai needs to find them, experience is no longer a good metric, etc etc.)-->
<!--- update landing page messaging to say the time of resumes is over. it's time for real evaluation etc.-->
<!--- the landing page has fake metrics (first report 3 min etc, think how valid they're or replace them with actual claims).-->
<!--- the landing page needs to show major cost savings for the company while showing great benefits, compared to all the mainstream platforms based on real and accurate pricing as per today.-->
<!--- in pre eval, profile vs resume consistency check is prob redundant now? check and remove.-->
<!--- think about connecting relevant profiles to the app (github, dribble etc for better understanding of the candidate, also check if we have any apis we can use to get and analyse the data.)-->
<!--- why do we even need two sources of candidate work history? it's redundant. resume should be enough. -->
<!--- think about showing pre eval report to companies bc the whole point is showing them tailored reports in the end. so instead of immediately showing them, show it only when the full reports are actually generated? think. fine for local dev bc we need to check the scores etc etc. -->
<!--- everything on the company side needs to be rethought. the ux isn't there. it's cluttered and messy.-->
<!--- in post eval, refine the scores using the actual agent conv and add it to the final report.-->
<!--- some company email reports are really bad and some are entirely missing for some flows. they have zero styling. review every single resend email template and align with rest of the app.-->
<!--- align interview sidebar and main app's padding equally on a global level. -->
<!--- fix shadcn card comp, has too much top and bottom padding.-->
<!--- in post eval add another slop check to review interview transcript-->
<!--- think about entire ai layer arch, it is on-demand right now, check if that's sufficient or we need queues etc?-->
<!--- think about this entire model: should companies even see applicants as they come? or should we force reports until they arrive? then show applications?-->
<!--- shortlisting/rejecting actions should nicely accessible on top of each report for easy auctioning. right now they're buried under drop downs.-->
<!--- if a model generates some stupid shit in the name of evidence, we need another step to clean that up before writing to db. this applies to everything we're writing to db from a model. should never trust direct model responses. the entire evidence, weakness, strengths needs to be redone in a better way with good insights. it is useless now. basically the entire evaluation block should be post-processed with a new workflow to be useful.-->
<!--- there is no indication after sending a message to the agent (both voice and text).-->
<!--- if a candidate goes into hold, there is no way for companies to manually invite them to interview because of new batch flow?-->
<!--- the pre-eval and all prompts need to be hardened in such a way that they won't reject a an applicant just because they don't have x years of experience or because they don't have x keywords in their profile. it should decide that based on the actual work mentioned in the candidate's work history and should not act like an ats parser.-->
<!--- think about voice recording for communication assessment.-->
<!--- remove new stupid gradients everywhere.-->
<!--- copy agent testing patterns from opencode, pi etc. also see how they harden their prompts.-->
<!--- strictly make agent ask interview questions from the profile and then from the actual job. right now it's not even close. asks vague questions. check if we're feeding the agent context the right way (better models solve this).-->
<!--- update seed to include much more data for better agent evaluation with multiple jobs having company questions (relocation, visa, etc etc)-->
<!--- too many applicant status enums (follwup enum etc, only keep using ones by checking end to end flow)-->
<!--- we can prob use cf workflow's waitForEvent method to gather all the reports and then send all at once to the company? (using batch workflow now)-->
<!--- add pre-built job templates.-->
<!--- ai job creation (just describe the job, ai completes it, review, if yes, creates a posting. can use voice too to describe.)-->
<!--- let companies choose how many reports they wanna see per job while creating it etc.-->
<!--- show number of applicants on each job detail. (done — public job listing, detail, and company page now show applicant count.)-->
<!--- think about this entire end to end lifecycle of each job on the platform (draft → open → quota-hit → expired/closed → archived). expiry deadline + activeness badge now shown to candidates. -->
<!--- prevent dark mode from applying to public pages.-->
<!--- slop checks need fixing. it even flags if resume and profile are similar.-->
<!--- add a tailored tos and privacy policy.-->
<!--- changing from pre_screening to interview invite for pending roles throws an error.-->
<!--- show interview invited button in applied job application pages if they have an existing interview, or in progress etc. basically like a status action.-->
<!--- wire polar and pricing up. make sure to implement a really nice way of checking for an active sub throughout the app (context) perhaps?-->
<!--- use frontier models for the entire ai layer in prod.-->
<!--- see shadcn dashboard block for inspiration on company dashboard. (bunx shadcn@latest add dashboard-01)-->
<!--- configure different r2 buckets based on env.-->
<!--- manual interview invitation does not trigger post workflow on end (only checked using cancel action, not auto end from agent).-->
<!--- isn't serverEnv redundant now since this entire thing itself is a cf worker now? think and remove.-->
<!--- figure our the random stretched dashboard skeleton.-->
<!--- test docx resumes, parsing errors etc. -->
<!--- application status change notifications need to be good. right now they;re too generic even if the candidate is shortlisted/rejected.-->
<!--- update relevant arch files since we no longer have edge.
- refactor workflows to have separate steps.ts file. change structure for cleanliness.-->
<!--- check interview expiry, show it in interviews etc.-->
<!--- email templates use old design lang.-->
<!--- use faded out empty states like cards more like a graphic plus texts-->
<!--- in pre eval report what we are showing is not clear. missing requirements don't read good enough. the messaging needs to be clear.-->
<!--- switching interviews has stale data. switching to 1 shows data from 2nd and vice versa. fixes on refresh-->
<!--- think about context compaction to save on costs.-->
<!--- add a default expiry time for agent interviews. bc we can't make companies wait based on candidate's availability. think about it briefly. -->
<!--- maybe remove submit button since agent can auto-end an interview? think.-->
<!--- generated report on company side links to full profile, it should not-->
<!--- improve shortlisting behaviour across company and candidate. applicant detail page still shows as applied while the applications list does show as shortlisted. also think about notifications of shortlisting and notifications in general.-->
<!--- full report needs a lot of work including overall ux, ui, representation, accuracy, for ex (even if an interview goes bad, the report seems to show good points. prob in llm layer)-->
<!--- when the agent ends an interview, the ui doesnt update, i need to refresh to see interview has ended.-->
<!--- the agent interview feels off. the entire interview should be based on the actual candidate's profile, dynamic followups etc like a full fledged conv. also check if the agent is asking company's questions (mandatory and all things I expected from the agent.)-->
<!--- when an interview starts or ends, the ui actions don't update. need to refresh page to see if an interview was ended. the entire chat ui should update in real time.-->
<!--- the agent doesnt greet by default even after starting the interview. it mush greet with relevant info about the candidate.-->
<!--- pre-evaluation: make system prompt more detail. instead of just looking at resume text, also consider what the candidate has done in terms of dx, tech debt, that should add up to the score.
- pre-evaluation: detect ai filled slop resumes, compare two snapshots (profile and resume, find out differences), every little thing should add up to the score. and maybe save entire pre-eval timeline? to show the company's full report? or what we have is already enough? think.-->
<!--- check react query integration, queries don't seem to refetch on tab focus, etc.-->
<!--- Resume parsing: we accept PDF, DOC, DOCX. Need parsers for each type. Text extraction is local, then fed to LLM.-->
<!--- add job creation preview.-->
<!--- the work profile snapshot is duplicating markup. use single comp and also clean the entire thing up.-->
<!--- add better error and form handling. rn we throw generic errors instead of actual ones.-->
<!--- fix the fucking forms. able to create a job with nothing wtf.-->
<!--- add a timeline indicator for applicants who applied which clearly represents what stage their application is in.-->
<!--- add toast actions after mutations (view job, view application, etc)-->
<!--- upload logo isn't good enough. two progress indicators, redundant.-->
<!--- add command palette (cmd+k). and add keyboard shortcuts for example (showing search icon in the search field and keyboard shortcut (cmd + s))-->
<!--- fix skeletons, they're really bad (NOW DECENT).-->
<!--- add zod env variables like soulbound.-->
<!--- introduce better filters, using price etc. check schemas as well, so later we can add rich filters to jobs.-->
<!--- fix resume uploaded toast and save changes button positioning.-->
<!--- add a real user seed that can create jobs, profile, candidate profile, company profile etc for the actual signed in user.-->
<!--- auto save profile needs fixing (still needs work, reverted to manual saving).-->

<!--- see how some jobs require mandatory relocation, so we might need to ask questions or prevent candidate from applying? same with some location only jobs. remote but diff timezones. think about it. should it not even be a qualified agent interview? (AGENT-OFFLOAD)--> 



<!--- Flip the model, show companies first, (detailed view, what they do, why should someone work there, their tech stack etc, no of people, location etc optional stuff).
- Can always switch to jobs. (LATER)--> 

<!--- soft deletes only.-->
<!--- Add react compiler, and vite plus.-->

<!--- applicants should be able to browse jobs irrespective of authed. only prompt to login if they wanna apply. just like every other job board, public job listing.-->
<!--- applicants onboarding (name, resume, work etc)-->
<!--- same resume will be used in all applications. one click apply.-->
<!--- detailed profile for companies as well in profile, short onboarding but brief info in profile settings.-->
<!--- separate logins for both candidates and companies bc companies will have pricing flow. (also think if those both logins need diff messaging?)-->
<!--- always use url search params for filters, search, etc state. use tanstack skills to check how to use search params nicely.
- fix skeletons across the app, make sure they match the layout and are not just generic stuff.
- change branding from hirely to roundezero. we're changing the name entirely.-->

<!--- add knip.-->
<!--- add pagination-->
<!--- mobile login pages aren't good fix. -->
<!--- mobile nav doesn't have links for jobs, companies etc.-->
<!--- Add auto save to editing profile for both companies and candidates.-->

<!--- add true one click apply, include links from profile instead of asking again when applying. anyway one cannot apply without a resume. if a candidate has added links in their profile, just send them as meta data when clicked apply.-->
<!--- remove manual types in frontend code. use server resp.-->
<!--- we should not ask for resume url. it should be a file instead that gets written to R2 and we get that url.-->
<!--- allow resume updation, similar to wellfound. just replace existing resume and show updated at.-->


<!--- Think about job postings expiry (biggest problem with existing platforms where the inactive jobs still exist), give companies the option to set expiry.-->

<!--- see max upload error toast being thrown in toasts. also check the same for resumes.-->
<!--- the nav user for companies should show company info and not the one who signed up.-->
<!--- still being redirected if I remove something from profile. (STILL UNSURE)-->
<!--- doing manual trimming in a bunch of mutations. use zod for every mutation data parsing.-->
<!--- improve landing page messaging with (cut thru noise, ats is old and out dated, let real agents do the work, beat AI with AI etc)-->
<!--- make sure redirects work properly in the app.-->



## Agent & AI Stuff
- send periodic job recommendations to candidates (matches) based on their profile and put it behind a paywall.
<!--- add guard rails during agent conv, detect short and uninterested answers, detect screenshots, detect ai responses, detect if text was copied, and detect if answers don't align with normal conv tone and more. basically ai beating ai. - this will be another step in post-evaluation.-->
<!--- show suggested skills based on job description.-->
<!--- gatekeep ai features using paywall.-->
<!--- auto find and apply to multiple jobs based on the profile (paid feature).-->
<!--- think about compacting existing user-agent chats and reusing them for similar roles to save time and compute.-->
<!--- **pre-eval: switch slop + eval steps to OpenRouter (Claude 3.5 Haiku / Llama 3.3 70B)** for reliable structured outputs and deterministic scoring. Keep Workers AI for classify step only. See `pre-evaluation.ts` comments for context. Do this before scaling eval volume. And add temperature: 0 and explicit max_tokens — eliminates score variance.-->
<!--- pre-eval: Delete parseJsonPayload entirely — OpenRouter + Claude actually respects response_format. You’ll get clean objects every time.-->



## PROD THINGS
- add sentry.
- add good seo stuff (check skills), basic done. use tanstack dev tools for og stuff it's good. enable them first.
- check about data retention & allowing people to delete accounts.
- planetscale for db?
- analytics? stretch? or just have a basic admin dashboard with stats (should be good enough for the start).
- enable min release age in prod.
- see if we can use SST for deployments.



## Future Stuff (Not included in initial release)
- prevent people from using diff resumes/profiles for diff jobs. we can use snapshots to compare and decide if we wanna hold them in pre-eval itself. not exactly prevent, it should just act as a guardrail in the background.
- think about pricing (per job flat fee, or monthly, etc. something that suits a hiring platform. subscription based might not work for this kind of platforms.)

<!--- add save job feature for candidates. -->
<!--- companies might need api access to list jobs? iframes? too much for now? think about it.-->
<!--- think more about company questions (gender, race etc the other platforms ask.) (AGENT-OFFLOAD)-->
<!--- improve work experience fields, add skills, site location etc etc. (AGENT-OFFLOAD)-->

