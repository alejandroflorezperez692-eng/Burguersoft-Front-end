import { useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loadingAnimation from '../assets/hamburguesa.json';

// Bloqueo de scroll compartido: si hay varios loaders montados a la vez se
// cuenta cuántos hay y solo se restaura el scroll cuando se desmonta el último.
let bloqueosScroll = 0;
let overflowOriginal = '';

/**
 * Loading de la aplicación.
 *
 * Por defecto ocupa TODA la pantalla (incluido el sidebar y el header del
 * admin), para que al entrar o recargar una página no se vea el contenido a
 * medio cargar. Con `compact` se muestra en línea, dentro de un contenedor.
 */
export default function AdminLoading({
  texto = 'Cargando',
  subtexto = 'Preparando tus datos',
  compact = false,
}: {
  texto?: string;
  subtexto?: string;
  compact?: boolean;
}) {
  // Mientras el loading de pantalla completa está visible no se puede hacer
  // scroll de la página que hay detrás.
  useEffect(() => {
    if (compact) return;
    if (bloqueosScroll === 0) overflowOriginal = document.body.style.overflow;
    bloqueosScroll += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      bloqueosScroll = Math.max(0, bloqueosScroll - 1);
      if (bloqueosScroll === 0) document.body.style.overflow = overflowOriginal;
    };
  }, [compact]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={
        compact
          ? {
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }
          : {
              position: 'fixed',
              inset: 0,
              zIndex: 2147483000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              background: 'var(--bg, #fff)',
              animation: 'burguerFadeIn 0.2s ease-out',
            }
      }
    >
      <style>{`@keyframes burguerPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}@keyframes burguerFill{0%{width:0%}100%{width:100%}}@keyframes burguerDots{0%{opacity:.2}20%{opacity:1}100%{opacity:.2}}@keyframes burguerFadeIn{from{opacity:0}to{opacity:1}}`}</style>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 10 : 18 }}>
        <div
          style={{
            width: compact
              ? 'min(180px, calc(100vw - 120px))'
              : 'min(450px, 52vw, calc(100vw - 48px))',
            aspectRatio: '1 / 1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'burguerPulse 1.6s ease-in-out infinite',
          }}
        >
          <DotLottieReact
            data={loadingAnimation}
            autoplay
            loop
            style={{ width: '100%', height: '100%', display: 'block', background: 'transparent' }}
          />
        </div>

        <div style={{ textAlign: 'center', marginTop: -12 }}>
          <p style={{ margin: 0, fontFamily: 'var(--font-sans, sans-serif)', fontWeight: 900, fontSize: compact ? 16 : 'clamp(16px, 2.1vw, 22px)', color: 'var(--brand, #e8821a)', letterSpacing: 0.2 }}>
            {texto}
            <span style={{ animation: 'burguerDots 1.4s infinite', marginLeft: 2 }}>.</span>
            <span style={{ animation: 'burguerDots 1.4s .2s infinite', marginLeft: 1 }}>.</span>
            <span style={{ animation: 'burguerDots 1.4s .4s infinite', marginLeft: 1 }}>.</span>
          </p>
          <p style={{ margin: '8px 0 0', fontSize: compact ? 12 : 'clamp(12px, 1.4vw, 14px)', color: 'var(--text-400, #9a8a7a)', fontWeight: 500 }}>{subtexto}</p>
        </div>

        <div style={{ width: compact ? 160 : 'min(220px, 70vw)', height: 5, borderRadius: 999, background: 'var(--border, #f0e6d8)', overflow: 'hidden', marginTop: compact ? 0 : 8 }}>
          <div
            style={{
              width: 0,
              height: '100%',
              borderRadius: 999,
              background: 'linear-gradient(90deg, #e8821a, #ffb347)',
              animation: 'burguerFill 3s ease-in forwards',
            }}
          />
        </div>
      </div>
    </div>
  );
}
