import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { EstadisticasVentas } from '../types/Ventas';

const PALETA = ['#E8821A', '#C2410C', '#7C9A3C', '#2F7FB8', '#8E5BB5', '#B5563F'];

const dinero = (valor: number) =>
  Math.abs(valor) >= 1000000
    ? `$${(valor / 1000000).toFixed(1)}M`
    : `$${Math.round(valor).toLocaleString('es-CO')}`;

const dineroCorto = (valor: number) =>
  valor >= 1000 ? `$${Math.round(valor / 1000)}k` : `$${Math.round(valor)}`;

const etiquetaDia = (clave: string) => `${clave.slice(8, 10)}/${clave.slice(5, 7)}`;

interface Props {
  datos: EstadisticasVentas | null;
  cargando: boolean;
  error: boolean;
  dias: number;
  onCambiarDias: (dias: number) => void;
}

export default function VentasGraficas({ datos, cargando, error, dias, onCambiarDias }: Props) {
  const [orden, setOrden] = useState<number[]>([0, 1, 2]);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado) return;

    const temporizador = window.setInterval(() => {
      setOrden(([primera, segunda, tercera]) => [tercera, primera, segunda]);
    }, 5000);

    return () => window.clearInterval(temporizador);
  }, [pausado]);

  const serie = datos?.por_dia ?? [];
  const claves = serie.map((d) => d.dia);
  const ingresos = serie.map((d) => Number(d.total) || 0);
  const pedidos = serie.map((d) => Number(d.pedidos) || 0);
  const totalPeriodo = Number(datos?.total_periodo) || 0;
  const totalPedidos = Number(datos?.pedidos_periodo) || 0;
  const ticketPromedio = totalPedidos ? totalPeriodo / totalPedidos : 0;
  const variacion =
    datos && Number(datos.total_previo) > 0
      ? ((totalPeriodo - Number(datos.total_previo)) / Number(datos.total_previo)) * 100
      : null;

  const topProductos: [string, number][] = (datos?.por_producto ?? []).map((p) => [p.nombre, Number(p.cantidad) || 0]);
  const metodos: [string, number][] = (datos?.por_pago ?? []).map((p) => [p.metodo, Number(p.total) || 0]);
  const totalMetodos = metodos.reduce((a, [, valor]) => a + valor, 0);

  const graficaIngresos = (grande: boolean): ReactNode => {
    const ancho = grande ? 640 : 340;
    const alto = grande ? 230 : 200;
    const izquierda = grande ? 48 : 40;
    const derecha = 10;
    const superior = 14;
    const inferior = 26;

    const anchoArea = ancho - izquierda - derecha;
    const altoArea = alto - superior - inferior;
    const maxIngreso = Math.max(...ingresos, 1);
    const paso = ingresos.length > 1 ? anchoArea / (ingresos.length - 1) : anchoArea;
    const px = (i: number) => izquierda + i * paso;
    const py = (valor: number) => superior + altoArea - (valor / maxIngreso) * altoArea;

    const puntos = ingresos
      .map((valor, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(2)},${py(valor).toFixed(2)}`)
      .join(' ');
    const area = `${puntos} L${px(ingresos.length - 1).toFixed(2)},${superior + altoArea} L${izquierda},${superior + altoArea} Z`;

    const fracciones = grande ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.5, 1];
    const formatoEje = grande ? dinero : dineroCorto;
    const cadaEtiqueta = grande
      ? claves.length > 14 ? 5 : 1
      : Math.max(1, Math.ceil((claves.length - 1) / 3));

    return (
      <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label="Ingresos por día">
        <defs>
          <linearGradient id="ventas-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8821A" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#E8821A" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {fracciones.map((fraccion) => {
          const y = superior + altoArea * (1 - fraccion);

          return (
            <g key={fraccion}>
              <line className="grid-linea" x1={izquierda} y1={y} x2={ancho - derecha} y2={y} />
              <text className="eje" x={izquierda - 6} y={y + 3} textAnchor="end">
                {formatoEje(maxIngreso * fraccion)}
              </text>
            </g>
          );
        })}

        <path d={area} fill="url(#ventas-grad)" />
        <path d={puntos} fill="none" stroke="#E8821A" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {ingresos.map((valor, i) => (
          <g key={claves[i]}>
            <rect
              x={px(i) - paso / 2}
              y={superior}
              width={Math.max(paso, 6)}
              height={altoArea}
              fill="transparent"
            >
              <title>{`${etiquetaDia(claves[i])}: ${dinero(valor)} · ${pedidos[i]} pedidos`}</title>
            </rect>
            {claves.length <= 14 && (
              <circle cx={px(i)} cy={py(valor)} r={grande ? 3.5 : 2.5} fill="#fff" stroke="#E8821A" strokeWidth={2} />
            )}
            {i % cadaEtiqueta === 0 && (
              <text
                className="eje"
                x={px(i)}
                y={alto - 6}
                textAnchor={i === 0 ? 'start' : i === claves.length - 1 ? 'end' : 'middle'}
              >
                {etiquetaDia(claves[i])}
              </text>
            )}
          </g>
        ))}
      </svg>
    );
  };

  const graficaProductos = (grande: boolean): ReactNode => (
    <div className={grande ? 'ventas-contenido-medio' : undefined}>
      <div className="ventas-barras">
        {topProductos.map(([nombre, cantidad], indice) => (
          <div className="ventas-barra-fila" key={nombre}>
            <span className="ventas-barra-label" title={nombre}>{nombre}</span>
            <span className="ventas-barra-track">
              <span
                className="ventas-barra-fill"
                style={{
                  width: `${Math.max((cantidad / topProductos[0][1]) * 100, 4)}%`,
                  background: PALETA[indice % PALETA.length],
                }}
              />
            </span>
            <span className="ventas-barra-valor">{cantidad}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const graficaMetodos = (grande: boolean): ReactNode => (
    <div className={grande ? 'ventas-contenido-medio' : undefined}>
      <div className="ventas-dona">
        <svg viewBox="0 0 160 160" role="img" aria-label="Métodos de pago">
          <circle cx={80} cy={80} r={54} fill="none" stroke="var(--surface-3)" strokeWidth={22} />
          {(() => {
            const circunferencia = 2 * Math.PI * 54;
            let acumulado = 0;

            return metodos.map(([nombre, valor], indice) => {
              const longitud = (valor / totalMetodos) * circunferencia;
              const inicio = acumulado;
              acumulado += longitud;

              return (
                <circle
                  key={nombre}
                  cx={80}
                  cy={80}
                  r={54}
                  fill="none"
                  stroke={PALETA[indice % PALETA.length]}
                  strokeWidth={22}
                  strokeDasharray={`${longitud} ${circunferencia - longitud}`}
                  strokeDashoffset={-inicio}
                  transform="rotate(-90 80 80)"
                >
                  <title>{`${nombre}: ${dinero(valor)} (${Math.round((valor / totalMetodos) * 100)}%)`}</title>
                </circle>
              );
            });
          })()}
          <text x={80} y={78} textAnchor="middle" className="ventas-dona-total">{dinero(totalMetodos)}</text>
          <text x={80} y={94} textAnchor="middle" className="ventas-dona-detalle">en ventas</text>
        </svg>

        <div className="ventas-leyenda">
          {metodos.map(([nombre, valor], indice) => (
            <div className="ventas-leyenda-item" key={nombre}>
              <span className="ventas-leyenda-punto" style={{ background: PALETA[indice % PALETA.length] }} />
              <span>{nombre}</span>
              <strong>{Math.round((valor / totalMetodos) * 100)}%</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const graficas: { titulo: string; sub: string; contenido: (grande: boolean) => ReactNode; vacia?: boolean }[] = [
    {
      titulo: 'Ingresos por día',
      sub: 'No incluye ventas canceladas ni reembolsadas',
      contenido: graficaIngresos,
      vacia: totalPedidos === 0,
    },
    {
      titulo: 'Productos más vendidos',
      sub: 'Unidades en el periodo',
      contenido: graficaProductos,
      vacia: topProductos.length === 0,
    },
    {
      titulo: 'Métodos de pago',
      sub: 'Participación en ingresos',
      contenido: graficaMetodos,
      vacia: metodos.length === 0,
    },
  ];

  return (
    <section
      className="ventas-graficas"
      aria-busy={cargando}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className="ventas-graficas-cabecera">
        <div>
          <h3 className="ventas-graficas-titulo">Análisis de ventas</h3>
          <p className="ventas-graficas-resumen">
            {dinero(totalPeriodo)} · {totalPedidos} pedidos · ticket promedio {dinero(ticketPromedio)}
            {variacion !== null && (
              <span className={`ventas-variacion ${variacion >= 0 ? 'positiva' : 'negativa'}`}>
                {variacion >= 0 ? '▲' : '▼'} {Math.abs(variacion).toFixed(0)}% vs. periodo anterior
              </span>
            )}
            {cargando && datos && <span className="ventas-cargando">actualizando…</span>}
          </p>
        </div>
        <div className="ventas-periodo">
          {[7, 30].map((opcion) => (
            <button
              key={opcion}
              type="button"
              className={dias === opcion ? 'activo' : ''}
              onClick={() => onCambiarDias(opcion)}
            >
              {opcion} días
            </button>
          ))}
        </div>
      </div>

      {error && !datos ? (
        <article className="ventas-grafica ventas-grafica-ancha">
          <p className="ventas-grafica-vacia">No se pudieron cargar las estadísticas.</p>
        </article>
      ) : (
        orden.map((id, posicion) => {
          const grande = posicion === 0;
          const grafica = graficas[id];

          return (
            <article
              key={id}
              className={`ventas-grafica ${grande ? 'ventas-grafica-ancha' : ''}`}
            >
              <h4>{grafica.titulo}</h4>
              <p className="ventas-grafica-sub">{grafica.sub}</p>

              {grafica.vacia ? (
                <p className="ventas-grafica-vacia">
                  {id === 0 ? 'Sin ventas en este periodo.' : 'Sin datos todavía.'}
                </p>
              ) : (
                grafica.contenido(grande)
              )}
            </article>
          );
        })
      )}
    </section>
  );
}
