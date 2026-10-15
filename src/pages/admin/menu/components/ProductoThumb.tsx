import { useState } from 'react';

export default function ProductoThumb({ img, nombre }: { img: string; nombre: string }) {
  const [err, setErr] = useState(false);
  const letra = (nombre ?? '').charAt(0).toUpperCase() || '?';
  if (!img || err) {
    return (
      <span style={{
        width: 42, height: 42, borderRadius: 10, background: 'var(--brand)',
        color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 17, flexShrink: 0,
      }}>
        {letra}
      </span>
    );
  }
  return (
    <img
      src={img}
      alt={nombre}
      onError={() => setErr(true)}
      style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
    />
  );
}
