import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import HeroCarousel from '../components/HeroCarousel';
import Footer from '../components/Footer';
import apiClient from '../api/client';
import promocionFallback from '../assets/img/promocion.png';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import AdminLoading from '../components/AdminLoading';
import '../styles/public.css';

type Promocion = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  imagen?: string | null;
  estado?: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
};

function formatCOP(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`;
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
  const { agregar } = useCart();
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
            background: '#1e3b1e', color: '#7ddc82', border: '2.5px solid #2e7d32',
            padding: '16px 26px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            zIndex: 99999, maxWidth: '90%', textAlign: 'center',
            boxShadow: '0 8px 20px rgba(0,0,0,.25)',
          }}
        >
          Has cerrado sesión correctamente.
        </div>
      )}
      <PublicHeader />

      <HeroCarousel />

      <section className="promociones">
        <h2>Combos</h2>
        <p>Disfruta de nuestros combos exclusivos por tiempo limitado.</p>
        {promos === null ? (
          <AdminLoading texto="Cargando combos" subtexto="Preparando los mejores combos" />
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
                      onError={(e) => {
                        e.currentTarget.src = promocionFallback;
                      }}
                    />
                    <span className="promo-badge-pub">PROMO</span>
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
                      </div>
                      {isAuthenticated ? (
                        <button type="button" className="btn-circular-add" title="Agregar al carrito" onClick={() => agregar({ id: promo.id, nombre: promo.nombre, precio: Number(promo.precio), imagen: promo.imagen })}>
                          +

                        </button>
                      ) : (
                        <Link to="/login" title="Inicia sesión para pedir">
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

      <Footer />
    </div>
  );
}
