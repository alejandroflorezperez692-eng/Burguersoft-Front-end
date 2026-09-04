import { useEffect, useState } from 'react';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

type PedidoApi = {
  id: number;
  fecha?: string;
  valor_total?: number;
  total?: number;
  estado?: string;
  detalles?: { producto?: { nombre?: string }; cantidad?: number; precio_unitario?: number }[];
  productos?: { nombre: string; cantidad: number; precio: number }[];
};

type Pedido = {
  id: number;
  fecha?: string;
  total?: number;
  estado?: string;
  productos?: { nombre: string; cantidad: number; precio: number }[];
};

function normalize(p: PedidoApi): Pedido {
  const detalles = Array.isArray(p.detalles)
    ? p.detalles.map((d) => ({
        nombre: d.producto?.nombre ?? 'Producto',
        cantidad: Number(d.cantidad ?? 0),
        precio: Number(d.precio_unitario ?? 0),
      }))
    : undefined;
  return {
    id: Number(p.id),
    fecha: p.fecha,
    total: Number(p.valor_total ?? p.total ?? 0),
    estado: p.estado,
    productos: p.productos ?? detalles,
  };
}

export default function MisPedidos() {
  const { isAuthenticated } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiClient.get('/mis-pedidos')
      .then(({ data }) => {
        const raw = Array.isArray(data) ? data : (data?.data ?? []);
        const lista = Array.isArray(raw) ? raw : [];
        setPedidos(lista.map(normalize));
      })
      .catch(() => setPedidos([]));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="public-body">
        <PublicHeader />
        <div style={{ maxWidth: 800, margin: '60px auto', textAlign: 'center', padding: 24 }}>
          <h2>Debes iniciar sesión para ver tus pedidos</h2>
          <Link to="/login" style={{ display: 'inline-block', marginTop: 16, background: '#E8821A', color: '#fff', padding: '10px 22px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>Iniciar sesión</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="public-body">
      <PublicHeader />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px', minHeight: '60vh' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#2c1810', marginBottom: 8 }}>Mis pedidos</h1>
        <p style={{ color: '#6b4c38', marginBottom: 24 }}>Aquí verás el historial de tus compras.</p>

        {pedidos === null ? (
          <p>Cargando...</p>
        ) : pedidos.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #E0D5C5', borderRadius: 12, padding: 32, textAlign: 'center' }}>
            <p style={{ color: '#888' }}>Aún no tienes pedidos.</p>
            <Link to="/" style={{ display: 'inline-block', marginTop: 16, background: '#E8821A', color: '#fff', padding: '10px 22px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>Ir al menú</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pedidos.map((p) => (
              <div key={p.id} style={{ background: '#fff', border: '1px solid #E0D5C5', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Pedido #{p.id}</div>
                    <div style={{ fontSize: 13, color: '#7A6855' }}>{p.fecha ? new Date(p.fecha).toLocaleString() : ''} {p.estado ? `• ${p.estado}` : ''}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: '#E8821A' }}>${Number(p.total ?? 0).toLocaleString('es-CO')}</div>
                </div>
                {(p.productos ?? []).length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(p.productos ?? []).map((prod, i) => (
                      <div key={i} style={{ fontSize: 13, color: '#5b4a3a' }}>
                        {prod.nombre} x{prod.cantidad}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
