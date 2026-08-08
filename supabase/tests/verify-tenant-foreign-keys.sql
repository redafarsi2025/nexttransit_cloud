-- NextTransit Tenant Schema Constraint Validation Script
-- This script queries information_schema to verify that the required multi-tenant 
-- architecture (tenant_id columns, NOT NULL constraints, and foreign key references)
-- has been correctly initialized.

DO $$
DECLARE
    v_table_name TEXT;
    v_column_exists BOOLEAN;
    v_is_nullable TEXT;
    v_fk_exists BOOLEAN;
    v_data_type TEXT;
    v_errors INT := 0;
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'Starting NextTransit Multi-Tenant Schema Verification';
    RAISE NOTICE '==================================================';

    -- Loop through core tables to check tenant_id configuration
    FOR v_table_name IN 
        SELECT unnest(ARRAY['vehicles', 'work_orders', 'inventory_items', 'fleet_alerts'])
    LOOP
        -- 1. Check if tenant_id column exists
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = v_table_name 
              AND column_name = 'tenant_id'
        ) INTO v_column_exists;

        IF NOT v_column_exists THEN
            RAISE WARNING 'Table "%": tenant_id column is MISSING!', v_table_name;
            v_errors := v_errors + 1;
            CONTINUE;
        END IF;

        -- 2. Check tenant_id data type (MUST be UUID)
        SELECT data_type 
        INTO v_data_type
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = v_table_name 
          AND column_name = 'tenant_id';

        IF v_data_type <> 'uuid' THEN
            RAISE WARNING 'Table "%": tenant_id column is of type "%" (Expected: uuid)!', v_table_name, v_data_type;
            v_errors := v_errors + 1;
        ELSE
            RAISE NOTICE 'Table "%": tenant_id column exists and is of type UUID.', v_table_name;
        END IF;

        -- 3. Check if tenant_id is NOT NULL
        SELECT is_nullable 
        INTO v_is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = v_table_name 
          AND column_name = 'tenant_id';

        IF v_is_nullable = 'YES' THEN
            RAISE WARNING 'Table "%": tenant_id column is NULLABLE (Expected: NOT NULL)!', v_table_name;
            v_errors := v_errors + 1;
        ELSE
            RAISE NOTICE 'Table "%": tenant_id column correctly enforces NOT NULL.', v_table_name;
        END IF;

        -- 4. Check for Foreign Key constraint referencing public.tenants(id)
        SELECT EXISTS (
            SELECT 1
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_namespace tn ON t.relnamespace = tn.oid
            JOIN pg_class rt ON c.confrelid = rt.oid
            JOIN pg_namespace rtn ON rt.relnamespace = rtn.oid
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
            WHERE c.contype = 'f'
              AND tn.nspname = 'public'
              AND t.relname = v_table_name
              AND rtn.nspname = 'public'
              AND rt.relname = 'tenants'
              AND a.attname = 'tenant_id'
        ) INTO v_fk_exists;

        IF NOT v_fk_exists THEN
            RAISE WARNING 'Table "%": Foreign Key reference to tenants(id) is MISSING!', v_table_name;
            v_errors := v_errors + 1;
        ELSE
            RAISE NOTICE 'Table "%": Foreign Key reference to tenants(id) is present and functional.', v_table_name;
        END IF;

        RAISE NOTICE '--------------------------------------------------';
    END LOOP;

    IF v_errors > 0 THEN
        RAISE EXCEPTION 'Multi-tenant schema verification failed with % error(s). Please review warnings above.', v_errors;
    ELSE
        RAISE NOTICE 'SUCCESS: All core multi-tenant schema constraints are valid!';
    END IF;
END $$;
