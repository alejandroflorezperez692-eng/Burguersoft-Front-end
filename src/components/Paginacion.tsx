import '../styles/paginacion.css';

export const POR_PAGINA = 10;

/** Corta la lista en la página pedida. La página se ajusta sola si queda fuera de rango. */
export function paginar<T>(lista: T[], pagina: number, porPagina: number = POR_PAGINA) {
  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const paginaActual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaActual - 1) * porPagina;
  return { visibles: lista.slice(inicio, inicio + porPagina), paginaActual, totalPaginas, inicio };
}

// [1, '…', 4, 5, 6, '…', 12]
const numerosPagina = (actual: number, total: number): (number | '…')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const ini = Math.max(2, actual - 1);
  const fin = Math.min(total - 1, actual + 1);
  if (ini > 2) out.push('…');
  for (let i = ini; i <= fin; i++) out.push(i);
  if (fin < total - 1) out.push('…');
  out.push(total);
  return out;
};

interface Props {
  total: number;
  pagina: number;
  onCambiar: (n: number) => void;
  porPagina?: number;
  /** Texto después del total, ej: "días" -> "Mostrando 1–5 de 12 días" */
  etiqueta?: string;
}

export default function Paginacion({ total, pagina, onCambiar, porPagina = POR_PAGINA, etiqueta }: Props) {
  if (total === 0) return null;

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const actual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (actual - 1) * porPagina;
  const ir = (n: number) => onCambiar(Math.min(Math.max(1, n), totalPaginas));

  return (
    <div className="pag">
      <span className="pag-info">
        Mostrando {inicio + 1}–{Math.min(inicio + porPagina, total)} de {total}{etiqueta ? ` ${etiqueta}` : ''}
      </span>

      {totalPaginas > 1 && (
        <nav className="pag-nav" aria-label="Paginación">
          <button type="button" className="pag-btn" onClick={() => ir(actual - 1)} disabled={actual === 1}>
            ‹ Anterior
          </button>

          {numerosPagina(actual, totalPaginas).map((n, i) =>
            n === '…' ? (
              <span key={`e${i}`} className="pag-dots">…</span>
            ) : (
              <button
                key={n}
                type="button"
                className={`pag-btn pag-num${n === actual ? ' activa' : ''}`}
                onClick={() => ir(n)}
                aria-current={n === actual ? 'page' : undefined}
              >
                {n}
              </button>
            )
          )}

          <button type="button" className="pag-btn" onClick={() => ir(actual + 1)} disabled={actual === totalPaginas}>
            Siguiente ›
          </button>
        </nav>
      )}
    </div>
  );
}