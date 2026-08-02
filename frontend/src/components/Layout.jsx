import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { api, BASE_URL } from '../api';
import { useAuth } from '../AuthContext';
import { useApp } from '../AppContext';
import {
  Search, Bell, Menu, ChevronDown, Key, LogOut, Moon, Sun,
  CheckCircle, Clock, Settings, X, LayoutDashboard, Users,
  BookOpen, CreditCard, Receipt, FileBarChart, ShieldAlert,
  UserCog, MoreHorizontal
} from 'lucide-react';

// Bottom nav items per role (max 4 + more)
const BOTTOM_NAV = {
  admin: [
    { to: '/dashboard',  label: 'Dashboard', icon: <LayoutDashboard size={22} strokeWidth={2} /> },
    { to: '/students',   label: 'Students',  icon: <Users size={22} strokeWidth={2} /> },
    { to: '/payments',   label: 'Payments',  icon: <Receipt size={22} strokeWidth={2} /> },
    { to: '/reports',    label: 'Reports',   icon: <FileBarChart size={22} strokeWidth={2} /> },
  ],
  accountant: [
    { to: '/payments',   label: 'Payments',  icon: <Receipt size={22} strokeWidth={2} /> },
    { to: '/students',   label: 'Students',  icon: <Users size={22} strokeWidth={2} /> },
    { to: '/reports',    label: 'Reports',   icon: <FileBarChart size={22} strokeWidth={2} /> },
  ],
  principal: [
    { to: '/reports',    label: 'Reports',   icon: <FileBarChart size={22} strokeWidth={2} /> },
    { to: '/students',   label: 'Students',  icon: <Users size={22} strokeWidth={2} /> },
    { to: '/classes',    label: 'Classes',   icon: <BookOpen size={22} strokeWidth={2} /> },
    { to: '/dashboard',  label: 'Overview',  icon: <LayoutDashboard size={22} strokeWidth={2} /> },
  ],
};

const roleColors = {
  admin: 'from-amber-500 to-orange-500',
  principal: 'from-indigo-500 to-purple-500',
  accountant: 'from-emerald-500 to-teal-500',
};

const roleLabels = {
  admin: ' Administrator',
  principal: ' Principal',
  accountant: ' Accountant',
};

const BOTTOM_NAV_ACTIVE = {
  admin: 'text-amber-500',
  accountant: 'text-emerald-500',
  principal: 'text-indigo-500',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const {
    language, setLanguage,
    darkMode, setDarkMode,
    setSelectedStudentForPayment,
    t
  } = useApp();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [idleAlert, setIdleAlert] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState({ count: 0, unread: 0, items: [] });
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifReadIds, setNotifReadIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('readNotifIds') || '[]'); } catch { return []; }
  });

  // Profile Dropdown
  const [showProfile, setShowProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchOverlayInputRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const role = user?.role || 'accountant';
  const bottomNavItems = BOTTOM_NAV[role] || BOTTOM_NAV.accountant;
  const activeColor = BOTTOM_NAV_ACTIVE[role] || 'text-amber-500';

  // Load School Settings
  useEffect(() => {
    api.getSettings()
      .then(setSettings)
      .catch(() => {
        setSettings({
          school_name: 'Thayagam',
          current_academic_year: '2024-2025'
        });
      });
  }, []);

  // Load Notifications
  useEffect(() => {
    function loadNotifications() {
      api.getNotifications().then(setNotifications).catch(() => {});
    }
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.items?.filter(n => !notifReadIds.includes(n.id)).length || 0;

  function markAllRead() {
    const ids = notifications.items?.map(n => n.id) || [];
    const merged = Array.from(new Set([...notifReadIds, ...ids]));
    setNotifReadIds(merged);
    localStorage.setItem('readNotifIds', JSON.stringify(merged));
  }

  // Global search lookup
  useEffect(() => {
    if (searchQuery.length >= 2) {
      api.getStudents({ search: searchQuery })
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Focus search overlay input when opened
  useEffect(() => {
    if (showSearchOverlay && searchOverlayInputRef.current) {
      setTimeout(() => searchOverlayInputRef.current?.focus(), 100);
    }
  }, [showSearchOverlay]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Session Inactivity Timer (30 minutes)
  useEffect(() => {
    function resetTimer() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIdleAlert(true);
        logout();
      }, 30 * 60 * 1000);
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(e => document.removeEventListener(e, resetTimer));
    };
  }, [logout]);

  function handleQuickCollect(student) {
    setSelectedStudentForPayment(student);
    setSearchQuery('');
    setShowSearchResults(false);
    setShowSearchOverlay(false);
    navigate('/payments');
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (pwForm.next !== pwForm.confirm) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwForm.next.length < 6) {
      setPwError('Password must be at least 6 characters.');
      return;
    }
    setPwSuccess('Password changed successfully! Please log in again.');
    setTimeout(() => {
      setShowChangePassword(false);
      setShowProfile(false);
      setPwForm({ current: '', next: '', confirm: '' });
      setPwSuccess('');
    }, 1500);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 print:h-auto print:overflow-visible relative w-full">

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`print:hidden h-full fixed md:relative z-40 transition-transform duration-300 ease-in-out md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible min-w-0">

        {/* ── Sticky Header ── */}
        <header className="flex h-14 md:h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 sm:px-6 z-20 print:hidden flex-shrink-0 gap-2">

          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition touch-target flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            {settings?.logo_path ? (
              <img
                src={`${BASE_URL}/${settings.logo_path}`}
                alt="Logo"
                className="h-8 w-8 md:h-9 md:w-9 rounded-xl object-contain border border-amber-500/30 p-0.5 bg-white flex-shrink-0 shadow-sm"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <img src="/logo.jpg" alt="Default Logo" className="h-8 w-8 md:h-9 md:w-9 rounded-xl object-contain border border-amber-500/30 p-0.5 bg-white flex-shrink-0 shadow-sm" />
            )}
            <div className="hidden md:block">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                user?.role === 'admin' ? 'text-amber-600 dark:text-amber-500' :
                user?.role === 'principal' ? 'text-indigo-600 dark:text-indigo-400' :
                'text-emerald-600 dark:text-emerald-500'
              }`}>
                {roleLabels[user?.role] || 'Portal'}
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[180px]">
                {settings?.school_name || 'Thayagam'}
              </h2>
            </div>
          </div>

          {/* Center: Desktop Search Bar */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-xs mx-4 hidden md:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                onFocus={() => setShowSearchResults(true)}
                placeholder={t('studentSearchPlaceholder')}
                className="w-full rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-1.5 pl-9 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-slate-900 dark:text-slate-100 placeholder-slate-500 transition shadow-inner"
              />
              <span className="absolute left-3 top-2 text-slate-500">
                <Search size={14} />
              </span>
            </div>
            {showSearchResults && searchResults.length > 0 && (
              <ul className="absolute left-0 mt-1.5 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 z-50">
                {searchResults.map((s) => (
                  <li key={s.id} className="p-3 text-xs flex items-center justify-between hover:bg-amber-50 dark:hover:bg-slate-800">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{s.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{s.class_name} · Adm: {s.admission_no}</p>
                    </div>
                    <button
                      onClick={() => handleQuickCollect(s)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1 rounded-lg font-bold text-[10px] transition"
                    >
                      {t('collectNow')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 ml-auto">

            {/* Mobile Search Icon */}
            <button
              onClick={() => setShowSearchOverlay(true)}
              className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition touch-target flex items-center justify-center"
              aria-label="Search"
            >
              <Search size={18} />
            </button>

            {/* Language Switch — Desktop only */}
            <div className="hidden sm:flex bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full p-0.5 text-[10px] font-bold">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded-full transition-all ${language === 'en' ? 'bg-amber-500 text-slate-950' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('ta')}
                className={`px-2 py-0.5 rounded-full transition-all ${language === 'ta' ? 'bg-amber-500 text-slate-950' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                தமிழ்
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
              title="Toggle Dark/Light Mode"
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {/* Academic Year Badge — Desktop only */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              {settings?.current_academic_year || '2024-2025'}
            </div>

            {/* Notification Bell */}
            <div ref={notifRef} className="relative">
              <button
                id="notification-bell-btn"
                onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllRead(); }}
                className="relative p-1.5 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">Notifications</h3>
                    <span className="text-[10px] font-bold text-slate-400">{notifications.items?.length || 0} alerts</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.items?.length === 0 && (
                      <div className="px-4 py-8 text-center text-xs text-slate-400">
                        <span className="text-2xl"></span>
                        <p className="mt-1 font-medium">No alerts. All clear!</p>
                      </div>
                    )}
                    {notifications.items?.map((n) => (
                      <div key={n.id} className={`px-4 py-3 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition ${!notifReadIds.includes(n.id) ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}>
                        <span className="text-lg flex-shrink-0 mt-0.5">{n.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">{n.title}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                        </div>
                        {!notifReadIds.includes(n.id) && (
                          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1.5"></div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800">
                    <Link
                      to="/reports"
                      onClick={() => setShowNotifications(false)}
                      className="text-[10px] font-bold text-amber-500 hover:underline"
                    >
                      View all pending dues →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                id="profile-dropdown-btn"
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 px-2 py-1.5 text-xs font-bold transition hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900"
              >
                <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${roleColors[user?.role] || 'from-slate-400 to-slate-600'} flex items-center justify-center text-white text-[10px] font-black shadow-sm`}>
                  {user?.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="hidden sm:block text-slate-700 dark:text-slate-300 max-w-[80px] truncate">
                  {user?.username}
                </span>
                <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden">
                  <div className={`bg-gradient-to-br ${roleColors[user?.role] || 'from-slate-400 to-slate-600'} p-4`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white text-lg font-black shadow">
                        {user?.username?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{user?.username}</p>
                        <p className="text-[10px] text-white/70 font-semibold capitalize">{user?.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* Mobile: Language & Dark Mode inside profile */}
                  <div className="sm:hidden px-3 pt-3 pb-1 flex items-center gap-2">
                    <div className="flex bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full p-0.5 text-[10px] font-bold flex-1">
                      <button onClick={() => setLanguage('en')} className={`flex-1 px-2 py-1 rounded-full transition-all ${language === 'en' ? 'bg-amber-500 text-slate-950' : 'text-slate-500'}`}>EN</button>
                      <button onClick={() => setLanguage('ta')} className={`flex-1 px-2 py-1 rounded-full transition-all ${language === 'ta' ? 'bg-amber-500 text-slate-950' : 'text-slate-500'}`}>தமிழ்</button>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={() => { setShowChangePassword(true); setShowProfile(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <Key size={14} className="text-slate-400" />
                      Change Password
                    </button>

                    {user?.role === 'admin' && (
                      <Link
                        to="/settings"
                        onClick={() => setShowProfile(false)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Settings size={14} className="text-slate-400" />
                        School Settings
                      </Link>
                    )}

                    <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => { setShowProfile(false); logout(); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                      >
                        <LogOut size={14} />
                        {t('logout')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950 print:p-0 print:overflow-visible print:bg-white print:text-black">
          <div className="max-w-7xl mx-auto w-full p-3 sm:p-6 md:p-8 print:p-0 pb-24 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 print:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-900/10 bottom-nav">
        <div className="flex items-center justify-around px-1 pt-2 pb-1">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px] ${
                  isActive
                    ? `${activeColor} bg-slate-100 dark:bg-slate-800`
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span className="text-[9px] font-bold tracking-wide">{item.label}</span>
              </Link>
            );
          })}
          {/* "More" button opens sidebar */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-200 min-w-[56px]"
          >
            <MoreHorizontal size={22} strokeWidth={2} />
            <span className="text-[9px] font-bold tracking-wide">More</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile Full-Screen Search Overlay ── */}
      {showSearchOverlay && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col md:hidden animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                ref={searchOverlayInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-9 pr-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              onClick={() => { setShowSearchOverlay(false); setSearchQuery(''); setSearchResults([]); }}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {searchQuery.length < 2 && (
              <div className="text-center py-16 text-slate-400">
                <Search size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Type at least 2 characters to search students</p>
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{s.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{s.class_name} · Adm: {s.admission_no}</p>
                    </div>
                    <button
                      onClick={() => handleQuickCollect(s)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-sm"
                    >
                      Collect
                    </button>
                  </div>
                ))}
              </div>
            )}
            {searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <p className="text-sm font-medium">No students found for "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Idle session alarm modal */}
      {idleAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <Clock size={48} className="mx-auto text-rose-500 mb-2" />
            <h3 className="text-base font-bold text-slate-900 mt-3">Session Expired</h3>
            <p className="text-xs text-slate-500 mt-1">You have been logged out due to 30 minutes of inactivity.</p>
            <button
              onClick={() => { setIdleAlert(false); window.location.reload(); }}
              className="mt-4 w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 py-2.5 text-xs font-bold transition shadow-md"
            >
              Sign In Again
            </button>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">Change Password</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Update your account password.</p>
              </div>
              <button onClick={() => { setShowChangePassword(false); setPwError(''); setPwSuccess(''); }}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full">
                <X size={16} />
              </button>
            </div>

            {pwError && (
              <div className="mt-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600">
                ️ {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="mt-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-600">
                 {pwSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
              {[
                ['Current Password', 'current'],
                ['New Password', 'next'],
                ['Confirm New Password', 'confirm'],
              ].map(([label, key]) => (
                <div key={key}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
                  <input
                    type="password"
                    required
                    value={pwForm[key]}
                    onChange={(e) => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-xs font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 text-slate-900 dark:text-slate-100"
                  />
                </div>
              ))}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button type="button" onClick={() => setShowChangePassword(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  Cancel
                </button>
                <button type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2 text-xs font-bold transition shadow-md">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
