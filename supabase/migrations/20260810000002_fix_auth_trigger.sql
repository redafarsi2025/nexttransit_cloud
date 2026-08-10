-- 1. S'assurer que le locataire peut être NULL en attente de provisionnement
ALTER TABLE public.profiles ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN tenant_id DROP DEFAULT;
-- 2. Mettre à jour le trigger avec le typage explicite (NULL::uuid)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;