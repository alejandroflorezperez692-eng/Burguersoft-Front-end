import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/legal-modal.css';

export type DocumentoLegal = 'terminos' | 'privacidad';

type ModalLegalProps = {
  documentoInicial: DocumentoLegal;
  onClose: () => void;
};

const TITULOS: Record<DocumentoLegal, string> = {
  terminos: 'Términos y condiciones de uso',
  privacidad: 'Política de privacidad',
};

export default function ModalLegal({ documentoInicial, onClose }: ModalLegalProps) {
  const [documento, setDocumento] = useState(documentoInicial);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    const elementoAnterior = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    cerrarRef.current?.focus();

    const manejarTecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', manejarTecla);

    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener('keydown', manejarTecla);
      elementoAnterior?.focus();
    };
  }, [onClose]);

  const cambiarDocumento = (nuevoDocumento: DocumentoLegal) => {
    setDocumento(nuevoDocumento);
  };

  return createPortal(
    <div
      className="legal-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="legal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        <button
          ref={cerrarRef}
          type="button"
          className="legal-modal-cerrar"
          aria-label="Cerrar ventana"
          onClick={onClose}
        >
          ×
        </button>

        <div className="legal-modal-pestanas" aria-label="Documentos legales">
          <button
            type="button"
            className={documento === 'terminos' ? 'activa' : ''}
            aria-pressed={documento === 'terminos'}
            onClick={() => cambiarDocumento('terminos')}
          >
            Términos y condiciones
          </button>
          <button
            type="button"
            className={documento === 'privacidad' ? 'activa' : ''}
            aria-pressed={documento === 'privacidad'}
            onClick={() => cambiarDocumento('privacidad')}
          >
            Política de privacidad
          </button>
        </div>

        <div className="legal-modal-contenido">
          <h2 id="legal-modal-title">{TITULOS[documento]}</h2>
          {documento === 'terminos' ? (
            <>
              <p>
                Bienvenido a Burguersoft. Al registrarte y usar nuestra plataforma aceptas los
                siguientes términos y condiciones. Si no estás de acuerdo, no utilices el servicio.
              </p>
              <h3>1. Uso del servicio</h3>
              <p>
                El usuario se compromete a usar la plataforma de forma responsable y conforme a la
                ley. Está prohibido el uso fraudulento, el acceso no autorizado y cualquier acción
                que afecte el funcionamiento del sistema.
              </p>
              <h3>2. Cuenta de usuario</h3>
              <p>
                El usuario es responsable de mantener la confidencialidad de sus credenciales y de
                todas las actividades realizadas desde su cuenta. Debe notificar de inmediato
                cualquier uso no autorizado.
              </p>
              <h3>3. Pedidos y pagos</h3>
              <p>
                Los pedidos realizados a través de la plataforma están sujetos a disponibilidad y
                confirmación. Los precios pueden variar sin previo aviso. El pago se procesa
                conforme a los métodos disponibles.
              </p>
              <h3>4. Privacidad y datos personales</h3>
              <p>
                Los datos personales se tratan conforme a nuestra Política de Privacidad. Al
                registrarte autorizas el tratamiento de tus datos para la prestación del servicio.
              </p>
              <h3>5. Modificaciones</h3>
              <p>
                Burguersoft puede modificar estos términos en cualquier momento. Los cambios se
                publicarán en esta página y el uso continuado implica su aceptación.
              </p>
            </>
          ) : (
            <>
              <p>
                En Burguersoft nos comprometemos a proteger tu privacidad y tus datos personales.
              </p>
              <h3>1. Datos que recopilamos</h3>
              <p>
                Recopilamos nombre, apellido, documento, correo electrónico y teléfono para la
                creación y gestión de tu cuenta, así como para procesar tus pedidos.
              </p>
              <h3>2. Uso de los datos</h3>
              <p>
                Los datos se utilizan para prestar el servicio, mejorar la experiencia, enviar
                notificaciones relacionadas con tus pedidos y cumplir obligaciones legales.
              </p>
              <h3>3. Compartición de datos</h3>
              <p>
                No compartimos tus datos personales con terceros, salvo cuando sea necesario para
                la prestación del servicio o por requerimiento legal.
              </p>
              <h3>4. Seguridad</h3>
              <p>
                Implementamos medidas de seguridad para proteger tus datos. Sin embargo, ningún
                sistema es completamente seguro.
              </p>
              <h3>5. Derechos del usuario</h3>
              <p>
                Puedes solicitar la actualización, corrección o eliminación de tus datos
                personales contactándonos a través de nuestros canales oficiales.
              </p>
              <h3>6. Cookies</h3>
              <p>
                El sitio puede usar cookies para mejorar la experiencia de navegación. Puedes
                configurar tu navegador para rechazarlas.
              </p>
              <h3>7. Términos y condiciones</h3>
              <p>
                El uso de la plataforma también se rige por nuestros Términos y Condiciones.
              </p>
            </>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
