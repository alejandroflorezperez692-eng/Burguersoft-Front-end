import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AccessibilityPanel from './components/AccessibilityPanel';
import Login from './pages/Login';

function RutaProtegida({ children }: { children: React.ReactNode }) {
  const { usuario, cargando } = useAuth();

  if (cargando) return <p>Cargando...</p>;
  if (!usuario) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RutaProtegida>
            <h1>Bienvenido a BurguerSoft</h1>
          </RutaProtegida>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AccessibilityPanel />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;