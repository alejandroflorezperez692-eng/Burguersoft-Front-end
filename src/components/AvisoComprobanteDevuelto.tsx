import { useEffect, useRef } from 'react';
import apiClient from '../api/client';
import { getEcho } from '../api/echo';
import { useAuth } from '../hooks/useAuth';
import { normalizarRol } from '../utils/roles';
import { useToast } from './Toast';

/**
 * Avisa al cliente, en cualquier página, cuando el administrador o el cajero
 * le devuelven el comprobante de pago de un pedido.
 *
 * - Revisa "/mis-pedidos" al entrar, al volver a la pestaña, cada 30 s y cuando
 *   llega un evento en tiempo real.
 * - Cada devolución se avisa una sola vez (se recuerda en localStorage).
 */
export default function AvisoComprobanteDevuelto() {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  useEffect(() => {
    if (!isAuthenticated || normalizarRol(user?.role) !== 'cliente') return;
    if (sessionStorage.getItem('token') === 'demo-token-sin-backend') return;

    let vivo = true;
    let consultando = false;

    const revisar = async () => {
      if (consultando || document.hidden) return;
      consultando = true;
      try {
        const { data } = await apiClient.get('/mis-pedidos');
        if (!vivo) return;
        const lista: any[] = Array.isArray(data) ? data : data?.data ?? data?.pedidos ?? [];

        // Número del pedido del cliente (1, 2, 3...), igual que en Mis compras.
        // /mis-pedidos viene paginado: data.total es la cantidad real de pedidos.
        const totalPedidos = Number(data?.total) || lista.length;
        const ordenados = [...lista].sort((a, b) => {
          const fa = new Date(a?.fecha ?? a?.created_at ?? 0).getTime();
          const fb = new Date(b?.fecha ?? b?.created_at ?? 0).getTime();
          if (Number.isFinite(fa) && Number.isFinite(fb) && fa !== fb) return fb - fa;
          return Number(b?.id ?? 0) - Number(a?.id ?? 0);
        });
        const numeroPorId = new Map<number, number>();
        ordenados.forEach((v, i) => numeroPorId.set(Number(v?.id), totalPedidos - i));

        for (const v of lista) {
          const id = Number(v?.id ?? v?.id_venta ?? 0);
          if (!id) continue;
          const clave = `aviso_comprobante_${id}`;

          if (String(v?.comprobante_estado ?? '') !== 'Rechazado') {
            // Si luego lo vuelve a subir y lo devuelven otra vez, avisa de nuevo.
            localStorage.removeItem(clave);
            continue;
          }

          const huella = `${v?.comprobante_subido_en ?? ''}|${v?.comprobante_motivo ?? ''}`;
          if (localStorage.getItem(clave) === huella) continue;
          localStorage.setItem(clave, huella);

          const numero = numeroPorId.get(id) ?? id;
          const motivoTxt = String(v?.comprobante_motivo ?? '').trim().replace(/[.\s]+$/, '');
          const motivo = motivoTxt ? ` Motivo: ${motivoTxt}.` : '';
          showToastRef.current(
            `Te devolvieron el comprobante del pedido #${numero}.${motivo} Sube uno nuevo desde Mis compras.`,
            true,
            false,
            5000,
          );
        }
      } catch {
        /* sin conexión: se reintenta en el siguiente ciclo */
      } finally {
        consultando = false;
      }
    };

    void revisar();

    const echo = getEcho();
    const alEvento = () => void revisar();
    echo?.channel('cocina').listen('.venta.actualizada', alEvento);

    const t = window.setInterval(() => void revisar(), 30000);
    const alVolver = () => void revisar();
    window.addEventListener('focus', alVolver);
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      vivo = false;
      window.clearInterval(t);
      window.removeEventListener('focus', alVolver);
      document.removeEventListener('visibilitychange', alVolver);
      echo?.channel('cocina').stopListening('.venta.actualizada', alEvento);
    };
  }, [isAuthenticated, user?.role]);

  return null;
}