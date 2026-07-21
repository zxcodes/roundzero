\restrict dbmate

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg13+1)
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    resume_key text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    queued_at timestamp with time zone,
    CONSTRAINT applications_queued_at_matches_status CHECK (((status = 'queued_for_batch'::text) = (queued_at IS NOT NULL)))
);


--
-- Name: candidate_job_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_job_matches (
    candidate_id uuid NOT NULL,
    job_id uuid NOT NULL,
    generation_id uuid NOT NULL,
    candidate_profile_source_hash text NOT NULL,
    job_profile_source_hash text NOT NULL,
    score double precision NOT NULL,
    band text NOT NULL,
    reasons jsonb DEFAULT '[]'::jsonb NOT NULL,
    consideration text,
    algorithm_version text NOT NULL,
    threshold_version text NOT NULL,
    prompt_version text NOT NULL,
    model text NOT NULL,
    matched_at timestamp with time zone DEFAULT now() NOT NULL,
    first_strong_at timestamp with time zone,
    viewed_at timestamp with time zone,
    dismissed_at timestamp with time zone,
    digest_notified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: candidate_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    onboarding_completed_at timestamp with time zone,
    resume_key text,
    resume_updated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    matching_profile jsonb,
    matching_profile_source_hash text,
    matching_profile_version text,
    matching_profile_status text DEFAULT 'pending'::text NOT NULL,
    matching_profile_error text,
    serving_match_generation uuid,
    serving_match_input_hash text,
    match_feed_status text DEFAULT 'pending'::text NOT NULL,
    match_feed_error text,
    match_feed_refreshed_at timestamp with time zone,
    match_alerts_enabled boolean DEFAULT true NOT NULL,
    match_alerts_enabled_at timestamp with time zone DEFAULT now(),
    match_refresh_token uuid,
    match_refresh_claimed_at timestamp with time zone
);


--
-- Name: communication_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communication_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    application_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    audio_key text,
    provider_session_id text,
    provider_conversation_id text,
    transcript jsonb DEFAULT '[]'::jsonb NOT NULL,
    analysis jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    onboarding_completed_at timestamp with time zone,
    description text,
    logo_key text,
    website text,
    industry text,
    company_size text,
    founded_year integer,
    location text,
    tech_stack jsonb DEFAULT '[]'::jsonb,
    culture text,
    social_links jsonb DEFAULT '{}'::jsonb,
    polar_customer_id text,
    polar_subscription_id text,
    polar_product_id text,
    subscription_plan text DEFAULT 'free'::text NOT NULL,
    subscription_status text DEFAULT 'inactive'::text NOT NULL,
    subscription_current_period_end timestamp with time zone,
    subscription_cancel_at_period_end boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    subscription_welcome_polar_subscription_id text,
    polar_subscription_modified_at timestamp with time zone,
    subscription_pending_plan text,
    subscription_pending_change_at timestamp with time zone
);


--
-- Name: company_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    token text NOT NULL,
    invited_by uuid,
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: company_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    invited_by uuid,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    type text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    company_id uuid
);


--
-- Name: interview_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "position" bigint NOT NULL
);


--
-- Name: interview_messages_position_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.interview_messages ALTER COLUMN "position" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.interview_messages_position_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: interviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    batch_id uuid,
    agent_id text,
    type text DEFAULT 'full'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    invited_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    expired_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: job_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    status text DEFAULT 'forming'::text NOT NULL,
    target_size integer DEFAULT 5 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    launched_at timestamp with time zone,
    released_at timestamp with time zone
);


--
-- Name: job_matching_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_matching_profiles (
    job_id uuid NOT NULL,
    requested_source_hash text NOT NULL,
    completed_source_hash text,
    source_version text NOT NULL,
    extraction_status text DEFAULT 'pending'::text NOT NULL,
    extraction_error text,
    matching_profile jsonb,
    model text,
    prompt_version text,
    extraction_token uuid NOT NULL,
    extraction_claimed_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    requirements jsonb DEFAULT '[]'::jsonb NOT NULL,
    screening_questions jsonb DEFAULT '[]'::jsonb CONSTRAINT jobs_interview_questions_not_null NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    location text,
    workplace_type text,
    employment_type text,
    experience_level text,
    salary_min integer,
    salary_max integer,
    salary_currency text DEFAULT 'USD'::text NOT NULL,
    team_size integer,
    headcount integer DEFAULT 1,
    final_report_target integer DEFAULT 5 NOT NULL,
    expires_at timestamp with time zone,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    read_at timestamp with time zone,
    email_delivery_status text,
    email_delivery_error text,
    email_delivery_attempted_at timestamp with time zone,
    email_delivery_sent_at timestamp with time zone,
    email_provider_message_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    dedupe_key text
);


--
-- Name: polar_webhook_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.polar_webhook_receipts (
    id text NOT NULL,
    event_type text NOT NULL,
    event_timestamp timestamp with time zone NOT NULL,
    status text NOT NULL,
    attempt_count integer DEFAULT 1 NOT NULL,
    last_error text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pre_evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pre_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    score double precision NOT NULL,
    missing_requirements jsonb DEFAULT '[]'::jsonb NOT NULL,
    confidence text NOT NULL,
    next_step text NOT NULL,
    consistency_score double precision,
    raw_response jsonb,
    model text,
    prompt_version text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pre_evaluations_consistency_score_check CHECK (((consistency_score IS NULL) OR ((consistency_score >= ((0)::numeric)::double precision) AND (consistency_score <= ((10)::numeric)::double precision)))),
    CONSTRAINT pre_evaluations_score_check CHECK (((score >= ((0)::numeric)::double precision) AND (score <= ((10)::numeric)::double precision)))
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    application_id uuid NOT NULL,
    summary text NOT NULL,
    strengths jsonb DEFAULT '[]'::jsonb NOT NULL,
    weaknesses jsonb DEFAULT '[]'::jsonb NOT NULL,
    insights jsonb DEFAULT '[]'::jsonb NOT NULL,
    evidence jsonb DEFAULT '[]'::jsonb NOT NULL,
    screening_answers jsonb DEFAULT '[]'::jsonb NOT NULL,
    scores jsonb NOT NULL,
    recommendation text NOT NULL,
    model text,
    prompt_version text,
    refine_version text,
    released_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    answer_authenticity jsonb
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    picture text,
    role text,
    google_id text,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    anonymized_at timestamp with time zone
);


--
-- Name: applications applications_job_id_candidate_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_candidate_id_key UNIQUE (job_id, candidate_id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: candidate_job_matches candidate_job_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_job_matches
    ADD CONSTRAINT candidate_job_matches_pkey PRIMARY KEY (candidate_id, job_id);


--
-- Name: candidate_profiles candidate_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_profiles
    ADD CONSTRAINT candidate_profiles_pkey PRIMARY KEY (id);


--
-- Name: candidate_profiles candidate_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_profiles
    ADD CONSTRAINT candidate_profiles_user_id_key UNIQUE (user_id);


--
-- Name: communication_assessments communication_assessments_interview_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_assessments
    ADD CONSTRAINT communication_assessments_interview_id_key UNIQUE (interview_id);


--
-- Name: communication_assessments communication_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_assessments
    ADD CONSTRAINT communication_assessments_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: companies companies_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_slug_key UNIQUE (slug);


--
-- Name: company_invitations company_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_invitations
    ADD CONSTRAINT company_invitations_pkey PRIMARY KEY (id);


--
-- Name: company_members company_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: interview_messages interview_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_messages
    ADD CONSTRAINT interview_messages_pkey PRIMARY KEY (id);


--
-- Name: interviews interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_pkey PRIMARY KEY (id);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: job_matching_profiles job_matching_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_matching_profiles
    ADD CONSTRAINT job_matching_profiles_pkey PRIMARY KEY (job_id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: polar_webhook_receipts polar_webhook_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polar_webhook_receipts
    ADD CONSTRAINT polar_webhook_receipts_pkey PRIMARY KEY (id);


--
-- Name: pre_evaluations pre_evaluations_application_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_evaluations
    ADD CONSTRAINT pre_evaluations_application_id_key UNIQUE (application_id);


--
-- Name: pre_evaluations pre_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_evaluations
    ADD CONSTRAINT pre_evaluations_pkey PRIMARY KEY (id);


--
-- Name: reports reports_interview_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_interview_id_key UNIQUE (interview_id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: users users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_applications_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_candidate ON public.applications USING btree (candidate_id);


--
-- Name: idx_applications_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_job ON public.applications USING btree (job_id);


--
-- Name: idx_candidate_job_matches_digest; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_job_matches_digest ON public.candidate_job_matches USING btree (candidate_id, generation_id, first_strong_at) WHERE ((band = 'strong'::text) AND (viewed_at IS NULL) AND (dismissed_at IS NULL) AND (digest_notified_at IS NULL));


--
-- Name: idx_candidate_job_matches_feed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_job_matches_feed ON public.candidate_job_matches USING btree (candidate_id, generation_id, score DESC) WHERE (dismissed_at IS NULL);


--
-- Name: idx_candidate_profiles_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_profiles_user ON public.candidate_profiles USING btree (user_id);


--
-- Name: idx_comm_assessments_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comm_assessments_application ON public.communication_assessments USING btree (application_id);


--
-- Name: idx_comm_assessments_interview; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comm_assessments_interview ON public.communication_assessments USING btree (interview_id);


--
-- Name: idx_comm_assessments_provider_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_comm_assessments_provider_conversation ON public.communication_assessments USING btree (provider_conversation_id) WHERE (provider_conversation_id IS NOT NULL);


--
-- Name: idx_comm_assessments_provider_session; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_comm_assessments_provider_session ON public.communication_assessments USING btree (provider_session_id) WHERE (provider_session_id IS NOT NULL);


--
-- Name: idx_companies_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_owner ON public.companies USING btree (owner_id);


--
-- Name: idx_companies_polar_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_companies_polar_customer ON public.companies USING btree (polar_customer_id) WHERE (polar_customer_id IS NOT NULL);


--
-- Name: idx_company_invitations_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_invitations_company ON public.company_invitations USING btree (company_id);


--
-- Name: idx_company_invitations_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_company_invitations_pending ON public.company_invitations USING btree (company_id, email) WHERE ((accepted_at IS NULL) AND (revoked_at IS NULL));


--
-- Name: idx_company_invitations_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_company_invitations_token ON public.company_invitations USING btree (token);


--
-- Name: idx_company_members_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_members_company ON public.company_members USING btree (company_id);


--
-- Name: idx_company_members_company_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_company_members_company_user ON public.company_members USING btree (company_id, user_id);


--
-- Name: idx_company_members_one_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_company_members_one_active ON public.company_members USING btree (user_id) WHERE (status = 'active'::text);


--
-- Name: idx_company_members_one_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_company_members_one_owner ON public.company_members USING btree (company_id) WHERE (role = 'owner'::text);


--
-- Name: idx_company_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_members_user ON public.company_members USING btree (user_id);


--
-- Name: idx_feedback_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_company ON public.feedback USING btree (company_id);


--
-- Name: idx_feedback_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_created_at ON public.feedback USING btree (created_at DESC);


--
-- Name: idx_feedback_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_user ON public.feedback USING btree (user_id);


--
-- Name: idx_interview_messages_interview_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interview_messages_interview_position ON public.interview_messages USING btree (interview_id, "position");


--
-- Name: idx_interviews_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interviews_application ON public.interviews USING btree (application_id);


--
-- Name: idx_interviews_application_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_interviews_application_unique ON public.interviews USING btree (application_id);


--
-- Name: idx_interviews_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interviews_batch ON public.interviews USING btree (batch_id);


--
-- Name: idx_job_batches_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_batches_job ON public.job_batches USING btree (job_id);


--
-- Name: idx_job_batches_one_active_per_job; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_job_batches_one_active_per_job ON public.job_batches USING btree (job_id) WHERE (status = ANY (ARRAY['forming'::text, 'active'::text]));


--
-- Name: idx_job_batches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_batches_status ON public.job_batches USING btree (status) WHERE (status = ANY (ARRAY['forming'::text, 'active'::text]));


--
-- Name: idx_job_matching_profiles_recovery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_matching_profiles_recovery ON public.job_matching_profiles USING btree (extraction_status, extraction_claimed_at);


--
-- Name: idx_jobs_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_archived ON public.jobs USING btree (archived_at) WHERE (archived_at IS NULL);


--
-- Name: idx_jobs_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_company ON public.jobs USING btree (company_id);


--
-- Name: idx_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);


--
-- Name: idx_notifications_dedupe; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_notifications_dedupe ON public.notifications USING btree (user_id, type, dedupe_key) WHERE (dedupe_key IS NOT NULL);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, read_at) WHERE (read_at IS NULL);


--
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_pre_evaluations_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pre_evaluations_application ON public.pre_evaluations USING btree (application_id);


--
-- Name: idx_reports_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_application ON public.reports USING btree (application_id);


--
-- Name: idx_reports_released; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_released ON public.reports USING btree (released_at) WHERE (released_at IS NULL);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_email ON public.users USING btree (lower(email));


--
-- Name: idx_users_pending_erasure; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_pending_erasure ON public.users USING btree (deleted_at) WHERE ((deleted_at IS NOT NULL) AND (anonymized_at IS NULL));


--
-- Name: applications applications_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: applications applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE RESTRICT;


--
-- Name: candidate_job_matches candidate_job_matches_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_job_matches
    ADD CONSTRAINT candidate_job_matches_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: candidate_job_matches candidate_job_matches_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_job_matches
    ADD CONSTRAINT candidate_job_matches_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: candidate_profiles candidate_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_profiles
    ADD CONSTRAINT candidate_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: communication_assessments communication_assessments_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_assessments
    ADD CONSTRAINT communication_assessments_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE RESTRICT;


--
-- Name: communication_assessments communication_assessments_interview_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_assessments
    ADD CONSTRAINT communication_assessments_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE RESTRICT;


--
-- Name: companies companies_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: company_invitations company_invitations_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_invitations
    ADD CONSTRAINT company_invitations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;


--
-- Name: company_invitations company_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_invitations
    ADD CONSTRAINT company_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: company_members company_members_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;


--
-- Name: company_members company_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: company_members company_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: feedback feedback_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: feedback feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: interview_messages interview_messages_interview_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_messages
    ADD CONSTRAINT interview_messages_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE RESTRICT;


--
-- Name: interviews interviews_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE RESTRICT;


--
-- Name: interviews interviews_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.job_batches(id) ON DELETE SET NULL;


--
-- Name: job_batches job_batches_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE RESTRICT;


--
-- Name: job_matching_profiles job_matching_profiles_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_matching_profiles
    ADD CONSTRAINT job_matching_profiles_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: pre_evaluations pre_evaluations_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_evaluations
    ADD CONSTRAINT pre_evaluations_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE RESTRICT;


--
-- Name: reports reports_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE RESTRICT;


--
-- Name: reports reports_interview_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20260328081657'),
    ('20260606171616'),
    ('20260608010913'),
    ('20260612120000'),
    ('20260614000000'),
    ('20260614010000'),
    ('20260615042817'),
    ('20260622161816'),
    ('20260629021838'),
    ('20260703114221'),
    ('20260705072949'),
    ('20260715154907'),
    ('20260719022003'),
    ('20260721090921');
