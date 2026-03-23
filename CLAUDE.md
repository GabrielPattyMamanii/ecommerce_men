# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (localhost:5173)
npm run build      # Production build → dist/
npm run lint       # ESLint check
npm run preview    # Preview production build
```

No test suite is configured. No git repository initialized.

### Supabase Edge Functions
```bash
supabase functions deploy create-preference   # Deploy Mercado Pago function
supabase functions serve create-preference    # Local testing (requires Supabase CLI)
```

## Required Environment Variables

Create `.env.local` in the project root:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

In Supabase Dashboard → Settings → Edge Functions:
```
MERCADOPAGO_ACCESS_TOKEN=...
SITE_URL=...
```

`supabaseClient.js` falls back to a no-op stub when env vars are missing — the app renders without crashing but all DB calls silently return empty data.

## Architecture

**Stack:** React 19 + Vite 7, Tailwind CSS 3, React Router 7, Supabase JS SDK, Mercado Pago

### Context tree (order matters)
```
AuthProvider > CartProvider > Route tree
```
- `AuthProvider` — tracks `user`, `session`, `role` ('user'|'admin'), `loading`. Fetches role from `profiles.role` after auth state change.
- `CartProvider` — persists to `localStorage` key `'cart'`. Item ID format: `${productId}-${color}-${size}` (lowercase). Spec format: `"Label // Sz: SIZE"`. Free shipping threshold: $200.

### Routing
- Public routes use a standard layout (`PublicLayout`)
- Admin routes (`/admin/*`) are wrapped in `ProtectedRoute` which checks `role === 'admin'`; non-admins redirect to `/`, unauthenticated redirect to `/cuenta`

### Services
- `src/services/supabaseClient.js` — single exported `supabase` client. Import this everywhere; never call `createClient` elsewhere.

### Edge Function
- `supabase/functions/create-preference/index.ts` — Deno runtime, `npm:mercadopago@^2`
- Invoked from `Checkout.jsx` via `supabase.functions.invoke('create-preference', { body: { items } })`
- Returns `{ preference_id, init_point, sandbox_init_point }`; page redirects to `init_point`

### Database (supabase/schema.sql)
- ENUMs: `user_role` ('user'|'admin'), `order_status` ('pending'|'paid'|'shipped')
- Tables: `profiles`, `products`, `orders`, `order_items`
- `is_admin()` — STABLE SECURITY DEFINER function used inside RLS policies to avoid recursion
- `handle_new_user()` trigger — SECURITY DEFINER, auto-inserts `profiles` row on signup, bypasses RLS
- `set_updated_at()` trigger — has loop-guard: only fires if the caller didn't already set `updated_at`

## Design System

Custom Tailwind tokens (tailwind.config.js):
- **Colors:** `primary` (#00f0ff neon cyan), `accent` (#2d3446), `background-dark` (#050505), `surface` (#0a0f14)
- **Admin colors:** `admin-primary` (#0d46f2), `admin-bg` (#101422)
- **Fonts:** `font-display` (Chakra Petch), `font-body` (Inter), `font-grotesk` (Space Grotesk)
- **Shadows:** `shadow-neon` — cyan glow effect
- Border radius defaults to 0 (sharp corners); use `rounded-sm`/`rounded-lg` for 2px/4px

Public storefront uses dark/neon aesthetic. Admin dashboard uses blue (`admin-primary`) on dark (`admin-bg`).

## Current State

Pages with mock data (not yet connected to Supabase):
- `Home.jsx` — skeleton only
- `ProductDetail.jsx` — hardcoded "Spectre Shell Jacket"

Pages with live Supabase queries:
- `admin/ProductsTable.jsx` — full CRUD on `products` table
- `admin/OrdersTable.jsx` — read + mark-as-shipped on `orders` table (joins `profiles`)

See `PLAN.md` for the full implementation roadmap.
