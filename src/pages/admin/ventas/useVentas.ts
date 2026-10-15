import { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { desglosarIVA } from '../../../utils/iva';
import { unwrap } from '../shared';
import type { Producto, Venta } from './types';

export function useVentas() {
  const [items, setItems] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [tipoEntrega, setTipoEntrega] = useState('Recoger');
  const [productoId, setProductoId] = useState<number>(0);
  const [cantidad, setCantidad] = useState('1');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      // /pedidos trae detalles.producto; /ventas no trae detalles
      apiClient.get('/pedidos'),
      apiClient.get('/productos'),
    ]).then(([r1, r2]) => {
      setItems(unwrap<Venta>(r1.data));
      setProductos(
        unwrap<Record<string, unknown>>(r2.data).map((p) => ({
          id: Number(p.id ?? p.id_producto ?? 0),
          nombre: String(p.nombre ?? p.nombre_producto ?? ''),
          valor: Number(p.valor ?? p.valor_producto ?? 0),
        }))
      );
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const qLower = q.toLowerCase();
  const filtered = items.filter((v) =>
    String(v.id ?? '').includes(q) ||
    (v.detalles ?? []).some((d) => (d.producto?.nombre ?? '').toLowerCase().includes(qLower))
  );

  const hoy = new Date().toISOString().slice(0, 10);
  const ventasHoy = items.filter((v) => (v.fecha ?? '').slice(0, 10) === hoy);
  const ingresosHoy = ventasHoy.reduce((a, v) => a + Number(v.valor_total ?? 0), 0);
  const ingresosTotal = items.reduce((a, v) => a + Number(v.valor_total ?? 0), 0);
  const ivaHoy = desglosarIVA(ingresosHoy).iva;
  const ivaTotal = desglosarIVA(ingresosTotal).iva;

  const save = () => {
    if (!productoId) return;
    const body = {
      carrito: [{ producto_id: productoId, cantidad: Math.max(1, Number(cantidad) || 1) }],
      metodo_pago: metodoPago,
      tipo_entrega: tipoEntrega,
    };
    apiClient.post('/ventas', body).then(() => {
      setShowForm(false);
      setProductoId(0);
      setCantidad('1');
      load();
    }).catch(() => {
      alert('No se pudo registrar la venta (revisa stock y sesión).');
    });
  };

  const updateEstado = (id: number, estado: string) => {
    apiClient.patch(`/ventas/${id}/estado`, { estado })
      .then(() => load())
      .catch(() => alert('No se pudo actualizar el estado.'));
  };

  const cancelar = (id: number) => {
    if (!confirm('¿Cancelar esta venta?')) return;
    updateEstado(id, 'Cancelado');
  };

  const selectedProd = productos.find((p) => p.id === productoId);

  return {
    items, productos, q, setQ, showForm, setShowForm,
    metodoPago, setMetodoPago, tipoEntrega, setTipoEntrega,
    productoId, setProductoId, cantidad, setCantidad,
    loading, filtered, ventasHoy, ingresosHoy, ingresosTotal,
    ivaHoy, ivaTotal, selectedProd,
    save, updateEstado, cancelar,
  };
}
