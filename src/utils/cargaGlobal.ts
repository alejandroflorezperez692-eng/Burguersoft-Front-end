/**
 * Lleva la cuenta de las peticiones que hay en curso.
 * Así el cargador de pantalla completa no desaparece hasta que la página
 * nueva terminó de pedir sus datos.
 */
type Oyente = (pendientes: number) => void;

let pendientes = 0;
const oyentes = new Set<Oyente>();

function avisar(): void {
  oyentes.forEach((oyente) => oyente(pendientes));
}

export function cargaIniciada(): void {
  pendientes += 1;
  avisar();
}

export function cargaFinalizada(): void {
  pendientes = Math.max(0, pendientes - 1);
  avisar();
}

export function pendientesDeCarga(): number {
  return pendientes;
}

/** Avisa cada vez que cambia el número de peticiones en curso. */
export function suscribirCarga(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}
