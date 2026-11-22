import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import apiClient from '../api/client';

export type CaptchaLocalRef = { recargar: () => void };
type Props = { onChange: (id: string, respuesta: string) => void };

const CaptchaLocal = forwardRef<CaptchaLocalRef, Props>(({ onChange }, ref) => {
  const [id, setId] = useState('');
  const [estado, setEstado] = useState<'idle' | 'cargando' | 'ok' | 'error'>('idle');
  const [honeypot, setHoneypot] = useState('');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const honeypotRef = useRef('');
  honeypotRef.current = honeypot;

  const cargar = useCallback(async () => {
    setEstado('cargando');
    setId('');
    onChangeRef.current('', '');
    try {
      const { data } = await apiClient.get<{ id: string }>('/captcha');
      setId(data.id);
    } catch {
      setEstado('error');
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useImperativeHandle(ref, () => ({ recargar: cargar }), [cargar]);

  useEffect(() => {
    if (!id) return;
    let cancelado = false;
    const t = setTimeout(async () => {
      try {
        await apiClient.post('/captcha/verificar', { id, website: honeypotRef.current });
        if (cancelado) return;
        setEstado('ok');
        onChangeRef.current(id, 'ok');
      } catch {
        if (!cancelado) setEstado('error');
      }
    }, 1200);
    return () => { cancelado = true; clearTimeout(t); };
  }, [id]);

  const marcar = (e: React.MouseEvent) => {
    if (!e.isTrusted || estado !== 'error') return;
    cargar();
  };

  const [hover, setHover] = useState(false);
  const [oscuro, setOscuro] = useState(() => document.body.classList.contains('dark-mode'));
  useEffect(() => {
    const obs = new MutationObserver(() => setOscuro(document.body.classList.contains('dark-mode')));
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const titulo =
    estado === 'cargando' ? 'Verificando...' :
    estado === 'ok' ? 'Verificación completada' :
    estado === 'error' ? 'No se pudo verificar' :
    'Verifica que eres humano';
  const sub =
    estado === 'cargando' ? 'Comprobando tu navegador' :
    estado === 'ok' ? 'Ya puedes continuar' :
    estado === 'error' ? 'Haz clic para reintentar' :
    'Haz clic para continuar';
  const P = oscuro
    ? { bg: '#111827', bgOk: '#0f2a1c', borde: '#2b3a5c', bordeOk: '#1f7a47', bordeHover: '#5b8cff',
        sombra: '0 3px 14px rgba(0,0,0,0.55)', sombraHover: '0 6px 20px rgba(91,140,255,0.35)',
        tit: '#e8eefc', titOk: '#4ade80', titErr: '#ff8a80', sub: '#9fb0d3', subOk: '#86e0a8',
        cbBg: '#0b1220', cbBorde: '#4a5f93', cbHover: '#5b8cff', riel: '#24304d', escudo: '#5b8cff', pie: '#9fb0d3' }
    : { bg: '#ffffff', bgOk: '#f0fbf4', borde: '#d6e0f3', bordeOk: '#9be0b8', bordeHover: '#2f6fed',
        sombra: '0 3px 12px rgba(47,111,237,0.10)', sombraHover: '0 6px 18px rgba(47,111,237,0.22)',
        tit: '#14213d', titOk: '#0f7a45', titErr: '#c0392b', sub: '#6b7a99', subOk: '#2f7d55',
        cbBg: '#ffffff', cbBorde: '#9db4e6', cbHover: '#2f6fed', riel: '#dbe7fb', escudo: '#2f6fed', pie: '#6b7a99' };
  const colorTitulo = estado === 'ok' ? P.titOk : estado === 'error' ? P.titErr : P.tit;
  const colorSub = estado === 'ok' ? P.subOk : P.sub;
  const activo = estado === 'idle' || estado === 'error';

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
      <div
        className="cpt-root"
        onClick={marcar}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        role="checkbox"
        aria-checked={estado === 'ok'}
        style={{
          position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 14,
          width: 340, maxWidth: '100%', height: 74, boxSizing: 'border-box', padding: '0 16px',
          background: estado === 'ok' ? P.bgOk : P.bg,
          border: `1px solid ${estado === 'ok' ? P.bordeOk : hover && activo ? P.bordeHover : P.borde}`,
          borderRadius: 14,
          boxShadow: hover && activo ? P.sombraHover : P.sombra,
          transition: 'all .2s ease',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
          cursor: estado === 'error' ? 'pointer' : 'default', userSelect: 'none',
        }}
      >
        <div style={{ width: 32, height: 32, flex: '0 0 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {activo && (
            <div style={{
              width: 28, height: 28, boxSizing: 'border-box', borderRadius: 8, background: P.cbBg,
              border: `2px solid ${hover ? P.cbHover : P.cbBorde}`,
              boxShadow: hover ? '0 0 0 4px rgba(91,140,255,0.20)' : 'none', transition: 'all .2s ease',
            }} />
          )}
          {estado === 'cargando' && (
            <div style={{ width: 28, height: 28, boxSizing: 'border-box', borderRadius: '50%',
              border: `3px solid ${P.riel}`, borderTopColor: P.cbHover, animation: 'captchaspin .8s linear infinite' }} />
          )}
          {estado === 'ok' && (
            <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" style={{ animation: 'captchapop .35s ease-out' }}>
              <circle cx="16" cy="16" r="15" fill="#16a34a" />
              <path d="M9 16.5l5 5 9-10" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="30" strokeDashoffset="0" style={{ animation: 'captchadraw .4s ease-out' }} />
            </svg>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cpt-t" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25, color: colorTitulo, whiteSpace: 'nowrap' }}>{titulo}</div>
          <div className="cpt-s" style={{ fontSize: 12, lineHeight: 1.3, color: colorSub, whiteSpace: 'nowrap', marginTop: 2 }}>{sub}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: '0 0 auto' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z" fill={estado === 'ok' ? '#16a34a' : P.escudo} />
            <path d="M8.5 12l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.6, color: P.pie, whiteSpace: 'nowrap' }} className="cpt-pie">PROTEGIDO</span>
        </div>

        <div style={{
          position: 'absolute', left: 0, bottom: 0, height: 3,
          width: estado === 'ok' ? '100%' : estado === 'cargando' ? '100%' : '0%',
          background: estado === 'ok' ? '#16a34a' : 'linear-gradient(90deg,#2f6fed,#6aa2ff)',
          transition: estado === 'cargando' ? 'width .9s linear' : 'width .25s ease',
        }} />

        <input
          type="text" tabIndex={-1} autoComplete="off" value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ position: 'absolute', left: -9999, opacity: 0, height: 0, width: 0 }}
         maxLength={64}/>
      </div>
      <style>{`
        .cpt-root .cpt-t{color:${colorTitulo} !important;text-shadow:none !important}
        .cpt-root .cpt-s{color:${colorSub} !important;text-shadow:none !important}
        .cpt-root .cpt-pie{color:${P.pie} !important;text-shadow:none !important}
        @keyframes captchaspin{to{transform:rotate(360deg)}}
        @keyframes captchapop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
        @keyframes captchadraw{from{stroke-dashoffset:30}to{stroke-dashoffset:0}}
      `}</style>
    </div>
  );
});

export default CaptchaLocal;