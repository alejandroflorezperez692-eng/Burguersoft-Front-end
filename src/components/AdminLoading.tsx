import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loadingAnimation from '../assets/hamburguesa.json';

export default function AdminLoading({
  texto = 'Cargando',
  subtexto = 'Preparando tus datos',
  compact = false,
}: {
  texto?: string;
  subtexto?: string;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        minHeight: compact ? 0 : 'min(68vh, 420px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: compact ? '16px' : '20px',
      }}
    >
      <style>{`@keyframes burguerPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}@keyframes burguerFill{0%{width:0%}100%{width:100%}}@keyframes burguerDots{0%{opacity:.2}20%{opacity:1}100%{opacity:.2}}`}</style>

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