import 'bootstrap/dist/css/bootstrap.min.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from "react-oidc-context";

// Настройки подключения к Keycloak
const oidcConfig = {
  authority: "http://localhost:8180/realms/education-realm",
  client_id: "education-client",
  redirect_uri: "http://localhost:5173",
  // После входа мы хотим видеть данные пользователя
  onSigninCallback: () => {
    // Чистим URL от мусора после редиректа
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Оборачиваем App в AuthProvider */}
    <AuthProvider {...oidcConfig}>
      <App />
    </AuthProvider>
  </StrictMode>,
)