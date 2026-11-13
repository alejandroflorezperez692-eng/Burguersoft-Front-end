import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App.tsx';
import './styles/responsive.css';
import './styles/claro-fixes.css';
import './styles/x-centradas.css';
import { AuthProvider } from './context/AuthContext.tsx';
import { CartProvider } from './context/CartContext.tsx';

document.addEventListener(
  'click',
  (e) => {
    const t = e.target as HTMLElement | null;
    if (
      t?.classList?.contains('modal-overlay') ||
      t?.classList?.contains('mn-modal-overlay') ||
      t?.classList?.contains('confirm-modal-overlay')
    ) {
      e.stopPropagation();
    }
  },
  true,
);

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>,
);