import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function DemoAccess() {
  const { demoLogin } = useAuth();
  const [searchParams] = useSearchParams();
  const procesado = useRef(false);

  useEffect(() => {
    const demo = searchParams.get('demo');
    if (demo && !procesado.current) {
      procesado.current = true;
      demoLogin(demo);
    }
  }, [searchParams, demoLogin]);

  return null;
}
