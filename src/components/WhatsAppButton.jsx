export default function WhatsAppButton() {
  const PHONE_NUMBER = '000000000'; // TODO: reemplazar con el número real de WhatsApp antes de publicar

  const handleClick = () => {
    const message = '¿Tenés dudas sobre nuestros productos?';
    const encodedMessage = encodeURIComponent(message);
    window.open(
      `https://wa.me/${PHONE_NUMBER}?text=${encodedMessage}`,
      '_blank'
    );
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex items-end gap-3 group">
      {/* Tarjeta informativa — aparece al pasar el cursor sobre el botón */}
      <div
        onClick={handleClick}
        className="relative w-64 cursor-pointer rounded-lg border border-primary/20 bg-surface p-4 shadow-lg transition-all duration-300 font-body pointer-events-none opacity-0 translate-x-4 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-x-0"
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-green-500">En línea ahora</span>
        </div>
        <p className="text-sm font-semibold text-slate-100 pr-4">
          ¿Tenés dudas? Chateá con nosotros por WhatsApp
        </p>
        <p className="mt-1 text-xs text-tech-grey flex items-center gap-1">
          Respondemos al instante
          <span className="material-symbols-outlined text-sm leading-none">chat_bubble</span>
        </p>

        {/* Flecha decorativa apuntando al botón */}
        <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-surface border-r border-b border-primary/20 rotate-[-45deg]" />
      </div>

      {/* Botón circular flotante */}
      <button
        onClick={handleClick}
        className="relative shrink-0 group"
        aria-label="Chatear por WhatsApp"
      >
        {/* Fondo animado - círculo decorativo con glow */}
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-lg group-hover:blur-xl transition-all duration-300 animate-pulse" />

        {/* Botón principal — gradiente neon */}
        <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-neon hover:shadow-lg transition-all duration-300 group-hover:scale-110 animate-bounce">
          {/* Logo WhatsApp (SVG inline — mismo que Footer.jsx) */}
          <svg aria-hidden="true" className="size-7 fill-white" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
        </div>

        {/* Indicador de "en línea" — punto verde pulsante */}
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-surface animate-pulse shadow-neon" />
      </button>
    </div>
  );
}
