import { useEffect, useState } from 'react';
import apiClient from '../api/client';

/** Tasa de respaldo solo si el servidor no responde; la real viene de /negocio. */
const TASA_POR_DEFECTO = 0.08;

let tasaCache: number | null = null;
let peticion: Promise<number> | null = null;

function cargarTasa(): Promise<number> {
  if (tasaCache !== null) return Promise.resolve(tasaCache);

  if (!peticion) {
    peticion = apiClient
      .get<{ impuesto?: number }>('/negocio')
      .then(({ data }) => {
        const tasa = Number(data?.impuesto);
        tasaCache = Number.isFinite(tasa) && tasa >= 0 ? tasa : TASA_POR_DEFECTO;
        return tasaCache;
      })
      .catch(() => TASA_POR_DEFECTO)
      .finally(() => {
        peticion = null;
      });
  }

  return peticion;
}

/**
 * F-026: la tasa de impuesto se lee del servidor (GET /api/negocio) para que
 * carrito y checkout usen exactamente la misma que guardan las ventas.
 */
export function useTasaImpuesto(): number {
  const [tasa, setTasa] = useState<number>(tasaCache ?? TASA_POR_DEFECTO);

  useEffect(() => {
    let vivo = true;
    cargarTasa().then((valor) => {
      if (vivo) setTasa(valor);
    });
    return () => {
      vivo = false;
    };
  }, []);

  return tasa;
}
