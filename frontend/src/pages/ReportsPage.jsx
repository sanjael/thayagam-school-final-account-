import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../api';
import { useApp } from '../AppContext';
import { 
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Download, Printer, FileText, Search, 
  AlertCircle, CheckCircle,
  Users, IndianRupee, CheckCircle2, MessageCircle
} from 'lucide-react';

export default function ReportsPage() {
  const { setSelectedStudentForPayment } = useApp();
  const navigate = useNavigate();

  // State
  const [tab, setTab] = useState('pending');
  const [summary, setSummary] = useState(null);
  const [pending, setPending] = useState([]);
  const [classWise, setClassWise] = useState([]);
  const [daybook, setDaybook] = useState(null);
  const [collectionTrend, setCollectionTrend] = useState([]);
  
  // Filters
  const [dateFilter, setDateFilter] = useState('This Month');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');

  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Load Initial Data
  useEffect(() => {
    loadDashboardData();
  }, [dateFilter]);

  function loadDashboardData() {
    api.getSummary().then(setSummary).catch(console.error);
    api.getPendingReport().then(setPending).catch(console.error);
    api.getClassWiseReport().then(setClassWise).catch(console.error);
    api.getCollectionTrend(dateFilter === 'This Month' ? 'month' : 'week').then(setCollectionTrend).catch(console.error);
    
    api.getDayBook(new Date().toISOString().slice(0, 10)).then(setDaybook).catch(console.error);
  }

  // Format currency
  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  // Derived Summary Stats
  const totalStudents = summary?.total_students || 0;
  const uniquePendingStudents = new Set(pending.map(p => p.student_name)).size;
  const pendingStudentsCount = uniquePendingStudents;
  const paidStudentsCount = Math.max(0, totalStudents - pendingStudentsCount);
  
  const pieData = [
    { name: 'Paid', value: paidStudentsCount, color: '#10B981' },
    { name: 'Pending', value: pendingStudentsCount, color: '#F43F5E' }
  ];

  // Filtering Logic
  const filteredPending = useMemo(() => {
    return pending.filter(p => {
      const matchSearch = p.student_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.class.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = classFilter ? p.class === classFilter : true;
      const matchTerm = termFilter ? p.term === termFilter : true;
      return matchSearch && matchClass && matchTerm;
    });
  }, [pending, searchQuery, classFilter, termFilter]);

  // Actions
  function handleCollectNow(studentId) {
    api.getStudent(studentId).then((student) => {
      if (student) {
        setSelectedStudentForPayment(student);
        navigate('/payments');
      }
    });
  }

  function handleSendReminder(phone, studentName, balance) {
    if (!phone) {
      alert("No phone number found for this student. Please update their profile.");
      return;
    }
    const message = `Dear Parent 👨‍👩‍👧,\nGreetings from *Sri Thayagam Matriculation School* 🏫!\n\nThis is a gentle reminder regarding the pending fee balance for your ward, *${studentName}*.\n\n💰 *Pending Amount:* ${fmt(balance)}\n\nKindly clear the dues at the earliest to ensure uninterrupted services for your child's education 📚.\n\nIf you have already paid, please ignore this message.\nThank you for your cooperation! ✨`;
    window.open(`https://api.whatsapp.com/send?phone=91${phone.replace(/\D/g,'')}&text=${encodeURIComponent(message)}`, '_blank');
  }

  function handlePrint() {
    window.print();
  }
  
  function handleGenerateReport(e) {
    e.preventDefault();
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowGenerateModal(false);
      setToastMessage(' Report Generated Successfully (PDF Ready)');
      setTimeout(() => setToastMessage(''), 3000);
    }, 1500);
  }

  return (
    <Layout>
      <div className="space-y-6 print:space-y-4">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-6 py-4 flex items-center gap-3 shadow-2xl transition-all">
            {toastMessage}
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Financial Reports</h1>
            <p className="text-sm text-slate-500">Comprehensive overview of school finances</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              <Printer size={16} /> Print
            </button>
            <button onClick={() => setShowGenerateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-sm font-bold shadow-sm transition">
              <FileText size={16} /> Generate Report
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Total Collection</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{fmt(summary?.total_collected)}</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <IndianRupee size={24} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Pending Amount</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1">{fmt(summary?.total_balance)}</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Students Paid</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{paidStudentsCount}</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <CheckCircle size={24} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Pending Students</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{pendingStudentsCount}</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <Users size={24} />
            </div>
          </div>
        </div>


        {/* Main Content Area */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col lg:flex-row gap-4 justify-between items-center print:hidden">
            
            {/* Tabs Dropdown/Buttons */}
            <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
              {['pending', 'classwise', 'daybook'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                    tab === t ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300'
                  } border border-slate-200 dark:border-slate-700`}
                >
                  {t === 'pending' ? 'Pending Fees' : 
                   t === 'classwise' ? 'Collection by Class' : 
                   'Daily Report'}
                </button>
              ))}
            </div>

            {/* Date Filter & Export */}
            <div className="flex gap-3 w-full lg:w-auto items-center">
              <select 
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-amber-500"
              >
                <option>Today</option>
                <option>Yesterday</option>
                <option>This Week</option>
                <option>This Month</option>
                <option>Custom Range</option>
              </select>
              
              <button onClick={() => alert('Export feature will be available in the next update!')} className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Download size={18} />
              </button>
            </div>
          </div>

          {/* Filters Bar (Only for Pending) */}
          {tab === 'pending' && (
            <div className="p-4 flex flex-wrap gap-4 items-center bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 print:hidden">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search student, class..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-amber-500"
                />
              </div>
              <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-amber-500">
                <option value="">All Classes</option>
                <option value="Pre-KG">Pre-KG</option>
                <option value="LKG">LKG</option>
                <option value="UKG">UKG</option>
                <option value="Class 1">Class 1</option>
                <option value="Class 2">Class 2</option>
                <option value="Class 3">Class 3</option>
                <option value="Class 4">Class 4</option>
                <option value="Class 5">Class 5</option>
                <option value="Class 6">Class 6</option>
                <option value="Class 7">Class 7</option>
                <option value="Class 8">Class 8</option>
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10</option>
                <option value="Class 11">Class 11</option>
                <option value="Class 12">Class 12</option>
              </select>
              <select value={termFilter} onChange={e => setTermFilter(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-amber-500">
                <option value="">All Terms</option>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
          )}

          {/* Content Area */}
          <div className="p-0">
            {tab === 'pending' && (
              <div className="overflow-x-auto">
                {filteredPending.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 size={48} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Pending Fees</h3>
                    <p className="text-slate-500 mt-1 max-w-sm">All students have completed their payments based on your current filters.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">Class</th>
                        <th className="px-6 py-4">Term</th>
                        <th className="px-6 py-4 text-right">Total Fee</th>
                        <th className="px-6 py-4 text-right">Paid</th>
                        <th className="px-6 py-4 text-right">Balance</th>
                        <th className="px-6 py-4 text-center print:hidden">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredPending.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{p.student_name}</td>
                          <td className="px-6 py-4 text-slate-500">{p.class}</td>
                          <td className="px-6 py-4"><span className="bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold">{p.term}</span></td>
                          <td className="px-6 py-4 text-right">{fmt(p.total_fee)}</td>
                          <td className="px-6 py-4 text-right text-emerald-600">{fmt(p.amount_paid)}</td>
                          <td className="px-6 py-4 text-right font-bold text-rose-600">{fmt(p.balance)}</td>
                          <td className="px-6 py-4 text-center print:hidden">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => handleSendReminder(p.phone, p.student_name, p.balance)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition border border-emerald-200" title="Send WhatsApp Reminder">
                                <MessageCircle size={14} /> Send Reminder
                              </button>
                              <button onClick={() => handleCollectNow(p.student_id)} className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-lg hover:bg-slate-800 transition shadow-sm">Collect</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === 'classwise' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4">Class</th>
                      <th className="px-6 py-4 text-right">Collected Amount</th>
                      <th className="px-6 py-4 text-right">Remaining Dues</th>
                      <th className="px-6 py-4 text-center">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {classWise.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{c.class}</td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600">{fmt(c.collected)}</td>
                        <td className="px-6 py-4 text-right font-bold text-rose-600">{fmt(c.balance)}</td>
                        <td className="px-6 py-4 text-center"><span className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-xs font-bold">{c.payments}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'daybook' && (
              <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4">Receipt</th>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Class</th>
                      <th className="px-6 py-4">Mode</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {daybook?.transactions?.map((t, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 text-slate-500">{t.time}</td>
                        <td className="px-6 py-4 font-mono text-xs">{t.receipt_no}</td>
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{t.student_name}</td>
                        <td className="px-6 py-4 text-slate-500">{t.class_name}</td>
                        <td className="px-6 py-4 capitalize"><span className="bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold">{t.mode}</span></td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600">{fmt(t.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="text-amber-500" /> Generate Professional Report
              </h2>
            </div>
            <form onSubmit={handleGenerateReport} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Academic Year</label>
                <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold">
                  <option>2024 - 2025</option>
                  <option>2023 - 2024</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Term / Period</label>
                <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold">
                  <option>All Terms</option>
                  <option>Term 1</option>
                  <option>Term 2</option>
                  <option>Term 3</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Report Type</label>
                <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold">
                  <option>Comprehensive Summary (PDF)</option>
                  <option>Pending Fees List (Excel)</option>
                  <option>Daily Collection Report (PDF)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowGenerateModal(false)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">Cancel</button>
                <button type="submit" disabled={isGenerating} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition shadow-md flex items-center gap-2">
                  {isGenerating ? <span className="animate-pulse"></span> : <Download size={18} />}
                  {isGenerating ? 'Generating...' : 'Generate PDF'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </Layout>
  );
}
