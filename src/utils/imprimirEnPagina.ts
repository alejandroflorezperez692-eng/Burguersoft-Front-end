/** Imprime un HTML completo desde un iframe oculto, sin abrir pestañas ni ventanas. */
export function imprimirEnPagina(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    position: 'fixed', right: '0', bottom: '0',
    width: '0', height: '0', border: '0', visibility: 'hidden',
  });
  document.body.appendChild(iframe);

  const ventana = iframe.contentWindow;
  if (!ventana) { iframe.remove(); return; }

  const limpiar = () => iframe.remove();
  ventana.addEventListener('afterprint', limpiar);
  setTimeout(limpiar, 120000); // por si afterprint no se dispara

  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();

  let impreso = false;
  const lanzar = () => {
    if (impreso) return;
    impreso = true;
    ventana.focus();
    ventana.print();
  };

  const img = ventana.document.querySelector('img');
  if (img && !img.complete) {
    img.onload = lanzar;
    img.onerror = lanzar;
    setTimeout(lanzar, 1500);
  } else {
    setTimeout(lanzar, 300);
  }
}