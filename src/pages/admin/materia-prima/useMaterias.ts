import { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { unwrap } from '../shared';
import { emptyForm, estadoKey, normalize, type Filtro, type Marca, type MateriaApi, type MateriaForm, type MateriaPrima } from './types';

export function useMaterias() {
  const [items, setItems] = useState<MateriaPrima[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<MateriaForm>(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        apiClient.get('/materias-primas'),
        apiClient.get('/marcas'),
      ]);
      setItems(unwrap<MateriaApi>(r1.data).map(normalize));
      setMarcas(unwrap<Record<string, unknown>>(r2.data).map((m) => ({
        id: Number(m.id ?? m.idMarca ?? 0),
        nombre: String(m.nombre ?? m.nombre_marca ?? ''),
      })));
    } catch {
      showToast('No se pudieron cargar los insumos', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const marcaNombre = (id: number) => marcas.find((m) => m.id === id)?.nombre || '—';

  const filtered = items.filter((m) =>
    (filtro === 'todos' || estadoKey(Number(m.cantidad) || 0) === filtro) &&
    (m.nombre ?? '').toLowerCase().includes(q.toLowerCase())
  );

  const total = items.length;
  const disponibles = items.filter((m) => Number(m.cantidad) > 0).length;
  const agotados = items.filter((m) => Number(m.cantidad) <= 0).length;
  const valorInv = items.reduce((a, m) => a + Number(m.valor || 0) * Number(m.cantidad || 0), 0);

  const openNew = () => {
    setForm({ ...emptyForm, marca_id: marcas[0]?.id ?? 1 });
    setEditId(null);
    setModal(true);
  };

  const openEdit = (m: MateriaPrima) => {
    setForm({
      nombre: m.nombre,
      tipo: m.tipo,
      valor: String(m.valor),
      cantidad: String(m.cantidad),
      unidad_medida: m.unidad_medida,
      estado: m.estado || 'Activo',
      marca_id: m.marca_id,
    });
    setEditId(m.id);
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { showToast('El nombre es obligatorio', true); return; }
    if (Number(form.valor) < 0 || Number(form.cantidad) < 0) {
      showToast('El valor y el stock no pueden ser negativos', true);
      return;
    }
    if (!form.marca_id) { showToast('Selecciona una marca', true); return; }
    const body = {
      nombre: form.nombre.trim(),
      tipo: form.tipo || null,
      valor: Number(form.valor) || 0,
      cantidad: Number(form.cantidad) || 0,
      unidad_medida: form.unidad_medida || null,
      estado: form.estado,
      marca_id: Number(form.marca_id),
    };
    try {
      if (editId) {
        await apiClient.put(`/materias-primas/${editId}`, body);
        showToast('Materia prima actualizada');
      } else {
        await apiClient.post('/materias-primas', body);
        showToast('Materia prima creada');
      }
      setModal(false);
      load();
    } catch {
      showToast('No se pudo guardar la materia prima', true);
    }
  };

  const del = async (id: number) => {
    const m = items.find((x) => x.id === id);
    if (!confirm(`¿Eliminar "${m?.nombre ?? id}"?`)) return;
    try {
      await apiClient.delete(`/materias-primas/${id}`);
      showToast('Materia prima eliminada');
      load();
    } catch {
      showToast('No se pudo eliminar la materia prima', true);
    }
  };

  return {
    items, marcas, q, setQ, filtro, setFiltro,
    modal, setModal, form, setForm, editId,
    loading, filtered, total, disponibles, agotados, valorInv, toast,
    marcaNombre, openNew, openEdit, guardar, del,
  };
}
