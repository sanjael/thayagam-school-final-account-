import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../AppContext';

export default function SignupPage() {
  const { t, language, setLanguage } = useApp();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('accountant'); // default role
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
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
      await api.signup({ username, email, password, role });
      // Redirect to login page on success
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
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

      <div className="w-full max-w-md space-y-8 relative z-10 mt-8">
        
        {/* Main Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] border border-slate-100">
          
          <div className="text-center mb-6">
            {/* School Logo */}
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-md border-4 border-amber-500/20 overflow-hidden mb-4">
              <img 
                src="/logo.jpg" 
                alt="School Logo" 
                className="h-full w-full object-contain p-2"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
              <div className="hidden h-full w-full items-center justify-center text-4xl text-blue-900 bg-slate-50">
                
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-950 mb-1">
              Thayagam
            </h1>
            <h2 className="text-sm sm:text-base font-semibold text-slate-500 uppercase tracking-wide">
              Matric Hr Sec School
            </h2>
            <div className="mt-3 w-12 h-1 bg-amber-500 mx-auto rounded-full"></div>
            
            <h3 className="mt-6 text-lg font-bold text-slate-700">
              Create an Account
            </h3>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-rose-50 border-l-4 border-rose-500 px-4 py-3 text-sm text-rose-700 font-medium shadow-sm">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {error}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {t('username') || "Username"}
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
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-2.5 text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white text-sm font-medium"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-2.5 text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white text-sm font-medium"
                  placeholder="admin@thayagam.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Role
              </label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white text-sm font-medium appearance-none cursor-pointer"
                >
                  <option value="admin">Admin</option>
                  <option value="accountant">Accountant</option>
                  <option value="principal">Principal</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {t('password') || "Password"}
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
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-2.5 text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white text-sm font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs px-1 pt-1">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none font-medium hover:text-blue-700 transition-colors">
                <input 
                  type="checkbox" 
                  checked={showPassword} 
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                />
                {t('showPassword') || "Show Password"}
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-3.5 text-sm font-bold text-blue-950 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none shadow-lg shadow-amber-500/30 group"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-blue-950" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Creating account...</span>
                  </div>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign Up
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </span>
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 font-bold hover:text-blue-800 transition-colors">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
