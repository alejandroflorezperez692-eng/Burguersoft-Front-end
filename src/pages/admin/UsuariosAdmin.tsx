import { useEffect, useState, type CSSProperties } from 'react';
import apiClient from '../../api/client';
import { useToast } from '../../components/Toast';
import AdminLoading from '../../components/AdminLoading';
import '../../styles/nu-admin.css';
import { useEscape } from '../../hooks/useEscape';
import { useAuth } from '../../hooks/useAuth';
import { mensajeError } from '../../utils/errores';
import SelectOscuro from '../../components/SelectOscuro';

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

type ProblemaNombre = 'vacio' | 'corto' | 'largo' | 'caracteres' | 'repetidas' | 'sin_vocales';

const problemaNombre = (v: string): ProblemaNombre | null => {
  const t = limpiarEspacios(v);
  if (t.length === 0) return 'vacio';
  if (t.length < 2) return 'corto';
  if (t.length > 50) return 'largo';
  if (!NOMBRE_REGEX.test(t)) return 'caracteres';
  if (/(\p{L})\1{2,}/iu.test(t)) return 'repetidas';
  if (!/[aeiouáéíóúüy]/i.test(t)) return 'sin_vocales';
  return null;
};

const textosNombre = (p: ProblemaNombre, campo: 'nombre' | 'apellido'): { msg: string; toast: string } => {
  const el = campo === 'nombre' ? 'el nombre' : 'el apellido';
  const El = campo === 'nombre' ? 'El nombre' : 'El apellido';
  switch (p) {
    case 'vacio':      return { msg: `Falta ${el}`, toast: `Falta escribir ${el}` };
    case 'corto':      return { msg: 'Debe tener al menos 2 letras', toast: `${El} debe tener al menos 2 letras` };
    case 'largo':      return { msg: 'Máximo 50 caracteres', toast: `${El} no puede pasar de 50 caracteres` };
    case 'caracteres': return { msg: 'Solo letras, sin números ni símbolos', toast: `${El} solo puede llevar letras, sin números ni símbolos` };
    case 'repetidas':  return { msg: 'Repite la misma letra 3 veces seguidas', toast: `${El} no puede repetir la misma letra 3 veces seguidas` };
    default:           return { msg: 'No parece un nombre real', toast: `${El} no parece real: revisa que esté bien escrito` };
  }
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

  const [q, setQ] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroNombre, setFiltroNombre] = useState('');

  const { showToast, confirmar } = useToast();
  const { user: sesion } = useAuth();

  const hayFiltros = q !== '' || filtroRol !== '' || filtroNombre !== '';

  const limpiarFiltros = () => {
    setQ('');
    setFiltroRol('');
    setFiltroNombre('');
    setPagina(1);
  };

const load = async (silencioso = false) => {
  if (!silencioso) setLoading(true);
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
    { id: 'largo',     texto: 'Mínimo 8 caracteres',                 corto: 'mínimo 8 caracteres', cumple: password.length >= 8 },
    { id: 'mayuscula', texto: 'Al menos una mayúscula',              corto: 'una mayúscula',       cumple: /[A-Z]/.test(password) },
    { id: 'numero',    texto: 'Al menos un número',                  corto: 'un número',           cumple: /\d/.test(password) },
    { id: 'simbolo',   texto: 'Al menos un símbolo (@, #, $, etc.)', corto: 'un símbolo',          cumple: /[^A-Za-z0-9\s]/.test(password) },
  ];

  const requisitosCumplidos = requisitos.filter((r) => r.cumple).length;
  const claseBarra =
    requisitosCumplidos === requisitos.length ? 'verde'
    : requisitosCumplidos >= 2 ? 'amarillo'
    : 'rojo';
  const porcentajeBarra = (requisitosCumplidos / requisitos.length) * 100;

  const errores = {
    nombre: problemaNombre(nombre) !== null,
    apellido: problemaNombre(apellido) !== null,
    correo: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim()),
    password: password !== '' && requisitosCumplidos < requisitos.length,
    rol: !rol,
    estado: !estado,
  };

  const bordeError = (malo: boolean): CSSProperties | undefined =>
    intentado && malo ? { borderColor: 'var(--danger)' } : undefined;

  type CampoError = keyof typeof errores;

  const listaErrores = (): { campo: CampoError; msg: string; toast: string }[] => {
    const out: { campo: CampoError; msg: string; toast: string }[] = [];
    const pNombre = problemaNombre(nombre);
    if (pNombre) out.push({ campo: 'nombre', ...textosNombre(pNombre, 'nombre') });
    const pApellido = problemaNombre(apellido);
    if (pApellido) out.push({ campo: 'apellido', ...textosNombre(pApellido, 'apellido') });
    if (errores.correo) {
      out.push(correo.trim() === ''
        ? { campo: 'correo', msg: 'Falta el correo', toast: 'Falta escribir el correo' }
        : { campo: 'correo', msg: 'El correo no es válido', toast: 'El correo no es válido: debe tener la forma nombre@dominio.com' });
    }
    if (errores.password) {
      const faltan = requisitos.filter((r) => !r.cumple).map((r) => r.corto).join(', ');
      out.push({ campo: 'password', msg: `Falta: ${faltan}`, toast: `La contraseña no cumple los requisitos, falta: ${faltan}` });
    }
    if (errores.rol) out.push({ campo: 'rol', msg: 'Falta elegir el rol', toast: 'Falta elegir el rol del usuario' });
    if (errores.estado) out.push({ campo: 'estado', msg: 'Falta elegir el estado', toast: 'Falta elegir el estado del usuario' });
    return out;
  };

  const errs = listaErrores();

  const inv = (campo: CampoError): 'true' | undefined =>
    intentado && errs.some((e) => e.campo === campo) ? 'true' : undefined;

  const msgCampo = (campo: CampoError) => {
    const e = errs.find((x) => x.campo === campo);
    return intentado && e
      ? <small style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600, marginTop: 4, display: 'block' }}>{e.msg}</small>
      : null;
  };

  const guardar = async () => {
    if (!sel) return;
    setIntentado(true);
    if (errs.length > 0) {
      const resto = errs.length - 1;
      showToast(
        resto === 0 ? errs[0].toast : `${errs[0].toast} (y ${resto} ${resto === 1 ? 'dato más' : 'datos más'})`,
        true,
      );
      setTimeout(() => {
        const primero = document.querySelector('[data-invalido="true"]') as HTMLElement | null;
        primero?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
      return;
    }

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
      load(true);
    } catch (e: unknown) {
      showToast(mensajeError(e, 'No se pudo actualizar el usuario'), true);
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
    } catch (e: unknown) {
      showToast(mensajeError(e, 'No se pudo eliminar el usuario'), true);
    }
  };

  const alternarEstado = async (u: Usuario) => {
    if (u.id === sesion?.id) {
      showToast('No puedes inactivar tu propia cuenta.', true);
      return;
    }
    const esAdmin = /admin/i.test(u.rol?.nombre ?? '');
    const activosAdmin = items.filter(
      (x) => x.estado === 'Activo' && /admin/i.test(x.rol?.nombre ?? ''),
    );
    if (u.estado === 'Activo' && esAdmin && activosAdmin.length <= 1) {
      showToast('Debe existir al menos un administrador activo.', true);
      return;
    }

    const inactivando = u.estado === 'Activo';
    const nuevo = inactivando ? 'Inactivo' : 'Activo';
    const nombreCompleto = `${u.nombre} ${u.apellido ?? ''}`.trim();
    const ok = await confirmar(
      inactivando
        ? `¿Inactivar a "${nombreCompleto}"? No podrá iniciar sesión hasta que lo actives de nuevo.`
        : `¿Activar a "${nombreCompleto}"? Volverá a poder iniciar sesión.`,
      inactivando ? 'Sí, inactivar' : 'Sí, activar',
      inactivando,
    );
    if (!ok) return;

    try {
      await apiClient.put(`/usuarios/${u.id}`, {
        nombre: u.nombre,
        apellido: u.apellido ?? '',
        email: u.correo,
        rol: u.rol?.nombre ?? '',
        estado: nuevo,
      });
      showToast(`Usuario ${inactivando ? 'inactivado' : 'activado'} correctamente`);
      load();
    } catch (e: any) {
      const errs = e?.response?.data?.errors;
      const msg =
        (errs && (Object.values(errs).flat()[0] as string)) ||
        e?.response?.data?.error ||
        'No se pudo actualizar el estado del usuario';
      showToast(msg, true);
    }
  };

  useEscape([
    [modal && !!sel, () => setModal(false)],
  ]);

  return (
    <div className="page-inner usuarios-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p className="subtitulo">Administra los usuarios del sistema</p>
        </div>
      </div>


    
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
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

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 190 }}>
            <label>Rol</label>
            <SelectOscuro
              value={filtroRol}
              onChange={(e) => { setFiltroRol(e.target.value); setPagina(1); }}
            >
              <option value="">Todos los roles</option>
              <option value="Administrador">Administrador</option>
              <option value="Cajero">Cajero</option>
              <option value="Cocinero">Cocinero</option>
              <option value="Mesero">Mesero</option>
              <option value="Cliente">Cliente</option>
            </SelectOscuro>
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
            <SelectOscuro
              value={porPagina}
              onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1); }}
            >
              {OPCIONES_POR_PAGINA.map((n) => (
                <option key={n} value={n}>{n} por página</option>
              ))}
            </SelectOscuro>
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
                      <button className="btn-icon btn-icon-edit btn-accion" onClick={() => openEdit(u)} title="Editar" data-tooltip="Editar">Editar</button>
                      <button className="btn-icon btn-icon-del btn-accion" onClick={() => del(u.id)} title="Eliminar" data-tooltip="Eliminar">Eliminar</button>

                      <button
                        className={`btn-icon btn-icon-estado btn-accion ${u.estado === 'Activo' ? 'estado-inactivar' : 'estado-activar'}`}
                        onClick={() => alternarEstado(u)}
                        title={u.estado === 'Activo' ? 'Inactivar cuenta' : 'Activar cuenta'}
                      >
                        {u.estado === 'Activo' ? 'Inactivar' : 'Activar'}
                      </button>
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
          <button type="button" className="modal-x" onClick={() => setModal(false)} aria-label="Cerrar">×</button>
          <h2 style={{ marginBottom: 18, paddingBottom: 12 }}>Editar Usuario</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }} data-invalido={inv('nombre')}>
                <label>Nombre <span className="mn-req">*</span></label>
                <input
                  style={bordeError(errores.nombre)}
                  value={nombre}
                  maxLength={50}
                  placeholder="Ej. Alejandro"
                  onChange={(e) => setNombre(soloLetras(e.target.value))}
                  onBlur={() => setNombre(formatearNombre(nombre))}
                />
                {msgCampo('nombre')}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }} data-invalido={inv('apellido')}>
                <label>Apellido <span className="mn-req">*</span></label>
                <input
                  style={bordeError(errores.apellido)}
                  value={apellido}
                  maxLength={50}
                  placeholder="Ej. Florez"
                  onChange={(e) => setApellido(soloLetras(e.target.value))}
                  onBlur={() => setApellido(formatearNombre(apellido))}
                />
                {msgCampo('apellido')}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 14 }} data-invalido={inv('correo')}>
              <label>Correo <span className="mn-req">*</span></label>
              <input
                style={bordeError(errores.correo)}
                type="email"
                value={correo}
                maxLength={150}
                placeholder="correo@ejemplo.com"
                onChange={(e) => setCorreo(e.target.value)}
              />
              {msgCampo('correo')}
            </div>

            <div className="form-group" style={{ marginBottom: 14 }} data-invalido={inv('password')}>
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
              {msgCampo('password')}

                {true && (
                <>
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
                      <li key={r.id} className={`requisito${r.cumple ? ' cumple' : ''}`}>
                        <span aria-hidden="true">{r.cumple ? '✅' : '❌'}</span>
                        {r.texto}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }} data-invalido={inv('rol')}>
                <label>Rol <span className="mn-req">*</span></label>
                <SelectOscuro style={bordeError(errores.rol)} value={rol} onChange={(e) => setRol(e.target.value)}>
                  <option value="">Seleccionar rol...</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Cajero">Cajero</option>
                  <option value="Cocinero">Cocinero</option>
                  <option value="Mesero">Mesero</option>
                  <option value="Cliente">Cliente</option>
                </SelectOscuro>
                {msgCampo('rol')}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }} data-invalido={inv('estado')}>
                <label>Estado <span className="mn-req">*</span></label>
                <SelectOscuro style={bordeError(errores.estado)} value={estado} onChange={(e) => setEstado(e.target.value)}>
                  <option value="">Seleccionar estado...</option>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="Suspendido">Suspendido</option>
                </SelectOscuro>
                {msgCampo('estado')}
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