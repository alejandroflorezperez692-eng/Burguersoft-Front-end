import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function ConfiguracionAdmin() {
  const { user } = useAuth();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState(user?.email ?? '');
  const [telefono, setTelefono] = useState('');
  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');

  const handleInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('Funcionalidad pendiente de integración con backend.');
    setMsgType('ok');
  };

  const handlePass = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('Funcionalidad pendiente de integración con backend.');
    setMsgType('ok');
  };

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Configuración de Cuenta</h1>
          <p className="subtitulo">Gestiona tu perfil y contraseña</p>
        </div>
      </div>

      <div className="grid-perfil">
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)', padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: 'var(--brand)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: '#fff',
          }}>
            {(user?.name ?? 'A')[0].toUpperCase()}
          </div>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 700, color: 'var(--text-900)', margin: 0 }}>
            {user?.name ?? 'Administrador'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-400)', margin: 0 }}>{user?.email ?? ''}</p>
          <span className="badge badge-info">Administrador</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <form onSubmit={handleInfo} style={{
            background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)', padding: 28,
          }}>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-900)' }}>Información Personal</h3>
            <div className="grid-2col">
              <div className="form-group">
                <label>Nombre</label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={user?.name ?? ''} />
              </div>
              <div className="form-group">
                <label>Apellido</label>
                <input value={apellido} onChange={(e) => setApellido(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Correo electrónico</label>
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="3XX-XXXXXXX" />
            </div>
            <div className="modal-actions">
              <button className="btn-save" type="submit">Guardar cambios</button>
            </div>
          </form>

          <form onSubmit={handlePass} style={{
            background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)', padding: 28,
          }}>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-900)' }}>Seguridad (opcional)</h3>
            <div className="form-group">
              <label>Contraseña actual</label>
              <input type="password" value={passActual} onChange={(e) => setPassActual(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Nueva contraseña</label>
              <input type="password" value={passNueva} onChange={(e) => setPassNueva(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn-save" type="submit">Actualizar contraseña</button>
            </div>
          </form>

          {msg && (
            <div style={{
              padding: '12px 18px', borderRadius: 'var(--r-sm)',
              background: msgType === 'ok' ? '#d5f5e3' : '#fde8e8',
              color: msgType === 'ok' ? '#1a7a42' : '#922',
              fontSize: 13, fontWeight: 600,
            }}>
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
