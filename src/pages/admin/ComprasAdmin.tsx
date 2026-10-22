import { Fragment, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import apiClient from '../../api/client';
import ComprasResumen from '../../components/ComprasResumen';
import AdminLoading from '../../components/AdminLoading';
import ToastMessage, { useToast } from '../../components/Toast';
import '../../styles/nu-admin.css';

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

interface Compra {
  id: number;
  fecha: string;
  metodo_pago: string;
  valor_total: number;
  detalles: DetalleCompra[];
  /** El servidor indica si todavía están dentro de las 5 horas para eliminarla. */
  puede_eliminarse?: boolean;
  eliminable_hasta?: string | null;
}

interface MateriaPrima { id: number; nombre: string; valor: number; }
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

const METODOS = ['Efectivo', 'Nequi', 'Daviplata'];
const UNIDADES = ['Kg', 'Gramos', 'Libras', 'Litros', 'Mililitros', 'Unidades', 'Paquetes', 'Cajas', 'Bolsas', 'Botellas', 'Latas'];
const soloDigitos = (v: string): string => v.replace(/\D/g, '');
const miles = (v: string): string => v.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function Desplegable({ value, onChange, opciones, placeholder = 'Seleccionar...' }: {
  value: string;
  onChange: (v: string) => void;
  opciones: string[];
  placeholder?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '11px 14px',
          border: `1.5px solid ${abierto ? 'var(--brand)' : 'var(--border)'}`,
          borderRadius: 'var(--r-sm)',
          background: 'var(--surface-2)',
          color: value ? 'var(--text-900)' : 'var(--text-400)',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span>{value || placeholder}</span>
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
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 30,
            maxHeight: 220,
            overflowY: 'auto',
            margin: 0,
            padding: 6,
            listStyle: 'none',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {opciones.map((o) => (
            <li
              key={o}
              onClick={() => { onChange(o); setAbierto(false); }}
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 14,
                cursor: 'pointer',
                fontWeight: o === value ? 700 : 500,
                color: o === value ? 'var(--brand)' : 'var(--text-900)',
                background: o === value ? 'rgba(232, 130, 26, 0.12)' : 'transparent',
              }}
              onMouseEnter={(e) => { if (o !== value) e.currentTarget.style.background = 'rgba(232, 130, 26, 0.08)'; }}
              onMouseLeave={(e) => { if (o !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              {o}
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

/** "Jueves, 15 de octubre de 2026" a partir de "2026-10-15" (sin desfases de zona horaria). */
const fechaLarga = (fecha: string): string => {
  const [y, m, d] = String(fecha).slice(0, 10).split('-').map(Number);
  const larga = new Date(y, m - 1, d).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return larga.charAt(0).toUpperCase() + larga.slice(1);
};

const pesos = (n: number | string): string => `$${Math.round(Number(n)).toLocaleString('es-CO')}`;

/** Número de compra discreto (en vez de "#17" en negrita). */
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
export default function ComprasAdmin() {
  const [items, setItems] = useState<Compra[]>([]);
  const [materias, setMaterias] = useState<MateriaPrima[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const { toast, showToast } = useToast();
  const [lineas, setLineas] = useState<Linea[]>([
    { materia_prima_id: null, cantidad: '', precio_unitario: '', marca_id: 0, nombre_nuevo: '', tipo: '', unidad_medida: '' },
  ]);
  const [modalDetalle, setModalDetalle] = useState<Compra | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [eliminarCompra, setEliminarCompra] = useState<Compra | null>(null);
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
    Promise.all([
      apiClient.get<Compra[]>('/compras'),
      apiClient.get<MateriaPrima[]>('/materias-primas'),
      apiClient.get<Marca[]>('/marcas'),
    ]).then(([r1, r2, r3]) => {
      setItems(r1.data);
      setMaterias(r2.data);
      setMarcas(r3.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
  if (cargado.current) return;
  cargado.current = true;
  load();
}, []);

  // Cierra el detalle con la tecla Escape
  useEffect(() => {
    if (!modalDetalle) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalDetalle(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalDetalle]);

  const filtered = items.filter((c) =>
    String(c.id).includes(q) || c.metodo_pago.toLowerCase().includes(q.toLowerCase())
  );

  const [diasVisibles, setDiasVisibles] = useState(5);

  const grupos = Object.entries(
    [...filtered]
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
      .reduce<Record<string, Compra[]>>((acc, c) => {
        const clave = c.fecha.slice(0, 10);
        (acc[clave] = acc[clave] || []).push(c);
        return acc;
      }, {})
  );
  const gruposVisibles = grupos.slice(0, diasVisibles);

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

  // Autocompleta el precio total con el último precio guardado del insumo
  if (field === 'materia_prima_id' || field === 'cantidad') {
    const autoDe = (l: Linea): string => {
      const m = materias.find((x) => x.id === l.materia_prima_id);
      const c = Number(l.cantidad);
      return m && c > 0 ? String(Math.round(Number(m.valor) * c)) : '';
    };
    // Solo se sobreescribe si está vacío o si era el precio automático anterior
    if (antes.precio_unitario === '' || antes.precio_unitario === autoDe(antes)) {
      nueva.precio_unitario = autoDe(nueva);
    }
  }

  copy[i] = nueva;
  setLineas(copy);
};

  const total = lineas.reduce((a, l) => a + (Number(l.precio_unitario) || 0), 0);
  const cerrarForm = () => { setShowForm(false); setAviso(null); setFechaIA(''); setEditId(null); };

  /** Carga una compra existente en el formulario para modificarla (solo dentro de las 5 horas). */
  const abrirEditar = (c: Compra) => {
    setEditId(c.id);
    setMetodoPago(c.metodo_pago);
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

      const partes = ['Compra interpretada con IA a partir de lo que dijiste. Revisa cada dato antes de registrar.'];
      if (data.fecha) partes.push(`Fecha: ${data.fecha.split('-').reverse().join('/')}.`);
      if (data.observaciones) partes.push(data.observaciones);
      setAviso({ texto: partes.join(' '), alerta: !!data.observaciones });
      showToast('Listo: revisa los datos y registra');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      showToast(err?.response?.data?.message || 'No se pudo interpretar la compra', true);
    } finally {
      setInterpretando(false);
    }
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  // Dictado por voz del navegador (Chrome o Edge; necesita https o localhost)
  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const alternarMicrofono = () => {
    if (escuchando) { vozRef.current?.stop(); return; }
    const rec = new SpeechRec();
    rec.lang = 'es-CO';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (ev: any) => {
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
  /* eslint-enable @typescript-eslint/no-explicit-any */

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

    const partes = ['Factura leída con IA. Revisa cada dato antes de registrar.'];
    if (data.fecha) partes.push(`Fecha de la factura: ${data.fecha.split('-').reverse().join('/')}.`);
    if (data.cuadra === false && data.total_factura) {
      partes.push(`El total de la factura ($${data.total_factura.toLocaleString('es-CO')}) no coincide con la suma de los insumos ($${data.suma_items.toLocaleString('es-CO')}): puede ser IVA, un descuento o una línea mal leída.`);
    }
    if (data.observaciones) partes.push(data.observaciones);
    setAviso({ texto: partes.join(' '), alerta: data.cuadra === false || !!data.observaciones });
    showToast('Factura leída: revisa los datos y registra');
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } } };
    showToast(err?.response?.data?.message || 'No se pudo leer la factura', true);
  } finally {
    setEscaneando(false);
  }
};

const save = () => {
  if (!metodoPago) { showToast('Selecciona el método de pago', true); return; }
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    const n = `Insumo ${i + 1}`;
    if (l.materia_prima_id === null && !l.nombre_nuevo.trim()) { showToast(`${n}: escribe el nombre del insumo nuevo`, true); return; }
    if (!(Number(l.cantidad) > 0)) { showToast(`${n}: escribe la cantidad`, true); return; }
    if (l.materia_prima_id === null && !l.unidad_medida.trim()) { showToast(`${n}: selecciona la unidad de medida`, true); return; }
    if (!(Number(l.precio_unitario) > 0)) { showToast(`${n}: escribe el precio total`, true); return; }
    if (!l.marca_id) { showToast(`${n}: selecciona el proveedor`, true); return; }
  }

  const hoy = new Date();
  const payload = {
    fecha: fechaIA || `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`,
    metodo_pago: metodoPago,
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
    showToast(editId ? 'Compra modificada: el stock se recalculó' : 'Compra registrada: el stock se sumó a Materia Prima');
    setShowForm(false);
    setAviso(null);
    setFechaIA('');
    setEditId(null);
    setMetodoPago('');
    setLineas([{ materia_prima_id: null, cantidad: '', precio_unitario: '', marca_id: 0, nombre_nuevo: '', tipo: '', unidad_medida: '' }]);
    load();
  }).catch((e) => {
    const d = e?.response?.data;
    showToast(d?.errors ? (Object.values(d.errors) as string[][])[0][0] : d?.message || (editId ? 'No se pudo modificar la compra' : 'No se pudo registrar la compra'), true);
  });
};

  const HORAS_PARA_ELIMINAR = 5;
  const MSG_FUERA_DE_PLAZO = `Esta compra ya no se puede eliminar: pasaron más de ${HORAS_PARA_ELIMINAR} horas desde que se registró.`;

  const del = (c: Compra) => {
    if (!c.puede_eliminarse) { showToast(MSG_FUERA_DE_PLAZO, true); return; }
    setEliminarCompra(c);
  };

  const confirmarEliminarCompra = () => {
    const c = eliminarCompra;
    if (!c) return;
    setEliminarCompra(null);
    apiClient.delete(`/compras/${c.id}`)
      .then(() => { showToast('Compra eliminada y stock revertido'); load(); })
      .catch((e) => {
        showToast(e?.response?.data?.message || 'No se pudo eliminar la compra', true);
        load();
      });
  };

  /** Estilo del formulario cuando se abre como modal (Modificar). */
  const estiloModalCompra: CSSProperties = {
    background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '28px 32px',
    width: 'min(820px, 94vw)', maxHeight: '90vh', overflowY: 'auto',
    boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
  };

  /** Texto del botón Eliminar: hasta cuándo se puede, o por qué está bloqueado. */
  const ayudaEliminar = (c: Compra): string => {
    if (!c.puede_eliminarse) return MSG_FUERA_DE_PLAZO;
    if (!c.eliminable_hasta) return 'Eliminar compra';
    const hasta = new Date(c.eliminable_hasta).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    return `Se puede eliminar hasta las ${hasta}`;
  };

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Gestión de Compras</h1>
          <p className="subtitulo">{items.length} compras registradas</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            disabled={escaneando}
            style={{ background: 'transparent', color: 'var(--brand)', border: '2px solid var(--brand)', boxShadow: 'none' }}
            onClick={() => inputFactura.current?.click()}
          >
            Escanear factura
          </button>
          <button
            className="btn-primary"
            style={{ background: 'transparent', color: 'var(--brand)', border: '2px solid var(--brand)', boxShadow: 'none' }}
            onClick={() => setMostrarDictado((v) => !v)}
          >
            Dictar compra
          </button>
          <button className="btn-primary" onClick={() => (showForm ? cerrarForm() : setShowForm(true))}>
            {showForm ? 'Cancelar' : '+ Nueva compra'}
          </button>
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
                className="btn-primary"
                style={{ background: 'transparent', color: 'var(--brand)', border: '2px solid var(--brand)', boxShadow: 'none' }}
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

      <ComprasResumen items={items} />

      {showForm && (
        <div className={editId ? 'mn-modal-overlay' : undefined} onClick={editId ? cerrarForm : undefined}>
        <div style={editId ? estiloModalCompra : { background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 28, marginBottom: 28, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }} onClick={(e) => e.stopPropagation()}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-900)' }}>{editId ? `Modificar compra N.º ${editId}` : 'Registrar Compra'}</h3>
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
          <div className="form-group">
           <label>Método de pago <span className="mn-req">*</span></label>
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
              <option value="">Seleccionar...</option>
              {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
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
                <select value={l.materia_prima_id ?? '__nuevo__'} onChange={(e) => updateLinea(i, 'materia_prima_id', e.target.value === '__nuevo__' ? null : Number(e.target.value))}>
                  <option value="__nuevo__">+ Nuevo insumo</option>
                  {materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>

              {l.materia_prima_id === null && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Nombre del insumo<span className="mn-req">*</span></label>
                  <input value={l.nombre_nuevo} onChange={(e) => updateLinea(i, 'nombre_nuevo', e.target.value)} />
                </div>
              )}

              {l.materia_prima_id === null && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Tipo (opcional)</label>
                  <input
                    placeholder="Ej: Carnes, Salsas..."
                    value={l.tipo}
                    onChange={(e) => updateLinea(i, 'tipo', e.target.value)}
                  />
                </div>
              )}


              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Cantidad <span className="mn-req">*</span></label>
                <input type="number" value={l.cantidad} onChange={(e) => updateLinea(i, 'cantidad', e.target.value)} />
              </div>

              {l.materia_prima_id === null && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Unidad <span className="mn-req">*</span></label>
                  <Desplegable value={l.unidad_medida} onChange={(v) => updateLinea(i, 'unidad_medida', v)} opciones={UNIDADES} />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Precio total <span className="mn-req">*</span></label>
                <input type="text" inputMode="numeric" placeholder="$ 0" value={miles(l.precio_unitario)} onChange={(e) => updateLinea(i, 'precio_unitario', soloDigitos(e.target.value))} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Proveedor <span className="mn-req">*</span></label>
                <select value={l.marca_id} onChange={(e) => updateLinea(i, 'marca_id', Number(e.target.value))}>
                  <option value={0}>Seleccionar...</option>
                  {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
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
            <button className="btn-save" onClick={save}>{editId ? 'Guardar cambios' : 'Registrar Compra'}</button>
          </div>
        </div>
        </div>
      )}

      <div className="mn-search-wrap" style={{ marginBottom: 24 }}>
        <svg className="mn-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input className="mn-search" type="text" placeholder="Buscar compra..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <AdminLoading texto="Cargando compras" subtexto="Reuniendo tus abastecimientos" />
      ) : (
        <>
  <div className="tabla-responsive">
    <table className="data-table">
      <thead>
        <tr>
          <th>Compra</th>
          <th>Método de pago</th>
          <th>Insumos</th>
          <th>Total</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {gruposVisibles.map(([clave, lista]) => (
          <Fragment key={clave}>
            <tr>
              <td colSpan={5} style={{ background: 'var(--surface-2)', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-900)' }}>{etiquetaFecha(clave)}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-400)' }}>
                    {lista.length} {lista.length === 1 ? 'compra' : 'compras'} ·{' '}
                    <span style={{ color: 'var(--brand)', fontWeight: 800 }}>
                      ${lista.reduce((a, c) => a + Number(c.valor_total), 0).toLocaleString('es-CO')}
                    </span>
                  </span>
                </div>
              </td>
            </tr>
            {lista.map((c) => (
              <tr key={c.id}>
                <td><span style={chipNumero}>N.º {c.id}</span></td>
                <td><span className="badge badge-info">{c.metodo_pago}</span></td>
                <td>{(c.detalles ?? []).length}</td>
                <td style={{ fontWeight: 700 }}>${Number(c.valor_total).toLocaleString('es-CO')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="mn-btn-edit" style={{ flex: 'none', padding: '7px 14px' }} onClick={() => setModalDetalle(c)}>Ver detalle</button>
                    <button
                      type="button"
                      className="mn-btn-edit"
                      disabled={!c.puede_eliminarse}
                      title={c.puede_eliminarse ? 'Modificar compra' : 'Ya pasaron más de 5 horas: no se puede modificar'}
                      style={{ flex: 'none', padding: '7px 14px', ...(c.puede_eliminarse ? {} : { opacity: 0.4, cursor: 'not-allowed' }) }}
                      onClick={() => abrirEditar(c)}
                    >
                      Modificar
                    </button>
                    <button
                      type="button"
                      className="mn-btn-del"
                      disabled={!c.puede_eliminarse}
                      title={ayudaEliminar(c)}
                      style={{ flex: 'none', padding: '7px 14px', ...(c.puede_eliminarse ? {} : { opacity: 0.4, cursor: 'not-allowed' }) }}
                      onClick={() => del(c)}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Fragment>
        ))}
        {grupos.length === 0 && (
          <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron compras</td></tr>
        )}
      </tbody>
    </table>
  </div>

    {grupos.length > diasVisibles && (
    <div style={{ textAlign: 'center', marginTop: 18 }}>
      <button className="btn-primary" onClick={() => setDiasVisibles(diasVisibles + 5)}>
        Ver más días ({grupos.length - diasVisibles} restantes)
      </button>
    </div>
  )}
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
              <div style={{ marginBottom: 20 }}>
                <div>
                  <div style={etiquetaCol}>Factura de compra · N.º {modalDetalle.id}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 800, color: 'var(--text-900)', margin: '6px 0 10px' }}>
                    {fechaLarga(modalDetalle.fecha)}
                  </div>
                  <span className="badge badge-info">{modalDetalle.metodo_pago}</span>
                </div>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: 'var(--surface)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 540 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: columnas, gap: 12, padding: '10px 18px', background: 'var(--surface-2)' }}>
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
                          style={{ display: 'grid', gridTemplateColumns: columnas, gap: 12, padding: '13px 18px', borderTop: '1px solid var(--border)', alignItems: 'center', fontSize: 14, color: 'var(--text-900)' }}
                        >
                          <span style={{ fontWeight: 600 }}>{d.materia_prima?.nombre ?? 'N/A'}</span>
                          <span style={{ color: 'var(--text-400)' }}>{d.marca?.nombre ?? 'N/A'}</span>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, margin: '20px 4px 0' }}>
                <span style={{ fontSize: 13, color: 'var(--text-400)' }}>
                  {detalles.length} {detalles.length === 1 ? 'insumo' : 'insumos'}
                </span>
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
              La IA está identificando insumos, cantidades y precios
            </p>
          </div>
        </div>
      )}
      {eliminarCompra && (
        <div className="mn-modal-overlay" onClick={() => setEliminarCompra(null)}>
          <div className="mn-modal-box" onClick={(e) => e.stopPropagation()}>
            <p>¿Eliminar la compra N.º {eliminarCompra.id}? Se revertirá el stock de sus insumos. Esta acción no se puede deshacer.</p>
            <div className="mn-modal-actions">
              <button type="button" className="mn-btn-cancel" onClick={() => setEliminarCompra(null)}>Cancelar</button>
              <button type="button" className="mn-btn-confirm" onClick={confirmarEliminarCompra}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
       <ToastMessage toast={toast} />
    </div>
  
  );
}