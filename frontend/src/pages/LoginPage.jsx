import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useApp } from '../AppContext';

export default function LoginPage() {
  const { t, language, setLanguage } = useApp();
  const [username, setUsername] = useState(() => localStorage.getItem('remember_username') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('remember_username'));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const usernameRef = useRef(null);

  useEffect(() => {
    if (usernameRef.current) {
      usernameRef.current.focus();
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(username, password);
      login(data);
      
      if (rememberMe) {
        localStorage.setItem('remember_username', username);
      } else {
        localStorage.removeItem('remember_username');
      }

      // Force password change on first login
      if (data.must_change_password) {
        navigate('/change-password');
        return;
      }
      // Role-based redirection
      if (data.role === 'accountant') {
        navigate('/payments');
      } else if (data.role === 'principal') {
        navigate('/reports');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('credentials')) {
        setError(language === 'ta' ? t('tamilError') : t('invalidCredentials'));
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background styling for a professional look */}
      <div className="absolute top-0 w-full h-1/2 bg-blue-900 shadow-xl rounded-b-[4rem] sm:rounded-b-[8rem]"></div>
      
      {/* Top right language switch */}
      <div className="absolute top-6 right-6 z-20 flex gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-1 shadow-md">
        <button
          onClick={() => setLanguage('en')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
            language === 'en' ? 'bg-amber-500 text-blue-950 shadow-sm' : 'text-blue-100 hover:text-white'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => setLanguage('ta')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
            language === 'ta' ? 'bg-amber-500 text-blue-950 shadow-sm' : 'text-blue-100 hover:text-white'
          }`}
        >
          தமிழ்
        </button>
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        
        {/* Main Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] border border-slate-100">
          
          <div className="text-center mb-8">
            {/* School Logo */}
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-white shadow-xl border-4 border-amber-500/30 overflow-hidden mb-4 p-2 transition-transform duration-300 hover:scale-105">
              <img 
                src="/logo.jpg" 
                alt="School Logo" 
                className="h-full w-full object-contain"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
              {/* Fallback icon if logo not found */}
              <div className="hidden h-full w-full items-center justify-center text-4xl font-black text-blue-900 bg-white">
                TA
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-950 mb-1">
              Thayagam
            </h1>
            <h2 className="text-sm sm:text-base font-semibold text-slate-500 uppercase tracking-wide">
              Matric Hr Sec School
            </h2>
            <div className="mt-3 w-12 h-1 bg-amber-500 mx-auto rounded-full"></div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-rose-50 border-l-4 border-rose-500 px-4 py-3 text-sm text-rose-700 font-medium shadow-sm">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {error}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {t('username')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                </div>
                <input
                  ref={usernameRef}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-3 text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white text-sm font-medium"
                  placeholder="admin / accountant / principal"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {t('password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-3 text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white text-sm font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs px-1 pt-1">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none font-medium hover:text-blue-700 transition-colors">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                />
                {t('rememberMe')}
              </label>

              <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none font-medium hover:text-blue-700 transition-colors">
                <input 
                  type="checkbox" 
                  checked={showPassword} 
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                />
                {t('showPassword')}
              </label>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center rounded-xl bg-blue-900 hover:bg-blue-800 px-4 py-3.5 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none shadow-lg shadow-blue-900/30 group"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{t('signingIn')}</span>
                  </div>
                ) : (
                  <span className="flex items-center gap-2">
                    {t('signIn')}
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </span>
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">
              School Management System &copy; {new Date().getFullYear()}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Contact your administrator to get an account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

