## TODO

<!--- enforce resume types (pdf, doc, txt) so we have a deterministic parsing pipeline.-->
- add a job creation shortcut using "N" also indicate it on the button.
- the work profile snapshot is duplicating markup. use single comp and also clean the entire thing up.
- see shadcn dashboard block for inspiration on company dashboard. (bunx shadcn@latest add dashboard-01)
- resend testing in dev. (candidates tested, need company reports testing, also add email preview instead of sending and checking emails (react-email))
- company dashboard needs a big overhaul. graphs, charts, recent reports, etc
- see if we can use SST for deployments.
- check for leaking info in api calls (emails, ids etc)
- add a tailored tos and privacy policy.
- think about pricing (per job flat fee, or monthly, etc. something that suits a hiring platform. subscription based might not work for this kind of platforms.)
- for company full report, they should also see what they did in the chat, detecting ai responses, pasting, etc.
- add a feedback option for people or requesting features etc.
- add score breakdown. 
- let people connect their github so we can fetch their contribution graph. (adds to the overall result and we can also show it in detailed report view)
- add a really good resume and candidate test suite to pass thru the ai.
- start with mock ui for ai layer. add it now. (for both candidate, and companies)
- Basic analytics, company interest (like, dislike(why)? stretch)
- add better error and form handling. rn we throw generic errors instead of actual ones.




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
- add guard rails during agent conv, detect screenshots, detect ai responses, detect if text was copied, and detect if answers don't align with normal conv tone and more. basically ai beating ai.
- ai job creation (just describe the job, ai completes it, review, if yes, creates a posting. can use voice too to describe.)
- show suggested skills based on job description.
- gatekeep ai features using paywall.
- auto find and apply to multiple jobs based on the profile (paid feature).
- think about compacting existing user-agent chats and reusing them for similar roles to save time and compute.

## PROD THINGS
- add sentry.
- add good seo stuff (check skills), basic done. use tanstack dev tools for og stuff it's good. enable them first.
- check about data retention & allowing people to delete accounts.
- planetscale for db?
- analytics? stretch? or just have a basic admin dashboard with stats (should be good enough for the start).



## Future Stuff (Not included in initial release)

- add save job feature for candidates. 
- companies might need api access to list jobs? iframes? too much for now? think about it.
- think more about company questions (gender, race etc the other platforms ask.) (AGENT-OFFLOAD)
- improve work experience fields, add skills, site location etc etc. (AGENT-OFFLOAD)
- add applying limits (x number of jobs in a day or week) (Unnecessary)

## Checklist (STALE)

- Candidate Flow:
  - Can signup, 
  - can browse, and apply to jobs (90% done).
  - Can review their applied applications (with apply time snapshot)
  - Can get notified about their applications (not sure about the notification navigation & email delivery is still untested)
  
- Company Flow:
  - Can signup.
  - Can create profile (logo, details, tech stack, head count, etc).
  - Can post a job (draft, open, archived etc)
  - Can add questions while posting a job.






