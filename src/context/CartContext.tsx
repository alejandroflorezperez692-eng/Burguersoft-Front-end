import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

export type CartItem = {
  id: string | number;
  nombre: string;
  precio: number;
  imagen?: string | null;
  cantidad: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  agregar: (item: Omit<CartItem, 'cantidad'> & { cantidad?: number }) => void;
  quitar: (id: string | number) => void;
  actualizarCantidad: (id: string | number, cantidad: number) => void;
  vaciar: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
export { CartContext };

const STORAGE_KEY = 'burguersoft_cart';

function readStored(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Sanea items corruptos para que nunca rompan el render ni el total
    return parsed
      .filter((p) => p && typeof p === 'object')
      .map((p) => ({
        id: (p as CartItem).id ?? Math.random().toString(36).slice(2),
        nombre: String((p as CartItem).nombre ?? 'Producto'),
        precio: Number((p as CartItem).precio ?? 0) || 0,
        imagen: (p as CartItem).imagen ?? null,
        cantidad: Number((p as CartItem).cantidad ?? 1) || 1,
      }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readStored());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const count = useMemo(() => items.reduce((a, b) => a + (Number(b.cantidad) || 0), 0), [items]);
  const total = useMemo(() => items.reduce((a, b) => a + (Number(b.precio) || 0) * (Number(b.cantidad) || 0), 0), [items]);

  const agregar = useCallback((item: Omit<CartItem, 'cantidad'> & { cantidad?: number }) => {
    setItems((prev) => {
      const idx = prev.findIndex((p) => String(p.id) === String(item.id));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], cantidad: copy[idx].cantidad + (item.cantidad ?? 1) };
        return copy;
      }
      return [...prev, { ...item, cantidad: item.cantidad ?? 1 }];
    });
    setIsOpen(true);
  }, []);

  const quitar = useCallback((id: string | number) => {
    setItems((prev) => prev.filter((p) => String(p.id) !== String(id)));
  }, []);

  const actualizarCantidad = useCallback((id: string | number, cantidad: number) => {
    if (cantidad <= 0) {
      setItems((prev) => prev.filter((p) => String(p.id) !== String(id)));
      return;
    }
    setItems((prev) => prev.map((p) => (String(p.id) === String(id) ? { ...p, cantidad } : p)));
  }, []);

  const vaciar = useCallback(() => setItems([]), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo<CartContextValue>(
    () => ({ items, count, total, isOpen, open, close, toggle, agregar, quitar, actualizarCantidad, vaciar }),
    [items, count, total, isOpen, open, close, toggle, agregar, quitar, actualizarCantidad, vaciar],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
