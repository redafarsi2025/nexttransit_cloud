SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict 3oMuFPEUDyY5eJ340iEpwkNRRUueAwbJbgbSZx1EvUmGv76oxUSl2KzH5dnncEp

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

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

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'd6525583-f4dc-4477-9507-c6447e4c000f', 'authenticated', 'authenticated', 'superadmin@nexttransit.dz', '$2a$10$Eyv2Rr3P/Eq.rpxKaiyttO3u6yY5K25H4vUBz8IEQp.D2AJs1ca7i', '2026-08-15 13:52:41.917937+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-08-15 18:12:54.941705+00', '{"role": "SUPER_ADMIN", "provider": "email", "providers": ["email"], "tenant_id": "c0a80101-0000-0000-0000-000000000001", "company_id": "c0a80101-0000-0000-0000-000000000002"}', '{"email_verified": true}', NULL, '2026-08-15 13:52:41.866981+00', '2026-08-20 09:23:07.740562+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '2d996158-4399-49b2-9a3e-55d7a9399c8b', 'authenticated', 'authenticated', 'amir@gmail.com', '$2a$10$ilXi5VnPggojB7RxYJE7he717ULg/gHm44BNi7IV77Ct7rT5D4o5.', '2026-08-15 12:39:33.775895+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-08-20 09:24:00.721548+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "2d996158-4399-49b2-9a3e-55d7a9399c8b", "email": "amir@gmail.com", "full_name": "amir farsi", "company_name": "AMIR LOG", "email_verified": true, "phone_verified": false}', NULL, '2026-08-15 12:39:33.728428+00', '2026-08-20 11:27:45.919694+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'af705a05-5bae-418d-b7e7-878c909d7c8c', 'authenticated', 'authenticated', 'test.staging.1786750770660@example.com', '$2a$10$cPlSbpq6K.la5jgcDtMdgO4RATcwdxJyMG7e//7/II9SCPbc76I16', '2026-08-14 23:38:15.868058+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-08-14 23:38:15.877328+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "af705a05-5bae-418d-b7e7-878c909d7c8c", "email": "test.staging.1786750770660@example.com", "full_name": "Test User", "company_name": "Staging Test Company 1786750770660", "email_verified": true, "phone_verified": false}', NULL, '2026-08-14 23:38:15.859736+00', '2026-08-14 23:38:15.879026+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '2560a812-5754-4216-a4d8-9e5974682fe5', 'authenticated', 'authenticated', 'test.staging.1786750742311@example.com', '$2a$10$5Axo8eGiQItlueeyY2Lr2OSWU62EqkIuzDDaTg0.Et.8lkBtI0Qze', '2026-08-14 23:37:47.741904+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-08-14 23:37:47.74652+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "2560a812-5754-4216-a4d8-9e5974682fe5", "email": "test.staging.1786750742311@example.com", "full_name": "Test User", "company_name": "Staging Test Company 1786750742311", "email_verified": true, "phone_verified": false}', NULL, '2026-08-14 23:37:47.706557+00', '2026-08-14 23:37:47.752848+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'df47e2bd-b7a7-4d19-8293-76a6ae51375c', 'authenticated', 'authenticated', 'test.staging.1786750790085@example.com', '$2a$10$OtYwU5ZJUJKrTPfYSGHifOdM1l7vzJ/afzTaNueA0TBGvoD/8JcMC', '2026-08-14 23:38:35.28282+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-08-14 23:38:35.285226+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "df47e2bd-b7a7-4d19-8293-76a6ae51375c", "email": "test.staging.1786750790085@example.com", "full_name": "Test User", "company_name": "Staging Test Company 1786750790085", "email_verified": true, "phone_verified": false}', NULL, '2026-08-14 23:38:35.278194+00', '2026-08-14 23:38:35.29196+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'c3560d4f-ba9d-4441-a47b-7fbfaa9c05fa', 'authenticated', 'authenticated', 'test.staging.1786750910567@example.com', '$2a$10$FWEU7GB/vS0Z4/cs6E5gi.Xjeqxl3GsDxgi.s5okdV75ZmsB7UeFC', '2026-08-14 23:40:35.898961+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-08-15 08:25:53.31617+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "c3560d4f-ba9d-4441-a47b-7fbfaa9c05fa", "email": "test.staging.1786750910567@example.com", "full_name": "Test User", "company_name": "Staging Test Company 1786750910567", "email_verified": true, "phone_verified": false}', NULL, '2026-08-14 23:40:35.887824+00', '2026-08-15 08:25:53.397198+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('2560a812-5754-4216-a4d8-9e5974682fe5', '2560a812-5754-4216-a4d8-9e5974682fe5', '{"sub": "2560a812-5754-4216-a4d8-9e5974682fe5", "email": "test.staging.1786750742311@example.com", "full_name": "Test User", "company_name": "Staging Test Company 1786750742311", "email_verified": false, "phone_verified": false}', 'email', '2026-08-14 23:37:47.73613+00', '2026-08-14 23:37:47.73618+00', '2026-08-14 23:37:47.73618+00', '56231ce8-2ee2-43fc-aedc-008ce5902b92'),
	('af705a05-5bae-418d-b7e7-878c909d7c8c', 'af705a05-5bae-418d-b7e7-878c909d7c8c', '{"sub": "af705a05-5bae-418d-b7e7-878c909d7c8c", "email": "test.staging.1786750770660@example.com", "full_name": "Test User", "company_name": "Staging Test Company 1786750770660", "email_verified": false, "phone_verified": false}', 'email', '2026-08-14 23:38:15.865642+00', '2026-08-14 23:38:15.865682+00', '2026-08-14 23:38:15.865682+00', 'dfa49491-28a5-49cb-a755-e1ef39244f5d'),
	('df47e2bd-b7a7-4d19-8293-76a6ae51375c', 'df47e2bd-b7a7-4d19-8293-76a6ae51375c', '{"sub": "df47e2bd-b7a7-4d19-8293-76a6ae51375c", "email": "test.staging.1786750790085@example.com", "full_name": "Test User", "company_name": "Staging Test Company 1786750790085", "email_verified": false, "phone_verified": false}', 'email', '2026-08-14 23:38:35.280858+00', '2026-08-14 23:38:35.2809+00', '2026-08-14 23:38:35.2809+00', '56e71e52-ebb0-44ae-81cc-ea0bc81d4d66'),
	('c3560d4f-ba9d-4441-a47b-7fbfaa9c05fa', 'c3560d4f-ba9d-4441-a47b-7fbfaa9c05fa', '{"sub": "c3560d4f-ba9d-4441-a47b-7fbfaa9c05fa", "email": "test.staging.1786750910567@example.com", "full_name": "Test User", "company_name": "Staging Test Company 1786750910567", "email_verified": false, "phone_verified": false}', 'email', '2026-08-14 23:40:35.895532+00', '2026-08-14 23:40:35.895581+00', '2026-08-14 23:40:35.895581+00', '3d71515f-65db-4c6b-8ff9-0509fa8e61b4'),
	('2d996158-4399-49b2-9a3e-55d7a9399c8b', '2d996158-4399-49b2-9a3e-55d7a9399c8b', '{"sub": "2d996158-4399-49b2-9a3e-55d7a9399c8b", "email": "amir@gmail.com", "full_name": "amir farsi", "company_name": "AMIR LOG", "email_verified": false, "phone_verified": false}', 'email', '2026-08-15 12:39:33.767262+00', '2026-08-15 12:39:33.767301+00', '2026-08-15 12:39:33.767301+00', '90d7d353-e7aa-4e56-b8cc-7cc310d712c8'),
	('d6525583-f4dc-4477-9507-c6447e4c000f', 'd6525583-f4dc-4477-9507-c6447e4c000f', '{"sub": "d6525583-f4dc-4477-9507-c6447e4c000f", "email": "superadmin@nexttransit.dz", "email_verified": false, "phone_verified": false}', 'email', '2026-08-15 13:52:41.909504+00', '2026-08-15 13:52:41.909553+00', '2026-08-15 13:52:41.909553+00', '2b1d0221-b4ca-49d9-910e-4617640566a9');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('8b26b795-dadd-44e0-b0f9-20ee8acd7508', '2d996158-4399-49b2-9a3e-55d7a9399c8b', '2026-08-20 09:24:00.723421+00', '2026-08-20 11:27:45.94318+00', NULL, 'aal1', NULL, '2026-08-20 11:27:45.943045', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36', '104.28.221.228', NULL, NULL, NULL, NULL, NULL),
	('947b2466-0031-4625-b4d7-998e166e78c0', '2560a812-5754-4216-a4d8-9e5974682fe5', '2026-08-14 23:37:47.746651+00', '2026-08-14 23:37:47.746651+00', NULL, 'aal1', NULL, NULL, 'node', '154.243.5.30', NULL, NULL, NULL, NULL, NULL),
	('bad297f5-64e7-4ba3-853f-7b9d7e612050', 'af705a05-5bae-418d-b7e7-878c909d7c8c', '2026-08-14 23:38:15.877415+00', '2026-08-14 23:38:15.877415+00', NULL, 'aal1', NULL, NULL, 'node', '154.243.5.30', NULL, NULL, NULL, NULL, NULL),
	('d04c86c0-318b-478b-81f2-89bd7fd6bc39', 'df47e2bd-b7a7-4d19-8293-76a6ae51375c', '2026-08-14 23:38:35.285333+00', '2026-08-14 23:38:35.285333+00', NULL, 'aal1', NULL, NULL, 'node', '154.243.5.30', NULL, NULL, NULL, NULL, NULL),
	('2ba74600-750c-4019-aebd-f087de684e10', 'c3560d4f-ba9d-4441-a47b-7fbfaa9c05fa', '2026-08-14 23:40:35.904707+00', '2026-08-14 23:40:35.904707+00', NULL, 'aal1', NULL, NULL, 'node', '154.243.5.30', NULL, NULL, NULL, NULL, NULL),
	('9a120182-d0c6-4ebb-a56c-d054f344bc43', 'c3560d4f-ba9d-4441-a47b-7fbfaa9c05fa', '2026-08-14 23:42:04.759616+00', '2026-08-14 23:42:04.759616+00', NULL, 'aal1', NULL, NULL, 'node', '154.243.5.30', NULL, NULL, NULL, NULL, NULL),
	('7c92882d-202f-464d-9cb4-bd02c233e76f', 'c3560d4f-ba9d-4441-a47b-7fbfaa9c05fa', '2026-08-14 23:44:34.570387+00', '2026-08-14 23:44:34.570387+00', NULL, 'aal1', NULL, NULL, 'node', '154.243.5.30', NULL, NULL, NULL, NULL, NULL),
	('9095f245-89af-4c8c-976e-b1a24d0622e3', 'c3560d4f-ba9d-4441-a47b-7fbfaa9c05fa', '2026-08-15 08:25:53.316835+00', '2026-08-15 08:25:53.316835+00', NULL, 'aal1', NULL, NULL, 'node', '154.243.5.30', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('947b2466-0031-4625-b4d7-998e166e78c0', '2026-08-14 23:37:47.754145+00', '2026-08-14 23:37:47.754145+00', 'password', 'd7f721f1-dc6c-4fa4-b1c8-51e68f7b286a'),
	('bad297f5-64e7-4ba3-853f-7b9d7e612050', '2026-08-14 23:38:15.879399+00', '2026-08-14 23:38:15.879399+00', 'password', '38bbf694-8cce-451e-ba1d-f007bcf0a376'),
	('d04c86c0-318b-478b-81f2-89bd7fd6bc39', '2026-08-14 23:38:35.292332+00', '2026-08-14 23:38:35.292332+00', 'password', 'bc4b36ad-cc71-49df-bfc6-9890d8d292d0'),
	('2ba74600-750c-4019-aebd-f087de684e10', '2026-08-14 23:40:35.914793+00', '2026-08-14 23:40:35.914793+00', 'password', '8628d2ea-9573-4a2f-be39-536591f24f0b'),
	('9a120182-d0c6-4ebb-a56c-d054f344bc43', '2026-08-14 23:42:04.767618+00', '2026-08-14 23:42:04.767618+00', 'password', '25cedea9-1442-457b-8ca9-ce796f4bc23d'),
	('7c92882d-202f-464d-9cb4-bd02c233e76f', '2026-08-14 23:44:34.577887+00', '2026-08-14 23:44:34.577887+00', 'password', '9527e516-9d3f-4b7a-8b58-5faef8122935'),
	('9095f245-89af-4c8c-976e-b1a24d0622e3', '2026-08-15 08:25:53.412552+00', '2026-08-15 08:25:53.412552+00', 'password', '795dcfdc-1848-48e0-8ce8-0cc4d8b73dcb'),
	('8b26b795-dadd-44e0-b0f9-20ee8acd7508', '2026-08-20 09:24:00.752769+00', '2026-08-20 09:24:00.752769+00', 'password', 'e9d5f484-2d85-4bd2-a221-a819eb6f5eb3');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 75, 'h5aq2k7atd55', '2560a812-5754-4216-a4d8-9e5974682fe5', false, '2026-08-14 23:37:47.749591+00', '2026-08-14 23:37:47.749591+00', NULL, '947b2466-0031-4625-b4d7-998e166e78c0'),
	('00000000-0000-0000-0000-000000000000', 76, 'k3y2wvtfkyh6', 'af705a05-5bae-418d-b7e7-878c909d7c8c', false, '2026-08-14 23:38:15.878218+00', '2026-08-14 23:38:15.878218+00', NULL, 'bad297f5-64e7-4ba3-853f-7b9d7e612050'),
	('00000000-0000-0000-0000-000000000000', 77, 'vfflfxjghnjn', 'df47e2bd-b7a7-4d19-8293-76a6ae51375c', false, '2026-08-14 23:38:35.286058+00', '2026-08-14 23:38:35.286058+00', NULL, 'd04c86c0-318b-478b-81f2-89bd7fd6bc39'),
	('00000000-0000-0000-0000-000000000000', 78, 'xigudwlwogn4', 'c3560d4f-ba9d-4441-a47b-7fbfaa9c05fa', false, '2026-08-14 23:40:35.905972+00', '2026-08-14 23:40:35.905972+00', NULL, '2ba74600-750c-4019-aebd-f087de684e10'),
	('00000000-0000-0000-0000-000000000000', 79, 'ij4h6cf67zxq', 'c3560d4f-ba9d-4441-a47b-7fbfaa9c05fa', false, '2026-08-14 23:42:04.765216+00', '2026-08-14 23:42:04.765216+00', NULL, '9a120182-d0c6-4ebb-a56c-d054f344bc43'),
	('00000000-0000-0000-0000-000000000000', 80, 'yqsttweukahm', 'c3560d4f-ba9d-4441-a47b-7fbfaa9c05fa', false, '2026-08-14 23:44:34.574021+00', '2026-08-14 23:44:34.574021+00', NULL, '7c92882d-202f-464d-9cb4-bd02c233e76f'),
	('00000000-0000-0000-0000-000000000000', 81, 'awqw3nggzzbe', 'c3560d4f-ba9d-4441-a47b-7fbfaa9c05fa', false, '2026-08-15 08:25:53.366757+00', '2026-08-15 08:25:53.366757+00', NULL, '9095f245-89af-4c8c-976e-b1a24d0622e3'),
	('00000000-0000-0000-0000-000000000000', 93, 'b36lyvf5f2zy', '2d996158-4399-49b2-9a3e-55d7a9399c8b', true, '2026-08-20 09:24:00.738637+00', '2026-08-20 10:21:39.245728+00', NULL, '8b26b795-dadd-44e0-b0f9-20ee8acd7508'),
	('00000000-0000-0000-0000-000000000000', 94, '5lkmiqvbscz6', '2d996158-4399-49b2-9a3e-55d7a9399c8b', true, '2026-08-20 10:21:39.267414+00', '2026-08-20 11:27:45.890131+00', 'b36lyvf5f2zy', '8b26b795-dadd-44e0-b0f9-20ee8acd7508'),
	('00000000-0000-0000-0000-000000000000', 95, 'za52veoztfbw', '2d996158-4399-49b2-9a3e-55d7a9399c8b', false, '2026-08-20 11:27:45.910163+00', '2026-08-20 11:27:45.910163+00', '5lkmiqvbscz6', '8b26b795-dadd-44e0-b0f9-20ee8acd7508');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."companies" ("id", "name", "tax_id", "billing_email", "created_at", "updated_at") VALUES
	('af5c4112-fa2f-4397-a473-f5769ac913e9', 'AKRAM nexttransit compagnie', NULL, 'akramfarsi@gmail.com', '2026-08-09 20:37:29.918739+00', '2026-08-09 20:37:29.918739+00'),
	('72445c15-eca1-4fd0-bd12-fa9a03c2cdbd', 'farsi logistique', NULL, 'mohamedredhafarsi@gmail.com', '2026-08-09 20:37:29.918739+00', '2026-08-09 20:37:29.918739+00'),
	('9e195e01-7967-4e07-9b29-0c025e6f422a', 'Reda farsi adminFlotte', NULL, 'farsireda@gmail.com', '2026-08-12 11:51:01.506161+00', '2026-08-12 11:51:01.506161+00'),
	('1fa100dd-fac0-400a-9245-20deadf2eace', 'FARSI AKRAM LOGSTQ', NULL, 'akramfarsi@gmail.com', '2026-08-14 23:30:22.519379+00', '2026-08-14 23:30:22.519379+00'),
	('bac19c52-2662-4ee8-8157-e27b6f6c0960', 'Staging Test Company 1786750742311', NULL, 'test.staging.1786750742311@example.com', '2026-08-14 23:37:48.006508+00', '2026-08-14 23:37:48.006508+00'),
	('0514cb01-df34-416d-9860-87e5d540919d', 'Staging Test Company 1786750770660', NULL, 'test.staging.1786750770660@example.com', '2026-08-14 23:38:16.170182+00', '2026-08-14 23:38:16.170182+00'),
	('3187fb7b-db43-4123-934c-c7733152e882', 'Staging Test Company 1786750790085', NULL, 'test.staging.1786750790085@example.com', '2026-08-14 23:38:35.43244+00', '2026-08-14 23:38:35.43244+00'),
	('ae52fc01-b0c2-47a8-8712-405e4d502dd0', 'Staging Test Company 1786750910567', NULL, 'test.staging.1786750910567@example.com', '2026-08-14 23:40:36.091892+00', '2026-08-14 23:40:36.091892+00'),
	('a4a07151-1087-45d3-b81a-b87b3cad7191', 'AMIR LOG', NULL, 'amir@gmail.com', '2026-08-15 12:39:34.062955+00', '2026-08-15 12:39:34.062955+00'),
	('c0a80101-0000-0000-0000-000000000002', 'NextTransit Platform', NULL, 'superadmin@nexttransit.dz', '2026-08-15 13:59:08.964849+00', '2026-08-15 13:59:08.964849+00');


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."tenants" ("id", "name", "slug", "currency", "enabled_modules", "created_at", "updated_at", "company_id", "operating_region", "is_configured", "legal_name", "trade_name", "acronym", "legal_form", "capital_social", "date_creation", "date_activity_start", "country", "status", "timezone", "allocated_budget") VALUES
	('873eb7b5-199b-496d-a662-49979e6700a2', 'AKRAM nexttransit compagnie', 'akram-nexttransit-compagnie-873eb7', 'DZD (DA)', '["MODULE_CORE_FLEET", "MODULE_MAINTENANCE_R4", "MODULE_INVENTORY_R3", "MODULE_WARRANTY", "MODULE_FUEL", "MODULE_TELEMETRY", "MODULE_FINANCE_R7"]', '2026-08-09 20:37:29.918739+00', '2026-08-09 20:37:29.918739+00', 'af5c4112-fa2f-4397-a473-f5769ac913e9', 'North Africa', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Algérie', 'ACTIVE', 'Africa/Algiers', NULL),
	('03e6d88b-122a-4264-806a-09642e459c50', 'farsi logistique', 'farsi-logistique-03e6d8', 'DZD (DA)', '["MODULE_CORE_FLEET", "MODULE_MAINTENANCE_R4", "MODULE_INVENTORY_R3", "MODULE_WARRANTY", "MODULE_FUEL", "MODULE_TELEMETRY", "MODULE_FINANCE_R7"]', '2026-08-09 20:37:29.918739+00', '2026-08-09 20:37:29.918739+00', '72445c15-eca1-4fd0-bd12-fa9a03c2cdbd', 'North Africa', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Algérie', 'ACTIVE', 'Africa/Algiers', NULL),
	('8987115e-a76b-457a-a717-61791b902d39', 'Reda farsi adminFlotte', 'reda-farsi-adminflotte', 'DZD (DA)', '["MODULE_CORE_FLEET", "MODULE_MAINTENANCE_R4", "MODULE_INVENTORY_R3", "MODULE_WARRANTY", "MODULE_FUEL", "MODULE_TELEMETRY", "MODULE_FINANCE_R7"]', '2026-08-12 11:51:01.506161+00', '2026-08-12 11:51:01.506161+00', '9e195e01-7967-4e07-9b29-0c025e6f422a', 'North Africa', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Algérie', 'ACTIVE', 'Africa/Algiers', NULL),
	('c37f91ea-cbe1-4378-99ac-65e67c7e9020', 'FARSI AKRAM LOGSTQ', 'farsi-akram-logstq', 'DZD (DA)', '["MODULE_CORE_FLEET", "MODULE_MAINTENANCE_R4", "MODULE_INVENTORY_R3", "MODULE_WARRANTY", "MODULE_FUEL", "MODULE_TELEMETRY", "MODULE_FINANCE_R7"]', '2026-08-14 23:30:22.519379+00', '2026-08-14 23:30:22.519379+00', '1fa100dd-fac0-400a-9245-20deadf2eace', 'North Africa', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Algérie', 'ACTIVE', 'Africa/Algiers', NULL),
	('59a91810-f701-4e2f-8a28-473ef7f78e0f', 'Staging Test Company 1786750742311', 'staging-test-company-1786750742311', 'DZD (DA)', '["MODULE_CORE_FLEET", "MODULE_MAINTENANCE_R4", "MODULE_INVENTORY_R3", "MODULE_WARRANTY", "MODULE_FUEL", "MODULE_TELEMETRY", "MODULE_FINANCE_R7"]', '2026-08-14 23:37:48.006508+00', '2026-08-14 23:37:48.006508+00', 'bac19c52-2662-4ee8-8157-e27b6f6c0960', 'North Africa', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Algérie', 'ACTIVE', 'Africa/Algiers', NULL),
	('e07f15b7-62cb-4b8b-a0af-3a69e30d17f9', 'Staging Test Company 1786750770660', 'staging-test-company-1786750770660', 'DZD (DA)', '["MODULE_CORE_FLEET", "MODULE_MAINTENANCE_R4", "MODULE_INVENTORY_R3", "MODULE_WARRANTY", "MODULE_FUEL", "MODULE_TELEMETRY", "MODULE_FINANCE_R7"]', '2026-08-14 23:38:16.170182+00', '2026-08-14 23:38:16.170182+00', '0514cb01-df34-416d-9860-87e5d540919d', 'North Africa', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Algérie', 'ACTIVE', 'Africa/Algiers', NULL),
	('6b10aff1-d74d-4dcb-a53a-ca864fc5489d', 'Staging Test Company 1786750790085', 'staging-test-company-1786750790085', 'DZD (DA)', '["MODULE_CORE_FLEET", "MODULE_MAINTENANCE_R4", "MODULE_INVENTORY_R3", "MODULE_WARRANTY", "MODULE_FUEL", "MODULE_TELEMETRY", "MODULE_FINANCE_R7"]', '2026-08-14 23:38:35.43244+00', '2026-08-14 23:38:35.43244+00', '3187fb7b-db43-4123-934c-c7733152e882', 'North Africa', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Algérie', 'ACTIVE', 'Africa/Algiers', NULL),
	('02131ab9-171b-4744-b374-4ff6c2db4d0c', 'Staging Test Company 1786750910567', 'staging-test-company-1786750910567', 'DZD (DA)', '["MODULE_CORE_FLEET", "MODULE_MAINTENANCE_R4", "MODULE_INVENTORY_R3", "MODULE_WARRANTY", "MODULE_FUEL", "MODULE_TELEMETRY", "MODULE_FINANCE_R7"]', '2026-08-14 23:40:36.091892+00', '2026-08-14 23:40:36.091892+00', 'ae52fc01-b0c2-47a8-8712-405e4d502dd0', 'North Africa', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Algérie', 'ACTIVE', 'Africa/Algiers', NULL),
	('c0a80101-0000-0000-0000-000000000001', 'NextTransit Platform', 'nexttransit-platform', 'DZD (DA)', '["MODULE_CORE_FLEET", "MODULE_MAINTENANCE_R4", "MODULE_INVENTORY_R3", "MODULE_WARRANTY", "MODULE_FUEL", "MODULE_TELEMETRY", "MODULE_FINANCE_R7"]', '2026-08-15 13:59:08.964849+00', '2026-08-15 13:59:08.964849+00', 'c0a80101-0000-0000-0000-000000000002', 'North Africa', true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Algérie', 'ACTIVE', 'Africa/Algiers', NULL),
	('cb5ecf72-eee0-4047-86e7-9d0b11933b1f', 'AMIR LOG', 'amir-log', 'DZD (DA)', '["MODULE_CORE_FLEET", "MODULE_MAINTENANCE_R4", "MODULE_INVENTORY_R3", "MODULE_WARRANTY", "MODULE_FUEL", "MODULE_TELEMETRY", "MODULE_FINANCE_R7"]', '2026-08-15 12:39:34.062955+00', '2026-08-15 12:48:01.612+00', 'a4a07151-1087-45d3-b81a-b87b3cad7191', 'North Africa', false, 'AMIR LOG', 'SARL AMIR Logistiqe', NULL, 'SARL', 5000000.00, '2026-01-01', '2026-01-01', 'Algérie', 'ACTIVE', 'Africa/Algiers', NULL);


--
-- Data for Name: establishments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: business_glossary; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."business_glossary" ("id", "term", "namespace", "definition", "translations", "status", "forbid_auto_translate", "created_at", "updated_at") VALUES
	('2b3bcb6a-f579-495e-b96b-2eaaf2536520', 'Telemetry Reconciliation', 'fleet', 'Audit process comparing electronic OBD-II telemetry logs against driver incident logs.', '{"ar": "المطابقة والتسوية التليماتية", "en": "Telemetry Reconciliation", "fr": "Rapprochement Télématique"}', 'Approved', true, '2026-08-01 20:54:31.104123+00', '2026-08-01 20:54:31.104123+00'),
	('f64f03ef-da3a-42a5-aaf2-78248275d1c8', 'OBD-II Diagnostic Fault Code', 'maintenance', 'Electronic fault codes generated by onboard vehicle diagnostic sensors.', '{"ar": "كود عطل تشخيصي OBD-II", "en": "OBD-II Diagnostic Fault Code", "fr": "Code d''Erreur OBD-II"}', 'Approved', true, '2026-08-01 20:54:31.104123+00', '2026-08-01 20:54:31.104123+00');


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: cae_budget_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: commercial_registrations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: wilayas; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: communes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: company_bank_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: cost_records; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: device_mappings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "tenant_id", "email", "full_name", "role", "is_active", "created_at", "updated_at", "company_id") VALUES
	('2560a812-5754-4216-a4d8-9e5974682fe5', '59a91810-f701-4e2f-8a28-473ef7f78e0f', 'test.staging.1786750742311@example.com', 'Test User', 'TENANT_ADMIN', true, '2026-08-14 23:37:47.704927+00', '2026-08-14 23:37:47.704927+00', 'bac19c52-2662-4ee8-8157-e27b6f6c0960'),
	('af705a05-5bae-418d-b7e7-878c909d7c8c', 'e07f15b7-62cb-4b8b-a0af-3a69e30d17f9', 'test.staging.1786750770660@example.com', 'Test User', 'TENANT_ADMIN', true, '2026-08-14 23:38:15.858779+00', '2026-08-14 23:38:15.858779+00', '0514cb01-df34-416d-9860-87e5d540919d'),
	('df47e2bd-b7a7-4d19-8293-76a6ae51375c', '6b10aff1-d74d-4dcb-a53a-ca864fc5489d', 'test.staging.1786750790085@example.com', 'Test User', 'TENANT_ADMIN', true, '2026-08-14 23:38:35.277912+00', '2026-08-14 23:38:35.277912+00', '3187fb7b-db43-4123-934c-c7733152e882'),
	('c3560d4f-ba9d-4441-a47b-7fbfaa9c05fa', '02131ab9-171b-4744-b374-4ff6c2db4d0c', 'test.staging.1786750910567@example.com', 'Test User', 'TENANT_ADMIN', true, '2026-08-14 23:40:35.88624+00', '2026-08-14 23:40:35.88624+00', 'ae52fc01-b0c2-47a8-8712-405e4d502dd0'),
	('2d996158-4399-49b2-9a3e-55d7a9399c8b', 'cb5ecf72-eee0-4047-86e7-9d0b11933b1f', 'amir@gmail.com', 'amir farsi', 'TENANT_ADMIN', true, '2026-08-15 12:39:33.72603+00', '2026-08-15 12:39:33.72603+00', 'a4a07151-1087-45d3-b81a-b87b3cad7191'),
	('d6525583-f4dc-4477-9507-c6447e4c000f', 'c0a80101-0000-0000-0000-000000000001', 'superadmin@nexttransit.dz', 'Mohamed Redha Farsi', 'SUPER_ADMIN', true, '2026-08-15 13:52:41.864034+00', '2026-08-15 13:59:08.964849+00', 'c0a80101-0000-0000-0000-000000000002');


--
-- Data for Name: drivers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: fleet_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: fuel_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: incidents; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: legal_representatives; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: login_attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: platform_admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."platform_admins" ("id", "created_at") VALUES
	('d6525583-f4dc-4477-9507-c6447e4c000f', '2026-08-15 13:59:08.964849+00');


--
-- Data for Name: pm_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pm_vehicle_subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: work_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pm_evaluation_events; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: regulatory_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: replay_results; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: social_security_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: statistical_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."subscriptions" ("id", "company_id", "tenant_id", "plan", "status", "max_vehicles", "price_per_vehicle_dzd", "current_period_start", "current_period_end", "created_at") VALUES
	('032a3fe3-7621-45f3-b05a-ffdaf9207a06', 'af5c4112-fa2f-4397-a473-f5769ac913e9', '873eb7b5-199b-496d-a662-49979e6700a2', 'enterprise_trial', 'trial', 900, 950.00, '2026-08-09 20:37:29.918739+00', '2026-09-08 20:37:29.918739+00', '2026-08-09 20:37:29.918739+00'),
	('18b2a649-a773-4888-a216-783a65cf6562', '72445c15-eca1-4fd0-bd12-fa9a03c2cdbd', '03e6d88b-122a-4264-806a-09642e459c50', 'enterprise_trial', 'trial', 900, 950.00, '2026-08-09 20:37:29.918739+00', '2026-09-08 20:37:29.918739+00', '2026-08-09 20:37:29.918739+00'),
	('261aea6d-3da6-42d4-a898-735229fcdddf', '1fa100dd-fac0-400a-9245-20deadf2eace', 'c37f91ea-cbe1-4378-99ac-65e67c7e9020', 'enterprise_trial', 'trial', 900, 950.00, '2026-08-14 23:30:22.519379+00', '2026-09-13 23:30:22.519379+00', '2026-08-14 23:30:22.519379+00'),
	('345e8484-ad04-493a-b5d4-621fabd51a57', 'bac19c52-2662-4ee8-8157-e27b6f6c0960', '59a91810-f701-4e2f-8a28-473ef7f78e0f', 'enterprise_trial', 'trial', 900, 950.00, '2026-08-14 23:37:48.006508+00', '2026-09-13 23:37:48.006508+00', '2026-08-14 23:37:48.006508+00'),
	('ccd7f82c-42c4-41f3-92ad-64bcd9441a65', '0514cb01-df34-416d-9860-87e5d540919d', 'e07f15b7-62cb-4b8b-a0af-3a69e30d17f9', 'enterprise_trial', 'trial', 900, 950.00, '2026-08-14 23:38:16.170182+00', '2026-09-13 23:38:16.170182+00', '2026-08-14 23:38:16.170182+00'),
	('8b4b1f26-14f7-4de0-a839-c7a62934e07d', '3187fb7b-db43-4123-934c-c7733152e882', '6b10aff1-d74d-4dcb-a53a-ca864fc5489d', 'enterprise_trial', 'trial', 900, 950.00, '2026-08-14 23:38:35.43244+00', '2026-09-13 23:38:35.43244+00', '2026-08-14 23:38:35.43244+00'),
	('624cd8fc-1f56-4c39-a515-088df40a29d1', 'ae52fc01-b0c2-47a8-8712-405e4d502dd0', '02131ab9-171b-4744-b374-4ff6c2db4d0c', 'enterprise_trial', 'trial', 900, 950.00, '2026-08-14 23:40:36.091892+00', '2026-09-13 23:40:36.091892+00', '2026-08-14 23:40:36.091892+00'),
	('76fe66a9-06b4-4a1c-b10b-c2fbd8a63c69', 'a4a07151-1087-45d3-b81a-b87b3cad7191', 'cb5ecf72-eee0-4047-86e7-9d0b11933b1f', 'enterprise_trial', 'trial', 900, 950.00, '2026-08-15 12:39:34.062955+00', '2026-09-14 12:39:34.062955+00', '2026-08-15 12:39:34.062955+00'),
	('8111b38c-ca66-412c-bb23-fd62dd5494c3', 'c0a80101-0000-0000-0000-000000000002', 'c0a80101-0000-0000-0000-000000000001', 'enterprise_trial', 'trial', 900, 950.00, '2026-08-15 13:59:37.516061+00', '2026-09-14 13:59:37.516061+00', '2026-08-15 13:59:37.516061+00');


--
-- Data for Name: tax_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: telematics_gateways; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: telemetry_events; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: tenant_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."tenant_configs" ("id", "society_name", "currency", "currency_symbol", "allocated_budget", "money_used", "fiscal_year", "operating_region", "tax_registration_id", "cost_center_code", "default_labor_rate", "emergency_approval_threshold", "contact_email", "contact_phone", "billing_address", "auto_sync_money_used", "created_at", "updated_at") VALUES
	('TNT-NEXTR-001', 'NextTransit Metro Fleet Society S.A.', 'USD ($)', '$', 450000.00, 382450.00, 'FY2026', 'North America - Midwest Sector', 'TAX-8839201-NX', 'CC-FLEET-902', 85.00, 5000.00, 'operations@nexttransit.com', '+1 (555) 234-8900', '100 Fleet Center Plaza, Suite 400, Chicago, IL', true, '2026-08-01 20:58:24.627627+00', '2026-08-01 22:21:07.032174+00');


--
-- Data for Name: tenant_invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: translation_memory; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."translation_memory" ("id", "source_lang", "target_lang", "source_text", "target_text", "namespace", "usage_count", "quality_score", "last_used_at", "created_at") VALUES
	('7a48fb5d-e524-47b4-8e92-75ebc3ca487c', 'fr', 'ar', 'Gestion de la flotte et décision de maintenance', 'إدارة الأسطول وهندسة قرارات الصيانة', 'fleet', 42, 98, '2026-08-01 20:54:31.104123+00', '2026-08-01 20:54:31.104123+00'),
	('63bf0f89-ca2a-466b-8188-263d046335f9', 'fr', 'ar', 'Enregistrer les modifications', 'حفظ التغييرات', 'common', 156, 100, '2026-08-01 20:54:31.104123+00', '2026-08-01 20:54:31.104123+00');


--
-- Data for Name: translations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."translations" ("id", "key", "namespace", "language", "value", "description", "context", "status", "version", "last_modified_by", "created_at", "updated_at") VALUES
	('a44f2381-6d47-41cc-a5ce-a50ed7905dde', 'fleet.rule_r1_alert', 'fleet', 'ar', 'القاعدة R1: إيقاف طارئ إجباري (عطل تشخيصي خطير OBD-II)', 'R1 Alert Arabic', NULL, 'Approved', 1, 'admin@nexttransit.com', '2026-08-01 20:54:31.104123+00', '2026-08-01 22:21:07.032174+00'),
	('ec0e7a02-09ef-46d6-b0c1-90066a8fb67d', 'fleet.rule_r1_alert', 'fleet', 'en', 'Rule R1: Mandatory Emergency Stop (Critical OBD-II Fault)', 'R1 Alert English', NULL, 'Approved', 1, 'admin@nexttransit.com', '2026-08-01 20:54:31.104123+00', '2026-08-01 22:21:07.032174+00'),
	('026eaeb0-1aca-4e30-9c8d-bf7c5e46bbd2', 'maintenance.total_cost_formula', 'maintenance', 'fr', 'Coût Total R4 = (Heures × Tarif) + ∑(Pièces × Prix Unitaire)', 'R4 Cost Formula', NULL, 'Approved', 4, 'admin@nexttransit.com', '2026-08-01 20:54:31.104123+00', '2026-08-01 22:21:07.032174+00'),
	('ef04e868-9c79-43e1-9f4b-b23acbad6f26', 'maintenance.total_cost_formula', 'maintenance', 'ar', 'معادلة التكلفة الإجمالية R4 = (ساعات العمل × الأجرة) + مجموع(القطع × السعر)', 'R4 Cost Formula Arabic', NULL, 'Approved', 1, 'admin@nexttransit.com', '2026-08-01 20:54:31.104123+00', '2026-08-01 22:21:07.032174+00'),
	('2b6fd30f-19fa-476e-8344-b40cc065073c', 'common.save', 'common', 'fr', 'Enregistrer', 'Save action text', NULL, 'Approved', 1, 'admin@nexttransit.com', '2026-08-01 20:54:31.104123+00', '2026-08-01 22:21:07.032174+00'),
	('806d342a-becf-4f99-b3ad-b8cdd1ae0644', 'common.save', 'common', 'ar', 'حفظ', 'Save action text in Arabic', NULL, 'Approved', 1, 'admin@nexttransit.com', '2026-08-01 20:54:31.104123+00', '2026-08-01 22:21:07.032174+00'),
	('9ed0ffde-df23-4fee-82d9-1c9bc6fd9a58', 'common.save', 'common', 'en', 'Save', 'Save action text in English', NULL, 'Approved', 1, 'admin@nexttransit.com', '2026-08-01 20:54:31.104123+00', '2026-08-01 22:21:07.032174+00'),
	('d608fe5a-a693-4aba-b10c-2f1c2c5ff33c', 'fleet.rule_r1_alert', 'fleet', 'fr', 'Règle R1 : Arrêt d''Urgence Requis (Défaut Critique OBD-II)', 'R1 Alert text', NULL, 'Approved', 1, 'admin@nexttransit.com', '2026-08-01 20:54:31.104123+00', '2026-08-01 22:21:07.032174+00');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: vehicle_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: vehicle_lifecycle_history; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: warranties; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 95, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict 3oMuFPEUDyY5eJ340iEpwkNRRUueAwbJbgbSZx1EvUmGv76oxUSl2KzH5dnncEp

RESET ALL;
