# Plan de Implementación: E-commerce Men (React, Supabase, Mercado Pago)

> **Nota para IA/Ejecutor:** Este plan está diseñado de forma modular, con tareas paso a paso, enfocadas (Bite-Sized) y orientadas a TDD/Iteraciones cortas. Al finalizar cada paso, verifica tu funcionamiento de forma local antes del commit.

**Objetivo:** Construir un e-commerce completo de moda masculina usando React (Antigravity), Supabase y Mercado Pago, basándose en diseños de Stitch.
**Tecnologías:** React, VITE, Tailwind CSS o Vanilla CSS base, Supabase (DB + Auth + Edge Functions), Mercado Pago (SDK / Checkout Pro).

---

## 1. Estructura de Carpetas e Inicialización Base

### Tarea 1.1: Andamiaje del Proyecto (Scaffold)
**Archivos:**
- Directorios raíz

**Paso a paso:**
- [ ] Inicializar el proyecto con Vite y React (si no está hecho). `npm create vite@latest . -- --template react`
- [ ] Limpiar archivos boilerplates de Vite (App.css, index.css default, etc.).
- [ ] Crear estructura de directorios estándar:
  - `src/components/` (UI reusable)
  - `src/pages/` (Vistas completas)
  - `src/assets/` (Imágenes, iconos)
  - `src/services/` (Llamadas a apis, base de datos)
  - `src/hooks/`
  - `src/context/`
  - `src/utils/`
- [ ] Configurar React Router DOM en `src/main.jsx` y `src/App.jsx` definiendo layout principal y layout de admin.
- [ ] Instalar dependencias clave: `npm install react-router-dom @supabase/supabase-js @mercadopago/sdk-react`

---

## 2. UI/Frontend (Basado en Stitch)

*Instrucción de Stitch: Use un utilitario como `curl -L` para descargar el HTML/CSS/Images usando los tokens o links generados por Stitch de cada ID.*

### Tarea 2.1: Minimalist Men's Fashion Home Page
**ID Stitch:** `4261ff01c7e54cd79d1f026c29b459b4`
**Archivos:** `src/pages/Home.jsx`, `src/components/Navbar.jsx`, `src/components/Footer.jsx`

**Paso a paso:**
- [ ] Descargar/Copiar el código estático de la Home Page desde Stitch.
- [ ] Componentizar en React: Extraer `<Navbar />` y `<Footer />`.
- [ ] Implementar la sección de Hero (Header principal).
- [ ] Implementar la grilla de "Productos Destacados" de manera estática y luego pasar a una estructura basada en props (ej. un map sobre un array temporal de data mock).

### Tarea 2.2: Premium Jacket Product Detail Page
**ID Stitch:** `ce0d1253a6e74e2893d0849247b28afc`
**Archivos:** `src/pages/ProductDetail.jsx`

**Paso a paso:**
- [ ] Descargar/Copiar el código de la pantalla Product Detail desde Stitch.
- [ ] Crear la ruta `/product/:id` en `App.jsx`.
- [ ] Implementar galería de imágenes (Main + Thumbnails) usando estados si se requiere.
- [ ] Implementar panel de compra: Selección de tallas/colores estáticamente por ahora.
- [ ] Añadir botón "Add to Cart" que invoque temporalmente un `console.log`.

### Tarea 2.3: Mini-Cart and One-Step Checkout
**ID Stitch:** `a902b2722eaf41b28899f5aa85f3770c`
**Archivos:** `src/components/MiniCart.jsx`, `src/pages/Checkout.jsx`

**Paso a paso:**
- [ ] Descargar/Copiar el código del Mini-Cart y Checkout desde Stitch.
- [ ] Implementar compontente `MiniCart.jsx` que se pueda sobreponer en pantalla al hacer click en el icono del carrito en el `Navbar`.
- [ ] Crear UI del One-Step Checkout asimilando formulario de direcciones y resumen de compra.

---

## 3. Base de Datos (Supabase)

### Tarea 3.1: Configuración de SQL Schema
**Archivos:** Generar script en `/supabase/schema.sql` (para ejecución posterior directa en panel de Supabase).

**Paso a paso:**
- [ ] Escribir SQL para crear tabla `profiles` vinculando `auth.users` y albergando `full_name`, `role` (admin | user).
- [ ] Escribir SQL para crear tabla `products` (`id`, `name`, `description`, `price`, `stock`, `images`, `category_id`).
- [ ] Escribir SQL para crear tabla `orders` (`id`, `user_id`, `status` [pending, paid, shipped], `total`, `payment_id`).
- [ ] Escribir SQL para crear tabla `order_items` (vincula order y product, cantidad, precio).
- [ ] Escribir políticas RLS (Row Level Security):
  - Lectura pública en `products`.
  - Usuarios logueados solo pueden leer y crear sus `orders` basándose en `user_id`.
  - Admin (`role = 'admin'`) tiene permisos absolutos (CRUD).

---

## 4. Lógica de Backend (Auth, Carrito, MP)

### Tarea 4.1: Cliente e Inicialización de Supabase
**Archivos:** `src/services/supabaseClient.js`, `.env`

**Paso a paso:**
- [ ] Inicializar y exportar cliente usando la URL y ANON_KEY de supabase almacenados en `.env.local`.

### Tarea 4.2: Autenticación Contextual
**Archivos:** `src/context/AuthContext.jsx`

**Paso a paso:**
- [ ] Crear un estado que retenga la información del usuario en sesión usando `supabase.auth.onAuthStateChange()`.
- [ ] Implementar funciones exportadas genéricas: `login(email, password)`, `register(email, pass, metadata)` y `logout()`.
- [ ] Proveer este contexto al resto de la aplicación envolviendo `App.jsx`.

### Tarea 4.3: Estado y Lógica Global del Carrito
**Archivos:** `src/context/CartContext.jsx`

**Paso a paso:**
- [ ] Crear contexto con funciones: `addToCart(product, qt)`, `removeFromCart(productId)`, `clearCart()`.
- [ ] Mantener estado de persistencia sincronizando cambios de los arreglos contra `localStorage`.

### Tarea 4.4: Integración Mercado Pago (Edge Function + Frontend)
**Archivos:** `supabase/functions/create-preference/index.ts`, `src/pages/Checkout.jsx`

**Paso a paso:**
- [ ] Crear `Edge Function` en Supabase (requiere Deno). Inicializarla.
- [ ] Implementar SDK MP en la API de Supabase: recibir un JSON con el array de ítems del `Cart` y retornar el ID generado por `mercadopago.preferences.create`.
- [ ] En `Checkout.jsx`, llamar la función local Supabase pasando items del carrito activo.
- [ ] Renderizar el Wallet/Checkout Pro con el SDK Web (`@mercadopago/sdk-react`) usando el `preference_id` devuelto.

---

## 5. Dashboard Admin (Tech Admin)

### Tarea 5.1: Tech Admin Overview Mockup

> **Stitch Instructions**
> Get the images and code for the following Stitch project's screens:
>
> **Project ID:** `11880103943447007113`
>
> **Screens:**
> 1. Technical Admin Dashboard Overview
>     **ID:** `4456bc0fda444cb6834fdcf686480313`
>
> Use a utility like `curl -L` to download the hosted URLs.

**Archivos:** `src/pages/admin/AdminLayout.jsx`, `src/pages/admin/Dashboard.jsx`

**Paso a paso:**
- [ ] Descargar el código base de Stitch para el Dashboard usando `curl -L` con el ID de pantalla `4456bc0fda444cb6834fdcf686480313`.
- [ ] Implementar protección de ruta con componente `ProtectedRoute` que valide `if (user && role === "admin")`.
- [ ] Crear un layout base anidado para la zona `admin/*` con React Router.

### Tarea 5.2: Panel de Productos y Órdenes
**Archivos:** `src/pages/admin/ProductsTable.jsx`, `src/pages/admin/OrdersTable.jsx`

**Paso a paso:**
- [ ] Crear vista listando los productos reales atacando el endpoint `supabase.from('products').select('*')`.
- [ ] UI simple para agregar, editar (cambiar precios/stock) o remover productos.
- [ ] Vista de listado de Órdenes usando `supabase.from('orders')` mostrando su status (Pending / Paid). Toggle manual para actualizar estado a 'shipped'.
