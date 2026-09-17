import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loadingAnimation from '../assets/hamburguesa.json';

export default function AdminLoading({ texto = 'Cargando', subtexto = 'Preparando tus datos' }: { texto?: string; subtexto?: string }) {
  return (
    <div
      style={{
        minHeight: '68vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <style>{`@keyframes burguerPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}@keyframes burguerFill{0%{width:0%}100%{width:100%}}@keyframes burguerDots{0%{opacity:.2}20%{opacity:1}100%{opacity:.2}}`}</style>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <div
          style={{
            width: 450,
            height: 450,
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
            style={{ width: 450, height: 450, display: 'block', background: 'transparent' }}
          />
        </div>

        <div style={{ textAlign: 'center', marginTop: -12 }}>
          <p style={{ margin: 0, fontFamily: 'var(--font-sans, sans-serif)', fontWeight: 900, fontSize: 22, color: 'var(--brand, #e8821a)', letterSpacing: 0.2 }}>
            {texto}
            <span style={{ animation: 'burguerDots 1.4s infinite', marginLeft: 2 }}>.</span>
            <span style={{ animation: 'burguerDots 1.4s .2s infinite', marginLeft: 1 }}>.</span>
            <span style={{ animation: 'burguerDots 1.4s .4s infinite', marginLeft: 1 }}>.</span>
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-400, #9a8a7a)', fontWeight: 500 }}>{subtexto}</p>
        </div>

        <div style={{ width: 220, height: 5, borderRadius: 999, background: 'var(--border, #f0e6d8)', overflow: 'hidden', marginTop: 8 }}>
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