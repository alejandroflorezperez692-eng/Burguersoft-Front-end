import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import HeroCarousel from '../components/HeroCarousel';
import Footer from '../components/Footer';
import apiClient from '../api/client';
import promocionFallback from '../assets/img/promocion.png';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import '../styles/public.css';

type Promocion = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  imagen?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
};

function formatCOP(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`;
}

export default function Home() {
  const [promos, setPromos] = useState<Promocion[] | null>(null);
  const { isAuthenticated } = useAuth();
  const { agregar } = useCart();

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

  const hoy = new Date().toISOString().slice(0, 10);
  const activas = (promos ?? []).filter((p) => {
    if (p.fecha_fin && p.fecha_fin < hoy) return false;
    if (p.fecha_inicio && p.fecha_inicio > hoy) return false;
    return true;
  });

  return (
    <div className="public-body">
      <PublicHeader />

      <HeroCarousel />

      <section className="promociones">
        <h2>Combos Diarios</h2>
        <p>Disfruta de nuestros combos exclusivos por tiempo limitado.</p>
        <div className="grid-promociones">
          {promos === null ? null : activas.length === 0 ? (
            <p className="promo-vacio">No hay promociones activas en este momento.</p>
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
                      {promo.fecha_inicio && <>Desde {promo.fecha_inicio}</>}
                      {promo.fecha_fin && <> hasta {promo.fecha_fin}</>}
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
                        <button type="button" className="btn-circular-add btn-login" aria-label="Inicia sesión para pedir">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
