import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import HeroCarousel from '../components/HeroCarousel';
import Footer from '../components/Footer';
import apiClient from '../api/client';
import promocionFallback from '../assets/img/promocion.png';
import { useAuth } from '../hooks/useAuth';
import AdminLoading from '../components/AdminLoading';
import { IconoToast } from '../components/Toast';
import '../styles/public.css';
import PersonalizarModal, { type ItemPersonalizar } from '../components/PersonalizarModal';

type AdicionCombo = { id: number; nombre: string; precio: number | string; tipo?: string };

type Promocion = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  imagen?: string | null;
  estado?: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  productos?: { id: number; valor: number | string; adiciones?: AdicionCombo[] }[]; // ← NUEVO
};

function formatCOP(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`;
}

function precioNormal(promo: Promocion): number {
  return (promo.productos ?? []).reduce((s, x) => s + (Number(x.valor) || 0), 0);
}

// ← NUEVO: adicionales de los productos del combo (sin las de "quitar")
function adicionesCombo(promo: Promocion): AdicionCombo[] {
  const mapa = new Map<number, AdicionCombo>();
  (promo.productos ?? []).forEach((p) =>
    (p.adiciones ?? [])
      .filter((a) => a.tipo !== 'quitar')
      .forEach((a) => mapa.set(a.id, a)),
  );
  return [...mapa.values()];
}

function formatFecha(fecha?: string | null): string {
  if (!fecha) return '';
  const soloFecha = String(fecha).slice(0, 10);
  const partes = soloFecha.split('-');
  if (partes.length !== 3 || partes[0].length !== 4) return String(fecha);
  const [anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
}

export default function Home() {
  const [promos, setPromos] = useState<Promocion[] | null>(null);
  const { isAuthenticated } = useAuth();
  const [personalizando, setPersonalizando] = useState<ItemPersonalizar | null>(null);
  const location = useLocation();

  // Aviso flotante al cerrar sesión (vuelve a la Home con toast: 'logout_ok')
  const [avisoSesion, setAvisoSesion] = useState<string | null>(() =>
    (location.state as { toast?: string } | null)?.toast === 'logout_ok'
      ? 'Has cerrado sesión correctamente.'
      : null,
  );
  useEffect(() => {
    if ((location.state as { toast?: string } | null)?.toast !== 'logout_ok') return;
    setAvisoSesion('Has cerrado sesión correctamente.');
    const t = setTimeout(() => setAvisoSesion(null), 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelado = false;
    apiClient
      .get<any>('/promociones')
      .then(({ data }) => {
        const lista: Promocion[] = Array.isArray(data) ? data : data?.data ?? [];
        if (!cancelado) setPromos(lista);
      })
      .catch(() => {
        if (!cancelado) setPromos([]);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const d = new Date();
  const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const activas = (promos ?? []).filter((p) => {
    if (p.estado !== 'Activa') return false;
    if (p.fecha_fin && p.fecha_fin.slice(0, 10) < hoy) return false;
    if (p.fecha_inicio && p.fecha_inicio.slice(0, 10) > hoy) return false;
    return true;
  });

  return (
    <div className="public-body">
      {avisoSesion && (
        <div
          role="status"
          style={{
            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#1e3b1e', color: '#7ddc82', border: '2.5px solid #2e7d32',
            padding: '16px 26px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            zIndex: 99999, maxWidth: '90%', textAlign: 'center',
            boxShadow: '0 8px 20px rgba(0,0,0,.25)',
          }}
        >
          <IconoToast tipo="exito" />
          <span>{avisoSesion}</span>
        </div>
      )}
      <PublicHeader />

      <HeroCarousel />

      <section className="promociones">
        <h2>Combos y Promociones</h2>
        <p>Disfruta de nuestros combos exclusivos por tiempo limitado.</p>
        {promos === null ? (
          <AdminLoading texto="Cargando combos" subtexto="Preparando los mejores combos" compact />
        ) : (
          <div className="grid-promociones">
            {activas.length === 0 ? (
              <p className="promo-vacio">No hay combos disponibles en este momento.</p>
            ) : (
              activas.map((promo) => (
                <div className="promo-card-pub" key={promo.id}>
                  <div className="promo-img-pub">
                    <img
                      src={promo.imagen || promocionFallback}
                      alt={promo.nombre}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.src = promocionFallback;
                      }}
                    />
                  </div>
                  <div className="promo-info-pub">
                    <h3>{promo.nombre}</h3>
                    {promo.descripcion && <p>{promo.descripcion}</p>}
                    {(promo.fecha_inicio || promo.fecha_fin) && (
                      <div className="promo-fechas">
                        {promo.fecha_inicio && <>Desde {formatFecha(promo.fecha_inicio)}</>}
                        {promo.fecha_fin && <> hasta {formatFecha(promo.fecha_fin)}</>}
                      </div>
                    )}
                    <div className="promo-footer-pub">
                      <div className="promo-precio-pub">
                        {formatCOP(Number(promo.precio))}
                        {precioNormal(promo) > Number(promo.precio) && (
                          <span className="promo-precio-old">{formatCOP(precioNormal(promo))}</span>
                        )}
                      </div>
                      {isAuthenticated ? (
                        <button
                          type="button"
                          className="btn-circular-add"
                          title="Agregar al carrito"
                          data-tooltip="Agregar al carrito"
                          onClick={() =>
                            setPersonalizando({
                              id: promo.id,
                              nombre: promo.nombre,
                              precio: Number(promo.precio),
                              imagen: promo.imagen,
                              descripcion: promo.descripcion,
                              adiciones: adicionesCombo(promo), // ← NUEVO
                              esCombo: true,                    // ← NUEVO
                            })
                          }
                        >
                          +
                        </button>
                      ) : (
                        <Link to="/login" className="link-sesion" data-tooltip="Inicia sesión para pedir">
                          <button type="button" className="btn-circular-add btn-login">
                            +
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {personalizando && (
        <PersonalizarModal item={personalizando} onClose={() => setPersonalizando(null)} />
      )}

      <Footer />
    </div>
  );
}