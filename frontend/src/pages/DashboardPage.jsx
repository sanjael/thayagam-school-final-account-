import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList, LineChart, Line, Area, AreaChart } from 'recharts';
import Layout from '../components/Layout';
import { api } from '../api';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';

function StatCard({ title, value, color, icon, sub }) {
  return (
    <article className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 flex items-center justify-between group hover:-translate-y-1">
      <div className="space-y-1">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h2>
        <p className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight group-hover:text-amber-500 transition-colors">{value}</p>
        {sub && <p className="text-[9px] text-slate-400 font-medium">{sub}</p>}
      </div>
      <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${color} text-white shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
        {icon}
      </div>
    </article>
  );
}

const PERIOD_LABELS = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
};

export default function DashboardPage() {
  const { t, setSelectedStudentForPayment } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [classes, setClasses] = useState([]);
  const [timeData, setTimeData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [trendPeriod, setTrendPeriod] = useState('month');
  const [recentPayments, setRecentPayments] = useState([]);
  const [loadingTrend, setLoadingTrend] = useState(false);

  // Quick Action: Add Student modal trigger
  const [showQuickStudentForm, setShowQuickStudentForm] = useState(false);

  useEffect(() => {
    api.getSummary().then(setSummary).catch(() => {});
    api.getClasses().then(setClasses).catch(() => {});
    api.getTimeAnalytics().then(setTimeData).catch(() => {});
    api.getRecentPayments(6).then(setRecentPayments).catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingTrend(true);
    api.getCollectionTrend(trendPeriod)
      .then(setTrendData)
      .catch(() => setTrendData([]))
      .finally(() => setLoadingTrend(false));
  }, [trendPeriod]);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  const modeIcon = (mode) => {
    if (!mode) return '';
    const m = String(mode).toLowerCase();
    if (m === 'cash') return '';
    if (m === 'online') return '';
    if (m === 'cheque' || m === 'dd') return '';
    return '';
  };

  const modeBg = (mode) => {
    if (!mode) return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    const m = String(mode).toLowerCase();
    if (m === 'cash') return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400';
    if (m === 'online') return 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400';
    return 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400';
  };

  function handleCollectNow() {
    navigate('/payments');
  }

  function handleNewStudent() {
    navigate('/students');
  }

  return (
    <Layout>
      <div className="space-y-5">
        
        {/* Welcome Header */}
        <header className="flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-transparent dark:from-amber-900/20 border border-amber-100 dark:border-amber-900/30 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">👋 {t('welcomeTitle')}</h1>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              {t('welcomeSubtitle')}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link 
              to="/students" 
              className="rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 text-[11px] font-bold transition shadow-sm flex items-center gap-1.5 bg-white dark:bg-slate-900"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {t('students')}
            </Link>
            <Link 
              to="/payments" 
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-2 text-[11px] font-bold transition shadow-md shadow-amber-500/10 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('recordPayment')}
            </Link>
          </div>
        </header>

        {/* 5 Stats Cards Row */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard 
            title={t('todayCollected')}  
            value={fmt(summary?.today_collected)}   
            color="bg-gradient-to-br from-emerald-400 to-emerald-600" 
            sub="Collected today"
            icon={<span className="text-xl">💵</span>}
          />
          <StatCard 
            title={t('pendingFees')} 
            value={fmt(summary?.total_balance)}    
            color="bg-gradient-to-br from-rose-400 to-rose-600" 
            sub="Outstanding dues"
            icon={<span className="text-xl">⚠️</span>}
          />
          <StatCard 
            title={t('totalStudents')}   
            value={summary?.total_students ?? '0'}      
            color="bg-gradient-to-br from-sky-400 to-sky-600" 
            sub="Active students"
            icon={<span className="text-xl">🎓</span>}
          />
          <StatCard 
            title={t('thisMonth')}        
            value={fmt(summary?.month_collected)}   
            color="bg-gradient-to-br from-indigo-400 to-indigo-600" 
            sub="Month collections"
            icon={<span className="text-xl">📅</span>}
          />
          <StatCard 
            title={t('receipts')}        
            value={summary?.total_receipts ?? '0'}   
            color="bg-gradient-to-br from-slate-600 to-slate-800" 
            sub="Total receipts"
            icon={<span className="text-xl">🧾</span>}
          />
        </section>

        {/* Quick Actions Panel */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              id: 'qa-new-payment',
              label: 'New Payment',
              sub: 'Record a fee collection',
              icon: '💸',
              color: 'from-amber-400 to-orange-500',
              onClick: handleCollectNow,
              show: user?.role !== 'principal',
            },
            {
              id: 'qa-add-student',
              label: 'Add Student',
              sub: 'Register new student',
              icon: '🎒',
              color: 'from-sky-400 to-indigo-500',
              onClick: handleNewStudent,
              show: user?.role === 'admin',
            },
            {
              id: 'qa-view-reports',
              label: 'View Reports',
              sub: 'Pending dues & daybook',
              icon: '📈',
              color: 'from-emerald-400 to-teal-500',
              to: '/reports',
              show: true,
            },
            {
              id: 'qa-audit-logs',
              label: 'Audit Logs',
              sub: 'System activity trail',
              icon: '🛡️',
              color: 'from-purple-400 to-fuchsia-500',
              to: '/audit-logs',
              show: user?.role === 'admin',
            },
          ].filter(a => a.show).map((action) => {
            const inner = (
              <div className="flex flex-col gap-2.5">
                <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-xl shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                  {action.icon}
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-500 transition-colors">{action.label}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{action.sub}</p>
                </div>
              </div>
            );

            return action.to ? (
              <Link
                key={action.id}
                id={action.id}
                to={action.to}
                className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 hover:border-amber-200 dark:hover:border-amber-900 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-1"
              >
                {inner}
              </Link>
            ) : (
              <button
                key={action.id}
                id={action.id}
                onClick={action.onClick}
                className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 text-left hover:border-amber-200 dark:hover:border-amber-900 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-1"
              >
                {inner}
              </button>
            );
          })}
        </section>

        {/* Charts Row */}
        <section className="grid gap-6 md:grid-cols-2">
          
          {/* Peak Hours Chart */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <span className="text-lg">🕒</span>
               Busiest Hours for Fee Collection
            </h3>
            
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    formatter={(value) => [`${value} Payments`, "Volume"]}
                    cursor={{ fill: 'transparent' }} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} 
                  />
                  <Bar dataKey="payments" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    <LabelList dataKey="payments" position="top" style={{ fontSize: '10px', fill: '#64748b', fontWeight: 'bold' }} />
                    {timeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.payments > Math.max(...timeData.map(d=>d.payments))/1.5 ? '#f59e0b' : '#4f46e5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Collection Trend Chart with Period Filter */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="text-lg">📊</span>
                 Collection Trend
              </h3>
              {/* Period Filter Pills */}
              <div className="flex bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 gap-0.5">
                {['today', 'week', 'month', 'year'].map(p => (
                  <button
                    key={p}
                    id={`trend-filter-${p}`}
                    onClick={() => setTrendPeriod(p)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      trendPeriod === p
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-56 w-full">
              {loadingTrend ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 animate-pulse">
                  Loading chart data...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      formatter={(value) => [fmt(value), "Collected"]}
                      cursor={{ stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '4 4' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#f59e0b" 
                      strokeWidth={2.5} 
                      fill="url(#trendGradient)"
                      dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5, fill: '#f59e0b' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Period summary */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] text-slate-400 font-medium">
                Total for <span className="font-bold text-slate-600 dark:text-slate-300">{PERIOD_LABELS[trendPeriod]}</span>:{' '}
                <span className="font-black text-amber-600">
                  {fmt(trendData.reduce((sum, d) => sum + (d.amount || 0), 0))}
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* Bottom Row: Recent Payments + Classes Grid */}
        <section className="grid gap-6 lg:grid-cols-3">

          {/* Recent Payments Widget */}
          <div className="lg:col-span-1 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">⚡ {t('recentActivity')}</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Last 6 transactions</p>
              </div>
              <Link to="/payments" className="text-[10px] text-amber-500 font-bold hover:underline bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-lg">
                {t('viewAll')} →
              </Link>
            </div>

            <div className="mt-3 space-y-3">
              {recentPayments.length === 0 && (
                <div className="py-8 text-center">
                  <span className="text-3xl"></span>
                  <p className="mt-2 text-xs text-slate-400">No payments recorded yet.</p>
                </div>
              )}
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base flex-shrink-0">
                    {modeIcon(p.payment_mode)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{p.student_name}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">{p.class_name} · {p.term}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-500">{fmt(p.amount)}</p>
                    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${modeBg(p.payment_mode)}`}>
                      {p.payment_mode}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Classes Grid */}
          <div className="lg:col-span-2 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">🏫 School Classes</h2>
                <p className="text-xs text-slate-400 mt-0.5">Select a class to view its sections and details.</p>
              </div>
              <Link to="/classes" className="text-[10px] text-amber-500 font-bold hover:underline bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-lg">
                Manage Classes →
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {Array.from(new Set(classes.map(c => c.name)))
                .sort((a, b) => {
                  const order = { "LKG": -2, "UKG": -1 };
                  const getRank = (n) => {
                    const upper = n.toUpperCase();
                    if (order[upper] !== undefined) return order[upper];
                    const m = upper.match(/\d+/);
                    return m ? parseInt(m[0], 10) : 999;
                  };
                  return getRank(a) - getRank(b);
                })
                .map((className) => (
                <Link 
                  key={className} 
                  to={`/classes?exact_class=${encodeURIComponent(className)}`}
                  className="group flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-4-9 4 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 text-center">
                    {className}
                  </span>
                  <span className="text-[9px] text-slate-400 mt-0.5 uppercase font-semibold">
                    {classes.filter(c => c.name === className).length} Sec.
                  </span>
                </Link>
              ))}
            </div>
            
            {classes.length === 0 && (
              <div className="py-10 text-center">
                <span className="text-3xl"></span>
                <p className="mt-2 text-sm text-slate-400">No classes configured yet.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
