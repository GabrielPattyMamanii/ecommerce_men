import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Sin esto, React Router preserva el scroll al navegar entre rutas
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
