-- supabase/migration-contact-settings-active-toggles.sql
-- Agrega un toggle "activo/inactivo" por canal de comunicación (WhatsApp,
-- Instagram, Facebook, TikTok, Email) en contact_settings, igual al patrón
-- "abierto" de HORARIOS DE ATENCIÓN (ConfiguracionContacto.jsx).
--
-- Por qué: hasta ahora un canal se mostraba en el sitio público (Footer,
-- /contacto, botón flotante de WhatsApp) con solo cargar la URL. Un admin
-- que quiere pausar un canal sin perder la URL cargada (ej. WhatsApp de
-- soporte de baja temporalmente) no tenía forma de hacerlo sin borrar el
-- dato. Con estas columnas, el admin puede desactivar el canal manteniendo
-- la URL guardada para reactivarlo después.
--
-- Default true: el comportamiento actual (mostrar todo canal con URL
-- cargada) no cambia para las filas existentes ni hasta que un admin
-- desactive algo explícitamente.

alter table public.contact_settings
  add column if not exists whatsapp_active  boolean not null default true,
  add column if not exists instagram_active boolean not null default true,
  add column if not exists facebook_active  boolean not null default true,
  add column if not exists tiktok_active    boolean not null default true,
  add column if not exists email_active     boolean not null default true;
