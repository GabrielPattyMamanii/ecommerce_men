-- supabase/migration-contact-settings-consult-message.sql
-- Agrega el mensaje de bienvenida configurable para el botón "Consultar
-- precio" del catálogo/detalle de producto (productos con
-- price_on_request = true). Reusa la tabla singleton contact_settings ya
-- existente (mismo whatsapp_url que Footer.jsx/Contacto.jsx) — no crea
-- número separado ni tabla nueva.
--
-- Se edita desde /admin/configuracion/whatsapp (ConfiguracionWhatsapp.jsx).
-- RLS: no requiere cambios, las policies de contact_settings ya cubren
-- cualquier columna de la tabla (lectura pública, update solo admin).

alter table public.contact_settings add column if not exists consult_message text;

update public.contact_settings
  set consult_message = 'Hola, quiero consultar el precio de este producto:'
  where id = 1 and consult_message is null;
