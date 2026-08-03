import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { api, BASE_URL } from '../api';
import {
  LayoutDashboard, Users, BookOpen, CreditCard, Receipt,
  FileBarChart, Settings, ShieldAlert, LogOut, UserCog, KeyRound, X, Bus
} from 'lucide-react';

const NAV_BY_ROLE = {
  admin: [
    { to: '/dashboard',   label: 'Dashboard',      icon: <LayoutDashboard size={20} strokeWidth={2.5} /> },
    { to: '/students',    label: 'Students',        icon: <Users size={20} strokeWidth={2.5} /> },
    { to: '/classes',     label: 'Classes',         icon: <BookOpen size={20} strokeWidth={2.5} /> },
    { to: '/fees',        label: 'Fee Structure',   icon: <CreditCard size={20} strokeWidth={2.5} /> },
    { to: '/payments',    label: 'Payments',        icon: <Receipt size={20} strokeWidth={2.5} /> },
    { to: '/van-fees',    label: 'Van Fees',        icon: <Bus size={20} strokeWidth={2.5} /> },
    { to: '/reports',     label: 'Reports',         icon: <FileBarChart size={20} strokeWidth={2.5} /> },
    { to: '/admin/users', label: 'User Management', icon: <UserCog size={20} strokeWidth={2.5} /> },
    { to: '/audit-logs',  label: 'Audit Logs',      icon: <ShieldAlert size={20} strokeWidth={2.5} /> },
    { to: '/settings',    label: 'Settings',        icon: <Settings size={20} strokeWidth={2.5} /> },
  ],
  accountant: [
    { to: '/dashboard',   label: 'Dashboard',      icon: <LayoutDashboard size={20} strokeWidth={2.5} /> },
    { to: '/payments',    label: 'Payments',        icon: <Receipt size={20} strokeWidth={2.5} /> },
    { to: '/students',    label: 'Students',        icon: <Users size={20} strokeWidth={2.5} /> },
    { to: '/van-fees',    label: 'Van Fees',        icon: <Bus size={20} strokeWidth={2.5} /> },
    { to: '/reports',     label: 'Reports',         icon: <FileBarChart size={20} strokeWidth={2.5} /> },
  ],
  principal: [
    { to: '/reports',     label: 'Reports',         icon: <FileBarChart size={20} strokeWidth={2.5} /> },
    { to: '/students',    label: 'Students',        icon: <Users size={20} strokeWidth={2.5} /> },
    { to: '/classes',     label: 'Classes',         icon: <BookOpen size={20} strokeWidth={2.5} /> },
    { to: '/dashboard',   label: 'Overview',        icon: <LayoutDashboard size={20} strokeWidth={2.5} /> },
  ],
};

const THEME = {
  admin: {
    sidebar:  'bg-[#0a0f1e] border-[#1a2340]',
    active:   'bg-amber-500 text-[#0a0f1e] shadow-lg shadow-amber-500/20',
    inactive: 'text-slate-400 hover:bg-[#1a2340] hover:text-white',
    accent:   'text-amber-400',
    badge:    'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    avatar:   'bg-[#0a0f1e] border-amber-500/40 text-amber-400',
    label:    'ADMINISTRATOR',
    close:    'hover:bg-amber-500/10 text-amber-400',
  },
  accountant: {
    sidebar:  'bg-slate-900 border-slate-800',
    active:   'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/20',
    inactive: 'text-slate-400 hover:bg-slate-800 hover:text-white',
    accent:   'text-emerald-400',
    badge:    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    avatar:   'bg-slate-950 border-emerald-500/40 text-emerald-400',
    label:    'ACCOUNTANT',
    close:    'hover:bg-emerald-500/10 text-emerald-400',
  },
  principal: {
    sidebar:  'bg-[#0d0d1f] border-[#1a1a3a]',
    active:   'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20',
    inactive: 'text-slate-400 hover:bg-[#1a1a3a] hover:text-white',
    accent:   'text-indigo-400',
    badge:    'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
    avatar:   'bg-[#0d0d1f] border-indigo-500/40 text-indigo-400',
    label:    'PRINCIPAL',
    close:    'hover:bg-indigo-500/10 text-indigo-400',
  },
};

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState('/logo.jpg');

  const role = user?.role || 'accountant';
  const theme = THEME[role] || THEME.accountant;
  const navItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.accountant;

  useEffect(() => {
    async function fetchLogo() {
      try {
        const s = await api.getSettings();
        if (s?.logo_path) {
          setLogoUrl(s.logo_path.startsWith('data:image') ? s.logo_path : `${BASE_URL}/${s.logo_path}`);
        }
      } catch {}
    }
    fetchLogo();
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const roleInitial = { admin: 'A', accountant: 'Ac', principal: 'P' }[role] || '?';

  return (
    <aside className={`flex h-screen w-72 flex-col ${theme.sidebar} border-r text-slate-100 shadow-2xl z-20 font-sans transition-colors duration-300`}>

      {/* Brand Header */}
      <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-2 relative">
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className={`md:hidden absolute top-4 right-4 p-2 rounded-xl transition ${theme.close}`}
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>

        <div className="w-16 h-16 bg-white rounded-2xl border-2 border-amber-500/40 flex items-center justify-center shadow-xl overflow-hidden p-1.5 transition-transform duration-300 hover:scale-105">
          <img 
            src={logoUrl} 
            alt="Thayagam Academy Logo" 
            className="w-full h-full object-contain" 
            onError={(e) => {
              if (e.target.src !== `${window.location.origin}/logo.jpg`) {
                e.target.src = '/logo.jpg';
              }
            }}
          />
        </div>
        <div className="mt-2">
          <p className="text-[17px] font-black uppercase tracking-[0.15em] text-white">THAAYAGAM</p>
          <p className={`text-[10px] font-bold uppercase tracking-[0.25em] ${theme.accent} mt-1`}>SCHOOL</p>
        </div>

        {/* Role badge */}
        <span className={`mt-1 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${theme.badge}`}>
          {theme.label}
        </span>
      </div>

      <div className="mx-4 h-px bg-white/5 mb-2" />

      {/* Navigation — scrollable */}
      <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 group ${
                isActive ? theme.active : theme.inactive
              }`
            }
            onClick={() => onClose && onClose()}
          >
            <span className="transition-transform duration-200 group-hover:scale-110 flex-shrink-0">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mx-4 h-px bg-white/5 mb-2" />

      {/* User Card */}
      {user && (
        <div className="px-3 mb-2">
          <div className="bg-white/5 rounded-2xl p-3 flex items-center gap-3 border border-white/5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base border flex-shrink-0 ${theme.avatar}`}>
              {roleInitial}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user.username}</p>
              <p className={`text-[10px] uppercase tracking-widest font-semibold mt-0.5 ${theme.accent}`}>{role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="px-3">
        <NavLink
          to="/change-password"
          className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 group ${theme.inactive} w-full`}
          onClick={() => onClose && onClose()}
        >
          <KeyRound size={18} className="transition-transform duration-200 group-hover:scale-110 flex-shrink-0" strokeWidth={2.5} />
          Change Password
        </NavLink>
      </div>

      {/* Sign Out */}
      <div className="px-3 py-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 group text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 w-full"
        >
          <LogOut size={18} className="transition-transform duration-200 group-hover:-translate-x-1 flex-shrink-0" strokeWidth={2.5} />
          Sign Out
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 pb-5 text-center">
        <p className="text-[9px] text-slate-600 font-medium tracking-[0.1em] uppercase leading-relaxed">
          THAAYAGAM SCHOOL<br />SYSTEM v2.0.0
        </p>
      </div>
    </aside>
  );
}
