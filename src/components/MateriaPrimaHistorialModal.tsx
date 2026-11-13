import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
import { useToast } from './Toast';
import '../styles/historial-insumo.css';
import {
  armarPeriodos,
  exportarHistorialInsumoExcel,
  type CierreInsumo,
  type CompraInsumo,
} from '../utils/exportarHistorialInsumoExcel';

interface Insumo {
  id: number;
  nombre: string;
  tipo?: string | null;
  valor: number;
  cantidad: number;
  unidad_medida?: string | null;
  estado?: string | null;
}

interface Props {
  insumo: Insumo;
  proveedor: string;
  onClose: () => void;
}

const num = (v: unknown): number => Number(v ?? 0) || 0;
const moneda = (v: number) => `$${Math.round(v).toLocaleString('es-CO')}`;
const cant = (v: unknown) => num(v).toLocaleString('es-CO', { maximumFractionDigits: 2 });

const fechaHora = (s?: string | null) => {
  const m = String(s ?? '').match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return '—';
  return `${m[3]}/${m[2]}/${m[1]}${m[4] ? ` ${m[4]}:${m[5]}` : ''}`;
};

export default function MateriaPrimaHistorialModal({ insumo, proveedor, onClose }: Props) {
  const { showToast } = useToast();
  const [compras, setCompras] = useState<CompraInsumo[]>([]);
  const [cierres, setCierres] = useState<CierreInsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    apiClient
      .get(`/materias-primas/${insumo.id}/historial`)
      .then(({ data }) => {
        if (!vivo) return;
        setCompras(Array.isArray(data?.compras) ? data.compras : []);
        setCierres(Array.isArray(data?.cierres) ? data.cierres : []);
      })
      .catch(() => {
        if (vivo) showToast('No se pudo cargar el historial del insumo', true);
      })
      .finally(() => {
        if (vivo) setLoading(false);
      });
    return () => {
      vivo = false;
    };
  }, [insumo.id]);

  const unidad = insumo.unidad_medida ? ` ${insumo.unidad_medida}` : '';
  const inactivo = insumo.estado === 'Inactivo';

  const periodos = useMemo(() => armarPeriodos(compras, cierres), [compras, cierres]);

  const totales = useMemo(
    () => ({
      compras: periodos.reduce((a, p) => a + p.nCompras, 0),
      cantidad: periodos.reduce((a, p) => a + p.cantidad, 0),
      gastado: periodos.reduce((a, p) => a + p.gastado, 0),
      diferencia: periodos.reduce((a, p) => a + (p.cierre ? num(p.cierre.diferencia) : 0), 0),
    }),
    [periodos],
  );

  const exportar = async () => {
    setExportando(true);
    try {
      await exportarHistorialInsumoExcel({
        insumo: {
          nombre: insumo.nombre,
          tipo: insumo.tipo,
          unidad_medida: insumo.unidad_medida,
          cantidad: num(insumo.cantidad),
          valor: num(insumo.valor),
          proveedor,
          estado: inactivo ? 'Inactivo' : 'Activo',
        },
        compras,
        cierres,
      });
      showToast('Excel descargado', false);
    } catch {
      showToast('No se pudo generar el Excel', true);
    } finally {
      setExportando(false);
    }
  };

  const badgeDiferencia = (v: unknown) => {
    const d = num(v);
    if (d === 0) return <span className="badge badge-success">Sin diferencia</span>;
    return (
      <span className={`badge ${d < 0 ? 'badge-danger' : 'badge-warning'}`}>
        {d > 0 ? '+' : ''}
        {cant(d)}
      </span>
    );
  };

  return (
    <div className="mn-modal-overlay" onClick={onClose}>
      <div className="mn-modal-box hm-box" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-x" onClick={onClose} aria-label="Cerrar">×</button>

        <div className="hm-head">
          <div>
            <h3 className="hm-titulo">{insumo.nombre}</h3>
            <div className="hm-badges">
              <span className={`badge ${inactivo ? 'badge-danger' : 'badge-success'}`}>
                {inactivo ? 'Inactivo' : 'Activo'}
              </span>
              {insumo.tipo && <span className="hm-tipo">{insumo.tipo}</span>}
              <span className="hm-tipo">· Proveedor: {proveedor || '—'}</span>
            </div>
          </div>
          <button
            type="button"
            className="hm-btn-excel"
            onClick={() => void exportar()}
            disabled={loading || exportando}
          >
            {exportando ? 'Generando…' : '⬇ Exportar a Excel'}
          </button>
        </div>

        <div className="hm-kpis">
          <div className="hm-kpi">
            <span>Stock actual</span>
            <strong>{cant(insumo.cantidad)}{unidad}</strong>
          </div>
          <div className="hm-kpi">
            <span>Precio por unidad</span>
            <strong>{moneda(num(insumo.valor))}</strong>
          </div>
          <div className="hm-kpi">
            <span>Valor en inventario</span>
            <strong>{moneda(num(insumo.valor) * num(insumo.cantidad))}</strong>
          </div>
        </div>

        {!loading && periodos.length === 0 ? (
          <p className="hm-vacio" style={{ textAlign: 'center', padding: '24px 0' }}>
            Este insumo todavía no tiene compras ni cierres de inventario
          </p>
        ) : (
          <div className="tabla-responsive hm-tabla">
            <table className="data-table hm-vs" style={{ minWidth: 980 }}>
              <thead>
                <tr className="hm-grupos">
                  <th rowSpan={2} className="hm-g-periodo">Período</th>
                  <th colSpan={3} className="hm-g-compras">Compras</th>
                  <th colSpan={4} className="hm-g-cierre hm-sep">Cierre de inventario</th>
                </tr>
                <tr>
                  <th style={{ textAlign: 'right' }}># Compras</th>
                  <th style={{ textAlign: 'right' }}>Cantidad</th>
                  <th style={{ textAlign: 'right' }}>Total gastado</th>
                  <th style={{ textAlign: 'right' }} className="hm-sep">Stock inicial</th>
                  <th style={{ textAlign: 'right' }}>Esperado</th>
                  <th style={{ textAlign: 'right' }}>Conteo real</th>
                  <th>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="hm-vacio">…</td></tr>
                ) : (
                  <>
                    {periodos.map((p) => (
                  <tr key={p.clave}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.titulo}</div>
                      <div className="hm-sub">
                        {p.desde ? fechaHora(p.desde) : 'Inicio'} → {p.hasta ? fechaHora(p.hasta) : 'En curso'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>{p.nCompras}</td>
                    <td style={{ textAlign: 'right' }}>{cant(p.cantidad)}{unidad}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{moneda(p.gastado)}</td>
                    {p.cierre ? (
                      <>
                        <td style={{ textAlign: 'right' }} className="hm-sep">{cant(p.cierre.stock_inicial)}</td>
                        <td style={{ textAlign: 'right' }}>{cant(p.cierre.stock_esperado)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{cant(p.cierre.conteo_real)}{unidad}</td>
                        <td>{badgeDiferencia(p.cierre.diferencia)}</td>
                      </>
                    ) : (
                      <td colSpan={4} className="hm-sep hm-pendiente">
                        Pendiente de cierre · stock actual {cant(insumo.cantidad)}{unidad}
                      </td>
                    )}
                  </tr>
                ))}
                    </>
                )}
                {periodos.length > 0 && (
                  <tr className="hm-total">
                    <td>Total</td>
                    <td style={{ textAlign: 'right' }}>{totales.compras}</td>
                    <td style={{ textAlign: 'right' }}>{cant(totales.cantidad)}{unidad}</td>
                    <td style={{ textAlign: 'right' }}>{moneda(totales.gastado)}</td>
                    <td colSpan={3} className="hm-sep" />
                    <td>{badgeDiferencia(totales.diferencia)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mn-modal-actions" style={{ marginTop: 18 }}>
          <button type="button" className="mn-btn-cancel" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}