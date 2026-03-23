import { Link } from 'react-router-dom';
import NexoLogoImg from '../assets/logo-nexo.jpg';

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-black pb-8 relative mt-auto overflow-hidden pt-12">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />

      <div className="relative z-10 px-6 md:px-10 lg:px-40 flex flex-col gap-12">

        {/* ── Cuerpo principal ── */}
        <div className="flex flex-col lg:flex-row justify-between gap-12">

          {/* Logo + slogan */}
          <div className="flex flex-col gap-5 max-w-xs">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src={NexoLogoImg}
                alt="NEXO Performance"
                className="h-12 w-auto mix-blend-lighten opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <div className="flex flex-col justify-center">
                <span className="font-['Inter',sans-serif] font-black text-xl tracking-[0.1em] text-slate-200 leading-none">
                  NEXO
                </span>
                <span className="font-['Inter',sans-serif] font-extrabold text-[9px] tracking-[0.45em] text-[#4a90e2] mt-1">
                  PERFORMANCE
                </span>
              </div>
            </Link>
            <p className="text-xs leading-relaxed font-mono text-slate-500 uppercase tracking-tight border-l border-primary/30 pl-4">
              Indumentaria deportiva de alto rendimiento.<br />
              Calidad, estilo y comodidad en cada prenda.
            </p>
          </div>

          {/* ── Columnas de links ── */}
          <div className="grid grid-cols-2 gap-x-16 gap-y-8">
            {/* Columna 1: Categorías */}
            <div className="flex flex-col gap-4">
              <h4 className="text-white font-display font-bold uppercase tracking-widest text-sm border-b border-white/5 pb-2">
                Categorías
              </h4>
              <Link className="text-[11px] text-slate-400 hover:text-primary transition-colors font-mono uppercase tracking-wider tech-underline w-fit" to="/catalogo">Remeras</Link>
              <Link className="text-[11px] text-slate-400 hover:text-primary transition-colors font-mono uppercase tracking-wider tech-underline w-fit" to="/catalogo">Pantalones</Link>
              <Link className="text-[11px] text-slate-400 hover:text-primary transition-colors font-mono uppercase tracking-wider tech-underline w-fit" to="/catalogo">Accesorios</Link>
            </div>

            {/* Columna 2: Ayuda */}
            <div className="flex flex-col gap-4">
              <h4 className="text-white font-display font-bold uppercase tracking-widest text-sm border-b border-white/5 pb-2">
                Ayuda
              </h4>
              <Link className="text-[11px] text-slate-400 hover:text-primary transition-colors font-mono uppercase tracking-wider tech-underline w-fit" to="#">Cambios</Link>
              <Link className="text-[11px] text-slate-400 hover:text-primary transition-colors font-mono uppercase tracking-wider tech-underline w-fit" to="#">Envíos</Link>
              <Link className="text-[11px] text-slate-400 hover:text-primary transition-colors font-mono uppercase tracking-wider tech-underline w-fit" to="/contacto">Contacto</Link>
            </div>
          </div>
        </div>

        {/* ── Barra inferior ── */}
        <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-5">
          <p className="text-[10px] font-mono uppercase text-slate-600 tracking-widest">
            © {new Date().getFullYear()} NEXO PERFORMANCE — Todos los derechos reservados
          </p>

          {/* Redes sociales */}
          <div className="flex gap-5 items-center">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Seguinos:</span>
            <a className="text-slate-400 hover:text-primary transition-all transform hover:scale-110" href="#" title="WhatsApp">
              <svg className="size-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            </a>
            <a className="text-slate-400 hover:text-primary transition-all transform hover:scale-110" href="#" title="TikTok">
              <svg className="size-5 fill-current" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.6-4.12-1.31a6.345 6.345 0 01-1.85-1.57v8.52c.01 2.32-.7 4.71-2.42 6.27-1.44 1.34-3.48 2.01-5.41 1.83-2.07-.15-4.11-1.28-5.23-3.09-1.35-2.15-1.12-5.18.57-7.1 1.32-1.55 3.42-2.4 5.45-2.22.13 0 .26.02.39.04v4.09c-.58-.09-1.19-.07-1.75.12-1.02.36-1.79 1.35-1.87 2.42-.1 1.5.95 2.92 2.41 3.19 1.16.24 2.5-.16 3.19-1.16.32-.47.46-1.03.45-1.6V.02z"/></svg>
            </a>
            <a className="text-slate-400 hover:text-primary transition-all transform hover:scale-110" href="#" title="Instagram">
              <svg className="size-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.351-.2 6.78-2.618 6.98-6.98.058-1.281.072-1.689.072-4.948s-.014-3.667-.072-4.947c-.2-4.353-2.612-6.78-6.98-6.98C15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
          </div>
        </div>
      </div>

      {/* Acento decorativo */}
      <div className="absolute bottom-0 right-0 p-4 flex gap-1 opacity-20 pointer-events-none">
        <div className="w-1 h-8 bg-primary" />
        <div className="w-1 h-12 bg-primary/50" />
        <div className="w-1 h-4 bg-primary/20" />
      </div>
    </footer>
  );
}
