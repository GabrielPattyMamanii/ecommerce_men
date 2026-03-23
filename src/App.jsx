import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import MiniCart from './components/MiniCart'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import ProductsTable from './pages/admin/ProductsTable'
import OrdersTable from './pages/admin/OrdersTable'
import ProductDetail from './pages/ProductDetail'
import Checkout from './pages/Checkout'
import PaymentResult from './pages/PaymentResult'
import Cuenta from './pages/Cuenta'
import Catalogo from './pages/Catalogo'
import Contacto from './pages/Contacto'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import './index.css'

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
          <Routes>
            {/*
              ── Rutas Admin (protegidas) ──
              ProtectedRoute verifica sesión + role === 'admin' antes de
              renderizar AdminLayout. Si falla, redirige a /cuenta o /.
            */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="productos" element={<ProductsTable />} />
                <Route path="ordenes" element={<OrdersTable />} />
                <Route path="clientes" element={<ComingSoon title="Clientes" />} />
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
