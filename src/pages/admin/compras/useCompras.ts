import { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { unwrap } from '../shared';
import { esDelMesActual, lineaVacia, type Compra, type Linea, type Marca, type MateriaPrima } from './types';

export function useCompras() {
  const [items, setItems] = useState<Compra[]>([]);
  const [materias, setMaterias] = useState<MateriaPrima[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia()]);
  const [modalDetalle, setModalDetalle] = useState<Compra | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiClient.get('/compras'),
      apiClient.get('/materias-primas'),
      apiClient.get('/marcas'),
    ]).then(([r1, r2, r3]) => {
      setItems(unwrap<Compra>(r1.data));
      setMaterias(unwrap<Record<string, unknown>>(r2.data).map((m) => ({
        id: Number(m.id ?? m.idmateria ?? 0),
        nombre: String(m.nombre ?? m.nombre_materia ?? ''),
      })));
      setMarcas(unwrap<Record<string, unknown>>(r3.data).map((m) => ({
        id: Number(m.id ?? m.idMarca ?? 0),
        nombre: String(m.nombre ?? m.nombre_marca ?? ''),
      })));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const materiaNombre = (id: number) => materias.find((m) => m.id === id)?.nombre ?? `#${id}`;
  const marcaNombre = (id: number) => marcas.find((m) => m.id === id)?.nombre ?? `#${id}`;

  const filtered = items.filter((c) =>
    String(c.id ?? '').includes(q) || (c.metodo_pago ?? '').toLowerCase().includes(q.toLowerCase())
  );

  const comprasMes = items.filter((c) => c.fecha && esDelMesActual(c.fecha));
  const totalMes = comprasMes.reduce((a, c) => a + Number(c.valor_total ?? 0), 0);
  const totalHisto = items.reduce((a, c) => a + Number(c.valor_total ?? 0), 0);

  const addLinea = () => {
    setLineas([...lineas, lineaVacia(marcas[0]?.id ?? 0)]);
  };

  const removeLinea = (i: number) => {
    setLineas(lineas.filter((_, idx) => idx !== i));
  };

  const updateLinea = (i: number, field: keyof Linea, value: string | number | null) => {
    const copy = [...lineas];
    copy[i] = { ...copy[i], [field]: value };
    setLineas(copy);
  };

  const total = lineas.reduce((a, l) => a + (Number(l.cantidad) * Number(l.precio_unitario) || 0), 0);

  const save = () => {
    const payload = {
      fecha: new Date().toISOString().slice(0, 10),
      metodo_pago: metodoPago,
      items: lineas.map((l) => ({
        materia_prima_id: l.materia_prima_id,
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio_unitario),
        marca_id: l.marca_id,
        nombre_nuevo: l.materia_prima_id ? undefined : (l.nombre_nuevo || undefined),
        tipo: l.materia_prima_id ? undefined : (l.tipo || undefined),
        unidad_medida: l.materia_prima_id ? undefined : (l.unidad_medida || undefined),
      })),
    };
    apiClient.post('/compras', payload).then(() => {
      setShowForm(false);
      setLineas([lineaVacia(marcas[0]?.id ?? 0)]);
      load();
    }).catch(() => alert('No se pudo registrar la compra (revisa los datos).'));
  };

  const del = (id: number) => {
    if (!confirm('¿Eliminar esta compra? Se revertirá el stock.')) return;
    apiClient.delete(`/compras/${id}`).then(() => load()).catch(() => alert('No se pudo eliminar la compra.'));
  };

  return {
    items, materias, marcas, q, setQ, showForm, setShowForm,
    metodoPago, setMetodoPago, lineas, modalDetalle, setModalDetalle,
    loading, filtered, comprasMes, totalMes, totalHisto, total,
    materiaNombre, marcaNombre,
    addLinea, removeLinea, updateLinea, save, del,
  };
}
