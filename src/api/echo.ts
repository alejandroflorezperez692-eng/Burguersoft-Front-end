import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

import apiClient from './client';

type EchoReverb = Echo<'reverb'>;
type CanalPrivado = ReturnType<EchoReverb['private']>;

let echo: EchoReverb | null = null;

/** Crea (una sola vez) la conexión websocket con Reverb. Devuelve null si no hay sesión. */
export function getEcho(): EchoReverb | null {
  if (echo) return echo;
  if (!sessionStorage.getItem('token')) return null;

  const llave = import.meta.env.VITE_REVERB_APP_KEY;
  if (!llave) return null;

  const host = import.meta.env.VITE_REVERB_HOST ?? '127.0.0.1';
  const puerto = Number(import.meta.env.VITE_REVERB_PORT ?? 8080);
  const conTLS = (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https';

  try {
    (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

    echo = new Echo<'reverb'>({
      broadcaster: 'reverb',
      key: llave,
      wsHost: host,
      wsPort: puerto,
      wssPort: puerto,
      forceTLS: conTLS,
      enabledTransports: ['ws', 'wss'],
      // Si Reverb está caído, el navegador reintenta solo; aquí no rompemos nada.
      authorizer: (canal) => ({
        authorize: (socketId, callback) => {
          apiClient
            .post('/broadcasting/auth', {
              socket_id: socketId,
              channel_name: canal.name,
            })
            .then(({ data }) => callback(null, data))
            .catch((error: unknown) =>
              callback(
                error instanceof Error ? error : new Error(String(error)),
                null,
              ),
            );
        },
      }),
    });
    return echo;
  } catch {
    return null;
  }
}

const CANAL = 'admin.alertas';
const EVENTO = '.alertas.actualizadas';

/** Suscribe una refresco instantáneo en el canal de alertas del admin (privado). */
export function conectarAlertas(callback: () => void, onError?: (error: unknown) => void): CanalPrivado | null {
  const instancia = getEcho();
  if (!instancia) return null;

  const canal = instancia.private(CANAL);
  canal
    .listen(EVENTO, callback)
    .error((error: unknown) => {
      if (onError) onError(error);
    });

  return canal;
}

/** Quita solo el listener de este componente (la conexión queda para otros). */
export function desconectarAlertas(canal: CanalPrivado, callback: () => void): void {
  canal.stopListening(EVENTO, callback);
}
