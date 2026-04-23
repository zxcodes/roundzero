\restrict dbmate

-- Dumped from database version 17.6 (Debian 17.6-1.pgdg13+1)
-- Dumped by pg_dump version 18.0 (Homebrew)

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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: candidate_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    onboarding_completed_at timestamp with time zone,
    headline text,
    resume_key text,
    resume_updated_at timestamp with time zone,
    bio text,
    skills jsonb DEFAULT '[]'::jsonb,
    links jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: candidate_work_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_work_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidate_profile_id uuid NOT NULL,
    company text NOT NULL,
    title text NOT NULL,
    start_month text NOT NULL,
    end_month text,
    currently_working_here boolean DEFAULT false NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: interviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    agent_id text,
    type text DEFAULT 'full'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    started_at timestamp with time zone,
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
    interview_questions jsonb DEFAULT '[]'::jsonb NOT NULL,
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
    report_limit integer DEFAULT 5 NOT NULL,
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
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pre_evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pre_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    score integer NOT NULL,
    missing_requirements jsonb DEFAULT '[]'::jsonb NOT NULL,
    confidence text NOT NULL,
    next_step text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pre_evaluations_score_check CHECK (((score >= 0) AND (score <= 100)))
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
    scores jsonb NOT NULL,
    recommendation text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
-- Name: candidate_work_history candidate_work_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_work_history
    ADD CONSTRAINT candidate_work_history_pkey PRIMARY KEY (id);


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
-- Name: interviews interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_pkey PRIMARY KEY (id);


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
-- Name: idx_candidate_profiles_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_profiles_user ON public.candidate_profiles USING btree (user_id);


--
-- Name: idx_candidate_work_history_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_work_history_profile ON public.candidate_work_history USING btree (candidate_profile_id, sort_order);


--
-- Name: idx_companies_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_owner ON public.companies USING btree (owner_id);


--
-- Name: idx_interviews_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interviews_application ON public.interviews USING btree (application_id);


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
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_email ON public.users USING btree (lower(email));


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
-- Name: candidate_profiles candidate_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_profiles
    ADD CONSTRAINT candidate_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: candidate_work_history candidate_work_history_candidate_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_work_history
    ADD CONSTRAINT candidate_work_history_candidate_profile_id_fkey FOREIGN KEY (candidate_profile_id) REFERENCES public.candidate_profiles(id) ON DELETE RESTRICT;


--
-- Name: companies companies_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: interviews interviews_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE RESTRICT;


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
    ('20260328081657');
