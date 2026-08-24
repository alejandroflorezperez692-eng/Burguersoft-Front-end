import { useEffect, useRef, useState } from "react";

export default function AccessibilityPanel() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const body = document.body;
    if (localStorage.getItem("acc_tema") === "oscuro") {
      body.classList.add("dark-mode");
    }
    const fontGuardada = localStorage.getItem("acc_font");
    if (fontGuardada) {
      body.style.fontFamily = fontGuardada;
    }
    const factorGuardado = parseFloat(localStorage.getItem("acc_factor") || "1.0");
    if (factorGuardado !== 1.0) {
      aplicarEscala(factorGuardado);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!panelRef.current || !fabRef.current) return;
      const target = e.target as Node;
      if (open && !panelRef.current.contains(target) && !fabRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  function aplicarEscala(factor: number) {
    const selector = "p, h1, h2, h3, h4, h5, h6, span, a, li, button, label, b, i, strong, td, th";
    const elementos = document.querySelectorAll<HTMLElement>(selector);
    elementos.forEach((el) => {
      if (!el.dataset.origSize) {
        el.dataset.origSize = window.getComputedStyle(el).fontSize;
      }
      el.style.setProperty("font-size", `${parseFloat(el.dataset.origSize) * factor}px`, "important");
    });
  }

  function cambiarFuente(direccion: number) {
    const factorActual = parseFloat(localStorage.getItem("acc_factor") || "1.0");
    const nuevoFactor = Math.round((factorActual + direccion * 0.1) * 10) / 10;
    if (nuevoFactor >= 0.8 && nuevoFactor <= 2.0) {
      aplicarEscala(nuevoFactor);
      localStorage.setItem("acc_factor", String(nuevoFactor));
    }
  }

  function setTema(modo: "claro" | "oscuro") {
    if (modo === "oscuro") {
      document.body.classList.add("dark-mode");
      localStorage.setItem("acc_tema", "oscuro");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("acc_tema", "claro");
    }
  }

  function aplicarFuente(fuente: string) {
    document.body.style.fontFamily = fuente;
    localStorage.setItem("acc_font", fuente);
  }

  function restablecer() {
    localStorage.clear();
    window.location.reload();
  }

  return (
    <>
      <div className={`acc-panel ${open ? "open" : ""}`} id="accPanel" ref={panelRef}>
        <div className="acc-panel-title">Accesibilidad</div>
        <div className="acc-row">
          <div className="acc-row-label">Tema</div>
          <div className="acc-row-btns">
            <button className="acc_tema" onClick={() => setTema("claro")}>Claro</button>
            <button className="acc_tema" onClick={() => setTema("oscuro")}>Oscuro</button>
          </div>
        </div>
        <div className="acc-row">
          <div className="acc-row-label">Tamaño de letra</div>
          <div className="acc-row-btns">
            <button className="acc-btn-option" onClick={() => cambiarFuente(-1)}>A-</button>
            <button className="acc-btn-option" onClick={() => cambiarFuente(1)}>A+</button>
          </div>
        </div>
        <div className="acc-row">
          <div className="acc-row-label">Tipo de letra</div>
          <div className="acc-row-btns">
            <button className="acc-btn-option" onClick={() => aplicarFuente("Georgia, serif")}>Serif</button>
            <button className="acc-btn-option" onClick={() => aplicarFuente("Arial, sans-serif")}>Sans</button>
          </div>
        </div>
        <button className="acc-btn-reset" onClick={restablecer}>Restablecer</button>
      </div>

      <button className="acc-fab" id="accFab" ref={fabRef} onClick={() => setOpen((v) => !v)}>
        <img
          style={{ width: 24, height: 24, filter: "invert(1)", pointerEvents: "none" }}
          src="/estilos/img/accesibilidad.png"
          alt="Accesibilidad"
        />
      </button>
    </>
  );
}