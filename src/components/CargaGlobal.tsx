import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AdminLoading from './AdminLoading';
import { pendientesDeCarga, suscribirCarga } from '../utils/cargaGlobal';

/** Tiempo mínimo visible para que el cambio de página se note. */
const MINIMO_MS = 700;
/** Tope de seguridad por si alguna petición se queda colgada. */
const MAXIMO_MS = 5000;

const ETIQUETAS: Record<string, string> = {
  '/inicio': 'Inicio',
  '/menu': 'Menú',
  '/promociones': 'Promociones',
  '/pedidos-en-vivo': 'Pedidos en vivo',
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
  '/nosotros': 'Nosotros',
  '/menu-publico': 'Menú',
  '/contactanos': 'Contáctanos',
  '/mis-compras': 'Mis compras',
  '/checkout': 'Finalizar compra',
  '/ayuda': 'Ayuda',
  '/ayuda-cliente': 'Ayuda para clientes',
  '/terminos': 'Términos y condiciones',
  '/privacidad': 'Política de privacidad',
  '/terminos-y-condiciones': 'Términos y condiciones',
  '/creditos': 'Créditos y licencias',
};

function textoDeRuta(pathname: string): string {
  const nombre = ETIQUETAS[pathname];
  return nombre ? `Cargando ${nombre.toLowerCase()}` : 'Cargando';
}

/**
 * Muestra el cargador de pantalla completa cada vez que se cambia de página.
 * Permanece visible mientras la ruta nueva tenga peticiones en curso.
 */
export default function CargaGlobal() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [texto, setTexto] = useState('Cargando');
  const primeraCarga = useRef(true);

  useEffect(() => {
    // La primera pintura ya la cubre el Suspense de App.tsx.
    if (primeraCarga.current) {
      primeraCarga.current = false;
      return;
    }

    setTexto(textoDeRuta(pathname));
    setSaliendo(false);
    setVisible(true);

    const inicio = performance.now();
    let cerrado = false;
    let salida = 0;

    const cerrar = () => {
      if (cerrado) return;
      cerrado = true;
      setSaliendo(true);
      salida = window.setTimeout(() => setVisible(false), 180);
    };

    const revisar = () => {
      const transcurrido = performance.now() - inicio;
      const listo = transcurrido >= MINIMO_MS && pendientesDeCarga() === 0;
      if (listo || transcurrido >= MAXIMO_MS) cerrar();
    };

    const intervalo = window.setInterval(revisar, 100);
    const desuscribir = suscribirCarga(revisar);

    return () => {
      window.clearInterval(intervalo);
      window.clearTimeout(salida);
      desuscribir();
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483001,
        opacity: saliendo ? 0 : 1,
        pointerEvents: saliendo ? 'none' : 'auto',
        transition: 'opacity 0.18s ease',
      }}
    >
      <AdminLoading texto={texto} subtexto="Un momento, por favor" />
    </div>
  );
}
