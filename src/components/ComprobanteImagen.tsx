import { useEffect, useState } from 'react';
import apiClient from '../api/client';

interface ComprobanteImagenProps {
  ventaId: number;
  
  version?: string | number | null;
  alt?: string;
}


export default function ComprobanteImagen({
  ventaId,
  version,
  alt = 'Comprobante de pago',
}: ComprobanteImagenProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    let objectUrl: string | null = null;

    setCargando(true);
    setError(false);
    setUrl(null);

    apiClient
      .get(`/ventas/${ventaId}/comprobante/imagen`, { responseType: 'blob' })
      .then(({ data }) => {
        if (!activo) return;
        objectUrl = URL.createObjectURL(data);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (activo) setError(true);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [ventaId, version]);

  if (cargando) {
    return <p className="comprobante-imagen-estado">Cargando comprobante…</p>;
  }

  if (error || !url) {
    return <p className="comprobante-imagen-estado error">No se pudo cargar la imagen del comprobante.</p>;
  }

  return (
    <div className="comprobante-imagen-wrap">
      <img src={url} alt={alt} className="comprobante-imagen" />
      <a href={url} target="_blank" rel="noopener noreferrer" className="comprobante-imagen-abrir">
        Abrir imagen completa ↗
      </a>
    </div>
  );
}
