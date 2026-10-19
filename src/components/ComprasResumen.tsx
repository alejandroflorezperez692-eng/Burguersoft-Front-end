import { useMemo } from 'react';
import type { CSSProperties } from 'react';

interface DetalleResumen {
  subtotal: number | string;
  materia_prima?: { nombre: string };
  marca?: { nombre: string };
}

interface CompraResumen {
  fecha: string;
  valor_total: number | string;
  detalles?: DetalleResumen[];
}

const peso = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

/** Fecha de un mes relativo al actual (0 = este mes, -1 = el anterior...). */
function mesRelativo(offset: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return {
    clave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    nombre: d.toLocaleDateString('es-CO', { month: 'long' }),
    corto: d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
  };
}

/** Suma subtotales por nombre y devuelve el que más gastó. */
function mayorGasto(filas: { nombre?: string; valor: number }[]): { nombre: string; valor: number } | null {
  const acum: Record<string, number> = {};
  for (const f of filas) {
    if (!f.nombre) continue;
    acum[f.nombre] = (acum[f.nombre] ?? 0) + f.valor;
  }
  const top = Object.entries(acum).sort((a, b) => b[1] - a[1])[0];
  return top ? { nombre: top[0], valor: top[1] } : null;
}

const MESES_GRAFICA = 6;

/** Resumen de Compras: gasto del mes frente al último mes con datos, evolución de 6 meses y lo que más pesó. */
export default function ComprasResumen({ items }: { items: CompraResumen[] }) {
  const r = useMemo(() => {
    const porMes: Record<string, number> = {};
    for (const c of items) {
      const k = String(c.fecha).slice(0, 7);
      porMes[k] = (porMes[k] ?? 0) + Number(c.valor_total);
    }

    const actual = mesRelativo(0);
    const totalMes = porMes[actual.clave] ?? 0;
    const delMes = items.filter((c) => String(c.fecha).slice(0, 7) === actual.clave);

    // Último mes anterior que tenga compras (no solo el inmediato)
    let previo: { nombre: string; total: number } | null = null;
    for (let o = -1; o >= -12; o--) {
      const m = mesRelativo(o);
      if ((porMes[m.clave] ?? 0) > 0) {
        previo = { nombre: m.nombre, total: porMes[m.clave] };
        break;
      }
    }

    const barras = Array.from({ length: MESES_GRAFICA }, (_, i) => {
      const m = mesRelativo(i - (MESES_GRAFICA - 1));
      return { ...m, total: porMes[m.clave] ?? 0, esActual: i === MESES_GRAFICA - 1 };
    });

    const detalles = delMes.flatMap((c) => c.detalles ?? []);
    const historico = items.reduce((a, c) => a + Number(c.valor_total), 0);

    return {
      actual,
      totalMes,
      nCompras: delMes.length,
      promedio: delMes.length > 0 ? totalMes / delMes.length : 0,
      previo,
      barras,
      maxBarra: Math.max(...barras.map((b) => b.total), 1),
      topProveedor: mayorGasto(detalles.map((d) => ({ nombre: d.marca?.nombre, valor: Number(d.subtotal) }))),
      topInsumo: mayorGasto(detalles.map((d) => ({ nombre: d.materia_prima?.nombre, valor: Number(d.subtotal) }))),
      historico,
      nHistorico: items.length,
    };
  }, [items]);

  // Pastilla de comparación
  let pill: { texto: string; color: string; fondo: string };
  if (!r.previo) {
    pill = { texto: 'Primer mes con compras', color: 'var(--text-400)', fondo: 'var(--surface-2)' };
  } else if (r.totalMes === 0) {
    pill = { texto: `Aún sin compras · en ${r.previo.nombre} fueron ${peso(r.previo.total)}`, color: 'var(--text-400)', fondo: 'var(--surface-2)' };
  } else {
    const pct = Math.round(((r.totalMes - r.previo.total) / r.previo.total) * 100);
    if (pct === 0) {
      pill = { texto: `Igual que en ${r.previo.nombre}`, color: 'var(--text-400)', fondo: 'var(--surface-2)' };
    } else {
      const sube = pct > 0;
      pill = {
        texto: `${sube ? '▲' : '▼'} ${Math.abs(pct)}% frente a ${r.previo.nombre}`,
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

  const metrica = (titulo: string, valor: string, sub?: string) => (
    <div style={{ flex: '1 1 180px', minWidth: 0 }}>
      <div style={etiqueta}>{titulo}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-900)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {valor}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-400)', marginTop: 2 }}>{sub}</div>}
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
        marginBottom: 28,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 28, alignItems: 'end' }}>
        <div>
          <div style={etiqueta}>Invertido en {r.actual.nombre}</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 34, fontWeight: 800, color: 'var(--text-900)', lineHeight: 1.1, margin: '8px 0 10px' }}>
            {peso(r.totalMes)}
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
          <div style={{ fontSize: 13, color: 'var(--text-400)', marginTop: 10 }}>
            {r.nCompras === 1 ? '1 compra' : `${r.nCompras} compras`}
            {r.nCompras > 0 && ` · promedio ${peso(r.promedio)}`}
          </div>
        </div>

        <div>
          <div style={{ ...etiqueta, marginBottom: 8 }}>Últimos {MESES_GRAFICA} meses</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 96 }}>
            {r.barras.map((b) => (
              <div key={b.clave} title={`${b.nombre}: ${peso(b.total)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <div
                  style={{
                    width: '100%',
                    height: b.total > 0 ? `${Math.max((b.total / r.maxBarra) * 100, 6)}%` : 3,
                    borderRadius: 6,
                    background: b.esActual ? 'var(--brand)' : 'rgba(232, 130, 26, 0.3)',
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            {r.barras.map((b) => (
              <div key={b.clave} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: b.esActual ? 'var(--text-900)' : 'var(--text-400)', fontWeight: b.esActual ? 700 : 500, textTransform: 'capitalize' }}>
                {b.corto}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
        {metrica('Proveedor con más gasto', r.topProveedor ? r.topProveedor.nombre : '—', r.topProveedor ? peso(r.topProveedor.valor) : 'Sin compras este mes')}
        {metrica('Insumo con más gasto', r.topInsumo ? r.topInsumo.nombre : '—', r.topInsumo ? peso(r.topInsumo.valor) : 'Sin compras este mes')}
        {metrica('Total histórico', peso(r.historico), `${r.nHistorico} compras registradas`)}
      </div>
    </div>
  );
}