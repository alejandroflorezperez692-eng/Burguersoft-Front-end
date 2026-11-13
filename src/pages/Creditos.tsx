import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';

interface Recurso {
  recurso: string;
  autor: string;
  fuente: string;
  fecha: string;
  licencia: string;
}

// COMPLETAR: reemplaza cada "POR COMPLETAR" con el dato real de cada recurso.
const POR = 'POR COMPLETAR';

const RECURSOS: Recurso[] = [
  { recurso: 'Fuente Atkinson Hyperlegible', autor: 'Braille Institute', fuente: 'Google Fonts (fonts.google.com)', fecha: '2020', licencia: 'SIL Open Font License 1.1' },
  { recurso: 'Fuente Plus Jakarta Sans', autor: 'Tokotype', fuente: 'Google Fonts (fonts.google.com)', fecha: '2020', licencia: 'SIL Open Font License 1.1' },
  { recurso: 'Fuente Fraunces', autor: 'Undercase Type', fuente: 'Google Fonts (fonts.google.com)', fecha: '2020', licencia: 'SIL Open Font License 1.1' },
  { recurso: 'Logo Burguersoft / El Oriente', autor: 'Equipo del proyecto', fuente: 'Creación propia', fecha: POR, licencia: 'Uso propio del proyecto' },
  { recurso: 'Fotografías del carrusel (carrusel-1 a 7)', autor: POR, fuente: POR, fecha: POR, licencia: POR },
  { recurso: 'Imágenes de la sección Nosotros', autor: POR, fuente: POR, fecha: POR, licencia: POR },
  { recurso: 'Iconos de navegación y paneles (PNG/SVG)', autor: POR, fuente: POR, fecha: POR, licencia: POR },
  { recurso: 'Logos de medios de pago (Nequi, Daviplata, Bancolombia)', autor: 'Sus respectivos titulares', fuente: 'Sitios oficiales de cada marca', fecha: POR, licencia: 'Marcas registradas; uso para identificar el medio de pago' },
  { recurso: 'Animación de hamburguesa (hamburguesa.json)', autor: POR, fuente: POR, fecha: POR, licencia: POR },
];

export default function Creditos() {
  return (
    <div className="public-body">
      <PublicHeader />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px' }}>
        <h1>Créditos y licencias</h1>
        <p>
          Recursos de terceros utilizados en el aplicativo de El Oriente (Burguersoft), con su
          autor, fuente, fecha de publicación y licencia o autorización de uso.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {['Recurso', 'Autor', 'Fuente', 'Fecha de publicación', 'Licencia o autorización'].map((t) => (
                  <th key={t} style={{ background: '#1a0a00', color: '#fff', textAlign: 'left', padding: '8px 10px' }}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RECURSOS.map((r) => (
                <tr key={r.recurso}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #ddd' }}>{r.recurso}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #ddd' }}>{r.autor}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #ddd' }}>{r.fuente}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #ddd' }}>{r.fecha}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #ddd' }}>{r.licencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </div>
  );
}