import { useRef, useState, type FormEvent } from 'react';
import PublicHeader from '../components/PublicHeader';
import HeroCarousel from '../components/HeroCarousel';
import Footer from '../components/Footer';
import CaptchaLocal, { type CaptchaLocalRef } from '../components/CaptchaLocal';
import { useToast } from '../components/Toast';
import apiClient from '../api/client';
import { mensajeError } from '../utils/errores';
import '../styles/public.css';
import '../styles/contactanos.css';

const FORM_VACIO = {
  nombre: '',
  email: '',
  telefono: '',
  asunto: '',
  mensaje: '',
};

export default function Contactanos() {
  const [showWspMenu, setShowWspMenu] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [enviando, setEnviando] = useState(false);
  const captchaRef = useRef<CaptchaLocalRef>(null);
  const captchaValido = useRef({ id: '', respuesta: '' });
  const { showToast } = useToast();

  const cambiar = (campo: keyof typeof FORM_VACIO, valor: string) => {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  };

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!captchaValido.current.respuesta) {
      showToast('Completa la verificación de seguridad antes de enviar.', true);
      return;
    }

    setEnviando(true);
    try {
      const { data } = await apiClient.post<{ message?: string }>('/contacto', {
        ...form,
        captcha_id: captchaValido.current.id,
      });
      showToast(data?.message ?? '¡Mensaje enviado! Te responderemos pronto.', false);
      setForm(FORM_VACIO);
      captchaValido.current = { id: '', respuesta: '' };
      captchaRef.current?.recargar();
    } catch (err) {
      showToast(mensajeError(err, 'No se pudo enviar el mensaje. Intenta de nuevo.'), true);
      captchaRef.current?.recargar();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="public-body">
      <PublicHeader />

      <HeroCarousel />

      <section className="contact-section">
        <h1>¡Contáctanos!</h1>
        <br />
        <p className="descripcion">
          ¿Tienes alguna pregunta, quieres hacer un pedido especial
          o simplemente quieres saludarnos? Estamos disponibles
          en todas nuestras plataformas. ¡Con gusto te atendemos!
        </p>

        <div className="icons-container">
          <div className="icon-box" data-tooltip="WhatsApp">
            <button
              type="button"
              className="icon-button wsp-button"
              onClick={() => setShowWspMenu(!showWspMenu)}
              aria-expanded={showWspMenu}
              aria-label="WhatsApp: tenemos 2 números disponibles"
            >
              <img src="/estilos/img/whatsapp.png" alt="WhatsApp" />
              <span className="wsp-badge" aria-hidden="true">2</span>
            </button>

            {showWspMenu && (
              <div className="wsp-menu">
                <a
                  href="https://wa.link/h48kng"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  311 538 7534
                </a>
                <hr />
                <a
                  href="https://wa.link/ej3tjx"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  312 361 6372
                </a>
              </div>
            )}
            <p>WhatsApp</p>
          </div>

          <div className="icon-box" data-tooltip="Facebook">
            <a
              className="icon-button"
              href="https://www.facebook.com/ComidasElOriente"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/estilos/img/facebook.png" alt="Facebook" />
            </a>
            <p>Comidas Rápidas El Oriente</p>
          </div>

          <div className="icon-box" data-tooltip="Instagram">
            <a
              className="icon-button"
              href="https://www.instagram.com/ComidasElOriente"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/estilos/img/instagram.png" alt="Instagram" />
            </a>
            <p>@ComidasElOriente</p>
          </div>

          <div className="icon-box" data-tooltip="Gmail">
            <a className="icon-button" href="mailto:ComidasElOriente@gmail.com">
              <img src="/estilos/img/gmail.png" alt="Correo" />
            </a>
            <p>ComidasElOriente@gmail.com</p>
          </div>
        </div>

        <form className="contacto-form" onSubmit={enviar} noValidate>
          <h2>Escríbenos</h2>
          <p className="contacto-form-ayuda">
            Déjanos tus datos y tu mensaje. Responderemos al correo que indiques.
          </p>

          <div className="contacto-grid">
            <div className="contacto-campo">
              <label htmlFor="contacto-nombre">
                Nombre <span className="required-marker">*</span>
              </label>
              <input
                id="contacto-nombre"
                name="nombre"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
                value={form.nombre}
                onChange={(e) => cambiar('nombre', e.target.value)}
                placeholder="Tu nombre completo"
              />
            </div>

            <div className="contacto-campo">
              <label htmlFor="contacto-email">
                Correo electrónico <span className="required-marker">*</span>
              </label>
              <input
                id="contacto-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={150}
                value={form.email}
                onChange={(e) => cambiar('email', e.target.value)}
                placeholder="tucorreo@ejemplo.com"
              />
            </div>

            <div className="contacto-campo">
              <label htmlFor="contacto-telefono">Teléfono (opcional)</label>
              <input
                id="contacto-telefono"
                name="telefono"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={30}
                pattern="[0-9+()\s-]{7,30}"
                title="Solo números, espacios y los signos + ( ) -"
                value={form.telefono}
                onChange={(e) => cambiar('telefono', e.target.value)}
                placeholder="300 000 0000"
              />
            </div>

            <div className="contacto-campo">
              <label htmlFor="contacto-asunto">
                Asunto <span className="required-marker">*</span>
              </label>
              <input
                id="contacto-asunto"
                name="asunto"
                type="text"
                required
                minLength={3}
                maxLength={150}
                value={form.asunto}
                onChange={(e) => cambiar('asunto', e.target.value)}
                placeholder="¿En qué podemos ayudarte?"
              />
            </div>

            <div className="contacto-campo contacto-campo-ancho">
              <label htmlFor="contacto-mensaje">
                Mensaje <span className="required-marker">*</span>
              </label>
              <textarea
                id="contacto-mensaje"
                name="mensaje"
                required
                minLength={10}
                maxLength={2000}
                rows={5}
                value={form.mensaje}
                onChange={(e) => cambiar('mensaje', e.target.value)}
                placeholder="Cuéntanos tu solicitud, queja, sugerencia o pedido especial…"
              />
              <span className="contacto-contador">{form.mensaje.length}/2000</span>
            </div>
          </div>

          <CaptchaLocal
            ref={captchaRef}
            onChange={(id, respuesta) => {
              captchaValido.current = { id, respuesta };
            }}
          />

          <button type="submit" className="contacto-enviar" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar mensaje'}
          </button>
        </form>
      </section>

      <Footer />
    </div>
  );
}
