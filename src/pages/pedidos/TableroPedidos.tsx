import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import apiClient from '../../api/client';
import { getEcho } from '../../api/echo';
import AdminLoading from '../../components/AdminLoading';
import ToastMessage, { useToast } from '../../components/Toast';
import { useAuth } from '../../hooks/useAuth';
import { normalizarRol } from '../../utils/roles';

interface DetallePedido {
  id: number;
  cantidad: number;
  producto?: { nombre?: string };
}

interface Pedido {
  id: number;
  fecha: string;
  estado: string;
  tipo_entrega: string;
  cliente_nombre?: string | null;
  usuario?: { nombre: string; apellido: string } | null;
  detalles: DetallePedido[];
  promociones?: { id: number; nombre: string }[];
}

interface Accion {
  label: string;
  estado: string;
  peligro?: boolean;
}

interface Columna {
  titulo: string;
  estados: string[];
}

const REFRESCO_MS = 15_000;

const COLUMNAS_COCINA: Columna[] = [
  { titulo: 'Por preparar', estados: ['Pagado'] },
  { titulo: 'En preparación', estados: ['En cocina', 'En barra'] },
];

const COLUMNAS_CAJA: Columna[] = [
  ...COLUMNAS_COCINA,
  { titulo: 'Listos para entregar', estados: ['Listo para recoger'] },
  { titulo: 'En camino', estados: ['En camino'] },
];

/** Botones que ve cada rol según el estado del pedido. */
function accionesPara(pedido: Pedido, rol: string): Accion[] {
  const esCocina = rol === 'cocinero';

  switch (pedido.estado) {
    case 'Pagado':
      return esCocina
        ? [{ label: 'Empezar a preparar', estado: 'En cocina' }]
        : [
            { label: 'Pasar a cocina', estado: 'En cocina' },
            { label: 'Cancelar', estado: 'Cancelado', peligro: true },
          ];
    case 'En cocina':
    case 'En barra':
      return [{ label: 'Marcar listo', estado: 'Listo para recoger' }];
    case 'Listo para recoger':
      if (esCocina) return [];
      return pedido.tipo_entrega === 'Domicilio'
        ? [{ label: 'Enviar a domicilio', estado: 'En camino' }]
        : [{ label: 'Entregar', estado: 'Entregado' }];
    case 'En camino':
      return esCocina ? [] : [{ label: 'Marcar entregado', estado: 'Entregado' }];
    default:
      return [];
  }
}

function minutosDesde(fecha: string): number | null {
  const t = new Date(fecha.replace(' ', 'T')).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 60000));
}

export default function TableroPedidos() {
  const { user } = useAuth();
  const rol = normalizarRol(user?.role);
  const columnas = rol === 'cocinero' ? COLUMNAS_COCINA : COLUMNAS_CAJA;
  const { toast, showToast } = useToast();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [ocupado, setOcupado] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await apiClient.get<Pedido[] | { data?: Pedido[] }>('/pedidos/tablero');
      setPedidos(Array.isArray(data) ? data : (data.data ?? []));
    } catch {
      /* se reintenta en el siguiente ciclo */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    // Respaldo: refresca cada 15 s por si el websocket (Reverb) está caído
    const intervalo = window.setInterval(cargar, REFRESCO_MS);
    // Canal público 'cocina': el backend avisa cada vez que una venta cambia
    const canal = getEcho()?.channel('cocina');
    canal?.listen('.venta.actualizada', cargar);

    return () => {
      window.clearInterval(intervalo);
      canal?.stopListening('.venta.actualizada', cargar);
    };
  }, [cargar]);

  const cambiarEstado = async (pedido: Pedido, estado: string) => {
    setOcupado(pedido.id);
    try {
      await apiClient.patch(`/ventas/${pedido.id}/estado`, { estado });
      await cargar();
    } catch (err) {
      const data = isAxiosError(err)
        ? (err.response?.data as { message?: string; error?: string } | undefined)
        : undefined;
      showToast(data?.message ?? data?.error ?? 'No se pudo cambiar el estado.', true);
    } finally {
      setOcupado(null);
    }
  };

  if (loading) {
    return <AdminLoading texto="Cargando pedidos" subtexto="Buscando pedidos activos" />;
  }

  const nombreCliente = (p: Pedido) =>
    p.cliente_nombre || (p.usuario ? `${p.usuario.nombre} ${p.usuario.apellido}`.trim() : '');

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>{rol === 'cocinero' ? 'Cocina' : 'Pedidos'}</h1>
          <p className="subtitulo">Se actualiza solo · {pedidos.length} pedido(s) activo(s)</p>
        </div>
        <button className="btn-primary" onClick={cargar}>Actualizar</button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {columnas.map((col) => {
          const lista = pedidos.filter((p) => col.estados.includes(p.estado));

          return (
            <section
              key={col.titulo}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)',
                padding: 14,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: 'var(--text-900)' }}>
                {col.titulo} <span className="badge badge-gray">{lista.length}</span>
              </h3>

              {lista.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-400)', fontSize: 13, padding: '16px 0' }}>
                  Sin pedidos
                </p>
              )}

              {lista.map((p) => {
                const minutos = minutosDesde(p.fecha);
                const acciones = accionesPara(p, rol);

                return (
                  <article
                    key={p.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-sm)',
                      padding: 12,
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <strong style={{ color: 'var(--text-900)' }}>Pedido #{p.id}</strong>
                      <span className="badge badge-info">{p.tipo_entrega}</span>
                    </div>

                    <p style={{ fontSize: 12, color: 'var(--text-600)', margin: '4px 0 8px' }}>
                      {nombreCliente(p) || 'Cliente'}
                      {minutos !== null && ` · hace ${minutos} min`}
                    </p>

                    <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 14, color: 'var(--text-900)' }}>
                      {(p.detalles ?? []).map((d, i) => (
                        <li key={`${d.id}-${i}`}>
                          {d.producto?.nombre ?? 'Producto'} <strong>x{d.cantidad}</strong>
                        </li>
                      ))}
                    </ul>

                    {(p.promociones ?? []).map((promo, i) => (
                      <span key={`${promo.id}-${i}`} className="badge badge-info" style={{ fontSize: 10, marginRight: 4 }}>
                        {promo.nombre}
                      </span>
                    ))}

                    {acciones.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                        {acciones.map((a) => (
                          <button
                            key={a.estado}
                            type="button"
                            className={a.peligro ? 'btn-cancel' : 'btn-save'}
                            style={{ padding: '6px 12px', fontSize: 12 }}
                            disabled={ocupado === p.id}
                            onClick={() => cambiarEstado(p, a.estado)}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>

      <ToastMessage toast={toast} />
    </div>
  );
}