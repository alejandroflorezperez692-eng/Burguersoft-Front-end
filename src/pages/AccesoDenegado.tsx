import { Link, useLocation } from 'react-router-dom';

type Props = { codigo?: string; titulo?: string; mensaje?: string };

const COLORES = ['#4285F4', '#EA4335', '#FBBC05', '#4285F4', '#34A853', '#EA4335'];

export default function AccesoDenegado({
  codigo = '404',
  titulo = 'Eso es un error.',
  mensaje = 'no está disponible sin iniciar sesión.',
}: Props) {
  const { pathname } = useLocation();

  return (
    <>
      <style>{`
        .acc-fab, .acc-panel { display: none !important; }
        .g-page{
          min-height:100vh; background:#fff; color:#202124;
          font-family:'Google Sans', Roboto, Arial, sans-serif;
          display:flex; flex-direction:column;
        }
        @media (prefers-color-scheme: dark){
          .g-page{ background:#202124; color:#e8eaed; }
          .g-muted{ color:#9aa0a6 !important; }
          .g-url{ background:#303134 !important; color:#e8eaed !important; }
          .g-btn--text:hover{ background:rgba(138,180,248,.12) !important; }
        }
        .g-header{ padding:20px 32px; }
        .g-logo{ font-size:28px; font-weight:700; letter-spacing:-1px; text-decoration:none; }
        .g-main{
          flex:1; display:flex; align-items:center; justify-content:center; gap:64px;
          padding:24px 32px 80px; flex-wrap:wrap;
        }
        .g-text{ max-width:460px; animation:g-in .5s ease both; }
        .g-code{ font-size:clamp(64px,12vw,96px); font-weight:400; line-height:1; margin:0; color:#EA4335; letter-spacing:-2px; }
        .g-title{ font-size:24px; font-weight:400; margin:12px 0 20px; }
        .g-p{ font-size:16px; line-height:1.6; margin:0 0 12px; }
        .g-muted{ color:#5f6368; }
        .g-url{
          display:inline-block; max-width:100%; padding:2px 8px; border-radius:6px; background:#f1f3f4;
          color:#202124; font-family:'Roboto Mono', Consolas, monospace; font-size:14px; word-break:break-all;
        }
        .g-actions{ display:flex; gap:8px; margin-top:28px; flex-wrap:wrap; }
        .g-btn{
          display:inline-flex; align-items:center; height:40px; padding:0 24px; border-radius:20px;
          font-size:14px; font-weight:500; text-decoration:none; transition:box-shadow .2s, background .2s;
        }
        .g-btn--fill{ background:#1a73e8; color:#fff; }
        .g-btn--fill:hover{ background:#1b66c9; box-shadow:0 1px 3px rgba(60,64,67,.4); }
        .g-btn--text{ color:#1a73e8; }
        .g-btn--text:hover{ background:rgba(26,115,232,.08); }
        .g-art{ animation:g-in .5s .1s ease both; }
        .g-burger{ animation:g-float 3.5s ease-in-out infinite; transform-origin:center; }
        @keyframes g-float{ 0%,100%{ transform:translateY(0);} 50%{ transform:translateY(-10px);} }
        @keyframes g-in{ from{ opacity:0; transform:translateY(12px);} to{ opacity:1; transform:none;} }
      `}</style>

      <div className="g-page">
        <header className="g-header">
          <Link to="/" className="g-logo" aria-label="Burguersoft">
            {'Burguersoft'.split('').map((l, i) => (
              <span key={i} style={{ color: COLORES[i % COLORES.length] }}>{l}</span>
            ))}
          </Link>
        </header>

        <main className="g-main">
          <div className="g-text">
            <h1 className="g-code">{codigo}</h1>
            <h2 className="g-title">{titulo}</h2>
            <p className="g-p">
              <b>Acceso denegado.</b> La URL solicitada{' '}
              <span className="g-url">{pathname}</span> {mensaje}
            </p>
            <p className="g-p g-muted">Eso es todo lo que sabemos.</p>

            <div className="g-actions">
              <Link to="/login" className="g-btn g-btn--fill">Iniciar sesión</Link>
              <Link to="/" className="g-btn g-btn--text">Ir al inicio</Link>
            </div>
          </div>

          <div className="g-art" aria-hidden="true">
            <svg className="g-burger" width="260" height="260" viewBox="0 0 200 200">
              {/* sombra */}
              <ellipse cx="100" cy="182" rx="56" ry="8" fill="#000" opacity=".12" />
              {/* pan de abajo */}
              <path d="M32 126H168V136C168 154 152 166 136 166H64C48 166 32 154 32 136Z" fill="#E8821A" />
              {/* carne */}
              <rect x="28" y="108" width="144" height="22" rx="11" fill="#5a2a12" />
              {/* lechuga */}
              <path d="M26 104q10 12 20 0t20 0 20 0 20 0 20 0 20 0 20 0v8H26z" fill="#34A853" />
              {/* queso */}
              <path d="M34 98H166L150 118 134 98 118 118 102 98Z" fill="#FBBC05" />
              {/* pan de arriba, torcido */}
              <g transform="rotate(-14 100 70)">
                <path d="M30 86C30 28 170 28 170 86Z" fill="#E8821A" />
                <ellipse cx="72" cy="58" rx="6" ry="3" fill="#fff3d6" />
                <ellipse cx="100" cy="48" rx="6" ry="3" fill="#fff3d6" />
                <ellipse cx="128" cy="58" rx="6" ry="3" fill="#fff3d6" />
                {/* ojos X */}
                <path d="M72 70l10 10M82 70L72 80M118 70l10 10M128 70l-10 10" stroke="#5a2a12" strokeWidth="3.5" strokeLinecap="round" />
              </g>
            </svg>
          </div>
        </main>
      </div>
    </>
  );
}