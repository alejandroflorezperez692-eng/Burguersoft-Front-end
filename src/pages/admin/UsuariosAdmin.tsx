import { useEffect, useState, type CSSProperties } from 'react';
import apiClient from '../../api/client';
import { useToast } from '../../components/Toast';
import AdminLoading from '../../components/AdminLoading';
import '../../styles/nu-admin.css';
import { useEscape } from '../../hooks/useEscape';

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  estado: string;
  rol: { nombre: string } | null;
}

const OPCIONES_POR_PAGINA = [10, 50, 100, 200, 500];

const badgeClass = (e: string) =>
  e === 'Activo' ? 'badge-success' : e === 'Inactivo' ? 'badge-danger' : 'badge-warning';

const NOMBRE_REGEX = /^\p{L}+(?:[ '’-]\p{L}+)*$/u;

const limpiarEspacios = (v: string) => v.trim().replace(/\s+/g, ' ');

const soloLetras = (v: string) => v.replace(/[^\p{L}\s'’-]/gu, '');

const formatearNombre = (v: string) =>
  limpiarEspacios(v)
    .toLowerCase()
    .replace(/(^|[\s'’-])(\p{L})/gu, (_, sep, letra) => sep + letra.toUpperCase());

const nombreValido = (v: string) => {
  const t = limpiarEspacios(v);
  if (t.length < 2 || t.length > 50) return false;
  if (!NOMBRE_REGEX.test(t)) return false;
  if (/(\p{L})\1{2,}/iu.test(t)) return false;
  if (!/[aeiouáéíóúüy]/i.test(t)) return false;
  return true;
};

function Avatar({ nombre, apellido, estado }: { nombre: string; apellido: string; estado: string }) {
  return (
    <span style={{
      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
      background: estado === 'Activo' ? 'var(--brand)' : 'var(--surface-3)',
      color: estado === 'Activo' ? '#fff' : 'var(--text-400)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: 15,
    }}>
      {(nombre.charAt(0) + (apellido?.charAt(0) ?? '')).toUpperCase()}
    </span>
  );
}

export default function UsuariosAdmin() {
  const [items, setItems] = useState<Usuario[]>([]);
  const [modal, setModal] = useState(false);
  const [sel, setSel] = useState<Usuario | null>(null);
  const [rol, setRol] = useState('');
  const [estado, setEstado] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [intentado, setIntentado] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  // --- Estados de Filtros ---
  const [q, setQ] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroNombre, setFiltroNombre] = useState('');

  const { showToast, confirmar } = useToast();

  const hayFiltros = q !== '' || filtroRol !== '' || filtroNombre !== '';

  const limpiarFiltros = () => {
    setQ('');
    setFiltroRol('');
    setFiltroNombre('');
    setPagina(1);
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get<Usuario[]>('/usuarios');
      setItems(r.data);
    } catch {
      showToast('No se pudieron cargar los usuarios', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // --- Lógica de Filtrado Combinada ---
  const filtered = items
    .filter((u) => {
      if (!q) return true;
      const t = q.toLowerCase();
      return (
        `${u.nombre} ${u.apellido}`.toLowerCase().includes(t) ||
        u.correo.toLowerCase().includes(t) ||
        (u.telefono && u.telefono.includes(t))
      );
    })
    .filter((u) => !filtroRol || u.rol?.nombre === filtroRol)
    .filter((u) => {
      if (!filtroNombre.trim()) return true;
      return `${u.nombre} ${u.apellido ?? ''}`.toLowerCase().includes(filtroNombre.trim().toLowerCase());
    })
    .sort((a, b) => a.id - b.id);

  // Paginación con cantidad configurable (10, 50, 100, 200, 500)
  const totalPaginas = Math.max(1, Math.ceil(filtered.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtered.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);

  const openEdit = (u: Usuario) => {
    setSel(u);
    setNombre(u.nombre);
    setApellido(u.apellido ?? '');
    setCorreo(u.correo);
    setPassword('');
    setVerPass(false);
    setRol(u.rol?.nombre ?? '');
    setEstado(u.estado);
    setIntentado(false);
    setModal(true);
  };

  const requisitos = [
    { id: 'largo',     texto: 'Mínimo 8 caracteres',                 cumple: password.length >= 8 },
    { id: 'mayuscula', texto: 'Al menos una mayúscula',              cumple: /[A-Z]/.test(password) },
    { id: 'numero',    texto: 'Al menos un número',                  cumple: /\d/.test(password) },
    { id: 'simbolo',   texto: 'Al menos un símbolo (@, #, $, etc.)', cumple: /[^A-Za-z0-9\s]/.test(password) },
  ];

  const requisitosCumplidos = requisitos.filter((r) => r.cumple).length;
  const claseBarra =
    requisitosCumplidos === requisitos.length ? 'verde'
    : requisitosCumplidos >= 2 ? 'amarillo'
    : 'rojo';
  const porcentajeBarra = (requisitosCumplidos / requisitos.length) * 100;

  const errores = {
    nombre: !nombreValido(nombre),
    apellido: !nombreValido(apellido),
    correo: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim()),
    password: password !== '' && requisitosCumplidos < requisitos.length,
    rol: !rol,
    estado: !estado,
  };

  const bordeError = (malo: boolean): CSSProperties | undefined =>
    intentado && malo ? { borderColor: 'var(--danger)' } : undefined;

  const guardar = async () => {
    if (!sel) return;
    setIntentado(true);
    if (errores.nombre) { showToast('Escribe un nombre real: solo letras, sin números ni símbolos', true); return; }
    if (errores.apellido) { showToast('Escribe un apellido real: solo letras, sin números ni símbolos', true); return; }
    if (errores.correo) { showToast('Escribe un correo válido', true); return; }
    if (errores.password) { showToast('La contraseña debe tener 8+ caracteres, mayúscula, número y símbolo', true); return; }
    if (errores.rol) { showToast('Selecciona un rol', true); return; }
    if (errores.estado) { showToast('Selecciona un estado', true); return; }

    const payload: Record<string, string> = {
      nombre: formatearNombre(nombre),
      apellido: formatearNombre(apellido),
      email: correo.trim(),
      rol,
      estado,
    };
    if (password) payload.password = password;

    try {
      await apiClient.put(`/usuarios/${sel.id}`, payload);
      showToast('Usuario actualizado correctamente');
      setModal(false);
      load();
    } catch (e: any) {
      const errs = e?.response?.data?.errors;
      const msg =
        (errs && (Object.values(errs).flat()[0] as string)) ||
        e?.response?.data?.error ||
        'No se pudo actualizar el usuario';
      showToast(msg, true);
    }
  };

  const del = async (id: number) => {
    const u = items.find((x) => x.id === id);
    const nombreCompleto = u ? `${u.nombre} ${u.apellido ?? ''}` : 'este usuario';
    if (!(await confirmar(`¿Eliminar a "${nombreCompleto}"? Esta acción no se puede deshacer.`, 'Sí, eliminar'))) return;
    try {
      await apiClient.delete(`/usuarios/${id}`);
      showToast('Usuario eliminado');
      load();
    } catch {
      showToast('No se pudo eliminar el usuario', true);
    }
  };

  useEscape([
    [modal && !!sel, () => setModal(false)],
  ]);

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p className="subtitulo">Administra los usuarios del sistema</p>
        </div>
      </div>

      {/* Barra de herramientas con Búsqueda + Filtros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>

        {/* Fila 1: Búsqueda */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="mn-search-wrap" style={{ flex: 1, minWidth: 250, marginBottom: 0 }}>
            <svg className="mn-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input className="mn-search" type="text" placeholder="Buscar por nombre, correo o teléfono..." value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} />
          </div>
        </div>

        {/* Fila 2: Filtros */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 190 }}>
            <label>Rol</label>
            <select
              value={filtroRol}
              onChange={(e) => { setFiltroRol(e.target.value); setPagina(1); }}
            >
              <option value="">Todos los roles</option>
              <option value="Administrador">Administrador</option>
              <option value="Cajero">Cajero</option>
              <option value="Cocinero">Cocinero</option>
              <option value="Mesero">Mesero</option>
              <option value="Cliente">Cliente</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0, minWidth: 220 }}>
            <label>Nombre</label>
            <input
              type="text"
              placeholder="Filtrar por nombre..."
              value={filtroNombre}
              onChange={(e) => { setFiltroNombre(e.target.value); setPagina(1); }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0, minWidth: 150 }}>
            <label>Mostrar</label>
            <select
              value={porPagina}
              onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1); }}
            >
              {OPCIONES_POR_PAGINA.map((n) => (
                <option key={n} value={n}>{n} por página</option>
              ))}
            </select>
          </div>

          {hayFiltros && (
            <button type="button" className="btn-cancel" onClick={limpiarFiltros} style={{ height: 42 }}>
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="meta-bar">
        <span>{filtered.length} usuario{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <AdminLoading texto="Cargando usuarios" subtexto="Listando tu equipo" />
      ) : (
        <>
        <div className="tabla-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Rol</th>
                <th className="th-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                  <td style={{ fontWeight: 600, color: 'var(--text-600)' }}>{u.id}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar nombre={u.nombre} apellido={u.apellido} estado={u.estado} />
                      <span>{u.nombre} {u.apellido}</span>
                    </div>
                  </td>
                  <td>{u.correo}</td>
                  <td>{u.telefono || '—'}</td>
                  <td><span className={`badge ${badgeClass(u.estado)}`}>{u.estado}</span></td>
                  <td><span className="badge badge-info">{u.rol?.nombre ?? '—'}</span></td>
                  <td className="td-acciones">
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button className="btn-icon btn-icon-edit btn-accion" onClick={() => openEdit(u)} title="Editar">Editar</button>
                      <button className="btn-icon btn-icon-del btn-accion" onClick={() => del(u.id)} title="Eliminar">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {(filtered.length === 0 && (items.length > 0)) && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron usuarios</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 18 }}>
            <button
              type="button"
              className="btn-cancel"
              disabled={paginaActual <= 1}
              onClick={() => setPagina(paginaActual - 1)}
            >
              Anterior
            </button>
            <span style={{ fontSize: 14, color: 'var(--text-600)' }}>
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              type="button"
              className="btn-cancel"
              disabled={paginaActual >= totalPaginas}
              onClick={() => setPagina(paginaActual + 1)}
            >
              Siguiente
            </button>
          </div>
        )}

        </>
      )}

      {modal && sel && (
        <div className="modal-overlay open" onClick={() => setModal(false)}>
          <div className="modal-box" style={{ maxWidth: 560, padding: '28px 32px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 18, paddingBottom: 12 }}>Editar Usuario</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Nombre <span className="mn-req">*</span></label>
                <input
                  style={bordeError(errores.nombre)}
                  value={nombre}
                  maxLength={50}
                  placeholder="Ej. Alejandro"
                  onChange={(e) => setNombre(soloLetras(e.target.value))}
                  onBlur={() => setNombre(formatearNombre(nombre))}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Apellido <span className="mn-req">*</span></label>
                <input
                  style={bordeError(errores.apellido)}
                  value={apellido}
                  maxLength={50}
                  placeholder="Ej. Florez"
                  onChange={(e) => setApellido(soloLetras(e.target.value))}
                  onBlur={() => setApellido(formatearNombre(apellido))}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Correo <span className="mn-req">*</span></label>
              <input
                style={bordeError(errores.correo)}
                type="email"
                value={correo}
                maxLength={150}
                placeholder="correo@ejemplo.com"
                onChange={(e) => setCorreo(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>
                Nueva contraseña{' '}
                <span style={{ color: 'var(--text-400)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                  (opcional)
                </span>
              </label>

              <div style={{ position: 'relative' }}>
                <input
                  style={{ paddingRight: 70, ...bordeError(errores.password) }}
                  type={verPass ? 'text' : 'password'}
                  value={password}
                  maxLength={64}
                  autoComplete="new-password"
                  placeholder="Dejar vacío para no cambiarla"
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setVerPass((v) => !v)}
                  aria-label={verPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={verPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: 0.5,
                    color: 'var(--text-600)',
                  }}
                >
                  {verPass ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              <div
                className={`barra-contrasena ${claseBarra}`}
                role="progressbar"
                aria-label="Requisitos de la contraseña"
                aria-valuemin={0}
                aria-valuemax={requisitos.length}
                aria-valuenow={requisitosCumplidos}
                style={{ marginTop: 10 }}
              >
                <span className="barra-contrasena-fill" style={{ width: `${porcentajeBarra}%` }} />
              </div>
              <ul className="requisitos" style={{ marginTop: 10 }}>
                {requisitos.map((r) => (
                  <li key={r.id} className={`requisito${r.cumple ? '✅' : '❌'}`}>
                    <span aria-hidden="true">{r.cumple ? '✅' : '❌'}</span>
                    {r.texto}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Rol <span className="mn-req">*</span></label>
                <select style={bordeError(errores.rol)} value={rol} onChange={(e) => setRol(e.target.value)}>
                  <option value="">Seleccionar rol...</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Cajero">Cajero</option>
                  <option value="Cocinero">Cocinero</option>
                  <option value="Mesero">Mesero</option>
                  <option value="Cliente">Cliente</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Estado <span className="mn-req">*</span></label>
                <select style={bordeError(errores.estado)} value={estado} onChange={(e) => setEstado(e.target.value)}>
                  <option value="">Seleccionar estado...</option>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="Suspendido">Suspendido</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={guardar}>Actualizar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}