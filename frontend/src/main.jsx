import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './AppContext';
import { AuthProvider } from './AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  </React.StrictMode>
);
