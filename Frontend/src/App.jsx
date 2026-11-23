import { BrowserRouter } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from './shared/contexts/ThemeContext';
import { PermissionProvider } from './shared/contexts/PermissionContext';
import { ConfiguracionProvider } from './shared/contexts/ConfiguracionContext';
import { Toaster } from './shared/components/Toaster';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { AppRoutes } from './routes';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      // Si hay sesión guardada o en entorno de desarrollo, mantener activo
      if (token || user) return true;
      return true; // Por defecto activo para navegación fluida
    } catch {
      return true;
    }
  });

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('cenarepas_role_id');
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // Reemplaza esto con tu Client ID real de Google Cloud
  const GOOGLE_CLIENT_ID = "241085126353-arfjd2ij4qhuc7033u169ip1psrhjktl.apps.googleusercontent.com";

  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <ThemeProvider>
          <PermissionProvider>
            <ConfiguracionProvider>
              <BrowserRouter>
                <AppRoutes
                  isAuthenticated={isAuthenticated}
                  setIsAuthenticated={setIsAuthenticated}
                />
                <Toaster />
              </BrowserRouter>
            </ConfiguracionProvider>
          </PermissionProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}