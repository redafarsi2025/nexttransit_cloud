


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."accept_tenant_invitation"("p_token" "text", "p_full_name" "text", "p_email" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_invite  RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'accept_tenant_invitation: not authenticated';
    END IF;

    -- Atomic token claim: prevents concurrent double-accept race condition
    UPDATE public.invitations
    SET accepted_at = NOW()
    WHERE token       = p_token
      AND accepted_at IS NULL
      AND expires_at  > NOW()
    RETURNING id, tenant_id, company_id, role, email
    INTO v_invite;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'accept_tenant_invitation: invalid, expired, or already used token';
    END IF;

    -- Provision profile with role/tenant from DB, NEVER from client input
    UPDATE public.profiles
    SET
        tenant_id  = v_invite.tenant_id,
        company_id = v_invite.company_id,
        role       = v_invite.role,
        full_name  = COALESCE(p_full_name, full_name),
        email      = COALESCE(p_email, v_invite.email, email),
        updated_at = NOW()
    WHERE id = v_user_id;

    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object(
            'tenant_id', v_invite.tenant_id::text,
            'role',      v_invite.role
        )
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'tenant_id', v_invite.tenant_id,
        'role',      v_invite.role
    );
END;
$$;


ALTER FUNCTION "public"."accept_tenant_invitation"("p_token" "text", "p_full_name" "text", "p_email" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."vehicle_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "unassigned_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assignment_type" "text" DEFAULT 'PRIMARY'::"text" NOT NULL,
    "unassignment_reason" "text",
    CONSTRAINT "vehicle_assignment_dates_valid" CHECK ((("unassigned_at" IS NULL) OR ("unassigned_at" > "assigned_at"))),
    CONSTRAINT "vehicle_assignments_assignment_type_check" CHECK (("assignment_type" = ANY (ARRAY['PRIMARY'::"text", 'SECONDARY'::"text", 'TEMPORARY'::"text"]))),
    CONSTRAINT "vehicle_assignments_unassignment_reason_check" CHECK (("unassignment_reason" = ANY (ARRAY['MANUAL'::"text", 'REASSIGNED'::"text", 'DRIVER_DEACTIVATED'::"text", 'DRIVER_SUSPENDED'::"text", 'VEHICLE_ARCHIVED'::"text", 'SYSTEM'::"text"])))
);


ALTER TABLE "public"."vehicle_assignments" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_driver_to_vehicle"("p_vehicle_id" "uuid", "p_driver_id" "uuid", "p_assignment_type" "text" DEFAULT 'PRIMARY'::"text") RETURNS "public"."vehicle_assignments"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_tenant_id UUID;
    v_profile_active BOOLEAN;
    v_driver_status TEXT;
    v_license_exp DATE;
    v_medical_exp DATE;
    v_assignment public.vehicle_assignments;
    v_vehicle_locked RECORD;
BEGIN
    -- Resolve Current Tenant
    v_tenant_id := public.get_current_tenant_id();

    -- Verify Vehicle exists, get tenant and lock row
    SELECT id, tenant_id INTO v_vehicle_locked 
    FROM public.vehicles 
    WHERE id = p_vehicle_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehicle % not found', p_vehicle_id;
    END IF;

    IF v_tenant_id IS NULL THEN
        v_tenant_id := v_vehicle_locked.tenant_id;
    END IF;

    IF v_tenant_id != v_vehicle_locked.tenant_id THEN
        RAISE EXCEPTION 'Security Error: Vehicle tenant mismatch';
    END IF;

    -- Validate Profile
    SELECT is_active INTO v_profile_active 
    FROM public.profiles 
    WHERE id = p_driver_id AND tenant_id = v_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Driver Profile not found or tenant mismatch';
    END IF;

    IF NOT v_profile_active THEN
        RAISE EXCEPTION 'Driver Profile is not active';
    END IF;

    -- Validate Driver Qualifications
    SELECT operational_status, license_expiration, medical_certificate_expiration 
    INTO v_driver_status, v_license_exp, v_medical_exp
    FROM public.drivers
    WHERE id = p_driver_id AND tenant_id = v_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Driver qualifications not found. Driver subsystem initialization required.';
    END IF;

    IF v_driver_status != 'AVAILABLE' THEN
        RAISE EXCEPTION 'Driver is not AVAILABLE (Status: %)', v_driver_status;
    END IF;

    IF v_license_exp IS NOT NULL AND v_license_exp < CURRENT_DATE THEN
        RAISE EXCEPTION 'Driver license has expired';
    END IF;

    IF v_medical_exp IS NOT NULL AND v_medical_exp < CURRENT_DATE THEN
        RAISE EXCEPTION 'Driver medical certificate has expired';
    END IF;

    -- Close current assignment for THIS VEHICLE ONLY
    UPDATE public.vehicle_assignments
    SET unassigned_at = NOW(), 
        updated_at = NOW(),
        unassignment_reason = 'REASSIGNED'
    WHERE vehicle_id = p_vehicle_id AND unassigned_at IS NULL;

    -- Note: We DO NOT unassign the driver from other vehicles per NextTransit specifications.

    -- Create new assignment
    INSERT INTO public.vehicle_assignments (
        tenant_id, vehicle_id, driver_id, assignment_type, assigned_at
    )
    VALUES (
        v_tenant_id, p_vehicle_id, p_driver_id, p_assignment_type, NOW()
    )
    RETURNING * INTO v_assignment;

    -- Generate Business Audit Event
    INSERT INTO public.audit_logs (
        tenant_id, action, entity_name, entity_id, new_value, user_role, user_email
    ) VALUES (
        v_tenant_id, 'DRIVER_ASSIGNED', 'vehicle_assignments', v_assignment.id::text, 
        jsonb_build_object('vehicle_id', p_vehicle_id, 'driver_id', p_driver_id, 'type', p_assignment_type)::text,
        COALESCE(public.get_current_user_role(), 'SYSTEM'),
        COALESCE((auth.jwt() ->> 'email'), 'system@nexttransit.com')
    );

    RETURN v_assignment;
END;
$$;


ALTER FUNCTION "public"."assign_driver_to_vehicle"("p_vehicle_id" "uuid", "p_driver_id" "uuid", "p_assignment_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_work_order_total_cost"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    parts_sum NUMERIC(10,2) := 0.00;
    elem JSONB;
BEGIN
    -- Calculate labor cost
    NEW.labor_cost := COALESCE(NEW.labor_hours, 0) * COALESCE(NEW.hourly_rate, 85.00);
    
    -- Sum up parts used
    IF NEW.parts_used IS NOT NULL AND jsonb_array_length(NEW.parts_used) > 0 THEN
        FOR elem IN SELECT * FROM jsonb_array_elements(NEW.parts_used)
        LOOP
            parts_sum := parts_sum + (COALESCE((elem->>'quantity')::NUMERIC, 0) * COALESCE((elem->>'unit_cost')::NUMERIC, 0));
        END LOOP;
    END IF;
    
    NEW.parts_cost := parts_sum;
    NEW.total_cost := NEW.labor_cost + NEW.parts_cost;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_work_order_total_cost"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_driver_tenant_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_profile_tenant UUID;
BEGIN
    SELECT tenant_id INTO v_profile_tenant FROM public.profiles WHERE id = NEW.id;
    IF v_profile_tenant != NEW.tenant_id THEN
        RAISE EXCEPTION 'Driver tenant_id (%) must match Profile tenant_id (%)', NEW.tenant_id, v_profile_tenant;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_driver_tenant_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_vehicle_assignment_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tenant UUID;
    d_tenant UUID;
BEGIN
    SELECT tenant_id INTO v_tenant FROM public.vehicles WHERE id = NEW.vehicle_id;
    SELECT tenant_id INTO d_tenant FROM public.profiles WHERE id = NEW.driver_id;
    
    IF NEW.tenant_id != v_tenant OR NEW.tenant_id != d_tenant THEN
        RAISE EXCEPTION 'Cross-tenant assignment is prohibited (assignment tenant: %, vehicle: %, driver: %)', NEW.tenant_id, v_tenant, d_tenant;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_vehicle_assignment_tenant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deactivate_driver"("p_driver_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_tenant_id UUID;
    v_profile_exists BOOLEAN;
BEGIN
    v_tenant_id := public.get_current_tenant_id();

    -- Ensure driver exists in current tenant
    SELECT TRUE INTO v_profile_exists FROM public.profiles WHERE id = p_driver_id AND tenant_id = v_tenant_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Driver not found or tenant mismatch';
    END IF;

    -- 1. profiles.is_active = false
    UPDATE public.profiles SET is_active = FALSE, updated_at = NOW() WHERE id = p_driver_id;

    -- 2. drivers.operational_status = INACTIVE
    UPDATE public.drivers SET operational_status = 'INACTIVE', updated_at = NOW(), archived_at = NOW() WHERE id = p_driver_id;

    -- 3. Close all active assignments
    UPDATE public.vehicle_assignments
    SET unassigned_at = NOW(),
        updated_at = NOW(),
        unassignment_reason = 'DRIVER_DEACTIVATED'
    WHERE driver_id = p_driver_id AND unassigned_at IS NULL;

    -- 4. Audit
    INSERT INTO public.audit_logs (
        tenant_id, action, entity_name, entity_id, new_value, user_role, user_email
    ) VALUES (
        v_tenant_id, 'DRIVER_DEACTIVATED', 'profiles', p_driver_id::text, 
        jsonb_build_object('reason', 'Driver deactivated operationally')::text,
        COALESCE(public.get_current_user_role(), 'SYSTEM'),
        COALESCE((auth.jwt() ->> 'email'), 'system@nexttransit.com')
    );

END;
$$;


ALTER FUNCTION "public"."deactivate_driver"("p_driver_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_rule_r1_emergency_stop"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    elem JSONB;
    has_critical BOOLEAN := FALSE;
BEGIN
    IF NEW.active_fault_codes IS NOT NULL AND jsonb_array_length(NEW.active_fault_codes) > 0 THEN
        FOR elem IN SELECT * FROM jsonb_array_elements(NEW.active_fault_codes)
        LOOP
            IF LOWER(elem->>'severity') = 'critical' THEN
                has_critical := TRUE;
            END IF;
        END LOOP;
    END IF;

    IF has_critical THEN
        NEW.status := 'Critical';
        NEW.status_reason := 'Rule R1 Emergency Stop: Critical OBD-II Fault active';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_rule_r1_emergency_stop"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_tenant_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id 
    FROM public.profiles 
    WHERE id = auth.uid();
    RETURN v_tenant_id;
END;
$$;


ALTER FUNCTION "public"."get_current_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_company_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."get_current_user_company_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_role"() RETURNS character varying
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
    u_role VARCHAR(64);
BEGIN
    -- 1. Try profiles table lookup by auth.uid()
    BEGIN
        SELECT role INTO u_role 
        FROM public.profiles 
        WHERE id::text = auth.uid()::text 
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        u_role := NULL;
    END;

    IF u_role IS NOT NULL AND u_role != '' THEN
        RETURN u_role;
    END IF;

    -- 2. Try users table lookup if present
    BEGIN
        SELECT role INTO u_role
        FROM public.users
        WHERE auth_user_id::text = auth.uid()::text OR id::text = auth.uid()::text
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        u_role := NULL;
    END;

    IF u_role IS NOT NULL AND u_role != '' THEN
        RETURN u_role;
    END IF;

    -- 3. Fallback to JWT claims metadata
    RETURN COALESCE(
        NULLIF(current_setting('request.jwt.claims', true)::json ->> 'role', ''),
        NULLIF(current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'role', ''),
        NULLIF(current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'role', ''),
        'DRIVER'
    );
END;
$$;


ALTER FUNCTION "public"."get_current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."get_current_user_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.profiles (id, tenant_id, role, is_active, full_name, email)
    VALUES (
        new.id,
        NULL::uuid, -- Correction de l'inférence de type PostgreSQL
        'DRIVER',
        TRUE,
        new.raw_user_meta_data->>'full_name',
        new.email
    )
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;
    RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_translation_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF OLD.value IS DISTINCT FROM NEW.value THEN
        NEW.version := OLD.version + 1;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_translation_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_authorized_role"("allowed_roles" character varying[]) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN public.get_current_user_role() = ANY(allowed_roles);
END;
$$;


ALTER FUNCTION "public"."is_authorized_role"("allowed_roles" character varying[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_system_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tenant_id UUID;
    v_actor_id UUID;
    v_actor_email VARCHAR(255);
    v_actor_role VARCHAR(64);
    v_entity_name VARCHAR(128);
    v_entity_id VARCHAR(255);
    v_action VARCHAR(32);
    v_old_json JSONB;
    v_new_json JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_tenant_id := OLD.tenant_id;
        v_entity_id := OLD.id::text;
        v_old_json := to_jsonb(OLD);
        v_new_json := NULL;
    ELSE
        v_tenant_id := NEW.tenant_id;
        v_entity_id := NEW.id::text;
        v_old_json := NULL;
        v_new_json := to_jsonb(NEW);
        IF TG_OP = 'UPDATE' THEN
            v_old_json := to_jsonb(OLD);
        END IF;
    END IF;

    v_entity_name := TG_TABLE_NAME;
    v_action := TG_OP;
    v_actor_id := auth.uid();
    
    SELECT email, role INTO v_actor_email, v_actor_role 
    FROM public.profiles 
    WHERE id = v_actor_id;

    IF v_actor_email IS NULL THEN
        v_actor_email := COALESCE(auth.jwt() ->> 'email', 'system@nexttransit.io');
        v_actor_role := public.get_current_user_role();
    END IF;

    INSERT INTO public.audit_logs (
        tenant_id,
        entity_name,
        entity_id,
        action,
        old_data,
        new_data,
        user_id,
        user_role,
        user_email,
        created_at
    ) VALUES (
        v_tenant_id,
        v_entity_name,
        v_entity_id,
        v_action,
        v_old_json,
        v_new_json,
        v_actor_id,
        v_actor_role,
        v_actor_email,
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."log_system_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."provision_tenant"("p_company_name" "text", "p_email" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
    v_company_id UUID;
    v_sub_id UUID;
    v_slug TEXT;
    v_user_email TEXT;
    v_existing_profile RECORD;
    v_tenant RECORD;
    v_company RECORD;
    v_subscription RECORD;
BEGIN
    -- A. Validation stricte
    IF p_company_name IS NULL OR trim(p_company_name) = '' THEN
        RAISE EXCEPTION 'provision_tenant: p_company_name ne peut être vide';
    END IF;

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'provision_tenant: non authentifié';
    END IF;

    -- B. L'identité Auth est la seule source de vérité pour l'email initial
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'provision_tenant: email introuvable dans auth.users';
    END IF;

    -- C. Idempotence & Réconciliation avec Verrou exclusif (Prévention Concurrence)
    SELECT * INTO v_existing_profile 
    FROM public.profiles 
    WHERE id = v_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PROFILE_NOT_FOUND';
    END IF;

    IF v_existing_profile.tenant_id IS NOT NULL THEN
        -- 1. Le tenant référencé doit exister
        SELECT * INTO v_tenant FROM public.tenants WHERE id = v_existing_profile.tenant_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'INCONSISTENT: tenant introuvable pour ce profil';
        END IF;

        -- 2. Concordance company_id entre profil et tenant
        IF v_existing_profile.company_id IS DISTINCT FROM v_tenant.company_id THEN
            RAISE EXCEPTION 'INCONSISTENT: company_id du profil diverge de celui du tenant';
        END IF;

        -- 3. La company doit exister
        SELECT * INTO v_company FROM public.companies WHERE id = v_tenant.company_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'INCONSISTENT: company introuvable pour ce tenant';
        END IF;
        
        -- 4 & 5. Vérification ou création de la subscription
        SELECT * INTO v_subscription FROM public.subscriptions WHERE tenant_id = v_tenant.id LIMIT 1;
        
        IF FOUND THEN
            IF v_subscription.company_id IS DISTINCT FROM v_tenant.company_id THEN
                RAISE EXCEPTION 'INCONSISTENT: subscription liée à une mauvaise company';
            END IF;
            v_sub_id := v_subscription.id;
        ELSE
            v_sub_id := gen_random_uuid();
            INSERT INTO public.subscriptions (id, company_id, tenant_id, plan, status, current_period_end)
            VALUES (v_sub_id, v_company.id, v_tenant.id, 'enterprise_trial', 'trial', NOW() + INTERVAL '30 days');
        END IF;
        
        RETURN json_build_object(
            'tenant_id', v_tenant.id,
            'company_id', v_company.id,
            'subscription_id', v_sub_id,
            'slug', v_tenant.slug
        );
    END IF;

    -- D. Nouveau Provisioning : Génération d'IDs uniques
    v_tenant_id := gen_random_uuid();
    v_company_id := gen_random_uuid();
    v_sub_id := gen_random_uuid();
    
    -- E. Création du slug (la contrainte UNIQUE sur la table protégera contre la collision finale)
    v_slug := regexp_replace(lower(trim(p_company_name)), '[^a-z0-9]+', '-', 'g');
    IF v_slug = '' THEN v_slug := 'tenant'; END IF;
    WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) LOOP
        v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
    END LOOP;

    -- F. Transaction (Le SECURITY DEFINER outrepasse les RLS pour ces INSERTS initiaux)
    INSERT INTO public.companies (id, name, billing_email)
    VALUES (v_company_id, trim(p_company_name), v_user_email);

    INSERT INTO public.tenants (id, company_id, name, slug)
    VALUES (v_tenant_id, v_company_id, trim(p_company_name), v_slug);

    INSERT INTO public.subscriptions (id, company_id, tenant_id, plan, status, current_period_end)
    VALUES (v_sub_id, v_company_id, v_tenant_id, 'enterprise_trial', 'trial', NOW() + INTERVAL '30 days');

    UPDATE public.profiles 
    SET 
        tenant_id = v_tenant_id,
        company_id = v_company_id,
        role = 'TENANT_ADMIN',
        full_name = COALESCE(full_name, split_part(v_user_email, '@', 1)),
        email = COALESCE(email, v_user_email)
    WHERE id = v_user_id;

    RETURN json_build_object(
        'tenant_id', v_tenant_id,
        'company_id', v_company_id,
        'subscription_id', v_sub_id,
        'slug', v_slug
    );
END;
$$;


ALTER FUNCTION "public"."provision_tenant"("p_company_name" "text", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_vehicle_lifecycle"("p_vehicle_id" "uuid", "p_new_status" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_tenant_id UUID;
    v_vehicle_locked RECORD;
    v_actor_email VARCHAR(255);
BEGIN
    v_tenant_id := public.get_current_tenant_id();
    v_actor_email := COALESCE((auth.jwt() ->> 'email'), 'system@nexttransit.com');

    -- Lock the vehicle row
    SELECT id, tenant_id, lifecycle_status INTO v_vehicle_locked 
    FROM public.vehicles 
    WHERE id = p_vehicle_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehicle % not found', p_vehicle_id;
    END IF;

    IF v_vehicle_locked.tenant_id != v_tenant_id THEN
        RAISE EXCEPTION 'Security Error: Vehicle tenant mismatch';
    END IF;

    -- Strict Transition Matrix Validation
    -- Current Status -> Allowed New Statuses
    IF v_vehicle_locked.lifecycle_status = 'ORDERED' THEN
        IF p_new_status NOT IN ('PENDING_ACTIVATION', 'RETIRED') THEN
            RAISE EXCEPTION 'Invalid transition from ORDERED to %', p_new_status;
        END IF;
    ELSIF v_vehicle_locked.lifecycle_status = 'PENDING_ACTIVATION' THEN
        IF p_new_status NOT IN ('IN_SERVICE', 'RETIRED') THEN
            RAISE EXCEPTION 'Invalid transition from PENDING_ACTIVATION to %', p_new_status;
        END IF;
    ELSIF v_vehicle_locked.lifecycle_status = 'IN_SERVICE' THEN
        IF p_new_status NOT IN ('IMMOBILIZED', 'RETIRED') THEN
            RAISE EXCEPTION 'Invalid transition from IN_SERVICE to %', p_new_status;
        END IF;
    ELSIF v_vehicle_locked.lifecycle_status = 'IMMOBILIZED' THEN
        IF p_new_status NOT IN ('IN_SERVICE', 'RETIRED') THEN
            RAISE EXCEPTION 'Invalid transition from IMMOBILIZED to %', p_new_status;
        END IF;
    ELSIF v_vehicle_locked.lifecycle_status = 'RETIRED' THEN
        RAISE EXCEPTION 'Invalid transition: RETIRED is a terminal state. Cannot transition to %', p_new_status;
    ELSE
        RAISE EXCEPTION 'Unknown current lifecycle_status: %', v_vehicle_locked.lifecycle_status;
    END IF;

    -- Update status
    UPDATE public.vehicles
    SET lifecycle_status = p_new_status,
        status_reason = COALESCE(p_reason, status_reason),
        updated_at = NOW()
    WHERE id = p_vehicle_id;

    -- Record Immutable History
    INSERT INTO public.vehicle_lifecycle_history (
        tenant_id, vehicle_id, previous_status, new_status, reason, changed_by
    ) VALUES (
        v_tenant_id, p_vehicle_id, v_vehicle_locked.lifecycle_status, p_new_status, p_reason, v_actor_email
    );

    -- Cross-cutting Audit Log
    INSERT INTO public.audit_logs (
        tenant_id, action, entity_name, entity_id, previous_value, new_value, user_role, user_email
    ) VALUES (
        v_tenant_id, 'VEHICLE_LIFECYCLE_CHANGED', 'vehicles', p_vehicle_id::text, 
        v_vehicle_locked.lifecycle_status,
        p_new_status,
        COALESCE(public.get_current_user_role(), 'SYSTEM'),
        v_actor_email
    );

END;
$$;


ALTER FUNCTION "public"."update_vehicle_lifecycle"("p_vehicle_id" "uuid", "p_new_status" "text", "p_reason" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "establishment_id" "uuid",
    "activity_code" character varying(64),
    "activity_label" character varying(255),
    "activity_type" character varying(32) DEFAULT 'PRIMARY'::character varying,
    "is_primary" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "start_date" "date",
    "end_date" "date",
    "is_regulated" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "entity_name" character varying(128) NOT NULL,
    "entity_id" character varying(255) NOT NULL,
    "action" character varying(32) NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "user_id" "uuid",
    "user_role" character varying(64),
    "user_email" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_glossary" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "term" character varying(255) NOT NULL,
    "namespace" character varying(64) DEFAULT 'maintenance'::character varying NOT NULL,
    "definition" "text" NOT NULL,
    "translations" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" character varying(32) DEFAULT 'Approved'::character varying NOT NULL,
    "forbid_auto_translate" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "business_glossary_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['Draft'::character varying, 'Approved'::character varying])::"text"[])))
);


ALTER TABLE "public"."business_glossary" OWNER TO "postgres";


COMMENT ON TABLE "public"."business_glossary" IS 'Domain-specific terminology dictionary preserving exact operational terms.';



CREATE TABLE IF NOT EXISTS "public"."cae_budget_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "vehicle_id" "uuid",
    "severity_score" integer DEFAULT 0 NOT NULL,
    "roi_score" numeric(5,2) DEFAULT 0 NOT NULL,
    "available_budget" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cae_budget_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commercial_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "rc_number" character varying(128),
    "rc_date" "date",
    "rc_status" character varying(32) DEFAULT 'ACTIVE'::character varying,
    "rc_authority" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."commercial_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wilaya_id" "uuid" NOT NULL,
    "code" character varying(5) NOT NULL,
    "name_fr" character varying(128) NOT NULL,
    "name_ar" character varying(128),
    "active" boolean DEFAULT true
);


ALTER TABLE "public"."communes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "tax_id" character varying(128),
    "billing_email" character varying(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_bank_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "bank_name" character varying(255) NOT NULL,
    "bank_code" character varying(32),
    "branch_code" character varying(32),
    "account_holder" character varying(255),
    "account_number" character varying(128),
    "rib" character varying(128),
    "currency" character varying(16) DEFAULT 'DZD'::character varying,
    "status" character varying(32) DEFAULT 'ACTIVE'::character varying,
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."company_bank_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cost_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "vehicle_id" "uuid",
    "category" character varying(64) NOT NULL,
    "budgeted_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "actual_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cost_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "provider" character varying(50) NOT NULL,
    "external_device_id" character varying(250) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "device_mappings_provider_check" CHECK ((("provider")::"text" = ANY ((ARRAY['teltonika'::character varying, 'flespi_wialon'::character varying, 'manual'::character varying, 'nexttransit_gateway'::character varying])::"text"[])))
);


ALTER TABLE "public"."device_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."drivers" (
    "id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "operational_status" "text" DEFAULT 'AVAILABLE'::"text" NOT NULL,
    "license_number" "text" NOT NULL,
    "license_category" "text",
    "license_expiration" "date",
    "medical_certificate_expiration" "date",
    "archived_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "drivers_operational_status_check" CHECK (("operational_status" = ANY (ARRAY['AVAILABLE'::"text", 'ON_LEAVE'::"text", 'SICK'::"text", 'SUSPENDED'::"text", 'INACTIVE'::"text"])))
);


ALTER TABLE "public"."drivers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."establishments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "code" character varying(64),
    "name" character varying(255) NOT NULL,
    "type" character varying(64) DEFAULT 'HEAD_OFFICE'::character varying,
    "is_head_office" boolean DEFAULT false,
    "is_operational" boolean DEFAULT true,
    "address_line_1" character varying(255),
    "address_line_2" character varying(255),
    "district" character varying(128),
    "wilaya_id" "text",
    "commune_id" "text",
    "postal_code" character varying(32),
    "phone" character varying(64),
    "email" character varying(255),
    "nis" character varying(64),
    "nis_sequence" character varying(32),
    "rc_secondary_reference" character varying(128),
    "tax_article_number" character varying(64),
    "activity_status" character varying(32) DEFAULT 'ACTIVE'::character varying,
    "activity_start_date" "date",
    "activity_end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "wilaya_name" "text",
    "commune_name" "text"
);


ALTER TABLE "public"."establishments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fleet_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rule_id" character varying(8) NOT NULL,
    "title" character varying(255) NOT NULL,
    "severity" character varying(32) NOT NULL,
    "vehicle_id" "uuid",
    "is_read" boolean DEFAULT false,
    "data_source" "text" DEFAULT 'manual'::"text"
);


ALTER TABLE "public"."fleet_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fuel_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "driver_id" "uuid",
    "quantity_liters" numeric(10,2) NOT NULL,
    "total_cost" numeric(12,2) NOT NULL,
    "odometer_at_fill" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "data_source" "text" DEFAULT 'manual'::"text"
);


ALTER TABLE "public"."fuel_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."incidents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "severity" character varying(32) DEFAULT 'Medium'::character varying NOT NULL,
    "status" character varying(32) DEFAULT 'Open'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."incidents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "sku" character varying(128) NOT NULL,
    "name" character varying(255) NOT NULL,
    "unit_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "current_stock" integer DEFAULT 0 NOT NULL,
    "min_stock_threshold" integer DEFAULT 5 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inventory_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "company_id" "uuid",
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "invitations_role_check" CHECK (("role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'DIRECTOR'::"text", 'FLEET_MANAGER'::"text", 'MAINTENANCE_MANAGER'::"text", 'FINANCE'::"text", 'OPERATIONS'::"text", 'MECHANIC'::"text", 'DRIVER'::"text"])))
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."legal_representatives" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "person_id" "uuid",
    "full_name" character varying(255) NOT NULL,
    "role" character varying(64) DEFAULT 'GERANT'::character varying,
    "start_date" "date",
    "end_date" "date",
    "is_current" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."legal_representatives" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."login_attempts" (
    "email" "text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "locked_until" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."login_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_admins" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."platform_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pm_evaluation_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" DEFAULT 'c0a80101-0000-0000-0000-000000000001'::"uuid" NOT NULL,
    "pm_subscription_id" "uuid" NOT NULL,
    "trigger_key" character varying(255) NOT NULL,
    "evaluated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "work_order_id" "uuid"
);


ALTER TABLE "public"."pm_evaluation_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pm_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" DEFAULT 'c0a80101-0000-0000-0000-000000000001'::"uuid" NOT NULL,
    "title" character varying(255) NOT NULL,
    "system_category" character varying(32) NOT NULL,
    "trigger_type" character varying(32) NOT NULL,
    "interval_value" numeric(10,2) NOT NULL,
    "interval_unit" character varying(32) NOT NULL,
    "applicable_classifications" "jsonb" DEFAULT '[]'::"jsonb",
    "estimated_labor_hours" numeric(8,2) DEFAULT 0.00,
    "required_parts" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pm_schedules_interval_unit_check" CHECK ((("interval_unit")::"text" = ANY ((ARRAY['KM'::character varying, 'MILES'::character varying, 'DAYS'::character varying, 'MONTHS'::character varying, 'HOURS'::character varying])::"text"[]))),
    CONSTRAINT "pm_schedules_system_category_check" CHECK ((("system_category")::"text" = ANY ((ARRAY['Engine'::character varying, 'Brakes'::character varying, 'Transmission'::character varying, 'Electrical'::character varying, 'Chassis & Tires'::character varying, 'General'::character varying])::"text"[]))),
    CONSTRAINT "pm_schedules_trigger_type_check" CHECK ((("trigger_type")::"text" = ANY ((ARRAY['ODOMETER'::character varying, 'TIME'::character varying, 'ENGINE_HOURS'::character varying])::"text"[])))
);


ALTER TABLE "public"."pm_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pm_vehicle_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" DEFAULT 'c0a80101-0000-0000-0000-000000000001'::"uuid" NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "pm_schedule_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "last_service_date" timestamp with time zone,
    "last_service_odometer" numeric(10,2),
    "last_service_engine_hours" numeric(10,2),
    "next_due_date" timestamp with time zone,
    "next_due_odometer" numeric(10,2),
    "next_due_engine_hours" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pm_vehicle_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "tenant_id" "uuid",
    "email" character varying(255) NOT NULL,
    "full_name" character varying(255),
    "role" character varying(64) DEFAULT 'DRIVER'::character varying NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_id" "uuid",
    CONSTRAINT "profiles_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['SUPER_ADMIN'::character varying, 'TENANT_ADMIN'::character varying, 'DIRECTOR'::character varying, 'FLEET_MANAGER'::character varying, 'MAINTENANCE_MANAGER'::character varying, 'FINANCE'::character varying, 'OPERATIONS'::character varying, 'MECHANIC'::character varying, 'DRIVER'::character varying])::"text"[])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."regulatory_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "establishment_id" "uuid",
    "activity_id" "uuid",
    "document_type" character varying(64) NOT NULL,
    "document_name" character varying(255),
    "document_number" character varying(128),
    "issuing_authority" character varying(255),
    "issue_date" "date",
    "expiry_date" "date",
    "storage_path" "text",
    "mime_type" character varying(128),
    "file_size" integer,
    "verification_status" character varying(32) DEFAULT 'PENDING'::character varying,
    "uploaded_by" "uuid",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "status" character varying(32) DEFAULT 'ACTIVE'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."regulatory_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."replay_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "batch_import_id" "text" NOT NULL,
    "vehicle_id" "text" NOT NULL,
    "period_start" timestamp with time zone,
    "period_end" timestamp with time zone,
    "r1_critical_events_count" integer DEFAULT 0,
    "r2_schedule_conflicts_count" integer DEFAULT 0,
    "r5_mean_cae_score" numeric(5,2) DEFAULT 0.00,
    "r7_projected_variance_percentage" numeric(5,2),
    "report_payload" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."replay_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_security_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "institution" character varying(32) NOT NULL,
    "registration_number" character varying(128),
    "employer_number" character varying(128),
    "affiliation_center" character varying(255),
    "status" character varying(32) DEFAULT 'ACTIVE'::character varying,
    "affiliation_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."social_security_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."statistical_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "nis" character varying(64),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."statistical_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "tenant_id" "uuid" NOT NULL,
    "plan" character varying(64) DEFAULT 'Enterprise'::character varying NOT NULL,
    "status" character varying(32) DEFAULT 'active'::character varying NOT NULL,
    "max_vehicles" integer DEFAULT 900 NOT NULL,
    "price_per_vehicle_dzd" numeric(10,2) DEFAULT 950.00 NOT NULL,
    "current_period_start" timestamp with time zone DEFAULT "now"() NOT NULL,
    "current_period_end" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tax_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "tax_regime" character varying(32) DEFAULT 'REAL'::character varying,
    "nif" character varying(64),
    "tax_article_number" character varying(64),
    "vat_subject" boolean DEFAULT true,
    "vat_status" character varying(32) DEFAULT 'ACTIVE'::character varying,
    "ibs_subject" boolean DEFAULT true,
    "ifu_subject" boolean DEFAULT false,
    "tax_authority_type" character varying(64),
    "tax_authority_code" character varying(32),
    "tax_authority_name" character varying(255),
    "tax_registration_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tax_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."telematics_gateways" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "name" "text" NOT NULL,
    "tenant_id" "uuid",
    "credential_hash" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rotated_at" timestamp with time zone,
    "last_used_at" timestamp with time zone,
    CONSTRAINT "provider_length" CHECK (("char_length"("provider") > 0))
);


ALTER TABLE "public"."telematics_gateways" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."telemetry_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "text" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "external_device_id" "text" NOT NULL,
    "event_timestamp" timestamp with time zone NOT NULL,
    "payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."telemetry_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_configs" (
    "id" character varying(64) NOT NULL,
    "society_name" character varying(255) NOT NULL,
    "currency" character varying(32) DEFAULT 'USD ($)'::character varying NOT NULL,
    "currency_symbol" character varying(8) DEFAULT '$'::character varying NOT NULL,
    "allocated_budget" numeric(14,2) DEFAULT 450000.00 NOT NULL,
    "money_used" numeric(14,2) DEFAULT 382450.00 NOT NULL,
    "fiscal_year" character varying(32) DEFAULT 'FY2026'::character varying NOT NULL,
    "operating_region" character varying(255) DEFAULT 'North America - Midwest Sector'::character varying NOT NULL,
    "tax_registration_id" character varying(64) DEFAULT 'TAX-8839201-NX'::character varying NOT NULL,
    "cost_center_code" character varying(64) DEFAULT 'CC-FLEET-902'::character varying NOT NULL,
    "default_labor_rate" numeric(10,2) DEFAULT 85.00 NOT NULL,
    "emergency_approval_threshold" numeric(12,2) DEFAULT 5000.00 NOT NULL,
    "contact_email" character varying(255) DEFAULT 'operations@nexttransit.com'::character varying NOT NULL,
    "contact_phone" character varying(64) DEFAULT '+1 (555) 234-8900'::character varying NOT NULL,
    "billing_address" "text" DEFAULT '100 Fleet Center Plaza, Suite 400, Chicago, IL'::"text" NOT NULL,
    "auto_sync_money_used" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenant_configs" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_configs" IS 'Multi-tenant organization configurations, financial budgets, and labor rates.';



CREATE TABLE IF NOT EXISTS "public"."tenant_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "role" character varying(64) DEFAULT 'DRIVER'::character varying NOT NULL,
    "invited_by" "uuid",
    "status" character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenant_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "slug" character varying(255) NOT NULL,
    "currency" character varying(32) DEFAULT 'DZD (DA)'::character varying,
    "enabled_modules" "jsonb" DEFAULT '["MODULE_CORE_FLEET", "MODULE_MAINTENANCE_R4", "MODULE_INVENTORY_R3", "MODULE_WARRANTY", "MODULE_FUEL", "MODULE_TELEMETRY", "MODULE_FINANCE_R7"]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_id" "uuid",
    "operating_region" "text" DEFAULT 'North Africa'::"text" NOT NULL,
    "is_configured" boolean DEFAULT false NOT NULL,
    "legal_name" character varying(255),
    "trade_name" character varying(255),
    "acronym" character varying(32),
    "legal_form" character varying(64),
    "capital_social" numeric(15,2),
    "date_creation" "date",
    "date_activity_start" "date",
    "country" character varying(64) DEFAULT 'Algérie'::character varying,
    "status" character varying(32) DEFAULT 'ACTIVE'::character varying,
    "timezone" character varying(64) DEFAULT 'Africa/Algiers'::character varying,
    "allocated_budget" numeric(15,2)
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."translation_memory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_lang" character varying(10) DEFAULT 'fr'::character varying NOT NULL,
    "target_lang" character varying(10) NOT NULL,
    "source_text" "text" NOT NULL,
    "target_text" "text" NOT NULL,
    "namespace" character varying(64) DEFAULT 'common'::character varying NOT NULL,
    "usage_count" integer DEFAULT 1 NOT NULL,
    "quality_score" integer DEFAULT 100 NOT NULL,
    "last_used_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "translation_memory_quality_score_check" CHECK ((("quality_score" >= 0) AND ("quality_score" <= 100)))
);


ALTER TABLE "public"."translation_memory" OWNER TO "postgres";


COMMENT ON TABLE "public"."translation_memory" IS 'Translation memory repository for automated phrase matching.';



CREATE TABLE IF NOT EXISTS "public"."translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" character varying(255) NOT NULL,
    "namespace" character varying(64) DEFAULT 'common'::character varying NOT NULL,
    "language" character varying(10) DEFAULT 'fr'::character varying NOT NULL,
    "value" "text" NOT NULL,
    "description" "text",
    "context" "text",
    "status" character varying(32) DEFAULT 'Draft'::character varying NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "last_modified_by" character varying(255) DEFAULT 'admin@nexttransit.com'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "translations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['Draft'::character varying, 'AI Generated'::character varying, 'Reviewed'::character varying, 'Approved'::character varying])::"text"[])))
);


ALTER TABLE "public"."translations" OWNER TO "postgres";


COMMENT ON TABLE "public"."translations" IS 'Enterprise SaaS translation records across namespaces and languages.';



COMMENT ON COLUMN "public"."translations"."status" IS 'Approval workflow state: Draft, AI Generated, Reviewed, Approved.';



COMMENT ON COLUMN "public"."translations"."version" IS 'Incremental version number incremented on each content modification.';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid",
    "tenant_id" "uuid",
    "company_id" "uuid",
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "role" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "invited_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'DIRECTOR'::"text", 'FLEET_MANAGER'::"text", 'MAINTENANCE_MANAGER'::"text", 'FINANCE'::"text", 'OPERATIONS'::"text", 'MECHANIC'::"text", 'DRIVER'::"text"]))),
    CONSTRAINT "users_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'disabled'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicle_lifecycle_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "previous_status" "text",
    "new_status" "text" NOT NULL,
    "reason" "text",
    "changed_by" character varying(255) NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vehicle_lifecycle_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "registration" character varying(64) NOT NULL,
    "brand" character varying(128),
    "model" character varying(128),
    "status" character varying(32) DEFAULT 'Available'::character varying NOT NULL,
    "health_score" integer DEFAULT 100,
    "odometer_km" numeric(12,2) DEFAULT 0,
    "planned_departure" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assigned_mechanic_id" character varying(255),
    "data_source" "text" DEFAULT 'manual'::"text",
    "vin" character varying(64),
    "lifecycle_status" "text" DEFAULT 'IN_SERVICE'::"text" NOT NULL,
    "acquisition_date" "date",
    "acquisition_cost" numeric(12,2),
    "disposal_date" "date",
    CONSTRAINT "vehicles_lifecycle_status_check" CHECK (("lifecycle_status" = ANY (ARRAY['ORDERED'::"text", 'PENDING_ACTIVATION'::"text", 'IN_SERVICE'::"text", 'IMMOBILIZED'::"text", 'RETIRED'::"text"])))
);


ALTER TABLE "public"."vehicles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."warranties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "provider" character varying(255) NOT NULL,
    "warranty_type" character varying(64) NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."warranties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wilayas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(2) NOT NULL,
    "name_fr" character varying(128) NOT NULL,
    "name_ar" character varying(128),
    "active" boolean DEFAULT true
);


ALTER TABLE "public"."wilayas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "title" character varying(255) NOT NULL,
    "status" character varying(32) DEFAULT 'Open'::character varying NOT NULL,
    "priority" character varying(32) DEFAULT 'Medium'::character varying NOT NULL,
    "total_cost" numeric(12,2) DEFAULT 0,
    "assigned_mechanic_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parts_used" "jsonb" DEFAULT '[]'::"jsonb",
    "reserved_parts" "jsonb" DEFAULT '[]'::"jsonb",
    "data_source" "text" DEFAULT 'manual'::"text",
    "pm_subscription_id" "uuid",
    "pm_schedule_id" "uuid",
    "pm_trigger_type" character varying(32),
    "pm_trigger_value" character varying(128)
);


ALTER TABLE "public"."work_orders" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_glossary"
    ADD CONSTRAINT "business_glossary_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cae_budget_metrics"
    ADD CONSTRAINT "cae_budget_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commercial_registrations"
    ADD CONSTRAINT "commercial_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communes"
    ADD CONSTRAINT "communes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."communes"
    ADD CONSTRAINT "communes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_bank_accounts"
    ADD CONSTRAINT "company_bank_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_bank_accounts"
    ADD CONSTRAINT "company_bank_accounts_tenant_id_rib_key" UNIQUE ("tenant_id", "rib");



ALTER TABLE ONLY "public"."cost_records"
    ADD CONSTRAINT "cost_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_mappings"
    ADD CONSTRAINT "device_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_tenant_id_license_number_key" UNIQUE ("tenant_id", "license_number");



ALTER TABLE ONLY "public"."establishments"
    ADD CONSTRAINT "establishments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fleet_alerts"
    ADD CONSTRAINT "fleet_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fuel_logs"
    ADD CONSTRAINT "fuel_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."legal_representatives"
    ADD CONSTRAINT "legal_representatives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."login_attempts"
    ADD CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("email");



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pm_evaluation_events"
    ADD CONSTRAINT "pm_evaluation_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pm_schedules"
    ADD CONSTRAINT "pm_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pm_vehicle_subscriptions"
    ADD CONSTRAINT "pm_vehicle_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regulatory_documents"
    ADD CONSTRAINT "regulatory_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."replay_results"
    ADD CONSTRAINT "replay_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_security_profiles"
    ADD CONSTRAINT "social_security_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."statistical_profiles"
    ADD CONSTRAINT "statistical_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."statistical_profiles"
    ADD CONSTRAINT "statistical_profiles_tenant_id_key" UNIQUE ("tenant_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tax_profiles"
    ADD CONSTRAINT "tax_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tax_profiles"
    ADD CONSTRAINT "tax_profiles_tenant_id_key" UNIQUE ("tenant_id");



ALTER TABLE ONLY "public"."telematics_gateways"
    ADD CONSTRAINT "telematics_gateways_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."telemetry_events"
    ADD CONSTRAINT "telemetry_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_configs"
    ADD CONSTRAINT "tenant_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."translation_memory"
    ADD CONSTRAINT "translation_memory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."translations"
    ADD CONSTRAINT "translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_mappings"
    ADD CONSTRAINT "unique_provider_external_device" UNIQUE ("provider", "external_device_id");



ALTER TABLE ONLY "public"."telemetry_events"
    ADD CONSTRAINT "unique_telemetry_event_id" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."business_glossary"
    ADD CONSTRAINT "uq_business_glossary_term_ns" UNIQUE ("term", "namespace");



ALTER TABLE ONLY "public"."pm_evaluation_events"
    ADD CONSTRAINT "uq_pm_trigger_key" UNIQUE ("pm_subscription_id", "trigger_key");



ALTER TABLE ONLY "public"."translation_memory"
    ADD CONSTRAINT "uq_translation_memory_phrase" UNIQUE ("source_lang", "target_lang", "source_text");



ALTER TABLE ONLY "public"."translations"
    ADD CONSTRAINT "uq_translations_key_lang" UNIQUE ("key", "language");



ALTER TABLE ONLY "public"."pm_vehicle_subscriptions"
    ADD CONSTRAINT "uq_vehicle_pm_schedule" UNIQUE ("vehicle_id", "pm_schedule_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicle_assignments"
    ADD CONSTRAINT "vehicle_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicle_lifecycle_history"
    ADD CONSTRAINT "vehicle_lifecycle_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."warranties"
    ADD CONSTRAINT "warranties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wilayas"
    ADD CONSTRAINT "wilayas_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."wilayas"
    ADD CONSTRAINT "wilayas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_activities_tenant" ON "public"."activities" USING "btree" ("tenant_id");



CREATE INDEX "idx_business_glossary_namespace" ON "public"."business_glossary" USING "btree" ("namespace");



CREATE INDEX "idx_business_glossary_status" ON "public"."business_glossary" USING "btree" ("status");



CREATE INDEX "idx_business_glossary_term" ON "public"."business_glossary" USING "btree" ("term");



CREATE INDEX "idx_comm_reg_tenant_rc" ON "public"."commercial_registrations" USING "btree" ("tenant_id", "rc_number");



CREATE INDEX "idx_documents_tenant" ON "public"."regulatory_documents" USING "btree" ("tenant_id");



CREATE INDEX "idx_establishments_geo" ON "public"."establishments" USING "btree" ("wilaya_id", "commune_id");



CREATE INDEX "idx_establishments_tenant" ON "public"."establishments" USING "btree" ("tenant_id");



CREATE INDEX "idx_pm_events_tenant" ON "public"."pm_evaluation_events" USING "btree" ("tenant_id");



CREATE INDEX "idx_pm_schedules_tenant" ON "public"."pm_schedules" USING "btree" ("tenant_id");



CREATE INDEX "idx_pm_subs_tenant" ON "public"."pm_vehicle_subscriptions" USING "btree" ("tenant_id");



CREATE INDEX "idx_pm_subs_vehicle" ON "public"."pm_vehicle_subscriptions" USING "btree" ("vehicle_id");



CREATE INDEX "idx_social_profiles_tenant" ON "public"."social_security_profiles" USING "btree" ("tenant_id");



CREATE INDEX "idx_stat_profiles_tenant_nis" ON "public"."statistical_profiles" USING "btree" ("tenant_id", "nis");



CREATE INDEX "idx_tax_profiles_tenant_nif" ON "public"."tax_profiles" USING "btree" ("tenant_id", "nif");



CREATE INDEX "idx_telematics_gateways_provider_active" ON "public"."telematics_gateways" USING "btree" ("provider") WHERE ("is_active" = true);



CREATE INDEX "idx_translation_memory_namespace" ON "public"."translation_memory" USING "btree" ("namespace");



CREATE INDEX "idx_translation_memory_pair" ON "public"."translation_memory" USING "btree" ("source_lang", "target_lang");



CREATE INDEX "idx_translation_memory_quality" ON "public"."translation_memory" USING "btree" ("quality_score" DESC);



CREATE INDEX "idx_translations_key_lang" ON "public"."translations" USING "btree" ("key", "language");



CREATE INDEX "idx_translations_language" ON "public"."translations" USING "btree" ("language");



CREATE INDEX "idx_translations_namespace" ON "public"."translations" USING "btree" ("namespace");



CREATE INDEX "idx_translations_status" ON "public"."translations" USING "btree" ("status");



CREATE INDEX "vehicle_assignments_driver_history_idx" ON "public"."vehicle_assignments" USING "btree" ("driver_id", "assigned_at" DESC);



CREATE UNIQUE INDEX "vehicle_assignments_one_active_vehicle" ON "public"."vehicle_assignments" USING "btree" ("vehicle_id") WHERE ("unassigned_at" IS NULL);



CREATE INDEX "vehicle_assignments_tenant_idx" ON "public"."vehicle_assignments" USING "btree" ("tenant_id");



CREATE INDEX "vehicle_assignments_vehicle_history_idx" ON "public"."vehicle_assignments" USING "btree" ("vehicle_id", "assigned_at" DESC);



CREATE UNIQUE INDEX "vehicles_vin_idx" ON "public"."vehicles" USING "btree" ("vin") WHERE ("vin" IS NOT NULL);



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."drivers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_business_glossary_updated_at" BEFORE UPDATE ON "public"."business_glossary" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_check_driver_tenant_integrity" BEFORE INSERT OR UPDATE ON "public"."drivers" FOR EACH ROW EXECUTE FUNCTION "public"."check_driver_tenant_integrity"();



CREATE OR REPLACE TRIGGER "trg_check_vehicle_assignment_tenant" BEFORE INSERT OR UPDATE ON "public"."vehicle_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."check_vehicle_assignment_tenant"();



CREATE OR REPLACE TRIGGER "trg_tenant_configs_updated_at" BEFORE UPDATE ON "public"."tenant_configs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_translations_updated_at" BEFORE UPDATE ON "public"."translations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_translations_version" BEFORE UPDATE ON "public"."translations" FOR EACH ROW EXECUTE FUNCTION "public"."increment_translation_version"();



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cae_budget_metrics"
    ADD CONSTRAINT "cae_budget_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cae_budget_metrics"
    ADD CONSTRAINT "cae_budget_metrics_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."commercial_registrations"
    ADD CONSTRAINT "commercial_registrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communes"
    ADD CONSTRAINT "communes_wilaya_id_fkey" FOREIGN KEY ("wilaya_id") REFERENCES "public"."wilayas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_bank_accounts"
    ADD CONSTRAINT "company_bank_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cost_records"
    ADD CONSTRAINT "cost_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cost_records"
    ADD CONSTRAINT "cost_records_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_mappings"
    ADD CONSTRAINT "device_mappings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."device_mappings"
    ADD CONSTRAINT "device_mappings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."establishments"
    ADD CONSTRAINT "establishments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_mappings"
    ADD CONSTRAINT "fk_device_mapping_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fleet_alerts"
    ADD CONSTRAINT "fleet_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fleet_alerts"
    ADD CONSTRAINT "fleet_alerts_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fuel_logs"
    ADD CONSTRAINT "fuel_logs_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fuel_logs"
    ADD CONSTRAINT "fuel_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fuel_logs"
    ADD CONSTRAINT "fuel_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."legal_representatives"
    ADD CONSTRAINT "legal_representatives_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_evaluation_events"
    ADD CONSTRAINT "pm_evaluation_events_pm_subscription_id_fkey" FOREIGN KEY ("pm_subscription_id") REFERENCES "public"."pm_vehicle_subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_evaluation_events"
    ADD CONSTRAINT "pm_evaluation_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_evaluation_events"
    ADD CONSTRAINT "pm_evaluation_events_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pm_schedules"
    ADD CONSTRAINT "pm_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_vehicle_subscriptions"
    ADD CONSTRAINT "pm_vehicle_subscriptions_pm_schedule_id_fkey" FOREIGN KEY ("pm_schedule_id") REFERENCES "public"."pm_schedules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_vehicle_subscriptions"
    ADD CONSTRAINT "pm_vehicle_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_vehicle_subscriptions"
    ADD CONSTRAINT "pm_vehicle_subscriptions_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."regulatory_documents"
    ADD CONSTRAINT "regulatory_documents_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."regulatory_documents"
    ADD CONSTRAINT "regulatory_documents_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."regulatory_documents"
    ADD CONSTRAINT "regulatory_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."regulatory_documents"
    ADD CONSTRAINT "regulatory_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."regulatory_documents"
    ADD CONSTRAINT "regulatory_documents_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."social_security_profiles"
    ADD CONSTRAINT "social_security_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."statistical_profiles"
    ADD CONSTRAINT "statistical_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tax_profiles"
    ADD CONSTRAINT "tax_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."telematics_gateways"
    ADD CONSTRAINT "telematics_gateways_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."telemetry_events"
    ADD CONSTRAINT "telemetry_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."telemetry_events"
    ADD CONSTRAINT "telemetry_events_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicle_assignments"
    ADD CONSTRAINT "vehicle_assignments_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."vehicle_assignments"
    ADD CONSTRAINT "vehicle_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicle_assignments"
    ADD CONSTRAINT "vehicle_assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicle_lifecycle_history"
    ADD CONSTRAINT "vehicle_lifecycle_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicle_lifecycle_history"
    ADD CONSTRAINT "vehicle_lifecycle_history_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."warranties"
    ADD CONSTRAINT "warranties_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."warranties"
    ADD CONSTRAINT "warranties_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_assigned_mechanic_id_fkey" FOREIGN KEY ("assigned_mechanic_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_pm_schedule_id_fkey" FOREIGN KEY ("pm_schedule_id") REFERENCES "public"."pm_schedules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_pm_subscription_id_fkey" FOREIGN KEY ("pm_subscription_id") REFERENCES "public"."pm_vehicle_subscriptions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage invitations for their tenant" ON "public"."invitations" USING (("tenant_id" = "public"."get_current_user_tenant_id"()));



CREATE POLICY "Allow full modify access to business glossary" ON "public"."business_glossary" USING (true) WITH CHECK (true);



CREATE POLICY "Allow full modify access to translation memory" ON "public"."translation_memory" USING (true) WITH CHECK (true);



CREATE POLICY "Allow full modify access to translations" ON "public"."translations" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read and write access to business_glossary" ON "public"."business_glossary" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read and write access to tenant_configs" ON "public"."tenant_configs" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read and write access to translation_memory" ON "public"."translation_memory" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read and write access to translations" ON "public"."translations" USING (true) WITH CHECK (true);



CREATE POLICY "Allow read access to business glossary" ON "public"."business_glossary" FOR SELECT USING (true);



CREATE POLICY "Allow read access to translation memory" ON "public"."translation_memory" FOR SELECT USING (true);



CREATE POLICY "Allow read access to translations" ON "public"."translations" FOR SELECT USING (true);



CREATE POLICY "Authenticated User Select Own Tenant" ON "public"."tenants" FOR SELECT TO "authenticated" USING (((("id")::"text" = ("public"."get_current_tenant_id"())::"text") OR (EXISTS ( SELECT 1
   FROM "public"."platform_admins"
  WHERE ("platform_admins"."id" = "auth"."uid"())))));



CREATE POLICY "Lecture publique pour les communes" ON "public"."communes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lecture publique pour les wilayas" ON "public"."wilayas" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Platform admins can read platform_admins" ON "public"."platform_admins" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "PlatformAdmin Manage Tenants" ON "public"."tenants" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."platform_admins"
  WHERE ("platform_admins"."id" = "auth"."uid"())))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."platform_admins"
  WHERE ("platform_admins"."id" = "auth"."uid"()))));



CREATE POLICY "RLS_FleetAlerts_Select_Policy" ON "public"."fleet_alerts" FOR SELECT USING ((("tenant_id" = "public"."get_current_tenant_id"()) OR ((("public"."get_current_user_role"())::"text" = 'DRIVER'::"text") AND ("vehicle_id" IN ( SELECT "vehicle_assignments"."vehicle_id"
   FROM "public"."vehicle_assignments"
  WHERE (("vehicle_assignments"."driver_id" = "auth"."uid"()) AND ("vehicle_assignments"."unassigned_at" IS NULL)))))));



CREATE POLICY "RLS_Inventory_Select_Policy" ON "public"."inventory_items" FOR SELECT USING (((("tenant_id")::"text" = ("public"."get_current_tenant_id"())::"text") AND (("public"."get_current_user_role"())::"text" = ANY ((ARRAY['SUPER_ADMIN'::character varying, 'TENANT_ADMIN'::character varying, 'DIRECTOR'::character varying, 'FLEET_MANAGER'::character varying, 'MAINTENANCE_MANAGER'::character varying, 'FINANCE'::character varying, 'OPERATIONS'::character varying, 'MECHANIC'::character varying])::"text"[]))));



CREATE POLICY "RLS_Vehicles_Select_Policy" ON "public"."vehicles" FOR SELECT USING ((("tenant_id" = "public"."get_current_tenant_id"()) OR ((("public"."get_current_user_role"())::"text" = 'DRIVER'::"text") AND ("id" IN ( SELECT "vehicle_assignments"."vehicle_id"
   FROM "public"."vehicle_assignments"
  WHERE (("vehicle_assignments"."driver_id" = "auth"."uid"()) AND ("vehicle_assignments"."unassigned_at" IS NULL)))))));



CREATE POLICY "RLS_WorkOrders_Select_Policy" ON "public"."work_orders" FOR SELECT USING ((("tenant_id" = "public"."get_current_tenant_id"()) OR ((("public"."get_current_user_role"())::"text" = 'DRIVER'::"text") AND ("vehicle_id" IN ( SELECT "vehicle_assignments"."vehicle_id"
   FROM "public"."vehicle_assignments"
  WHERE (("vehicle_assignments"."driver_id" = "auth"."uid"()) AND ("vehicle_assignments"."unassigned_at" IS NULL)))))));



CREATE POLICY "Super Admins can manage users in their tenant" ON "public"."users" USING (("tenant_id" = "public"."get_current_user_tenant_id"()));



CREATE POLICY "TENANT_ADMIN manages tenant profiles" ON "public"."profiles" FOR UPDATE USING ((("tenant_id" IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_id"()) AND (("public"."get_current_user_role"())::"text" = ANY ((ARRAY['SUPER_ADMIN'::character varying, 'TENANT_ADMIN'::character varying])::"text"[])))) WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation" ON "public"."cae_budget_metrics" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation" ON "public"."cost_records" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation" ON "public"."fleet_alerts" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation" ON "public"."fuel_logs" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation" ON "public"."incidents" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation" ON "public"."inventory_items" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation" ON "public"."vehicles" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation" ON "public"."warranties" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation" ON "public"."work_orders" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation DELETE for activities" ON "public"."activities" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation DELETE for commercial_registrations" ON "public"."commercial_registrations" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation DELETE for company_bank_accounts" ON "public"."company_bank_accounts" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation DELETE for device_mappings" ON "public"."device_mappings" FOR DELETE USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation DELETE for drivers" ON "public"."drivers" FOR DELETE USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation DELETE for establishments" ON "public"."establishments" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation DELETE for legal_representatives" ON "public"."legal_representatives" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation DELETE for regulatory_documents" ON "public"."regulatory_documents" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation DELETE for social_security_profiles" ON "public"."social_security_profiles" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation DELETE for statistical_profiles" ON "public"."statistical_profiles" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation DELETE for tax_profiles" ON "public"."tax_profiles" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation INSERT for activities" ON "public"."activities" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation INSERT for commercial_registrations" ON "public"."commercial_registrations" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation INSERT for company_bank_accounts" ON "public"."company_bank_accounts" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation INSERT for device_mappings" ON "public"."device_mappings" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation INSERT for drivers" ON "public"."drivers" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation INSERT for establishments" ON "public"."establishments" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation INSERT for legal_representatives" ON "public"."legal_representatives" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation INSERT for regulatory_documents" ON "public"."regulatory_documents" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation INSERT for social_security_profiles" ON "public"."social_security_profiles" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation INSERT for statistical_profiles" ON "public"."statistical_profiles" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation INSERT for tax_profiles" ON "public"."tax_profiles" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation INSERT for telemetry_events" ON "public"."telemetry_events" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation SELECT for activities" ON "public"."activities" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation SELECT for commercial_registrations" ON "public"."commercial_registrations" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation SELECT for company_bank_accounts" ON "public"."company_bank_accounts" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation SELECT for device_mappings" ON "public"."device_mappings" FOR SELECT USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation SELECT for drivers" ON "public"."drivers" FOR SELECT USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation SELECT for establishments" ON "public"."establishments" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation SELECT for legal_representatives" ON "public"."legal_representatives" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation SELECT for regulatory_documents" ON "public"."regulatory_documents" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation SELECT for social_security_profiles" ON "public"."social_security_profiles" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation SELECT for statistical_profiles" ON "public"."statistical_profiles" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation SELECT for tax_profiles" ON "public"."tax_profiles" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation SELECT for telemetry_events" ON "public"."telemetry_events" FOR SELECT USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation SELECT for vehicle_lifecycle_history" ON "public"."vehicle_lifecycle_history" FOR SELECT USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation UPDATE for activities" ON "public"."activities" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation UPDATE for commercial_registrations" ON "public"."commercial_registrations" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation UPDATE for company_bank_accounts" ON "public"."company_bank_accounts" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation UPDATE for device_mappings" ON "public"."device_mappings" FOR UPDATE USING (("tenant_id" = "public"."get_current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation UPDATE for drivers" ON "public"."drivers" FOR UPDATE USING (("tenant_id" = "public"."get_current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation UPDATE for establishments" ON "public"."establishments" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation UPDATE for legal_representatives" ON "public"."legal_representatives" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation UPDATE for regulatory_documents" ON "public"."regulatory_documents" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation UPDATE for social_security_profiles" ON "public"."social_security_profiles" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation UPDATE for statistical_profiles" ON "public"."statistical_profiles" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant Isolation UPDATE for tax_profiles" ON "public"."tax_profiles" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant isolation for pm_evaluation_events INSERT" ON "public"."pm_evaluation_events" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant isolation for pm_evaluation_events SELECT" ON "public"."pm_evaluation_events" FOR SELECT USING ((("tenant_id" IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_id"())));



CREATE POLICY "Tenant isolation for pm_schedules DELETE" ON "public"."pm_schedules" FOR DELETE USING ((("tenant_id" IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_id"())));



CREATE POLICY "Tenant isolation for pm_schedules INSERT" ON "public"."pm_schedules" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant isolation for pm_schedules SELECT" ON "public"."pm_schedules" FOR SELECT USING ((("tenant_id" IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_id"())));



CREATE POLICY "Tenant isolation for pm_schedules UPDATE" ON "public"."pm_schedules" FOR UPDATE USING ((("tenant_id" IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_id"())));



CREATE POLICY "Tenant isolation for pm_vehicle_subscriptions DELETE" ON "public"."pm_vehicle_subscriptions" FOR DELETE USING ((("tenant_id" IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_id"())));



CREATE POLICY "Tenant isolation for pm_vehicle_subscriptions INSERT" ON "public"."pm_vehicle_subscriptions" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Tenant isolation for pm_vehicle_subscriptions SELECT" ON "public"."pm_vehicle_subscriptions" FOR SELECT USING ((("tenant_id" IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_id"())));



CREATE POLICY "Tenant isolation for pm_vehicle_subscriptions UPDATE" ON "public"."pm_vehicle_subscriptions" FOR UPDATE USING ((("tenant_id" IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_id"())));



CREATE POLICY "Tenant members read profiles" ON "public"."profiles" FOR SELECT USING ((("tenant_id" IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_id"())));



CREATE POLICY "TenantAdmin Update Own Tenant" ON "public"."tenants" FOR UPDATE TO "authenticated" USING (((("id")::"text" = ("public"."get_current_tenant_id"())::"text") AND (("public"."get_current_user_role"())::"text" = 'TENANT_ADMIN'::"text"))) WITH CHECK (((("id")::"text" = ("public"."get_current_tenant_id"())::"text") AND (("public"."get_current_user_role"())::"text" = 'TENANT_ADMIN'::"text")));



CREATE POLICY "User reads own profile" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "User updates own profile" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK ((("id" = "auth"."uid"()) AND (("role")::"text" = (( SELECT "p"."role"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"())))::"text") AND (NOT ("tenant_id" IS DISTINCT FROM ( SELECT "p"."tenant_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can access vehicle assignments within their tenant" ON "public"."vehicle_assignments" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "Users can view invitations for their tenant" ON "public"."invitations" FOR SELECT USING (("tenant_id" = "public"."get_current_user_tenant_id"()));



CREATE POLICY "Users can view profiles in their tenant" ON "public"."users" FOR SELECT USING (("tenant_id" = "public"."get_current_user_tenant_id"()));



CREATE POLICY "Users can view subscription for their company" ON "public"."subscriptions" FOR SELECT USING (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "Users can view their own company" ON "public"."companies" FOR SELECT USING (("id" = "public"."get_current_user_company_id"()));



ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_glossary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cae_budget_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commercial_registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."communes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_bank_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cost_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drivers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."establishments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fleet_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fuel_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."incidents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."legal_representatives" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."login_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "login_attempts_service_policy" ON "public"."login_attempts" TO "authenticated", "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."platform_admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pm_evaluation_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pm_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pm_vehicle_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."regulatory_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."replay_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "replay_results_tenant_isolation" ON "public"."replay_results" USING (("tenant_id" = ((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'tenant_id'::"text"))::"uuid"));



ALTER TABLE "public"."social_security_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."statistical_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tax_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."telematics_gateways" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."telemetry_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."translation_memory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vehicle_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vehicle_lifecycle_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vehicles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."warranties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wilayas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_orders" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."accept_tenant_invitation"("p_token" "text", "p_full_name" "text", "p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_tenant_invitation"("p_token" "text", "p_full_name" "text", "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_tenant_invitation"("p_token" "text", "p_full_name" "text", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_tenant_invitation"("p_token" "text", "p_full_name" "text", "p_email" "text") TO "service_role";



GRANT ALL ON TABLE "public"."vehicle_assignments" TO "anon";
GRANT ALL ON TABLE "public"."vehicle_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicle_assignments" TO "service_role";



REVOKE ALL ON FUNCTION "public"."assign_driver_to_vehicle"("p_vehicle_id" "uuid", "p_driver_id" "uuid", "p_assignment_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_driver_to_vehicle"("p_vehicle_id" "uuid", "p_driver_id" "uuid", "p_assignment_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_driver_to_vehicle"("p_vehicle_id" "uuid", "p_driver_id" "uuid", "p_assignment_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_driver_to_vehicle"("p_vehicle_id" "uuid", "p_driver_id" "uuid", "p_assignment_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_work_order_total_cost"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_work_order_total_cost"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_work_order_total_cost"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_driver_tenant_integrity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_driver_tenant_integrity"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_driver_tenant_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_driver_tenant_integrity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_vehicle_assignment_tenant"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_vehicle_assignment_tenant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_vehicle_assignment_tenant"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."deactivate_driver"("p_driver_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."deactivate_driver"("p_driver_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."deactivate_driver"("p_driver_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deactivate_driver"("p_driver_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_rule_r1_emergency_stop"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_rule_r1_emergency_stop"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_rule_r1_emergency_stop"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_company_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_company_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_company_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_translation_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_translation_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_translation_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_authorized_role"("allowed_roles" character varying[]) TO "anon";
GRANT ALL ON FUNCTION "public"."is_authorized_role"("allowed_roles" character varying[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_authorized_role"("allowed_roles" character varying[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."log_system_mutation"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_system_mutation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_system_mutation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."provision_tenant"("p_company_name" "text", "p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."provision_tenant"("p_company_name" "text", "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."provision_tenant"("p_company_name" "text", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."provision_tenant"("p_company_name" "text", "p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_vehicle_lifecycle"("p_vehicle_id" "uuid", "p_new_status" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_vehicle_lifecycle"("p_vehicle_id" "uuid", "p_new_status" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_vehicle_lifecycle"("p_vehicle_id" "uuid", "p_new_status" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_vehicle_lifecycle"("p_vehicle_id" "uuid", "p_new_status" "text", "p_reason" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."business_glossary" TO "anon";
GRANT ALL ON TABLE "public"."business_glossary" TO "authenticated";
GRANT ALL ON TABLE "public"."business_glossary" TO "service_role";



GRANT ALL ON TABLE "public"."cae_budget_metrics" TO "anon";
GRANT ALL ON TABLE "public"."cae_budget_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."cae_budget_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."commercial_registrations" TO "anon";
GRANT ALL ON TABLE "public"."commercial_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."commercial_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."communes" TO "anon";
GRANT ALL ON TABLE "public"."communes" TO "authenticated";
GRANT ALL ON TABLE "public"."communes" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_bank_accounts" TO "anon";
GRANT ALL ON TABLE "public"."company_bank_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."company_bank_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."cost_records" TO "anon";
GRANT ALL ON TABLE "public"."cost_records" TO "authenticated";
GRANT ALL ON TABLE "public"."cost_records" TO "service_role";



GRANT ALL ON TABLE "public"."device_mappings" TO "anon";
GRANT ALL ON TABLE "public"."device_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."device_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."drivers" TO "anon";
GRANT ALL ON TABLE "public"."drivers" TO "authenticated";
GRANT ALL ON TABLE "public"."drivers" TO "service_role";



GRANT ALL ON TABLE "public"."establishments" TO "anon";
GRANT ALL ON TABLE "public"."establishments" TO "authenticated";
GRANT ALL ON TABLE "public"."establishments" TO "service_role";



GRANT ALL ON TABLE "public"."fleet_alerts" TO "anon";
GRANT ALL ON TABLE "public"."fleet_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."fleet_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."fuel_logs" TO "anon";
GRANT ALL ON TABLE "public"."fuel_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."fuel_logs" TO "service_role";



GRANT ALL ON TABLE "public"."incidents" TO "anon";
GRANT ALL ON TABLE "public"."incidents" TO "authenticated";
GRANT ALL ON TABLE "public"."incidents" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."legal_representatives" TO "anon";
GRANT ALL ON TABLE "public"."legal_representatives" TO "authenticated";
GRANT ALL ON TABLE "public"."legal_representatives" TO "service_role";



GRANT ALL ON TABLE "public"."login_attempts" TO "anon";
GRANT ALL ON TABLE "public"."login_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."login_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."platform_admins" TO "anon";
GRANT ALL ON TABLE "public"."platform_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_admins" TO "service_role";



GRANT ALL ON TABLE "public"."pm_evaluation_events" TO "anon";
GRANT ALL ON TABLE "public"."pm_evaluation_events" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_evaluation_events" TO "service_role";



GRANT ALL ON TABLE "public"."pm_schedules" TO "anon";
GRANT ALL ON TABLE "public"."pm_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."pm_vehicle_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."pm_vehicle_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_vehicle_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."regulatory_documents" TO "anon";
GRANT ALL ON TABLE "public"."regulatory_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."regulatory_documents" TO "service_role";



GRANT ALL ON TABLE "public"."replay_results" TO "anon";
GRANT ALL ON TABLE "public"."replay_results" TO "authenticated";
GRANT ALL ON TABLE "public"."replay_results" TO "service_role";



GRANT ALL ON TABLE "public"."social_security_profiles" TO "anon";
GRANT ALL ON TABLE "public"."social_security_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."social_security_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."statistical_profiles" TO "anon";
GRANT ALL ON TABLE "public"."statistical_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."statistical_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."tax_profiles" TO "anon";
GRANT ALL ON TABLE "public"."tax_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."telematics_gateways" TO "anon";
GRANT ALL ON TABLE "public"."telematics_gateways" TO "authenticated";
GRANT ALL ON TABLE "public"."telematics_gateways" TO "service_role";



GRANT ALL ON TABLE "public"."telemetry_events" TO "anon";
GRANT ALL ON TABLE "public"."telemetry_events" TO "authenticated";
GRANT ALL ON TABLE "public"."telemetry_events" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_configs" TO "anon";
GRANT ALL ON TABLE "public"."tenant_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_configs" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_invitations" TO "anon";
GRANT ALL ON TABLE "public"."tenant_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."translation_memory" TO "anon";
GRANT ALL ON TABLE "public"."translation_memory" TO "authenticated";
GRANT ALL ON TABLE "public"."translation_memory" TO "service_role";



GRANT ALL ON TABLE "public"."translations" TO "anon";
GRANT ALL ON TABLE "public"."translations" TO "authenticated";
GRANT ALL ON TABLE "public"."translations" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."vehicle_lifecycle_history" TO "anon";
GRANT ALL ON TABLE "public"."vehicle_lifecycle_history" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicle_lifecycle_history" TO "service_role";



GRANT ALL ON TABLE "public"."vehicles" TO "anon";
GRANT ALL ON TABLE "public"."vehicles" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicles" TO "service_role";



GRANT ALL ON TABLE "public"."warranties" TO "anon";
GRANT ALL ON TABLE "public"."warranties" TO "authenticated";
GRANT ALL ON TABLE "public"."warranties" TO "service_role";



GRANT ALL ON TABLE "public"."wilayas" TO "anon";
GRANT ALL ON TABLE "public"."wilayas" TO "authenticated";
GRANT ALL ON TABLE "public"."wilayas" TO "service_role";



GRANT ALL ON TABLE "public"."work_orders" TO "anon";
GRANT ALL ON TABLE "public"."work_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."work_orders" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































