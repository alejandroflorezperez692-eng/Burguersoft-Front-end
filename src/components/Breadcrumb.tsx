import { Link, useLocation } from 'react-router-dom';
import '../styles/breadcrumb.css';

const ETIQUETAS_ADMIN: Record<string, string> = {
  '/inicio': 'Inicio',
  '/menu': 'Menú',
  '/promociones': 'Promociones',
  '/pedidos-en-vivo': 'Pedidos',
  '/ventas': 'Ventas',
  '/compras': 'Compras',
  '/materia-prima': 'Materia prima',
  '/inventario': 'Inventario',
  '/cierre-inventario': 'Cierre de inventario',
  '/gestion-proveedores': 'Proveedores',
  '/reportes': 'Reportes',
  '/copias-de-seguridad': 'Copias de seguridad',
  '/usuarios': 'Usuarios',
  '/ayuda-admin': 'Ayuda',
  '/manual-programador': 'Manual del programador',
  '/configuracion': 'Mi perfil',
};

const ETIQUETAS_PUBLICAS: Record<string, string> = {
  '/nosotros': 'Nosotros',
  '/menu-publico': 'Menú',
  '/contactanos': 'Contáctanos',
  '/mis-compras': 'Mis compras',
  '/checkout': 'Finalizar compra',
  '/ayuda': 'Ayuda',
  '/ayuda-cliente': 'Ayuda para clientes',
  '/terminos': 'Términos y condiciones',
  '/privacidad': 'Política de privacidad',
  '/creditos': 'Créditos y licencias',
  '/terminos-y-condiciones': 'Términos y condiciones',
  '/login': 'Iniciar sesión',
  '/registro': 'Crear cuenta',
};

type Props = {
  variante?: 'admin' | 'publica';
};

function embellecer(segmento: string): string {
  return segmento
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

/**
 * Ruta de navegación (breadcrumb) siempre visible. En el panel interno
 * se apoya en el menú lateral; en las páginas públicas, en el header.
 */
export default function Breadcrumb({ variante = 'admin' }: Props) {
  const { pathname } = useLocation();
  const etiquetas = variante === 'admin' ? ETIQUETAS_ADMIN : ETIQUETAS_PUBLICAS;
  const segmentos = pathname.split('/').filter(Boolean);

  if (segmentos.length === 0) return null;

  const migas = segmentos.map((segmento, indice) => {
    const ruta = `/${segmentos.slice(0, indice + 1).join('/')}`;
    return {
      ruta,
      etiqueta: etiquetas[ruta] ?? embellecer(segmento),
      actual: indice === segmentos.length - 1,
    };
  });

  return (
    <nav
      className={`breadcrumb breadcrumb-${variante}`}
      aria-label="Ruta de navegación"
    >
      <ol>
        {migas.map((miga, indice) => (
          <li key={miga.ruta}>
            {indice > 0 && (
              <span className="breadcrumb-sep" aria-hidden="true">
                /
              </span>
            )}
            {miga.actual ? (
              <span className="breadcrumb-actual" aria-current="page">
                {miga.etiqueta}
              </span>
            ) : (
              <Link to={miga.ruta}>{miga.etiqueta}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
