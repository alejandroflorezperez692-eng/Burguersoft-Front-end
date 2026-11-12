import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import apiClient from '../../api/client';
import AdminLoading from '../../components/AdminLoading';

import Paginacion, { paginar } from '../../components/Paginacion';
import { useToast } from '../../components/Toast';
import '../../styles/nu-admin.css';
import { useEscape } from '../../hooks/useEscape';
import { mensajeError } from '../../utils/errores';
import ComprasSugeridas, { type ItemSugerido } from '../../components/ComprasSugeridas';
import SelectOscuro from '../../components/SelectOscuro';
import { useAuth } from '../../hooks/useAuth';
import { normalizarRol } from '../../utils/roles';

interface DetalleCompra {
  id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  materia_prima_id: number;
  marca_id: number;
  materia_prima?: { nombre: string; unidad_medida?: string | null };
  marca?: { nombre: string };
}

type EstadoCompra = 'Borrador' | 'En revisión' | 'Finalizada';

interface Compra {
  id: number;
  fecha: string;
  metodo_pago: string;
  numero_factura?: string | null;
  tipo_factura?: string | null;
  valor_total: number;
  estado: EstadoCompra;
  detalles: DetalleCompra[];
}

const badgeEstado = (e: string) =>
  e === 'Finalizada' ? 'badge-success' : e === 'En revisión' ? 'badge-info' : 'badge-warning';

interface MateriaPrima {
  id: number;
  nombre: string;
  valor: number;
  tipo?: string | null;
  unidad_medida?: string | null;
  estado?: string | null;
}
interface Marca { id: number; nombre: string; }

interface Linea {
  materia_prima_id: number | null;
  cantidad: string;
  precio_unitario: string;
  marca_id: number;
  nombre_nuevo: string;
  tipo: string;
  unidad_medida: string;
}
interface ItemIA {
  descripcion: string;
  materia_prima_id: number | null;
  nombre_nuevo: string | null;
  unidad_medida: string | null;
  cantidad: number | null;
  precio_total: number | null;
}

interface RespuestaIA {
  fecha: string | null;
  metodo_pago: string | null;
  marca_id: number | null;
  proveedor_texto: string | null;
  items: ItemIA[];
  total_factura: number | null;
  suma_items: number;
  cuadra: boolean | null;
  observaciones: string | null;
}

interface EventoVoz {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

interface Reconocimiento {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: EventoVoz) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const METODOS = ['Efectivo', 'Nequi', 'Daviplata'];
const TIPOS_FACTURA = ['Factura electrónica', 'Factura de venta', 'Tiquete POS', 'Cuenta de cobro', 'Remisión'];
const UNIDADES = ['Kg', 'Gramos', 'Libras', 'Litros', 'Mililitros', 'Unidades', 'Paquetes', 'Cajas', 'Bolsas', 'Botellas', 'Latas'];
const soloDigitos = (v: string): string => v.replace(/\D/g, '');
const miles = (v: string): string => v.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const estiloEtiqueta: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-400)',
};

type OpcionDesplegable = string | { value: string; label: string };

function SelectorFechaCompras({ value, onChange, min, max }: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) {
 const [, setModoOscuro] = useState(() => document.body.classList.contains('dark-mode'));
  const [abierto, setAbierto] = useState(false);
  const fechaInicial = value ? new Date(`${value}T00:00:00`) : new Date();
  const [mesVisible, setMesVisible] = useState(() => new Date(fechaInicial.getFullYear(), fechaInicial.getMonth(), 1));
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new MutationObserver(() => setModoOscuro(document.body.classList.contains('dark-mode')));
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const cerrarFuera = (event: MouseEvent) => {
      if (!contenedorRef.current?.contains(event.target as Node)) setAbierto(false);
    };
    const cerrarEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', cerrarFuera);
    document.addEventListener('keydown', cerrarEscape);
    return () => {
      document.removeEventListener('mousedown', cerrarFuera);
      document.removeEventListener('keydown', cerrarEscape);
    };
  }, [abierto]);

  

  const anio = mesVisible.getFullYear();
  const mes = mesVisible.getMonth();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const primerDia = (new Date(anio, mes, 1).getDay() + 6) % 7;
  const tituloMes = mesVisible.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const indiceMes = anio * 12 + mes;
  const mesMinimo = min ? Number(min.slice(0, 4)) * 12 + Number(min.slice(5, 7)) - 1 : -Infinity;
  const mesMaximo = max ? Number(max.slice(0, 4)) * 12 + Number(max.slice(5, 7)) - 1 : Infinity;
  const textoFecha = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('es-CO')
    : 'dd/mm/aaaa';

  return (
    <div className="compras-date-picker" ref={contenedorRef}>
      <button
        type="button"
        className="compras-date-trigger"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        onClick={() => {
          if (!abierto) {
            const fecha = value ? new Date(`${value}T00:00:00`) : new Date();
            setMesVisible(new Date(fecha.getFullYear(), fecha.getMonth(), 1));
          }
          setAbierto(!abierto);
        }}
      >
        <span>{textoFecha}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      </button>
      {abierto && (
        <div className="compras-calendar" role="dialog" aria-label="Elegir fecha">
          <div className="compras-calendar-header">
            <button type="button" aria-label="Mes anterior" disabled={indiceMes <= mesMinimo} onClick={() => setMesVisible(new Date(anio, mes - 1, 1))}>‹</button>
            <strong>{tituloMes}</strong>
            <button type="button" aria-label="Mes siguiente" disabled={indiceMes >= mesMaximo} onClick={() => setMesVisible(new Date(anio, mes + 1, 1))}>›</button>
          </div>
          <div className="compras-calendar-grid compras-calendar-weekdays" aria-hidden="true">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((dia) => <span key={dia}>{dia}</span>)}
          </div>
          <div className="compras-calendar-grid">
            {Array.from({ length: primerDia }, (_, index) => <span key={`vacio-${index}`} />)}
            {Array.from({ length: diasEnMes }, (_, index) => {
              const dia = index + 1;
              const fecha = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
              const deshabilitada = (!!min && fecha < min) || (!!max && fecha > max);
              return (
                <button
                  type="button"
                  key={fecha}
                  className={value === fecha ? 'selected' : ''}
                  disabled={deshabilitada}
                  aria-pressed={value === fecha}
                  onClick={() => {
                    onChange(fecha);
                    setAbierto(false);
                  }}
                >
                  {dia}
                </button>
              );
            })}
          </div>
          <div className="compras-calendar-footer">
            <button type="button" onClick={() => { onChange(''); setAbierto(false); }}>Borrar</button>
            <button type="button" onClick={() => {
              const hoy = new Date();
              const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
              if ((!min || fecha >= min) && (!max || fecha <= max)) onChange(fecha);
              setAbierto(false);
            }}>Hoy</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Desplegable({ value, onChange, opciones, placeholder = 'Seleccionar...', error = false, className }: {
  value: string;
  onChange: (v: string) => void;
  opciones: OpcionDesplegable[];
  placeholder?: string;
  error?: boolean;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const opcionesNormalizadas = opciones.map((opcion) =>
    typeof opcion === 'string' ? { value: opcion, label: opcion } : opcion,
  );
  const opcionSeleccionada = opcionesNormalizadas.find((opcion) => opcion.value === value);

  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  return (
    <div ref={ref} className={className} style={{ position: 'relative', minWidth: className ? 170 : undefined }}>
      <button
        type="button"
        className={className ? `${className}-trigger` : undefined}
        onClick={() => setAbierto(!abierto)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '11px 14px',
          border: `1.5px solid ${abierto ? 'var(--brand)' : error ? 'var(--danger)' : 'var(--border)'}`,
          borderRadius: 'var(--r-sm)',
          background: 'var(--surface-2)',
          color: value ? 'var(--text-900)' : 'var(--text-400)',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span>{opcionSeleccionada?.label || value || placeholder}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            color: 'var(--text-900)',
            flexShrink: 0,
            transform: abierto ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {abierto && (
        <ul
          className={className ? `${className}-options` : undefined}
          role={className ? 'listbox' : undefined}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            ...(className ? { minWidth: '100%', width: 'max-content', maxWidth: 320 } : { right: 0 }),
            zIndex: 30,
            maxHeight: 220,
            overflowY: 'auto',
            overflowX: 'hidden',
            margin: 0,
            padding: 6,
            listStyle: 'none',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {opcionesNormalizadas.map((o) => (
            <li
              key={o.value}
              className={className ? `${className}-option${o.value === value ? ' selected' : ''}` : undefined}
              role="option"
              aria-selected={o.value === value}
              tabIndex={0}
              onClick={() => { onChange(o.value); setAbierto(false); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange(o.value);
                  setAbierto(false);
                }
              }}
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 14,
                cursor: 'pointer',
                fontWeight: o.value === value ? 700 : 500,
                color: o.value === value ? 'var(--brand)' : 'var(--text-900)',
                background: o.value === value ? 'rgba(232, 130, 26, 0.12)' : 'transparent',
              }}
              onMouseEnter={(e) => { if (o.value !== value) e.currentTarget.style.background = 'rgba(232, 130, 26, 0.08)'; }}
              onMouseLeave={(e) => { if (o.value !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const etiquetaFecha = (clave: string): string => {
  const hoy = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const claveDe = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  const [y, m, d] = clave.split('-').map(Number);
  const larga = new Date(y, m - 1, d).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const texto = larga.charAt(0).toUpperCase() + larga.slice(1);
  if (clave === claveDe(hoy)) return `Hoy · ${texto}`;
  if (clave === claveDe(ayer)) return `Ayer · ${texto}`;
  return texto;
};

const fechaLarga = (fecha: string): string => {
  const [y, m, d] = String(fecha).slice(0, 10).split('-').map(Number);
  const larga = new Date(y, m - 1, d).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return larga.charAt(0).toUpperCase() + larga.slice(1);
};

const pesos = (n: number | string): string => `$${Math.round(Number(n)).toLocaleString('es-CO')}`;

const chipNumero: CSSProperties = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: 999,
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  color: 'var(--text-400)',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.3,
  whiteSpace: 'nowrap',
};

const etiquetaColumna: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  color: 'var(--text-400)',
};

const comprimirImagen = async (archivo: File): Promise<File> => {
  if (!archivo.type.startsWith('image/')) return archivo;
  try {
    const bmp = await createImageBitmap(archivo);
    const escala = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.85));
    return blob ? new File([blob], 'factura.jpg', { type: 'image/jpeg' }) : archivo;
  } catch {
    return archivo;
  }
};

const CLAVE_BORRADOR = 'compra_borrador_local';

export default function ComprasAdmin() {
  const { user } = useAuth();
  // F-021: el cocinero consulta compras y costos, pero no los modifica.
  const soloLectura = normalizarRol(user?.role) === 'cocinero';
  const [items, setItems] = useState<Compra[]>([]);
  const [materias, setMaterias] = useState<MateriaPrima[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);

  const [q, setQ] = useState('');
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [fMetodo, setFMetodo] = useState('');
  const [fInsumo, setFInsumo] = useState('');
  const [fMarca, setFMarca] = useState('');

  // --- Estados de paginación ---
  const DIAS_POR_PAGINA = 15;
  const [pagina, setPagina] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [tipoFactura, setTipoFactura] = useState('');
  const { showToast } = useToast();

  const [lineas, setLineas] = useState<Linea[]>([
    { materia_prima_id: null, cantidad: '', precio_unitario: '', marca_id: 0, nombre_nuevo: '', tipo: '', unidad_medida: '' },
  ]);
  const [modalDetalle, setModalDetalle] = useState<Compra | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [eliminarCompra, setEliminarCompra] = useState<Compra | null>(null);

  const [revisando, setRevisando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [hayBorradorLocal, setHayBorradorLocal] = useState(() => {
    try { return !!localStorage.getItem(CLAVE_BORRADOR); } catch { return false; }
  });
  const sinRed = useRef(false);
  const guardarBorradorRef = useRef<() => void>(() => {});
  const [loading, setLoading] = useState(true);
  const cargado = useRef(false);

  const [escaneando, setEscaneando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; alerta: boolean } | null>(null);
  const [fechaIA, setFechaIA] = useState('');
  const [mostrarDictado, setMostrarDictado] = useState(false);
  const [textoDictado, setTextoDictado] = useState('');
  const [interpretando, setInterpretando] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const vozRef = useRef<{ stop: () => void } | null>(null);
  const inputFactura = useRef<HTMLInputElement>(null);

const load = () => {
  apiClient.get<Compra[]>('/compras')
    .then((r) => setItems(r.data))
    .catch(() => {})
    .finally(() => setLoading(false));

  Promise.all([
    apiClient.get<MateriaPrima[]>('/materias-primas'),
    apiClient.get<Marca[]>('/marcas'),
  ])
    .then(([r2, r3]) => {
      setMaterias(r2.data);
      setMarcas(r3.data);
    })
    .catch(() => {});
};

  useEffect(() => {
    if (cargado.current) return;
    cargado.current = true;
    load();
  }, []);

  useEffect(() => {
    if (!modalDetalle) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalDetalle(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalDetalle]);

  useEffect(() => { setPagina(1); }, [q, fDesde, fHasta, fMetodo, fInsumo, fMarca]);

  const hayFiltros = q !== '' || fDesde !== '' || fHasta !== '' || fMetodo !== '' || fInsumo !== '' || fMarca !== '';

  const limpiarFiltros = () => {
    setQ('');
    setFDesde('');
    setFHasta('');
    setFMetodo('');
    setFInsumo('');
    setFMarca('');
  };

  useEffect(() => {
    if (!showForm || editId) return;
    const vacio = !metodoPago && !numeroFactura && !tipoFactura &&
      lineas.every((l) => !l.materia_prima_id && !l.nombre_nuevo && !l.cantidad && !l.precio_unitario && !l.marca_id);
    if (vacio) return;
    try {
      localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ metodoPago, numeroFactura, tipoFactura, fechaIA, lineas }));
      setHayBorradorLocal(true);
    } catch { }
  }, [showForm, editId, metodoPago, numeroFactura, tipoFactura, fechaIA, lineas]);

  useEffect(() => {
    const alVolver = () => { if (sinRed.current) guardarBorradorRef.current(); };
    window.addEventListener('online', alVolver);
    return () => window.removeEventListener('online', alVolver);
  }, []);

  const materiasOrdenadas = useMemo(
    () => [...materias].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [materias],
  );

  const marcasOrdenadas = useMemo(
    () => [...marcas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [marcas],
  );

  const filtered = useMemo(() => {
    const texto = q.toLowerCase();
    return items.filter((c) => {
      if (texto && !(String(c.id).includes(q) || c.metodo_pago.toLowerCase().includes(texto))) return false;
      const dia = c.fecha.slice(0, 10);
      if (fDesde && dia < fDesde) return false;
      if (fHasta && dia > fHasta) return false;
      if (fMetodo && c.metodo_pago !== fMetodo) return false;
      if (fInsumo && !(c.detalles ?? []).some((d) => d.materia_prima_id === Number(fInsumo))) return false;
      if (fMarca && !(c.detalles ?? []).some((d) => d.marca_id === Number(fMarca))) return false;
      return true;
    });
  }, [items, q, fDesde, fHasta, fMetodo, fInsumo, fMarca]);

  const grupos = Object.entries(
    [...filtered]
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
      .reduce<Record<string, Compra[]>>((acc, c) => {
        const clave = c.fecha.slice(0, 10);
        (acc[clave] = acc[clave] || []).push(c);
        return acc;
      }, {})
  );

  const { visibles: gruposVisibles, paginaActual } = paginar(grupos, pagina, DIAS_POR_PAGINA);

  const addLinea = () => {
    setLineas([...lineas, { materia_prima_id: null, cantidad: '', precio_unitario: '', marca_id: 0, nombre_nuevo: '', tipo: '', unidad_medida: '' }]);
  };

  const removeLinea = (i: number) => {
    setLineas(lineas.filter((_, idx) => idx !== i));
  };

  const updateLinea = (i: number, field: keyof Linea, value: string | number | null) => {
    const copy = [...lineas];
    const antes = copy[i];
    const nueva = { ...antes, [field]: value };

    if (field === 'materia_prima_id' || field === 'cantidad') {
      const autoDe = (l: Linea): string => {
        const m = materias.find((x) => x.id === l.materia_prima_id);
        const c = Number(l.cantidad);
        return m && c > 0 ? String(Math.round(Number(m.valor) * c)) : '';
      };
      if (antes.precio_unitario === '' || antes.precio_unitario === autoDe(antes)) {
        nueva.precio_unitario = autoDe(nueva);
      }
    }

    copy[i] = nueva;
    setLineas(copy);
  };

  const total = lineas.reduce((a, l) => a + (Number(l.precio_unitario) || 0), 0);
  const cerrarForm = () => { setIntentado(false); setShowForm(false); setAviso(null); setFechaIA(''); setEditId(null); setRevisando(false); setConfirmando(false); };

  const abrirNuevo = () => {
    if (showForm) { cerrarForm(); return; }
    setIntentado(false);
    setEditId(null);
    setMetodoPago('');
    setNumeroFactura('');
    setTipoFactura('');
    setFechaIA('');
    setAviso(null);
    setLineas([{ materia_prima_id: null, cantidad: '', precio_unitario: '', marca_id: 0, nombre_nuevo: '', tipo: '', unidad_medida: '' }]);
    setShowForm(true);
  };

  const agregarSugeridas = (sugeridas: ItemSugerido[]) => {
    if (!sugeridas.length) {
      showToast('No hay sugerencias para agregar', true);
      return;
    }
    setIntentado(false);
    setEditId(null);
    setAviso(null);
    setLineas(sugeridas.map((s) => ({
      materia_prima_id: s.materia_id,
      cantidad: String(s.comprar),
      precio_unitario: String(Math.round(s.costo_estimado)),
      marca_id: 0,
      nombre_nuevo: '',
      tipo: '',
      unidad_medida: '',
    })));
    setShowForm(true);
  };

  const abrirEditar = (c: Compra) => {
    setIntentado(false);
    setEditId(c.id);
    setMetodoPago(c.metodo_pago);
    setNumeroFactura(c.numero_factura ?? '');
    setTipoFactura(c.tipo_factura ?? '');
    setFechaIA(c.fecha.slice(0, 10));
    setLineas((c.detalles ?? []).map((d) => ({
      materia_prima_id: d.materia_prima_id,
      cantidad: String(Number(d.cantidad)),
      precio_unitario: String(Math.round(Number(d.subtotal))),
      marca_id: d.marca_id,
      nombre_nuevo: '',
      tipo: '',
      unidad_medida: '',
    })));
    setAviso(null);
    setShowForm(true);
  };

  const dictar = async () => {
    const texto = textoDictado.trim();
    if (!texto) return;
    vozRef.current?.stop();
    setInterpretando(true);
    try {
      const { data } = await apiClient.post<RespuestaIA>('/compras/dictar', { texto }, { timeout: 60000 });

      setLineas(data.items.map((it) => ({
        materia_prima_id: it.materia_prima_id,
        cantidad: it.cantidad ? String(it.cantidad) : '',
        precio_unitario: it.precio_total ? String(Math.round(it.precio_total)) : '',
        marca_id: data.marca_id ?? 0,
        nombre_nuevo: it.materia_prima_id ? '' : (it.nombre_nuevo ?? ''),
        tipo: '',
        unidad_medida: it.materia_prima_id ? '' : (it.unidad_medida ?? ''),
      })));
      setMetodoPago(data.metodo_pago ?? '');
      setFechaIA(data.fecha ?? '');
      setShowForm(true);
      setMostrarDictado(false);
      setTextoDictado('');

      const partes = ['Compra interpretada por Burgi a partir de lo que dijiste. Revisa cada dato antes de registrar.'];
      if (data.fecha) partes.push(`Fecha: ${data.fecha.split('-').reverse().join('/')}.`);
      if (data.observaciones) partes.push(data.observaciones);
      setAviso({ texto: partes.join(' '), alerta: !!data.observaciones });
      showToast('Listo: revisa los datos y registra', false, true);
    } catch (e) {
      showToast(mensajeError(e, 'No se pudo interpretar la compra'), true);
    } finally {
      setInterpretando(false);
    }
  };

  const ventana = window as unknown as {
    SpeechRecognition?: new () => Reconocimiento;
    webkitSpeechRecognition?: new () => Reconocimiento;
  };
  const SpeechRec = ventana.SpeechRecognition || ventana.webkitSpeechRecognition;

  const alternarMicrofono = () => {
    if (escuchando) { vozRef.current?.stop(); return; }
    if (!SpeechRec) return;
    const rec = new SpeechRec();
    rec.lang = 'es-CO';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (ev) => {
      let t = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) t += ev.results[i][0].transcript + ' ';
      }
      if (t.trim()) setTextoDictado((prev) => (prev ? prev.trim() + ' ' : '') + t.trim());
    };
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    vozRef.current = rec;
    rec.start();
    setEscuchando(true);
  };

  const escanear = async (archivo: File) => {
    setEscaneando(true);
    try {
      const listo = await comprimirImagen(archivo);
      const fd = new FormData();
      fd.append('archivo', listo);
      const { data } = await apiClient.post<RespuestaIA>('/compras/escanear', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      setLineas(data.items.map((it) => ({
        materia_prima_id: it.materia_prima_id,
        cantidad: it.cantidad ? String(it.cantidad) : '',
        precio_unitario: it.precio_total ? String(Math.round(it.precio_total)) : '',
        marca_id: data.marca_id ?? 0,
        nombre_nuevo: it.materia_prima_id ? '' : (it.nombre_nuevo ?? ''),
        tipo: '',
        unidad_medida: it.materia_prima_id ? '' : (it.unidad_medida ?? ''),
      })));
      setMetodoPago(data.metodo_pago ?? '');
      setFechaIA(data.fecha ?? '');
      setShowForm(true);

      const partes = ['Factura leída por Burgi. Revisa cada dato antes de registrar.'];
      if (data.fecha) partes.push(`Fecha de la factura: ${data.fecha.split('-').reverse().join('/')}.`);
      if (data.cuadra === false && data.total_factura) {
        partes.push(`El total de la factura ($${data.total_factura.toLocaleString('es-CO')}) no coincide con la suma de los insumos ($${data.suma_items.toLocaleString('es-CO')}): puede ser IVA, un descuento o una línea mal leída.`);
      }
      if (data.observaciones) partes.push(data.observaciones);
      setAviso({ texto: partes.join(' '), alerta: data.cuadra === false || !!data.observaciones });
      showToast('Factura leída por Burgi: revisa los datos y registra', false, true);
    } catch (e) {
      showToast(mensajeError(e, 'No se pudo leer la factura'), true);
    } finally {
      setEscaneando(false);
    }
  };

  const rojo = (malo: boolean): CSSProperties | undefined =>
    intentado && malo
      ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 3px rgba(192, 57, 43, 0.12)' }
      : undefined;

  const errLinea = (l: Linea) => ({
    nombre: l.materia_prima_id === null && !l.nombre_nuevo.trim(),
    cantidad: !(Number(l.cantidad) > 0),
    unidad: l.materia_prima_id === null && !l.unidad_medida.trim(),
    precio: !(Number(l.precio_unitario) > 0),
    marca: !l.marca_id,
  });

  const nombreLinea = (l: Linea, i: number): string => {
    const nombre = materias.find((x) => x.id === l.materia_prima_id)?.nombre ?? l.nombre_nuevo.trim();
    return nombre ? `Insumo ${i + 1} (${nombre})` : `Insumo ${i + 1}`;
  };

  const listaErrores = (): { campo: string; msg: string; toast: string }[] => {
    const out: { campo: string; msg: string; toast: string }[] = [];
    if (!metodoPago) out.push({ campo: 'metodo', msg: 'Falta elegir el método de pago', toast: 'Falta elegir el método de pago (Efectivo, Nequi o Daviplata)' });
    lineas.forEach((l, i) => {
      const e = errLinea(l);
      const add = (campo: string, msg: string, toast: string) =>
        out.push({
          campo: `${campo}-${i}`,
          msg,
          toast: lineas.length > 1 ? `${nombreLinea(l, i)}: ${toast}` : `${toast.charAt(0).toUpperCase()}${toast.slice(1)}`,
        });
      if (e.nombre) add('nombre', 'Falta el nombre del insumo', 'falta escribir el nombre del insumo nuevo');
      if (e.cantidad) {
        if (l.cantidad.trim() === '') add('cantidad', 'Falta la cantidad', 'falta escribir la cantidad');
        else add('cantidad', 'Debe ser mayor a 0', `la cantidad es ${l.cantidad} y debe ser mayor a 0`);
      }
      if (e.unidad) add('unidad', 'Falta elegir la unidad', 'falta elegir la unidad de medida (Kg, Litros, Unidades...)');
      if (e.precio) {
        if (l.precio_unitario.trim() === '') add('precio', 'Falta el precio total', 'falta escribir el precio total');
        else add('precio', 'Debe ser mayor a $0', 'el precio total debe ser mayor a $0');
      }
      if (e.marca) add('marca', 'Falta elegir el proveedor', 'falta elegir el proveedor');
    });
    return out;
  };

  const errMap = Object.fromEntries(listaErrores().map((e) => [e.campo, e.msg]));

  const inv = (campo: string): 'true' | undefined => (intentado && errMap[campo] ? 'true' : undefined);

  const msgCampo = (campo: string) =>
    intentado && errMap[campo]
      ? <small style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600, marginTop: 4, display: 'block' }}>{errMap[campo]}</small>
      : null;

  const validar = (): boolean => {
    const errs = listaErrores();
    if (errs.length === 0) return true;

    const resto = errs.length - 1;
    const resumen = resto === 0
      ? errs[0].toast
      : `${errs[0].toast} (y ${resto} ${resto === 1 ? 'dato más' : 'datos más'})`;
    showToast(resumen, true);

    setTimeout(() => {
      const primero = document.querySelector('[data-invalido="true"]') as HTMLElement | null;
      primero?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);

    return false;
  };

  const irARevision = () => {
    setIntentado(true);
    if (validar()) setRevisando(true);
  };

  const borrarLocal = () => {
    try { localStorage.removeItem(CLAVE_BORRADOR); } catch { }
    setHayBorradorLocal(false);
  };

  const continuarBorradorLocal = () => {
    try {
      const d = JSON.parse(localStorage.getItem(CLAVE_BORRADOR) || 'null');
      if (!d) { borrarLocal(); return; }
      setEditId(null);
      setIntentado(false);
      setMetodoPago(d.metodoPago ?? '');
      setNumeroFactura(d.numeroFactura ?? '');
      setTipoFactura(d.tipoFactura ?? '');
      setFechaIA(d.fechaIA ?? '');
      setLineas(Array.isArray(d.lineas) && d.lineas.length
        ? d.lineas
        : [{ materia_prima_id: null, cantidad: '', precio_unitario: '', marca_id: 0, nombre_nuevo: '', tipo: '', unidad_medida: '' }]);
      setShowForm(true);
    } catch {
      borrarLocal();
    }
  };

  const guardarBorrador = () => {
    if (guardando) return;
    setIntentado(true);
    if (!validar()) return;
    setGuardando(true);

    const hoy = new Date();
    const payload = {
      fecha: fechaIA || `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`,
      metodo_pago: metodoPago,
      numero_factura: numeroFactura.trim() || null,
      tipo_factura: tipoFactura || null,
      estado: 'Borrador',
      items: lineas.map((l) => ({
        materia_prima_id: l.materia_prima_id,
        cantidad: Number(l.cantidad),
        precio_total: Number(l.precio_unitario),
        marca_id: l.marca_id,
        nombre_nuevo: l.materia_prima_id ? undefined : l.nombre_nuevo.trim(),
        tipo: l.materia_prima_id ? undefined : (l.tipo.trim() || undefined),
        unidad_medida: l.materia_prima_id ? undefined : l.unidad_medida.trim(),
      })),
    };
    const peticion = editId
      ? apiClient.put(`/compras/${editId}`, payload)
      : apiClient.post('/compras', payload);
    peticion.then(() => {
      showToast('Compra guardada como borrador');
      sinRed.current = false;
      borrarLocal();
      setPagina(1);
      setRevisando(false);
      setConfirmando(false);
      setIntentado(false);
      setShowForm(false);
      setAviso(null);
      setFechaIA('');
      setEditId(null);
      setMetodoPago('');
      setNumeroFactura('');
      setTipoFactura('');
      setLineas([{ materia_prima_id: null, cantidad: '', precio_unitario: '', marca_id: 0, nombre_nuevo: '', tipo: '', unidad_medida: '' }]);
      load();
    }).catch((e) => {
      if (!e?.response) {
        sinRed.current = true;
        showToast('Sin conexión: tu compra quedó guardada en este equipo y se enviará como borrador cuando vuelva el internet', true);
        return;
      }
      showToast(mensajeError(e, 'No se pudo guardar el borrador'), true);
    }).finally(() => setGuardando(false));
  };
  guardarBorradorRef.current = guardarBorrador;

  const registrar = () => {
    if (guardando) return;
    setConfirmando(false);
    setGuardando(true);

    const hoy = new Date();
    const payload = {
      fecha: fechaIA || `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`,
      metodo_pago: metodoPago,
      numero_factura: numeroFactura.trim() || null,
      tipo_factura: tipoFactura || null,
      estado: 'Finalizada',
      items: lineas.map((l) => ({
        materia_prima_id: l.materia_prima_id,
        cantidad: Number(l.cantidad),
        precio_total: Number(l.precio_unitario),
        marca_id: l.marca_id,
        nombre_nuevo: l.materia_prima_id ? undefined : l.nombre_nuevo.trim(),
        tipo: l.materia_prima_id ? undefined : (l.tipo.trim() || undefined),
        unidad_medida: l.materia_prima_id ? undefined : l.unidad_medida.trim(),
      })),
    };
    const peticion = editId
      ? apiClient.put(`/compras/${editId}`, payload)
      : apiClient.post('/compras', payload);
    peticion.then(() => {
      showToast('Compra registrada: la cantidad se sumó a Materia Prima');
      sinRed.current = false;
      borrarLocal();
      setPagina(1);
      setRevisando(false);
      setIntentado(false);
      setShowForm(false);
      setAviso(null);
      setFechaIA('');
      setEditId(null);
      setMetodoPago('');
      setNumeroFactura('');
      setTipoFactura('');
      setLineas([{ materia_prima_id: null, cantidad: '', precio_unitario: '', marca_id: 0, nombre_nuevo: '', tipo: '', unidad_medida: '' }]);
      load();
    }).catch((e) => {
      setRevisando(false);
      if (!e?.response) {
        sinRed.current = true;
        showToast('Sin conexión: tu compra quedó guardada en este equipo y se enviará como borrador cuando vuelva el internet', true);
        return;
      }
      showToast(mensajeError(e, editId ? 'No se pudo modificar la compra' : 'No se pudo registrar la compra'), true);
    }).finally(() => setGuardando(false));
  };

  const del = (c: Compra) => setEliminarCompra(c);

  const confirmarEliminarCompra = () => {
    const c = eliminarCompra;
    if (!c) return;
    setEliminarCompra(null);
    apiClient.delete(`/compras/${c.id}`)
      .then(() => { showToast('Compra eliminada'); load(); })
      .catch((e) => {
        showToast(mensajeError(e, 'No se pudo eliminar la compra'), true);
        load();
      });
  };

  const estiloModalCompra: CSSProperties = {
    background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 0,
    width: 'min(820px, 94vw)', maxHeight: '90vh', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    boxShadow: 'var(--shadow-lg)', border: 'none',
  };

  useEscape([
    [confirmando, () => setConfirmando(false)],
    [revisando, () => setRevisando(false)],
    [!!eliminarCompra, () => setEliminarCompra(null)],
    [mostrarDictado, () => { vozRef.current?.stop(); setMostrarDictado(false); }],
    [showForm, cerrarForm],
  ]);

  return (
    <div className="page-inner compras-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Compras</h1>
          <p className="subtitulo">
            {hayFiltros ? `${filtered.length} de ${items.length} compras` : `${items.length} compras registradas`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!soloLectura && (
            <>
              <button
                className="btn-primary compras-outline-btn"
                disabled={escaneando}
                style={{ background: 'transparent', color: 'var(--brand)', border: '2px solid var(--brand)', boxShadow: 'none' }}
                onClick={() => inputFactura.current?.click()}
              >
                Escanear factura
              </button>
              <button
                className="btn-primary compras-outline-btn"
                style={{ background: 'transparent', color: 'var(--brand)', border: '2px solid var(--brand)', boxShadow: 'none' }}
                onClick={() => setMostrarDictado((v) => !v)}
              >
                Dictar compra
              </button>
              <button className="btn-primary" onClick={abrirNuevo}>
                + Nueva compra
              </button>
            </>
          )}
          <input
            ref={inputFactura}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) escanear(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>
      <ComprasSugeridas onAgregar={agregarSugeridas} />

      {mostrarDictado && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 24, marginBottom: 24, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text-900)' }}>Cuéntame qué compraste</h3>
          <p style={{ fontSize: 13, color: 'var(--text-400)', marginBottom: 12 }}>
            Ejemplo: "Compré 20 kilos de papa a 40 mil y 5 paquetes de pan a 6 mil cada uno, pagué en Nequi".
          </p>
          <textarea
            rows={3}
            value={textoDictado}
            onChange={(e) => setTextoDictado(e.target.value)}
            placeholder="Escribe o usa el micrófono..."
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', fontFamily: 'var(--font-sans)', fontSize: 14, background: 'var(--surface)', color: 'var(--text-900)', outline: 'none', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            {SpeechRec && (
              <button
                type="button"
                className="btn-primary btn-dictar-voz"
                onClick={alternarMicrofono}
              >
                {escuchando ? '⏹ Detener' : '🎤 Dictar con voz'}
              </button>
            )}
            <button type="button" className="btn-cancel" onClick={() => { vozRef.current?.stop(); setMostrarDictado(false); }}>Cancelar</button>
            <button type="button" className="btn-primary" disabled={interpretando || !textoDictado.trim()} onClick={dictar}>
              {interpretando ? 'Interpretando...' : 'Llenar formulario'}
            </button>
          </div>
        </div>
      )}

      {!showForm && hayBorradorLocal && (
        <div className="compras-borrador" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', marginBottom: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface-2)', fontSize: 13, fontWeight: 600, color: 'var(--text-900)' }}>
          <span style={{ flex: 1 }}>Tienes una compra sin terminar guardada en este equipo.</span>
          <button className="btn-primary" onClick={continuarBorradorLocal}>Continuar</button>
          <button className="btn-cancel" onClick={borrarLocal}>Descartar</button>
        </div>
      )}

      {showForm && (
        <div className="mn-modal-overlay">
        <div style={estiloModalCompra} onClick={(e) => e.stopPropagation()}>
          <div style={{ background: 'var(--text-900)', padding: '18px 28px', flexShrink: 0 }}>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--surface)' }}>{editId ? `Modificar compra N.º ${editId}` : 'Registrar Compra'}</h3>
            <button type="button" className="mn-form-cerrar" onClick={cerrarForm} aria-label="Cerrar">×</button>
          </div>
          <div style={{ padding: '24px 32px 28px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {aviso && (
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                padding: '12px 16px',
                marginBottom: 16,
                borderRadius: 12,
                border: `1px solid ${aviso.alerta ? 'var(--danger)' : 'var(--brand)'}`,
                background: aviso.alerta ? 'rgba(200, 56, 42, 0.08)' : 'rgba(232, 130, 26, 0.1)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-900)',
                lineHeight: 1.5,
              }}
            >
              <span>✨</span>
              <div>{aviso.texto}</div>
            </div>
          )}
          <div className="form-group" data-invalido={inv('metodo')}>
            <label>Método de pago <span className="mn-req">*</span></label>
            <SelectOscuro value={metodoPago} style={rojo(!metodoPago)} onChange={(e) => setMetodoPago(e.target.value)}>
              <option value="">Seleccionar...</option>
              {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </SelectOscuro>
            {msgCampo('metodo')}
          </div>

          <div className="form-group">
            <label>Número de factura <span style={{ opacity: 0.6, fontWeight: 500 }}>(opcional)</span></label>
            <input
              placeholder="Ej: FV-12345"
              maxLength={50}
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Tipo de factura <span style={{ opacity: 0.6, fontWeight: 500 }}>(opcional)</span></label>
            <SelectOscuro value={tipoFactura} onChange={(e) => setTipoFactura(e.target.value)}>
              <option value="">Seleccionar...</option>
              {TIPOS_FACTURA.map((t) => <option key={t} value={t}>{t}</option>)}
            </SelectOscuro>
          </div>

          {lineas.map((l, i) => (
            <div
              key={i}
              className="grid-lineas"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 14,
                padding: '38px 16px 16px',
                marginBottom: 16,
                border: '1px solid var(--border)',
                borderRadius: 14,
                background: 'var(--surface-2)',
                position: 'relative',
              }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Insumo (elige o crea uno nuevo) <span className="mn-req">*</span></label>
                <SelectOscuro value={l.materia_prima_id ?? '__nuevo__'} onChange={(e) => updateLinea(i, 'materia_prima_id', e.target.value === '__nuevo__' ? null : Number(e.target.value))}>
                  <option value="__nuevo__">+ Nuevo insumo</option>
                  {materias.filter((m) => m.estado !== 'Inactivo' || m.id === l.materia_prima_id).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </SelectOscuro>
              </div>

              {l.materia_prima_id === null && (
                <>
                  <div className="form-group" style={{ marginBottom: 0 }} data-invalido={inv(`nombre-${i}`)}>
                    <label>Nombre del insumo <span className="mn-req">*</span></label>
                    <input value={l.nombre_nuevo} style={rojo(errLinea(l).nombre)} onChange={(e) => updateLinea(i, 'nombre_nuevo', e.target.value)} />
                    {msgCampo(`nombre-${i}`)}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Tipo (opcional)</label>
                    <input
                      placeholder="Ej: Carnes, Salsas..."
                      value={l.tipo}
                      onChange={(e) => updateLinea(i, 'tipo', e.target.value)}
                    />
                  </div>
                </>
              )}

              {editId && l.materia_prima_id !== null && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Tipo <span style={{ opacity: 0.6, fontWeight: 500 }}>(del insumo)</span></label>
                  <input
                    disabled
                    value={materias.find((x) => x.id === l.materia_prima_id)?.tipo || ''}
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }} data-invalido={inv(`cantidad-${i}`)}>
                <label>Cantidad <span className="mn-req">*</span></label>
                <input type="number" value={l.cantidad} style={rojo(errLinea(l).cantidad)} onChange={(e) => updateLinea(i, 'cantidad', e.target.value)} />
                {msgCampo(`cantidad-${i}`)}
              </div>

              {l.materia_prima_id === null && (
                <div className="form-group" style={{ marginBottom: 0 }} data-invalido={inv(`unidad-${i}`)}>
                  <label>Unidad <span className="mn-req">*</span></label>
                  <Desplegable className="compras-filter-dropdown" value={l.unidad_medida} error={intentado && errLinea(l).unidad} onChange={(v) => updateLinea(i, 'unidad_medida', v)} opciones={UNIDADES} />
                </div>
              )}

              {editId && l.materia_prima_id !== null && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Unidad <span style={{ opacity: 0.6, fontWeight: 500 }}>(del insumo)</span></label>
                  <input
                    disabled
                    value={materias.find((x) => x.id === l.materia_prima_id)?.unidad_medida || ''}
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }} data-invalido={inv(`precio-${i}`)}>
                <label>Precio total <span className="mn-req">*</span></label>
                <input type="text" inputMode="numeric" placeholder="$ 0" style={rojo(errLinea(l).precio)} value={miles(l.precio_unitario)} onChange={(e) => updateLinea(i, 'precio_unitario', soloDigitos(e.target.value))} />
                {msgCampo(`precio-${i}`)}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }} data-invalido={inv(`marca-${i}`)}>
                <label>Proveedor <span className="mn-req">*</span></label>
                <SelectOscuro value={l.marca_id} style={rojo(errLinea(l).marca)} onChange={(e) => updateLinea(i, 'marca_id', Number(e.target.value))}>
                  <option value={0}>Seleccionar...</option>
                  {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </SelectOscuro>
                {msgCampo(`marca-${i}`)}
              </div>

              {lineas.length > 1 && (
                <button className="btn-icon btn-icon-del" onClick={() => removeLinea(i)} style={{ position: 'absolute', top: 6, right: 8 }}>✕</button>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <button className="btn-primary" onClick={addLinea}>+ Agregar insumo</button>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 18, color: 'var(--text-900)' }}>Total: ${total.toLocaleString('es-CO')}</span>
          </div>
          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button className="btn-cancel" onClick={cerrarForm}>Cancelar</button>
            <button className="btn-cancel" onClick={guardarBorrador} disabled={guardando}>Guardar borrador</button>
            <button className="btn-save" onClick={irARevision}>Registrar</button>
          </div>
          </div>
        </div>
        </div>
      )}

      <div className="mn-search-wrap" style={{ marginBottom: 14 }}>
        <svg className="mn-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input className="mn-search" type="text" placeholder="Buscar compra..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="compras-filtros" style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <label style={estiloEtiqueta}>
          Desde
          <SelectorFechaCompras value={fDesde} max={fHasta || undefined} onChange={setFDesde} />
        </label>
        <label style={estiloEtiqueta}>
          Hasta
          <SelectorFechaCompras value={fHasta} min={fDesde || undefined} onChange={setFHasta} />
        </label>
        <label style={estiloEtiqueta}>
          Método de pago
          <Desplegable
            className="compras-filter-dropdown"
            value={fMetodo}
            onChange={setFMetodo}
            placeholder="Todos"
            opciones={[{ value: '', label: 'Todos' }, ...METODOS]}
          />
        </label>
        <label style={estiloEtiqueta}>
          Insumo
          <Desplegable
            className="compras-filter-dropdown"
            value={fInsumo}
            onChange={setFInsumo}
            placeholder="Todos"
            opciones={[{ value: '', label: 'Todos' }, ...materiasOrdenadas.map((m) => ({ value: String(m.id), label: m.nombre }))]}
          />
        </label>
        <label style={estiloEtiqueta}>
          Proveedores
          <Desplegable
            className="compras-filter-dropdown"
            value={fMarca}
            onChange={setFMarca}
            placeholder="Todos"
            opciones={[{ value: '', label: 'Todos' }, ...marcasOrdenadas.map((m) => ({ value: String(m.id), label: m.nombre }))]}
          />
        </label>
        {hayFiltros && (
          <button type="button" className="btn-cancel compras-clear-filters-btn" style={{ padding: '9px 18px' }} onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        )}
      </div>

      {loading ? (
        <AdminLoading texto="Cargando compras" subtexto="Reuniendo tus abastecimientos" />
      ) : (
        <>
          <div className="tabla-responsive compras-table-wrap">
            <table className="data-table compras-table">
              <thead>
                <tr>
                  <th>Compra</th>
                  <th>Método de pago</th>
                  <th>Insumos</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th className="th-acciones">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gruposVisibles.map(([clave, lista]) => (
                  <Fragment key={clave}>
                    <tr>
                      <td colSpan={6} style={{ background: 'var(--surface-2)', padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-900)' }}>{etiquetaFecha(clave)}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-400)' }}>
                            {lista.length} {lista.length === 1 ? 'compra' : 'compras'} ·{' '}
                            <span style={{ color: 'var(--brand)', fontWeight: 800 }}>
                              ${lista.filter((c) => c.estado === 'Finalizada').reduce((a, c) => a + Number(c.valor_total), 0).toLocaleString('es-CO')}
                            </span>
                          </span>
                        </div>
                      </td>
                    </tr>
                    {lista.map((c) => (
                      <tr key={c.id}>
                        <td><span style={chipNumero}>N.º {c.id}</span></td>
                        <td><span className="badge badge-info compras-metodo-badge">{c.metodo_pago}</span></td>
                        <td>{(c.detalles ?? []).length}</td>
                        <td style={{ fontWeight: 700 }}>${Number(c.valor_total).toLocaleString('es-CO')}</td>
                        <td><span className={`badge ${badgeEstado(c.estado)}`}>{c.estado}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="mn-btn-edit" style={{ flex: 'none', padding: '7px 14px' }} onClick={() => setModalDetalle(c)} data-tooltip="Ver detalle">Ver detalle</button>
                            {!soloLectura && c.estado !== 'Finalizada' && (
                              <>
                                <button
                                  type="button"
                                  className="mn-btn-edit compras-modificar-btn"
                                  style={{ flex: 'none', padding: '7px 14px' }}
                                  onClick={() => abrirEditar(c)}
                                  data-tooltip="Modificar"
                                >
                                  Modificar
                                </button>
                                <button
                                  type="button"
                                  className="mn-btn-del"
                                  style={{ flex: 'none', padding: '7px 14px' }}
                                  onClick={() => del(c)}
                                  data-tooltip="Eliminar"
                                >
                                  Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {grupos.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>
                      {items.length === 0 ? 'Aún no hay compras' : 'No se encontraron compras con esos filtros'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Paginacion total={grupos.length} pagina={paginaActual} porPagina={DIAS_POR_PAGINA} etiqueta="días" onCambiar={setPagina} siempre />
        </>
      )}

      {modalDetalle && (() => {
        const detalles = modalDetalle.detalles ?? [];
        const columnas = '1.5fr 1.2fr 1fr 1fr 1fr';
        const etiquetaCol: CSSProperties = {
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          color: 'var(--text-400)',
        };
        return (
          <div className="modal-overlay open" onClick={() => setModalDetalle(null)}>
            <div className="modal-box" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Factura de compra ${modalDetalle.id}`}>
              <button type="button" className="modal-x" onClick={() => setModalDetalle(null)} aria-label="Cerrar">×</button>
              <div style={{ marginBottom: 20 }}>
                <div>
                  <div style={etiquetaCol}>Factura de compra · N.º {modalDetalle.id}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 800, color: 'var(--text-900)', margin: '6px 0 10px' }}>
                    {fechaLarga(modalDetalle.fecha)}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="badge badge-info compras-factura-metodo">{modalDetalle.metodo_pago}</span>
                    {modalDetalle.tipo_factura && <span className="badge badge-warning">{modalDetalle.tipo_factura}</span>}
                    {modalDetalle.numero_factura && <span style={chipNumero}>Factura {modalDetalle.numero_factura}</span>}
                  </div>
                </div>
              </div>

              <div className="compras-factura-contador">{detalles.length} {detalles.length === 1 ? 'insumo' : 'insumos'}</div>
              <div className="compras-factura-tabla" style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: 'var(--surface)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 540 }}>
                    <div className="compras-factura-head" style={{ display: 'grid', gridTemplateColumns: columnas, gap: 12, padding: '10px 18px', background: 'var(--surface-2)' }}>
                      <span style={etiquetaCol}>Insumo</span>
                      <span style={etiquetaCol}>Proveedor</span>
                      <span style={etiquetaCol}>Cant.</span>
                      <span style={etiquetaCol}>Precio unit.</span>
                      <span style={{ ...etiquetaCol, textAlign: 'right' }}>Subtotal</span>
                    </div>
                    {detalles.length === 0 ? (
                      <div style={{ padding: '18px', fontSize: 13, color: 'var(--text-400)' }}>Esta compra no tiene insumos registrados.</div>
                    ) : (
                      detalles.map((d) => (
                        <div
                          key={d.id}
                          className="compras-factura-fila"
                          style={{ display: 'grid', gridTemplateColumns: columnas, gap: 12, padding: '13px 18px', borderTop: '1px solid var(--border)', alignItems: 'center', fontSize: 14, color: 'var(--text-900)' }}
                        >
                          <span style={{ fontWeight: 600 }}>{d.materia_prima?.nombre ?? 'N/A'}</span>
                          <span className="compras-factura-prov" style={{ color: 'var(--text-400)' }}>{d.marca?.nombre ?? 'N/A'}</span>
                          <span style={{ whiteSpace: 'nowrap' }}>
                            {Number(d.cantidad).toLocaleString('es-CO')}
                            {d.materia_prima?.unidad_medida ? ` ${d.materia_prima.unidad_medida}` : ''}
                          </span>
                          <span>{pesos(d.precio_unitario)}</span>
                          <span style={{ fontWeight: 700, textAlign: 'right' }}>{pesos(d.subtotal)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 16, margin: '20px 4px 0' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={etiquetaCol}>Total</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 26, fontWeight: 800, color: 'var(--text-900)', lineHeight: 1.2 }}>
                    {pesos(modalDetalle.valor_total)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
                <button type="button" className="btn-primary" style={{ padding: '11px 32px' }} onClick={() => setModalDetalle(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {escaneando && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(22, 8, 0, 0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <style>{`@keyframes iaScan{0%,100%{top:6%}50%{top:90%}}@keyframes iaDots{0%,100%{opacity:.25}50%{opacity:1}}`}</style>
          <div style={{ background: 'var(--surface)', borderRadius: 22, padding: '30px 38px', textAlign: 'center', maxWidth: 340, boxShadow: 'var(--shadow-md)' }}>
            <div style={{ position: 'relative', width: 110, height: 140, margin: '0 auto 20px', border: '2px solid var(--border)', borderRadius: 12, background: 'var(--surface-2)', overflow: 'hidden', padding: '16px 12px' }}>
              {[80, 100, 65, 90, 55].map((w, i) => (
                <div key={i} style={{ height: 6, width: `${w}%`, borderRadius: 4, background: 'var(--border)', marginBottom: 12 }} />
              ))}
              <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #e8821a, #ffb347)', boxShadow: '0 0 14px #e8821a', animation: 'iaScan 1.8s ease-in-out infinite' }} />
            </div>
            <p style={{ margin: 0, fontWeight: 900, fontSize: 18, color: 'var(--text-900)' }}>
              Leyendo tu factura
              <span style={{ animation: 'iaDots 1.2s infinite' }}>.</span>
              <span style={{ animation: 'iaDots 1.2s .2s infinite' }}>.</span>
              <span style={{ animation: 'iaDots 1.2s .4s infinite' }}>.</span>
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-400)', fontWeight: 500 }}>
              Burgi está identificando insumos, cantidades y precios
            </p>
          </div>
        </div>
      )}

      {eliminarCompra && (
        <div className="mn-modal-overlay" onClick={() => setEliminarCompra(null)}>
          <div className="mn-modal-box" onClick={(e) => e.stopPropagation()}>
            <p>¿Eliminar esta compra? Todavía no se ha registrado en Materia Prima. Esta acción no se puede deshacer.</p>
            <div className="mn-modal-actions">
              <button type="button" className="mn-btn-cancel" onClick={() => setEliminarCompra(null)}>Cancelar</button>
              <button type="button" className="mn-btn-confirm" onClick={confirmarEliminarCompra}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {revisando && (() => {
        const columnas = '1.5fr 1.2fr 1fr 1fr 1fr';
        const filas = lineas.map((l) => {
          const m = materias.find((x) => x.id === l.materia_prima_id);
          const cantidad = Number(l.cantidad) || 0;
          const subtotal = Number(l.precio_unitario) || 0;
          return {
            nombre: m?.nombre ?? l.nombre_nuevo.trim(),
            nuevo: l.materia_prima_id === null,
            marca: marcas.find((x) => x.id === l.marca_id)?.nombre ?? 'N/A',
            unidad: m?.unidad_medida ?? l.unidad_medida,
            cantidad,
            unitario: cantidad > 0 ? subtotal / cantidad : 0,
            subtotal,
          };
        });
        const hoy = new Date();
        const fechaFactura = fechaIA || `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
        return (
          <div className="mn-modal-overlay" onClick={() => setRevisando(false)}>
            <div
              style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '28px 32px', width: 'min(760px, 94vw)', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Revisar factura de compra"
            >
              <div style={{ marginBottom: 20 }}>
                <div style={etiquetaColumna}>Revisa la factura{editId ? ` · Compra N.º ${editId}` : ''}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 800, color: 'var(--text-900)', margin: '6px 0 10px' }}>
                  {fechaLarga(fechaFactura)}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="badge badge-info">{metodoPago}</span>
                  {tipoFactura && <span className="badge badge-warning">{tipoFactura}</span>}
                  {numeroFactura.trim() && <span style={chipNumero}>Factura {numeroFactura.trim()}</span>}
                </div>
              </div>

              {aviso?.alerta && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px', marginBottom: 16, borderRadius: 12, border: '1px solid var(--danger)', background: 'rgba(200, 56, 42, 0.08)', fontSize: 13, fontWeight: 600, color: 'var(--text-900)', lineHeight: 1.5 }}>
                  <span>✨</span>
                  <div>{aviso.texto}</div>
                </div>
              )}

              <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: 'var(--surface)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 540 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: columnas, gap: 12, padding: '10px 18px', background: 'var(--surface-2)' }}>
                      <span style={etiquetaColumna}>Insumo</span>
                      <span style={etiquetaColumna}>Proveedor</span>
                      <span style={etiquetaColumna}>Cant.</span>
                      <span style={etiquetaColumna}>Precio unit.</span>
                      <span style={{ ...etiquetaColumna, textAlign: 'right' }}>Subtotal</span>
                    </div>
                    {filas.map((f, i) => (
                      <div
                        key={i}
                        style={{ display: 'grid', gridTemplateColumns: columnas, gap: 12, padding: '13px 18px', borderTop: '1px solid var(--border)', alignItems: 'center', fontSize: 14, color: 'var(--text-900)' }}
                      >
                        <span style={{ fontWeight: 600 }}>
                          {f.nombre}
                          {f.nuevo && <span className="badge badge-warning" style={{ marginLeft: 8 }}>Nuevo</span>}
                        </span>
                        <span style={{ color: 'var(--text-400)' }}>{f.marca}</span>
                        <span style={{ whiteSpace: 'nowrap' }}>
                          {f.cantidad.toLocaleString('es-CO')}{f.unidad ? ` ${f.unidad}` : ''}
                        </span>
                        <span>{pesos(f.unitario)}</span>
                        <span style={{ fontWeight: 700, textAlign: 'right' }}>{pesos(f.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, margin: '20px 4px 0' }}>
                <span style={{ fontSize: 13, color: 'var(--text-400)' }}>
                  {filas.length} {filas.length === 1 ? 'insumo' : 'insumos'}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <div style={etiquetaColumna}>Total</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 26, fontWeight: 800, color: 'var(--text-900)', lineHeight: 1.2 }}>
                    {pesos(total)}
                  </div>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 22 }}>
                <button type="button" className="btn-cancel" disabled={guardando} onClick={() => setRevisando(false)}>Volver a editar</button>
                <button type="button" className="btn-save" disabled={guardando} onClick={() => setConfirmando(true)}>
                  {guardando ? 'Registrando...' : 'Confirmar compra'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {confirmando && (
        <div className="mn-modal-overlay" onClick={() => setConfirmando(false)}>
          <div className="mn-modal-box" onClick={(e) => e.stopPropagation()}>
            <p>
              ¿Quieres registrar esta compra? Se sumará a Materia Prima y ya no se podrá modificar ni eliminar.
            </p>
            <div className="mn-modal-actions">
              <button type="button" className="mn-btn-cancel" onClick={() => setConfirmando(false)}>Seguir revisando</button>
              <button type="button" className="mn-btn-confirm" disabled={guardando} onClick={registrar}>Sí, registrar compra</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}