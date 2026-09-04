import { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { CATEGORIAS, emptyForm, normalize, type Producto, type ProductoApi, type ProductoForm } from './types';

export function useProductos() {
  const [items, setItems] = useState<Producto[]>([]);
  const [q, setQ] = useState('');
  const [catFiltro, setCatFiltro] = useState('Todas');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<ProductoForm>(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get<ProductoApi[]>('/productos');
      const data = Array.isArray(r.data) ? r.data : [];
      setItems(data.map(normalize));
    } catch {
      showToast('No se pudieron cargar los productos', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((p) =>
    (catFiltro === 'Todas' || p.categoria === catFiltro) &&
    (p.nombre ?? '').toLowerCase().includes(q.toLowerCase())
  );

  const grouped = CATEGORIAS.reduce<Record<string, Producto[]>>((acc, cat) => {
    const prods = filtered.filter((p) => p.categoria === cat);
    if (prods.length > 0) acc[cat] = prods;
    return acc;
  }, {});
  const sinCategoria = filtered.filter((p) => !p.categoria || !CATEGORIAS.includes(p.categoria));
  if (sinCategoria.length > 0) grouped['Sin categoría'] = sinCategoria;

  const openNew = () => { setForm(emptyForm); setEditId(null); setModal(true); };

  const openEdit = (p: Producto) => {
    setForm({
      nombre: p.nombre,
      valor: String(p.valor),
      descripcion: p.descripcion,
      img: p.img ?? '',
      cantidad: p.cantidad,
      categoria: p.categoria || 'Hamburguesa',
      estado: p.estado || 'Disponible',
    });
    setEditId(p.id);
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { showToast('El nombre es obligatorio', true); return; }
    if (Number(form.valor) < 0) { showToast('El precio no puede ser negativo', true); return; }
    const body = {
      nombre: form.nombre.trim(),
      valor: Number(form.valor) || 0,
      descripcion: form.descripcion || null,
      img: form.img || null,
      cantidad: form.cantidad === '' ? 0 : Number(form.cantidad),
      categoria: form.categoria,
      estado: form.estado,
    };
    try {
      if (editId) {
        await apiClient.put(`/productos/${editId}`, body);
        showToast('Producto actualizado');
      } else {
        await apiClient.post('/productos', body);
        showToast('Producto creado');
      }
      setModal(false);
      load();
    } catch {
      showToast('No se pudo guardar el producto', true);
    }
  };

  const del = async (id: number) => {
    const p = items.find((x) => x.id === id);
    if (!confirm(`¿Eliminar "${p?.nombre ?? id}"?`)) return;
    try {
      await apiClient.delete(`/productos/${id}`);
      showToast('Producto eliminado');
      load();
    } catch {
      showToast('No se pudo eliminar el producto', true);
    }
  };

  return {
    items, q, setQ, catFiltro, setCatFiltro,
    modal, setModal, form, setForm, editId,
    loading, filtered, grouped, toast,
    openNew, openEdit, guardar, del,
  };
}
