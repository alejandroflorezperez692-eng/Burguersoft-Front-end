import apiClient from './client';

export interface MensajeIA {
  role: 'user' | 'assistant';
  content: string;
}

export interface ContextoAsistente {
  pagina: string; // ej. /ventas, /menu, /materia-prima
  resumen?: string; // resumen numérico que cada página admin puede aportar
}

// Intenta llamar al backend Laravel. Contrato esperado:
// POST {VITE_API_URL}/asistente/chat  body: { mensaje, pagina, resumen, historial }
// resp: { respuesta: string }
export async function enviarMensajeAsistente(
  mensaje: string,
  contexto: ContextoAsistente,
  historial: MensajeIA[] = [],
): Promise<string> {
  const { data } = await apiClient.post('/asistente/chat', {
    mensaje,
    pagina: contexto.pagina,
    resumen: contexto.resumen ?? null,
    historial: historial.slice(-10),
  });
  const r = (data as { respuesta?: string; message?: string })?.respuesta
    ?? (data as { message?: string })?.message;
  if (!r) throw new Error('Respuesta vacía del asistente');
  return r;
}

// Fallback local para que el widget funcione aunque el backend aún no exista.
// Cuando conectes el backend real, este fallback solo se usará si hay error de red.
export function respuestaLocalAsistente(mensaje: string, pagina: string): string {
  const m = mensaje.toLowerCase();
  const nombrePagina = pagina.replace('/', '') || 'inicio';

  if (/iva|impuesto|factura|dian/.test(m)) {
    return `En ${nombrePagina} el IVA ya está desglosado: usamos tarifa general 19% con precio CON IVA incluido (práctica habitual en restaurantes).\n\n• Fórmula: base = total / 1.19 | IVA = total − base.\n• Ej: venta de $50.000 → base $42.017 + IVA $7.983.\n• Lo ves en FacturaModal y en la columna "IVA 19%" de Ventas.\n\nCuando conectes el backend (/api/asistente/chat), podré calcular el IVA real del día con tus ventas.`;
  }
  if (/venta|ingreso|hoy|total|resumen|analiz|dato/.test(m)) {
    return `Puedo analizar tus ventas cuando el backend esté conectado (POST /api/asistente/chat con {mensaje, pagina, resumen}).\n\nPor ahora, desde /ventas ya ves: ventas hoy, ingresos hoy + IVA incluido, e ingresos totales.\n\nPregúntame por ejemplo:\n• "¿Cuánto IVA generé hoy?"\n• "¿Qué producto se vende más?"\n• "Sugiere una promoción para el fin de semana"`;
  }
  if (/stock|inventario|materia|compra|proveedor/.test(m)) {
    return `Para inventario revisa /materia-prima y /compras. Cuando el backend envíe el resumen de stock bajo, te alertaré aquí y te sugeriré órdenes de compra.\n\nTip: dime "qué comprar esta semana" y te armo la lista con base en consumo y punto de reorden.`;
  }
  if (/promo|men[uú]|producto|precio|descuento/.test(m)) {
    return `Te ayudo a redactar promociones y descripciones de menú que vendan.\n\nDime por ejemplo: "créame una promo de hamburguesa doble para viernes" y te doy nombre, texto, precio sugerido con IVA y condiciones.\n\nEn la página completa (/asistente-ia) tendrás más espacio para trabajar estos textos.`;
  }
  if (/hola|buenas|ayuda|qué puedes|que puedes|cómo|como/.test(m)) {
    return `¡Hola! Soy tu asistente de administración (solo visible en el panel admin).\n\nPuedo:\n• Explicar cada módulo según la página donde estés (ahora: ${nombrePagina}).\n• Explicar el IVA 19% de las facturas.\n• Analizar ventas, stock y sugerir compras/promos (al conectar el backend).\n\nPrueba con: "resume las ventas" o "explícame el IVA".`;
  }
  return `Estoy en modo local (backend aún no conectado) y estás en "${nombrePagina}".\n\nEntendí: "${mensaje}".\n\nPuedo ayudarte con ventas, IVA 19%, inventario y promociones. Prueba con "¿cuánto IVA generé?" o abre la página completa en Asistente IA para un análisis más amplio.`;
}
