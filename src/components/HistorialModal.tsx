import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import apiClient from '../api/client';

interface Movimiento {
  id: number;
  usuario_id: number;
  nombre?: string;
  apellido?: string;
  rol?: string | null;
  modulo: string;
  descripcion: string;
  fecha: string;
}

type Respuesta = Movimiento[] | { data?: Movimiento[] };
type Accion = 'crear' | 'editar' | 'eliminar' | 'otro';

interface Item {
  mov: Movimiento;
  repetidos: number;
}

const POR_PAGINA = 50;
const ALTO = 38;

/** Deduce el tipo de acción a partir del texto de la descripción. */
function tipoAccion(desc: string): Accion {
  const d = (desc ?? '').toLowerCase();
  if (/elimin|borr|anul|cancel|desactiv/.test(d)) return 'eliminar';
  if (/registr|cre[óo]|agreg|a[ñn]adi/.test(d)) return 'crear';
  if (/actualiz|edit|modific|cambi|guard/.test(d)) return 'editar';
  return 'otro';
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** Clave de día local (YYYY-MM-DD), para comparar con <input type="date"> */
function claveDia(f: string): string {
  const d = new Date(f);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
}

function hoyClave(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDias);
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
}

function etiquetaDia(clave: string, fecha: string): string {
  if (clave === hoyClave(0)) return 'Hoy';
  if (clave === hoyClave(1)) return 'Ayer';
  const txt = new Date(fecha).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

const fmtHora = (f: string) =>
  f ? new Date(f).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';

const fmtCompleta = (f: string) =>
  f
    ? new Date(f).toLocaleString('es-CO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '';

const nombreDe = (m: Movimiento) => [m.nombre, m.apellido].filter(Boolean).join(' ') || 'Usuario';

const ctl: CSSProperties = {
  height: ALTO,
  boxSizing: 'border-box',
  padding: '0 12px',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 13,
  backgroundColor: 'var(--surface)',
  color: 'var(--text-900)',
  fontFamily: 'inherit',
  outline: 'none',
};

const selectCtl: CSSProperties = {
  ...ctl,
  width: '100%',
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  paddingRight: 34,
  cursor: 'pointer',
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' fill='none' stroke='%238a7a6a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  backgroundSize: '12px',
};

const etiquetaCtl: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-400)',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const tarjeta: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 14,
};

/** Botones de rango rápido (Hoy, 7 días, 30 días, Todo) */
function chip(activo: boolean): CSSProperties {
  return {
    height: ALTO,
    padding: '0 16px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    border: '1px solid ' + (activo ? 'var(--brand)' : 'var(--border)'),
    background: activo ? 'var(--brand)' : 'var(--surface)',
    color: activo ? '#fff' : 'var(--text-900)',
    transition: 'all .15s',
  };
}

// La prop onVolver se mantiene en el tipo para no romper ConfiguracionAdmin,
// pero ya no se usa porque se quitó el botón "Volver".
export default function HistorialPage(_props: { onVolver?: () => void }) {
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [q, setQ] = useState('');
  const [modulo, setModulo] = useState('');
  const [usuario, setUsuario] = useState('');
  const [rol, setRol] = useState('');
  const [accion, setAccion] = useState<'' | Accion>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const [agrupar, setAgrupar] = useState(true);

  const cargar = () => {
    setLoading(true);
    setError(false);
    apiClient
      .get<Respuesta>('/reportes/historial')
      .then(({ data }) => setMovs(Array.isArray(data) ? data : data?.data ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let vivo = true;
    apiClient
      .get<Respuesta>('/reportes/historial')
      .then(({ data }) => {
        if (vivo) setMovs(Array.isArray(data) ? data : data?.data ?? []);
      })
      .catch(() => {
        if (vivo) setError(true);
      })
      .finally(() => {
        if (vivo) setLoading(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    setMostrar(POR_PAGINA);
  }, [q, modulo, usuario, rol, accion, desde, hasta]);

  // Siempre del más reciente al más antiguo
  const ordenados = useMemo(
    () => [...movs].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [movs],
  );

  const modulos = useMemo(
    () => Array.from(new Set(movs.map((m) => m.modulo).filter(Boolean))).sort(),
    [movs],
  );

  const roles = useMemo(
    () => Array.from(new Set(movs.map((m) => m.rol).filter((r): r is string => !!r))).sort(),
    [movs],
  );

  const usuarios = useMemo(() => {
    const mapa = new Map<number, string>();
    movs.forEach((m) => {
      if (!mapa.has(m.usuario_id)) mapa.set(m.usuario_id, nombreDe(m));
    });
    return Array.from(mapa.entries()).sort((a, b) => a[1].localeCompare(b[1], 'es'));
  }, [movs]);

  const filtrados = useMemo(() => {
    const busqueda = q.toLowerCase().trim();
    return ordenados.filter((m) => {
      if (modulo && m.modulo !== modulo) return false;
      if (usuario && String(m.usuario_id) !== usuario) return false;
      if (rol && m.rol !== rol) return false;
      if (accion && tipoAccion(m.descripcion) !== accion) return false;
      const dia = claveDia(m.fecha);
      if (desde && dia < desde) return false;
      if (hasta && dia > hasta) return false;
      if (!busqueda) return true;
      const texto = `${nombreDe(m)} ${m.rol ?? ''} ${m.modulo} ${m.descripcion}`.toLowerCase();
      return texto.includes(busqueda);
    });
  }, [ordenados, q, modulo, usuario, rol, accion, desde, hasta]);

  // Junta movimientos idénticos consecutivos (mismo usuario, módulo, texto y minuto)
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    let ultimaClave = '';
    filtrados.forEach((m) => {
      const minuto = Math.floor(new Date(m.fecha).getTime() / 60000);
      const clave = `${m.usuario_id}|${m.modulo}|${m.descripcion}|${minuto}`;
      if (clave === ultimaClave && out.length) {
        out[out.length - 1].repetidos += 1;
      } else {
        out.push({ mov: m, repetidos: 1 });
        ultimaClave = clave;
      }
    });
    return out;
  }, [filtrados]);

  const visibles = items.slice(0, mostrar);

  const grupos = useMemo(() => {
    if (!agrupar) return [{ clave: 'todos', etiqueta: '', items: visibles }];
    const out: { clave: string; etiqueta: string; items: Item[] }[] = [];
    visibles.forEach((it) => {
      const clave = claveDia(it.mov.fecha);
      const ult = out[out.length - 1];
      if (ult && ult.clave === clave) ult.items.push(it);
      else out.push({ clave, etiqueta: etiquetaDia(clave, it.mov.fecha), items: [it] });
    });
    return out;
  }, [visibles, agrupar]);

  const filtrosActivos = [q.trim(), modulo, usuario, rol, accion, desde, hasta].filter(Boolean).length;

  const limpiar = () => {
    setQ('');
    setModulo('');
    setUsuario('');
    setRol('');
    setAccion('');
    setDesde('');
    setHasta('');
  };

  const rangoRapido = (dias: number | null) => {
    if (dias === null) {
      setDesde('');
      setHasta('');
    } else {
      setDesde(hoyClave(dias));
      setHasta(hoyClave(0));
    }
  };

  const esRango = (dias: number | null) =>
    dias === null ? !desde && !hasta : desde === hoyClave(dias) && hasta === hoyClave(0);

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', padding: '24px 32px 48px' }}>
      <style>{`
        .hist-ctl:focus {
          border-color: var(--brand) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 20%, transparent);
        }
        .hist-ctl:hover { border-color: var(--brand); }
      `}</style>

      {/* Encabezado */}
      <div style={{ marginBottom: 18 }}>
        <h2
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 26,
            fontWeight: 700,
            margin: 0,
            color: 'var(--text-900)',
          }}
        >
          Historial de movimientos
        </h2>
      </div>

      {/* Filtros */}
      <div
        style={{
          ...tarjeta,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <input
          className="hist-ctl"
          style={{ ...ctl, width: '100%' }}
          placeholder="Buscar por usuario, rol, apartado o acción..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 14,
          }}
        >
          <label style={etiquetaCtl}>
            Apartado
            <select
              className="hist-ctl"
              style={selectCtl}
              value={modulo}
              onChange={(e) => setModulo(e.target.value)}
            >
              <option value="">Todos</option>
              {modulos.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label style={etiquetaCtl}>
            Usuario
            <select
              className="hist-ctl"
              style={selectCtl}
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
            >
              <option value="">Todos</option>
              {usuarios.map(([id, nombre]) => (
                <option key={id} value={String(id)}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>

          <label style={etiquetaCtl}>
            Rol
            <select
              className="hist-ctl"
              style={selectCtl}
              value={rol}
              onChange={(e) => setRol(e.target.value)}
            >
              <option value="">Todos</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <label style={etiquetaCtl}>
            Tipo de acción
            <select
              className="hist-ctl"
              style={selectCtl}
              value={accion}
              onChange={(e) => setAccion(e.target.value as '' | Accion)}
            >
              <option value="">Todas</option>
              <option value="crear">Creaciones</option>
              <option value="editar">Ediciones</option>
              <option value="eliminar">Eliminaciones</option>
              <option value="otro">Otras</option>
            </select>
          </label>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            paddingTop: 14,
            borderTop: '1px solid var(--border)',
          }}
        >
          <label style={etiquetaCtl}>
            Desde
            <input
              className="hist-ctl"
              type="date"
              style={ctl}
              value={desde}
              max={hasta || undefined}
              onChange={(e) => setDesde(e.target.value)}
            />
          </label>
          <label style={etiquetaCtl}>
            Hasta
            <input
              className="hist-ctl"
              type="date"
              style={ctl}
              value={hasta}
              min={desde || undefined}
              onChange={(e) => setHasta(e.target.value)}
            />
          </label>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={chip(esRango(0))} onClick={() => rangoRapido(0)}>
              Hoy
            </button>
            <button type="button" style={chip(esRango(7))} onClick={() => rangoRapido(7)}>
              7 días
            </button>
            <button type="button" style={chip(esRango(30))} onClick={() => rangoRapido(30)}>
              30 días
            </button>
            <button type="button" style={chip(esRango(null))} onClick={() => rangoRapido(null)}>
              Todo
            </button>
          </div>

          <label
            style={{
              marginLeft: 'auto',
              height: ALTO,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--text-900)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={agrupar}
              onChange={(e) => setAgrupar(e.target.checked)}
              style={{ accentColor: 'var(--brand)', width: 16, height: 16, cursor: 'pointer' }}
            />
            Agrupar por día
          </label>
        </div>
      </div>

      {/* Contador */}
      <div
        style={{
          margin: '0 4px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-400)' }}>
          {filtrados.length} movimiento{filtrados.length !== 1 ? 's' : ''}
          {filtrosActivos > 0 && movs.length !== filtrados.length ? ` de ${movs.length}` : ''}
        </p>
        {filtrosActivos > 0 && (
          <button
            type="button"
            onClick={limpiar}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--brand)',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            Limpiar {filtrosActivos} filtro{filtrosActivos !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Lista */}
      <div style={{ ...tarjeta, padding: '0 20px 20px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>Cargando historial...</p>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <p style={{ color: 'var(--danger)', margin: '0 0 12px' }}>No se pudo cargar el historial.</p>
            <button type="button" className="btn-cancel" onClick={cargar}>
              Reintentar
            </button>
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <p style={{ color: 'var(--text-400)', margin: '0 0 12px' }}>No hay movimientos para mostrar.</p>
            {filtrosActivos > 0 && (
              <button type="button" className="btn-cancel" onClick={limpiar}>
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {grupos.map((g) => (
              <section key={g.clave}>
                {agrupar && (
                  <h4
                    style={{
                      margin: 0,
                      padding: '18px 0 6px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--text-400)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {g.etiqueta}
                  </h4>
                )}
                {g.items.map(({ mov: m, repetidos }) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '10px 4px',
                      borderBottom: '1px solid var(--border)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      className="badge badge-info"
                      style={{ flexShrink: 0, minWidth: 92, textAlign: 'center' }}
                    >
                      {m.modulo ?? '—'}
                    </span>

                    <span style={{ flex: 1, minWidth: 200, fontSize: 13, color: 'var(--text-900)' }}>
                      <strong>{nombreDe(m)}</strong>
                      {m.rol && <span style={{ color: 'var(--text-400)' }}> ({m.rol})</span>}
                      {' — '}
                      {m.descripcion ?? '—'}
                      {repetidos > 1 && (
                        <span
                          title={`Este movimiento se repitió ${repetidos} veces en el mismo minuto`}
                          style={{
                            marginLeft: 8,
                            padding: '1px 7px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                            background: 'var(--border)',
                            color: 'var(--text-900)',
                          }}
                        >
                          ×{repetidos}
                        </span>
                      )}
                    </span>

                    <span
                      title={fmtCompleta(m.fecha)}
                      style={{ flexShrink: 0, fontSize: 11, color: 'var(--text-400)', textAlign: 'right' }}
                    >
                      {agrupar
                        ? fmtHora(m.fecha)
                        : new Date(m.fecha).toLocaleString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                    </span>
                  </div>
                ))}
              </section>
            ))}

            {items.length > mostrar && (
              <div style={{ textAlign: 'center', paddingTop: 16 }}>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setMostrar((n) => n + POR_PAGINA)}
                >
                  Ver más ({items.length - mostrar} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}