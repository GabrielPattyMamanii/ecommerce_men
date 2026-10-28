import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import PromoBanner from './components/PromoBanner'
import MiniCart from './components/MiniCart'
import Footer from './components/Footer'
import WhatsAppButton from './components/WhatsAppButton'
import ProtectedRoute from './components/ProtectedRoute'
import RequirePermission from './components/RequirePermission'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import ProductDetail from './pages/ProductDetail'
import Checkout from './pages/Checkout'
import PaymentResult from './pages/PaymentResult'
import Cuenta from './pages/Cuenta'
import Catalogo from './pages/Catalogo'
import Contacto from './pages/Contacto'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import './index.css'

/* Admin pages lazy-loaded — keeps admin-only authorization fields out of the
   public bundle so the main artifact doesn't expose a BaaS authority map. */
const AdminLayout     = lazy(() => import('./pages/admin/layout/AdminLayout'))
const Dashboard       = lazy(() => import('./pages/admin/sections/Dashboard/Dashboard'))
const ProductsTable   = lazy(() => import('./pages/admin/sections/Products/ProductsTable'))
const CategoriesTable = lazy(() => import('./pages/admin/sections/Categories/CategoriesAndBrands'))
const OrdersTable     = lazy(() => import('./pages/admin/sections/Orders/OrdersTable'))
const CouponsTable    = lazy(() => import('./pages/admin/sections/Coupons/CouponsTable'))
const StockLayout     = lazy(() => import('./pages/admin/sections/Stock/StockLayout'))
const StockEntradas   = lazy(() => import('./pages/admin/sections/Stock/StockEntradas'))
const StockSalidas    = lazy(() => import('./pages/admin/sections/Stock/StockSalidas'))
const StockControl    = lazy(() => import('./pages/admin/sections/Stock/StockControl'))
const UsersTable      = lazy(() => import('./pages/admin/sections/Users/UsersTable'))
const ConfiguracionContacto = lazy(() => import('./pages/admin/sections/Configuracion/ConfiguracionContacto'))
const ConfiguracionWhatsapp = lazy(() => import('./pages/admin/sections/Configuracion/ConfiguracionWhatsapp'))
const ConfiguracionBanner   = lazy(() => import('./pages/admin/sections/Configuracion/ConfiguracionBanner'))
const ConfiguracionLogo     = lazy(() => import('./pages/admin/sections/Configuracion/ConfiguracionLogo'))

// Placeholder pages — serán reemplazadas en Tareas posteriores
function ComingSoon({ title }) {
  return (
    <main style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.75rem', color: '#00f0ff', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
        // En construcción
      </span>
      <h1 style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '3rem', textTransform: 'uppercase', fontWeight: 700 }}>
        {title}
      </h1>
    </main>
  )
}

// Layout público: incluye Navbar + MiniCart drawer
function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <PromoBanner />
      <Navbar />
      {/* MiniCart vive fuera del flujo de página para ser un overlay global */}
      <MiniCart />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/categoria/:slug" element={<ComingSoon title="Categoría" />} />
          <Route path="/producto/:id" element={<ProductDetail />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pago-resultado" element={<PaymentResult />} />
          <Route path="/cuenta" element={<Cuenta />} />
          <Route path="*" element={<ComingSoon title="404 — Not Found" />} />
        </Routes>
      </div>
      <Footer />
      <WhatsAppButton />
    </div>
  )
}


export default function App() {
  return (
    <BrowserRouter>
      {/*
        AuthProvider envuelve todo: necesario para que ProtectedRoute
        y cualquier componente que llame useAuth() funcione.
        CartProvider va dentro: el carrito no depende de la auth.
      */}
      <AuthProvider>
        <CartProvider>
          <ScrollToTop />
          <Routes>
            {/*
              ── Rutas Admin (protegidas) ──
              ProtectedRoute verifica sesión + role === 'admin' antes de
              renderizar AdminLayout. Si falla, redirige a /cuenta o /.
            */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<Suspense fallback={null}><AdminLayout /></Suspense>}>
                <Route index element={<Suspense fallback={null}><Dashboard /></Suspense>} />
                <Route path="productos" element={<RequirePermission section="productos"><Suspense fallback={null}><ProductsTable /></Suspense></RequirePermission>} />
                <Route path="stock" element={<RequirePermission section="stock"><Suspense fallback={null}><StockLayout /></Suspense></RequirePermission>}>
                  <Route index element={<Navigate to="control" replace />} />
                  <Route path="entradas" element={<Suspense fallback={null}><StockEntradas /></Suspense>} />
                  <Route path="salidas" element={<Suspense fallback={null}><StockSalidas /></Suspense>} />
                  <Route path="control" element={<Suspense fallback={null}><StockControl /></Suspense>} />
                </Route>
                <Route path="categorias" element={<RequirePermission section="categorias"><Suspense fallback={null}><CategoriesTable /></Suspense></RequirePermission>} />
                <Route path="ordenes" element={<RequirePermission section="ordenes"><Suspense fallback={null}><OrdersTable /></Suspense></RequirePermission>} />
                <Route path="clientes" element={<RequirePermission section="clientes"><ComingSoon title="Clientes" /></RequirePermission>} />
                <Route path="cupones" element={<RequirePermission section="cupones"><Suspense fallback={null}><CouponsTable /></Suspense></RequirePermission>} />
                <Route path="usuarios" element={<RequirePermission section="usuarios"><Suspense fallback={null}><UsersTable /></Suspense></RequirePermission>} />
                <Route path="configuracion" element={<RequirePermission section="configuracion"><Suspense fallback={null}><ConfiguracionContacto /></Suspense></RequirePermission>} />
                <Route path="configuracion/whatsapp" element={<RequirePermission section="configuracion"><Suspense fallback={null}><ConfiguracionWhatsapp /></Suspense></RequirePermission>} />
                <Route path="configuracion/banner" element={<RequirePermission section="configuracion"><Suspense fallback={null}><ConfiguracionBanner /></Suspense></RequirePermission>} />
                <Route path="configuracion/logo" element={<RequirePermission section="configuracion"><Suspense fallback={null}><ConfiguracionLogo /></Suspense></RequirePermission>} />
                <Route path="compras" element={<RequirePermission section="compras"><ComingSoon title="Compras" /></RequirePermission>} />
                <Route path="analytics" element={<ComingSoon title="Analytics" />} />
              </Route>
            </Route>

            {/*
              ── Rutas Públicas ──
              Cualquier ruta que no empiece con /admin pasa por PublicLayout.
            */}
            <Route path="/*" element={<PublicLayout />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
