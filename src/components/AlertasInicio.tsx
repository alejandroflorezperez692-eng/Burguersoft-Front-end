import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { conectarAlertas, desconectarAlertas } from '../api/echo';
import { peso } from '../utils/variacion';

interface Alerta {
  tipo: 'stock' | 'precio' | 'pedido' | 'comprobante' | 'pago';
  nivel: 'alta' | 'media' | 'info';
  titulo: string;
  detalle: string;
}

interface Resumen {
  ventas: number;
  ventas_anterior: number;
  ventas_n: number;
  compras: number;
  compras_anterior: number;
  top_producto: string | null;
  texto: string;
}

interface RespuestaAlertas {
  alertas: Alerta[];
  resumen: Resumen;
}

const COLOR_NIVEL: Record<Alerta['nivel'], string> = {
  alta: 'var(--danger)',
  media: 'var(--brand)',
  info: '#2e7d32',
};

const ICONO: Record<Alerta['tipo'], string> = {
  stock: '📦',
  precio: '💲',
  pedido: '🧾',
  comprobante: '📄',
  pago: '💳',
};


export default function AlertasInicio() {
  const [datos, setDatos] = useState<RespuestaAlertas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [recarga, setRecarga] = useState(0);

 
  useEffect(() => {
    const canal = conectarAlertas(() => setRecarga((n) => n + 1));
    return () => {
      if (canal) desconectarAlertas(canal, () => undefined);
    };
  }, []);

  useEffect(() => {
    let vivo = true;
    apiClient
      .get<RespuestaAlertas>('/alertas')
      .then(({ data }) => {
        if (vivo) setDatos(data);
      })
      .catch(() => {
      
        if (vivo) setDatos(null);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [recarga]);

  if (cargando || !datos) return null;

  const { alertas, resumen } = datos;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: 24,
        marginBottom: 24,
      }}
    >
      <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, color: 'var(--text-900)', marginBottom: 12 }}>
        Resumen de la semana
      </h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-900)', marginBottom: 6 }}>{resumen.texto}</p>
      <p style={{ fontSize: 12, color: 'var(--text-400)', marginBottom: 20 }}>
        Ventas {peso(resumen.ventas)} · Compras {peso(resumen.compras)}
      </p>

      <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, color: 'var(--text-900)', marginBottom: 12 }}>
        Alertas
      </h3>
      {alertas.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-400)' }}>
          Todo en orden: no hay pedidos pendientes, comprobantes por aprobar ni insumos por agotarse.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alertas.map((a, i) => (
            <div
              key={`${a.tipo}-${i}`}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                borderLeft: `4px solid ${COLOR_NIVEL[a.nivel]}`,
                background: 'var(--surface-2)',
              }}
            >
              <span aria-hidden="true">{ICONO[a.tipo]}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-900)' }}>{a.titulo}</div>
                <div style={{ fontSize: 12, color: 'var(--text-400)', marginTop: 2 }}>{a.detalle}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}