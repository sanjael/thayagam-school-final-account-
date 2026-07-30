import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    const mustChange = localStorage.getItem('must_change_password') === 'true';
    return token ? { token, username, role, mustChangePassword: mustChange } : null;
  });

  function login(tokenData) {
    localStorage.setItem('token', tokenData.access_token);
    localStorage.setItem('username', tokenData.username);
    localStorage.setItem('role', tokenData.role);
    localStorage.setItem('must_change_password', tokenData.must_change_password ? 'true' : 'false');
    setUser({
      token: tokenData.access_token,
      username: tokenData.username,
      role: tokenData.role,
      mustChangePassword: tokenData.must_change_password || false,
    });
  }

  function clearMustChangePassword() {
    localStorage.setItem('must_change_password', 'false');
    setUser((prev) => prev ? { ...prev, mustChangePassword: false } : null);
  }

  function logout() {
    localStorage.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, clearMustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
