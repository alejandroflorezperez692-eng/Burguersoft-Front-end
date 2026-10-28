import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import apiClient from '../../api/client';
import AdminLoading from '../../components/AdminLoading';
import VentasGraficas from '../../components/VentasGraficas';
import type { EstadisticasVentas } from '../../types/Ventas';

interface DetalleVenta {
  id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto?: { id?: number; nombre?: string };
}

interface PromocionVenta {
  id: number;
  nombre: string;
}

interface Venta {
  id: number;
  fecha: string;
  valor_total: number;
  metodo_pago: string;
  estado: string;
  tipo_entrega: string;
  usuario_id: number;
  cliente_nombre?: string | null;
  usuario?: { nombre: string; apellido: string };
  detalles: DetalleVenta[];
  promociones: PromocionVenta[];
}

interface DetalleCompra {
  id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  materia_prima?: { nombre: string; unidad_medida?: string | null };
  marca?: { nombre: string };
}

interface Compra {
  id: number;
  fecha: string;
  metodo_pago: string;
  valor_total: number;
  detalles: DetalleCompra[];
}

/* ---------- Configuración ---------- */
// Límite de tiempo: máximo de días que puede abarcar un reporte
const MAX_DIAS = 90;

// Estados de venta que no cuentan como ingreso
const ESTADOS_NO_CONTABLES = ['Cancelado', 'Reembolsada'];

const PRESETS = [
  { label: 'Hoy', dias: 1 },
  { label: '7 días', dias: 7 },
  { label: '30 días', dias: 30 },
  { label: `${MAX_DIAS} días`, dias: MAX_DIAS },
];

/* ---------- Utilidades ---------- */
const toArray = <T,>(v: unknown): T[] =>
  Array.isArray(v) ? (v as T[]) : ((v as { data?: unknown })?.data as T[] ?? []);

// Fecha local en formato YYYY-MM-DD
const aFechaISO = (d: Date) => d.toLocaleDateString('en-CA');

// Para ventas (llegan con hora)
const fechaLocal = (fecha?: string | null) =>
  fecha ? aFechaISO(new Date(fecha)) : '';

// Para compras (llegan como fecha sin hora: no se debe convertir de zona horaria)
const diaCompra = (fecha?: string | null) => String(fecha ?? '').slice(0, 10);

const sumarDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return aFechaISO(d);
};

// Días entre dos fechas, ambas incluidas
const diasEntre = (desde: string, hasta: string) =>
  Math.round(
    (new Date(`${hasta}T00:00:00`).getTime() - new Date(`${desde}T00:00:00`).getTime()) / 86400000
  ) + 1;

const moneda = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
const monedaConSigno = (n: number) => `${n < 0 ? '-' : ''}${moneda(Math.abs(n))}`;
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const csvCelda = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const nombreCliente = (v: Venta) =>
  v?.cliente_nombre || (v?.usuario ? `${v.usuario.nombre} ${v.usuario.apellido}`.trim() : '');

/* ---------- Componentes auxiliares ---------- */
interface FilaBarra {
  id?: string;
  nombre: string;
  principal: string;
  secundario?: string;
  proporcion: number; // 0 a 1
}

function ListaBarras({ filas, vacio = 'Sin datos en este rango' }: { filas: FilaBarra[]; vacio?: string }) {
  if (filas.length === 0) {
    return <p style={{ fontSize: 13, color: 'var(--text-400)', margin: 0 }}>{vacio}</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {filas.map((f) => (
        <div key={f.id ?? f.nombre}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-900)' }}>{f.nombre}</span>
            <span style={{ color: 'var(--text-600)', whiteSpace: 'nowrap' }}>
              {f.principal}{f.secundario ? ` · ${f.secundario}` : ''}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', marginTop: 4 }}>
            <div
              style={{
                width: `${Math.max(2, f.proporcion * 100)}%`,
                height: '100%',
                borderRadius: 3,
                background: 'rgba(232, 98, 44, 0.85)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Panel({ titulo, children, scroll }: { titulo: string; children: ReactNode; scroll?: boolean }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 22, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: 'var(--text-900)' }}>
        {titulo}
      </h3>
      <div style={scroll ? { maxHeight: 360, overflowY: 'auto', paddingRight: 6 } : undefined}>{children}</div>
    </div>
  );
}

function Seccion({ titulo, sub }: { titulo: string; sub?: string }) {
  return (
    <div style={{ margin: '40px 0 16px' }}>
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-900)' }}>
        {titulo}
      </h2>
      {sub && <p style={{ fontSize: 13, color: 'var(--text-400)', margin: '4px 0 0' }}>{sub}</p>}
    </div>
  );
}

/* ---------- Resumen de compras según el rango seleccionado ---------- */
interface ResumenComprasProps {
  total: number;
  totalPrevio: number;
  barras: { clave: string; etiqueta: string; titulo: string; total: number }[];
  topMarca: { nombre: string; valor: number } | null;
  topInsumo: { nombre: string; valor: number } | null;
}

function ResumenCompras({ total, totalPrevio, barras, topMarca, topInsumo }: ResumenComprasProps) {
  const maxBarra = Math.max(1, ...barras.map((b) => b.total));

  let pill: { texto: string; color: string; fondo: string };
  if (totalPrevio === 0) {
    pill = {
      texto: total === 0 ? 'Sin compras en el rango' : 'Sin compras en el periodo anterior',
      color: 'var(--text-400)',
      fondo: 'var(--surface-2)',
    };
  } else {
    const pct = Math.round(((total - totalPrevio) / totalPrevio) * 100);
    if (pct === 0) {
      pill = { texto: 'Igual que el periodo anterior', color: 'var(--text-400)', fondo: 'var(--surface-2)' };
    } else {
      const sube = pct > 0;
      pill = {
        texto: `${sube ? '▲' : '▼'} ${Math.abs(pct)}% frente al periodo anterior (${moneda(totalPrevio)})`,
        color: sube ? 'var(--danger)' : '#2e7d32',
        fondo: sube ? 'rgba(200, 56, 42, 0.1)' : 'rgba(46, 125, 50, 0.12)',
      };
    }
  }

  const etiqueta: CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: 'var(--text-400)',
  };

  const metrica = (titulo: string, dato: { nombre: string; valor: number } | null) => (
    <div style={{ flex: '1 1 180px', minWidth: 0 }}>
      <div style={etiqueta}>{titulo}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-900)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {dato ? dato.nombre : '—'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-400)', marginTop: 2 }}>
        {dato ? moneda(dato.valor) : 'Sin compras en el rango'}
      </div>
    </div>
  );

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: '22px 26px',
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 28, alignItems: 'end' }}>
        <div>
          <div style={etiqueta}>Invertido en el rango</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 34, fontWeight: 800, color: 'var(--text-900)', lineHeight: 1.1, margin: '8px 0 10px' }}>
            {moneda(total)}
          </div>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              color: pill.color,
              background: pill.fondo,
            }}
          >
            {pill.texto}
          </span>
        </div>

        <div>
          <div style={{ ...etiqueta, marginBottom: 8 }}>Evolución de compras</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 96 }}>
            {barras.map((b, i) => (
              <div
                key={b.clave}
                title={`${b.titulo}: ${moneda(b.total)}`}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
              >
                <div
                  style={{
                    width: '100%',
                    height: b.total > 0 ? `${Math.max((b.total / maxBarra) * 100, 6)}%` : 3,
                    borderRadius: 6,
                    background: i === barras.length - 1 ? 'var(--brand)' : 'rgba(232, 130, 26, 0.3)',
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            {barras.map((b, i) => (
              <div
                key={b.clave}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 10,
                  color: i === barras.length - 1 ? 'var(--text-900)' : 'var(--text-400)',
                  fontWeight: i === barras.length - 1 ? 700 : 500,
                  overflow: 'hidden',
                }}
              >
                {b.etiqueta}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
        {metrica('Proveedor con más gasto', topMarca)}
        {metrica('Insumo con más gasto', topInsumo)}
      </div>
    </div>
  );
}

/* ---------- Página ---------- */
export default function ReportesAdmin() {
  const hoy = aFechaISO(new Date());

  const [items, setItems] = useState<Venta[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [errorCompras, setErrorCompras] = useState(false);
  const [desde, setDesde] = useState(() => sumarDias(aFechaISO(new Date()), -6));
  const [hasta, setHasta] = useState(() => aFechaISO(new Date()));

  useEffect(() => {
    let activo = true;
    Promise.allSettled([
      apiClient.get('/ventas'),
      apiClient.get('/compras'),
    ]).then(([rVentas, rCompras]) => {
      if (!activo) return;

      if (rVentas.status === 'fulfilled') setItems(toArray<Venta>(rVentas.value.data));
      else { setItems([]); setErrorCarga(true); }

      if (rCompras.status === 'fulfilled') setCompras(toArray<Compra>(rCompras.value.data));
      else { setCompras([]); setErrorCompras(true); }

      setLoading(false);
    });
    return () => { activo = false; };
  }, []);

  /* ---------- Validación del rango ---------- */
  const dias = desde && hasta ? diasEntre(desde, hasta) : 0;

  let errorRango = '';
  if (!desde || !hasta) errorRango = 'Selecciona la fecha inicial y la final.';
  else if (desde > hasta) errorRango = 'La fecha inicial no puede ser posterior a la final.';
  else if (hasta > hoy) errorRango = 'No puedes consultar fechas futuras.';
  else if (dias > MAX_DIAS) errorRango = `El rango máximo permitido es de ${MAX_DIAS} días (seleccionaste ${dias}).`;

  const rangoValido = !errorRango;

  const aplicarPreset = (n: number) => {
    setHasta(hoy);
    setDesde(sumarDias(hoy, -(n - 1)));
  };

  const presetActivo = (n: number) => hasta === hoy && desde === sumarDias(hoy, -(n - 1));

  /* ---------- Reporte de ventas ---------- */
  const reporte = useMemo(() => {
    if (!rangoValido) return null;

    const enRango = items.filter((v) => {
      const f = fechaLocal(v?.fecha);
      return f >= desde && f <= hasta;
    });
    const validas = enRango.filter((v) => !ESTADOS_NO_CONTABLES.includes(v?.estado));
    const valorDe = (v: Venta) => Number(v?.valor_total) || 0;

    const ingresos = validas.reduce((a, v) => a + valorDe(v), 0);
    const ticketPromedio = validas.length ? ingresos / validas.length : 0;
    const noContables = enRango.length - validas.length;

    const agrupar = (clave: (v: Venta) => string) => {
      const m = new Map<string, { cantidad: number; total: number }>();
      validas.forEach((v) => {
        const k = clave(v) || 'Sin dato';
        const acc = m.get(k) ?? { cantidad: 0, total: 0 };
        acc.cantidad += 1;
        acc.total += valorDe(v);
        m.set(k, acc);
      });
      return [...m.entries()]
        .map(([nombre, d]) => ({ nombre, ...d }))
        .sort((a, b) => b.total - a.total);
    };

    const porMetodo = agrupar((v) => v?.metodo_pago);
    const porEntrega = agrupar((v) => v?.tipo_entrega);

    const estadoMap = new Map<string, number>();
    enRango.forEach((v) => estadoMap.set(v?.estado ?? 'Sin dato', (estadoMap.get(v?.estado ?? 'Sin dato') ?? 0) + 1));
    const porEstado = [...estadoMap.entries()]
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const prodMap = new Map<string, { cantidad: number; total: number }>();
    const comboMap = new Map<string, number>();
    validas.forEach((v) => {
      (v?.detalles ?? []).forEach((d) => {
        const nombre = d?.producto?.nombre ?? 'Producto';
        const acc = prodMap.get(nombre) ?? { cantidad: 0, total: 0 };
        acc.cantidad += Number(d?.cantidad) || 0;
        acc.total += Number(d?.subtotal) || (Number(d?.precio_unitario) || 0) * (Number(d?.cantidad) || 0);
        prodMap.set(nombre, acc);
      });
      (v?.promociones ?? []).forEach((p) => {
        const nombre = p?.nombre ?? 'Combo';
        comboMap.set(nombre, (comboMap.get(nombre) ?? 0) + 1);
      });
    });
    const topProductos = [...prodMap.entries()]
      .map(([nombre, d]) => ({ nombre, ...d }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
    const topCombos = [...comboMap.entries()]
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);

    const diaMap = new Map<string, { cantidad: number; total: number }>();
    validas.forEach((v) => {
      const f = fechaLocal(v?.fecha);
      const acc = diaMap.get(f) ?? { cantidad: 0, total: 0 };
      acc.cantidad += 1;
      acc.total += valorDe(v);
      diaMap.set(f, acc);
    });
    const porDia = Array.from({ length: diasEntre(desde, hasta) }, (_, i) => {
      const fecha = sumarDias(desde, i);
      return { fecha, ...(diaMap.get(fecha) ?? { cantidad: 0, total: 0 }) };
    });

    return {
      enRango, validas, ingresos, ticketPromedio, noContables,
      porMetodo, porEntrega, porEstado, topProductos, topCombos, porDia,
    };
  }, [items, desde, hasta, rangoValido]);

  /* ---------- Estadísticas de ventas para las gráficas (siguen el rango) ---------- */
  const statsRango = useMemo<EstadisticasVentas | null>(() => {
    if (!rangoValido) return null;

    const valorDe = (v: Venta) => Number(v?.valor_total) || 0;
    const contables = items.filter((v) => !ESTADOS_NO_CONTABLES.includes(v?.estado));
    const entre = (v: Venta, d: string, h: string) => {
      const f = fechaLocal(v?.fecha);
      return f >= d && f <= h;
    };

    const actuales = contables.filter((v) => entre(v, desde, hasta));
    const previas = contables.filter((v) => entre(v, sumarDias(desde, -dias), sumarDias(desde, -1)));

    const diaMap = new Map<string, { total: number; pedidos: number }>();
    actuales.forEach((v) => {
      const f = fechaLocal(v?.fecha);
      const acc = diaMap.get(f) ?? { total: 0, pedidos: 0 };
      acc.total += valorDe(v);
      acc.pedidos += 1;
      diaMap.set(f, acc);
    });
    const por_dia = Array.from({ length: dias }, (_, i) => {
      const dia = sumarDias(desde, i);
      return { dia, ...(diaMap.get(dia) ?? { total: 0, pedidos: 0 }) };
    });

    const prodMap = new Map<string, number>();
    actuales.forEach((v) =>
      (v?.detalles ?? []).forEach((d) => {
        const nombre = d?.producto?.nombre ?? 'Producto';
        prodMap.set(nombre, (prodMap.get(nombre) ?? 0) + (Number(d?.cantidad) || 0));
      })
    );
    const por_producto = [...prodMap.entries()]
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6);

    const pagoMap = new Map<string, number>();
    actuales.forEach((v) => {
      const k = v?.metodo_pago ?? 'Sin dato';
      pagoMap.set(k, (pagoMap.get(k) ?? 0) + valorDe(v));
    });
    const por_pago = [...pagoMap.entries()].map(([metodo, total]) => ({ metodo, total }));

    const ventasDeHoy = contables.filter((v) => fechaLocal(v?.fecha) === hoy);

    return {
      por_dia,
      por_producto,
      por_pago,
      total_periodo: actuales.reduce((a, v) => a + valorDe(v), 0),
      pedidos_periodo: actuales.length,
      total_previo: previas.reduce((a, v) => a + valorDe(v), 0),
      ventas_hoy: ventasDeHoy.length,
      ingresos_hoy: ventasDeHoy.reduce((a, v) => a + valorDe(v), 0),
      total_ventas: contables.length,
      ingresos_totales: contables.reduce((a, v) => a + valorDe(v), 0),
    } as unknown as EstadisticasVentas;
  }, [items, desde, hasta, dias, hoy, rangoValido]);

  /* ---------- Reporte de compras (mismo rango de fechas) ---------- */
  const reporteCompras = useMemo(() => {
    if (!rangoValido) return null;

    const enRango = compras.filter((c) => {
      const f = diaCompra(c?.fecha);
      return f >= desde && f <= hasta;
    });
    const valorDe = (c: Compra) => Number(c?.valor_total) || 0;
    const total = enRango.reduce((a, c) => a + valorDe(c), 0);

    // Periodo anterior de la misma duración
    const prevDesde = sumarDias(desde, -dias);
    const prevHasta = sumarDias(desde, -1);
    const totalPrevio = compras
      .filter((c) => {
        const f = diaCompra(c?.fecha);
        return f >= prevDesde && f <= prevHasta;
      })
      .reduce((a, c) => a + valorDe(c), 0);

    // Barras de evolución: máximo 12 tramos dentro del rango
    const tam = Math.ceil(dias / Math.min(dias, 12));
    const nBarras = Math.ceil(dias / tam);
    const barras = Array.from({ length: nBarras }, (_, i) => {
      const ini = sumarDias(desde, i * tam);
      const fin = sumarDias(desde, Math.min((i + 1) * tam, dias) - 1);
      const totalTramo = enRango
        .filter((c) => {
          const f = diaCompra(c?.fecha);
          return f >= ini && f <= fin;
        })
        .reduce((a, c) => a + valorDe(c), 0);
      return {
        clave: ini,
        etiqueta: ddmm(ini),
        titulo: ini === fin ? ddmm(ini) : `${ddmm(ini)} al ${ddmm(fin)}`,
        total: totalTramo,
      };
    });

    const metodoMap = new Map<string, { cantidad: number; total: number }>();
    enRango.forEach((c) => {
      const k = c?.metodo_pago || 'Sin dato';
      const acc = metodoMap.get(k) ?? { cantidad: 0, total: 0 };
      acc.cantidad += 1;
      acc.total += valorDe(c);
      metodoMap.set(k, acc);
    });
    const porMetodo = [...metodoMap.entries()]
      .map(([nombre, d]) => ({ nombre, ...d }))
      .sort((a, b) => b.total - a.total);

    const topPor = (nombreDe: (d: DetalleCompra) => string | undefined) => {
      const m = new Map<string, number>();
      enRango.forEach((c) =>
        (c?.detalles ?? []).forEach((d) => {
          const nombre = nombreDe(d);
          if (!nombre) return;
          m.set(nombre, (m.get(nombre) ?? 0) + (Number(d?.subtotal) || 0));
        })
      );
      return [...m.entries()]
        .map(([nombre, valor]) => ({ nombre, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10);
    };

    return {
      enRango,
      total,
      totalPrevio,
      barras,
      promedio: enRango.length ? total / enRango.length : 0,
      mayor: enRango.reduce((a, c) => Math.max(a, valorDe(c)), 0),
      porMetodo,
      topInsumos: topPor((d) => d?.materia_prima?.nombre),
      topMarcas: topPor((d) => d?.marca?.nombre),
    };
  }, [compras, desde, hasta, dias, rangoValido]);

  /* ---------- Exportar CSV (ventas del rango) ---------- */
  const exportarCSV = () => {
    if (!reporte) return;
    const encabezado = ['#', 'Fecha', 'Cliente', 'Productos', 'Combos', 'Método', 'Entrega', 'Estado', 'Total'];
    const filas = reporte.enRango.map((v) => [
      v.id,
      fechaLocal(v.fecha),
      nombreCliente(v),
      (v.detalles ?? []).map((d) => `${d?.producto?.nombre ?? 'Producto'} x${d?.cantidad ?? 0}`).join(' | '),
      (v.promociones ?? []).map((p) => p?.nombre).join(' | '),
      v.metodo_pago,
      v.tipo_entrega,
      v.estado,
      Math.round(Number(v.valor_total) || 0),
    ]);
    // BOM + separador ";" para que Excel abra bien las tildes y las columnas
    const csv = [encabezado, ...filas].map((f) => f.map(csvCelda).join(';')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-ventas_${desde}_a_${hasta}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (loading) {
    return <AdminLoading texto="Cargando reportes" subtexto="Preparando la información de ventas y compras" />;
  }

  const etiquetaDia = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' });

  const maxDia = reporte ? Math.max(1, ...reporte.porDia.map((d) => d.total)) : 1;
  const maxMetodo = reporte ? Math.max(1, ...reporte.porMetodo.map((d) => d.total)) : 1;
  const maxEntrega = reporte ? Math.max(1, ...reporte.porEntrega.map((d) => d.total)) : 1;
  const maxEstado = reporte ? Math.max(1, ...reporte.porEstado.map((d) => d.cantidad)) : 1;
  const maxProducto = reporte ? Math.max(1, ...reporte.topProductos.map((d) => d.cantidad)) : 1;
  const maxCombo = reporte ? Math.max(1, ...reporte.topCombos.map((d) => d.cantidad)) : 1;

  const maxMetodoCompra = reporteCompras ? Math.max(1, ...reporteCompras.porMetodo.map((d) => d.total)) : 1;
  const maxInsumoCompra = reporteCompras ? Math.max(1, ...reporteCompras.topInsumos.map((d) => d.valor)) : 1;
  const maxMarcaCompra = reporteCompras ? Math.max(1, ...reporteCompras.topMarcas.map((d) => d.valor)) : 1;

  const balance = reporte && reporteCompras ? reporte.ingresos - reporteCompras.total : 0;

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Reportes</h1>
          <p className="subtitulo">Consulta por rango de fechas · máximo {MAX_DIAS} días por reporte</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={exportarCSV}
          disabled={!reporte || reporte.enRango.length === 0}
          style={{ opacity: reporte && reporte.enRango.length ? 1 : 0.5, cursor: reporte && reporte.enRango.length ? 'pointer' : 'not-allowed' }}
        >
          Exportar ventas CSV
        </button>
      </div>

      {/* ---------- Selector de rango ---------- */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 22, marginBottom: 24, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {PRESETS.map((p) => (
            <button
              key={p.dias}
              type="button"
              className={presetActivo(p.dias) ? 'btn-primary' : 'btn-cancel'}
              style={{ padding: '7px 16px', fontSize: 13, flex: 'none', width: 'auto' }}
              onClick={() => aplicarPreset(p.dias)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Desde</label>
            <input
              type="date"
              value={desde}
              max={hasta || hoy}
              min={hasta ? sumarDias(hasta, -(MAX_DIAS - 1)) : undefined}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Hasta</label>
            <input
              type="date"
              value={hasta}
              min={desde || undefined}
              max={desde && sumarDias(desde, MAX_DIAS - 1) < hoy ? sumarDias(desde, MAX_DIAS - 1) : hoy}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          {rangoValido && (
            <span style={{ fontSize: 13, color: 'var(--text-600)', paddingBottom: 10 }}>
              {dias} {dias === 1 ? 'día' : 'días'} de {MAX_DIAS} permitidos
            </span>
          )}
        </div>

        {errorRango && (
          <p style={{ margin: '12px 0 0', fontSize: 13, fontWeight: 600, color: '#c0392b' }}>{errorRango}</p>
        )}
      </div>

      {errorCarga && (
        <p style={{ fontSize: 13, fontWeight: 600, color: '#c0392b', marginBottom: 16 }}>
          No se pudieron cargar las ventas. Intenta recargar la página.
        </p>
      )}
      {errorCompras && (
        <p style={{ fontSize: 13, fontWeight: 600, color: '#c0392b', marginBottom: 16 }}>
          No se pudieron cargar las compras. Intenta recargar la página.
        </p>
      )}

      {reporte && reporteCompras && (
        <>
          {/* ================= VENTAS ================= */}
          <Seccion titulo="Ventas" sub="Resumen del rango de fechas seleccionado" />

          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-label">Ventas</span>
              <span className="stat-val">{reporte.validas.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Ingresos</span>
              <span className="stat-val stat-val-dinero" title={moneda(reporte.ingresos)}>{moneda(reporte.ingresos)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Ticket promedio</span>
              <span className="stat-val stat-val-dinero" title={moneda(reporte.ticketPromedio)}>{moneda(reporte.ticketPromedio)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Canceladas / reembolsadas</span>
              <span className="stat-val">{reporte.noContables}</span>
            </div>
          </div>

          {/* Gráficas de ventas: ahora siguen el rango Desde / Hasta */}
          <div style={{ marginTop: 24 }}>
            <VentasGraficas
              datos={statsRango}
              cargando={false}
              error={false}
              dias={dias}
              onCambiarDias={aplicarPreset}
            />
          </div>

          {reporte.enRango.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>
              No hay ventas registradas en este rango.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginTop: 24 }}>
              <Panel titulo="Ventas por día" scroll>
                <ListaBarras
                  filas={reporte.porDia.map((d) => ({
                    id: d.fecha,
                    nombre: etiquetaDia(d.fecha),
                    principal: moneda(d.total),
                    secundario: `${d.cantidad} ${d.cantidad === 1 ? 'venta' : 'ventas'}`,
                    proporcion: d.total / maxDia,
                  }))}
                />
              </Panel>

              <Panel titulo="Por método de pago">
                <ListaBarras
                  filas={reporte.porMetodo.map((d) => ({
                    nombre: d.nombre,
                    principal: moneda(d.total),
                    secundario: `${d.cantidad}`,
                    proporcion: d.total / maxMetodo,
                  }))}
                />
              </Panel>

              <Panel titulo="Por tipo de entrega">
                <ListaBarras
                  filas={reporte.porEntrega.map((d) => ({
                    nombre: d.nombre,
                    principal: moneda(d.total),
                    secundario: `${d.cantidad}`,
                    proporcion: d.total / maxEntrega,
                  }))}
                />
              </Panel>

              <Panel titulo="Por estado">
                <ListaBarras
                  filas={reporte.porEstado.map((d) => ({
                    nombre: d.nombre,
                    principal: `${d.cantidad}`,
                    proporcion: d.cantidad / maxEstado,
                  }))}
                />
              </Panel>

              <Panel titulo="Productos más vendidos">
                <ListaBarras
                  filas={reporte.topProductos.map((d) => ({
                    nombre: d.nombre,
                    principal: `${d.cantidad} uds`,
                    secundario: moneda(d.total),
                    proporcion: d.cantidad / maxProducto,
                  }))}
                />
              </Panel>

              <Panel titulo="Combos más vendidos">
                <ListaBarras
                  vacio="No se vendieron combos en este rango"
                  filas={reporte.topCombos.map((d) => ({
                    nombre: d.nombre,
                    principal: `${d.cantidad} ${d.cantidad === 1 ? 'venta' : 'ventas'}`,
                    proporcion: d.cantidad / maxCombo,
                  }))}
                />
              </Panel>
            </div>
          )}

          {/* ================= COMPRAS ================= */}
          <Seccion titulo="Compras" sub="Resumen del rango de fechas seleccionado" />

          {/* Resumen de compras: ahora sigue el rango Desde / Hasta */}
          <ResumenCompras
            total={reporteCompras.total}
            totalPrevio={reporteCompras.totalPrevio}
            barras={reporteCompras.barras}
            topMarca={reporteCompras.topMarcas[0] ?? null}
            topInsumo={reporteCompras.topInsumos[0] ?? null}
          />

          <ResumenCompras
            total={reporteCompras.total}
            totalPrevio={reporteCompras.totalPrevio}
            barras={reporteCompras.barras}
            topMarca={reporteCompras.topMarcas[0] ?? null}
            topInsumo={reporteCompras.topInsumos[0] ?? null}
          />

          <div style={{ marginBottom: 24 }}>
            <Panel titulo="Productos más vendidos">
              <ListaBarras
                vacio="No hay productos vendidos en este rango"
                filas={reporte.topProductos.map((d) => ({
                  nombre: d.nombre,
                  principal: `${d.cantidad} uds`,
                  secundario: moneda(d.total),
                  proporcion: d.cantidad / maxProducto,
                }))}
              />
            </Panel>
          </div>
          {reporteCompras.enRango.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>
              No hay compras registradas en este rango.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginTop: 24 }}>
              <Panel titulo="Compras por método de pago">
                <ListaBarras
                  filas={reporteCompras.porMetodo.map((d) => ({
                    nombre: d.nombre,
                    principal: moneda(d.total),
                    secundario: `${d.cantidad} ${d.cantidad === 1 ? 'compra' : 'compras'}`,
                    proporcion: d.total / maxMetodoCompra,
                  }))}
                />
              </Panel>

              <Panel titulo="Insumos con más gasto">
                <ListaBarras
                  filas={reporteCompras.topInsumos.map((d) => ({
                    nombre: d.nombre,
                    principal: moneda(d.valor),
                    proporcion: d.valor / maxInsumoCompra,
                  }))}
                />
              </Panel>

              <Panel titulo="Proveedores (marcas) con más gasto">
                <ListaBarras
                  filas={reporteCompras.topMarcas.map((d) => ({
                    nombre: d.nombre,
                    principal: moneda(d.valor),
                    proporcion: d.valor / maxMarcaCompra,
                  }))}
                />
              </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
}