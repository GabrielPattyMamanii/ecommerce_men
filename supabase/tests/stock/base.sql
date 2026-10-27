-- Esquema mínimo que emula Supabase (solo para pruebas locales)
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.role', true), '') $$;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.role() TO anon, authenticated;

CREATE TABLE public.profiles (id uuid PRIMARY KEY, role text NOT NULL DEFAULT 'customer');
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  stock integer NOT NULL DEFAULT 0, unlimited_stock boolean NOT NULL DEFAULT false,
  retail_price numeric);
CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS
$$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') $$;
CREATE TABLE public.admin_permissions (
  user_id uuid NOT NULL, section text NOT NULL,
  CONSTRAINT admin_permissions_section_check CHECK (section IN ('productos','inventario')),
  PRIMARY KEY (user_id, section));
-- products legible por todos (catálogo público) y editable por authenticated (RLS de products no se emula)
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE ON public.products TO authenticated;
GRANT SELECT ON public.profiles, public.admin_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

INSERT INTO public.profiles VALUES
 ('00000000-0000-0000-0000-0000000000a1','admin'),
 ('00000000-0000-0000-0000-0000000000b1','staff'),
 ('00000000-0000-0000-0000-0000000000c1','staff'),
 ('00000000-0000-0000-0000-0000000000d1','customer');
INSERT INTO public.admin_permissions VALUES ('00000000-0000-0000-0000-0000000000b1','productos');
INSERT INTO public.products (id,name,retail_price) VALUES
 ('11111111-1111-1111-1111-111111111111','Remera A',100),
 ('22222222-2222-2222-2222-222222222222','Remera B',NULL);
