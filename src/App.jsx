import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import PromoBanner from './components/PromoBanner'
import MiniCart from './components/MiniCart'
import Footer from './components/Footer'
import WhatsAppButton from './components/WhatsAppButton'
import ProtectedRoute from './components/ProtectedRoute'
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
const CategoriesTable = lazy(() => import('./pages/admin/sections/Categories/CategoriesTable'))
const OrdersTable     = lazy(() => import('./pages/admin/sections/Orders/OrdersTable'))
const CouponsTable    = lazy(() => import('./pages/admin/sections/Coupons/CouponsTable'))
const InventarioTandas            = lazy(() => import('./pages/admin/sections/Inventario/InventarioTandas'))
const TandaForm                   = lazy(() => import('./pages/admin/sections/Inventario/TandaForm'))
const TandaDetalle                = lazy(() => import('./pages/admin/sections/Inventario/TandaDetalle'))
const InventarioPropietarios      = lazy(() => import('./pages/admin/sections/Inventario/InventarioPropietarios'))
const InventarioPropietariosTanda = lazy(() => import('./pages/admin/sections/Inventario/InventarioPropietariosTanda'))
const ControlInventarioTandas     = lazy(() => import('./pages/admin/sections/ControlInventario/ControlInventarioTandas'))
const ControlInventarioTanda      = lazy(() => import('./pages/admin/sections/ControlInventario/ControlInventarioTanda'))

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
                <Route path="productos" element={<Suspense fallback={null}><ProductsTable /></Suspense>} />
                <Route path="inventario" element={<Suspense fallback={null}><InventarioTandas /></Suspense>} />
                <Route path="inventario/nueva" element={<Suspense fallback={null}><TandaForm /></Suspense>} />
                <Route path="inventario/editar/:tandaNombre" element={<Suspense fallback={null}><TandaForm /></Suspense>} />
                <Route path="inventario/detalle/:tanda" element={<Suspense fallback={null}><TandaDetalle /></Suspense>} />
                <Route path="inventario/propietarios" element={<Suspense fallback={null}><InventarioPropietarios /></Suspense>} />
                <Route path="inventario/propietarios/:tanda" element={<Suspense fallback={null}><InventarioPropietariosTanda /></Suspense>} />
                <Route path="control-inventario" element={<Suspense fallback={null}><ControlInventarioTandas /></Suspense>} />
                <Route path="control-inventario/:tanda" element={<Suspense fallback={null}><ControlInventarioTanda /></Suspense>} />
                <Route path="categorias" element={<Suspense fallback={null}><CategoriesTable /></Suspense>} />
                <Route path="ordenes" element={<Suspense fallback={null}><OrdersTable /></Suspense>} />
                <Route path="clientes" element={<ComingSoon title="Clientes" />} />
                <Route path="cupones" element={<Suspense fallback={null}><CouponsTable /></Suspense>} />
                <Route path="configuracion" element={<ComingSoon title="Configuración" />} />
                <Route path="compras" element={<ComingSoon title="Compras" />} />
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
