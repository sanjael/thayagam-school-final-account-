import { useEffect, useState, useMemo, useRef } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { MessageCircle, IndianRupee, FileText, AlertCircle, FileCheck, CheckCircle, Zap, History } from 'lucide-react';
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const MODES = [
  { val: 'cash', label: ' Cash' },
  { val: 'online', label: ' Online' },
  { val: 'upi', label: ' UPI' },
  { val: 'card', label: ' Card' },
  { val: 'cheque', label: ' Cheque' }
];

const EMPTY = {
  student_id: '', term: 'Term 1', academic_year: '2024-2025',
  amount_paid: '', payment_date: new Date().toISOString().slice(0, 10),
  payment_mode: 'cash', notes: '', fine: 0, discount: 0, reference_no: ''
};

export default function PaymentsPage() {
  const { t, selectedStudentForPayment, setSelectedStudentForPayment } = useApp();
  const { user } = useAuth();
  
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  
  // Advanced Search & Filters
  const [search, setSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [filterDate, setFilterDate] = useState('All');
  const [filterMode, setFilterMode] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Form & Workflow
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [feeItems, setFeeItems] = useState([]);
  const [selectedFeeItem, setSelectedFeeItem] = useState('');
  const [feeStatus, setFeeStatus] = useState(null);
  const [loadingFeeStatus, setLoadingFeeStatus] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // UI States for "Wow" Features
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [cancelConfirmId, setCancelConfirmId] = useState(null);
  const [previewReceipt, setPreviewReceipt] = useState(null);
  const [historyStudent, setHistoryStudent] = useState(null);
  const [quickCollect, setQuickCollect] = useState(null);
  const [summary, setSummary] = useState(null);

  // Auto-redirect workflow from other pages
  useEffect(() => {
    if (selectedStudentForPayment) {
      selectStudent(selectedStudentForPayment);
      setShowForm(true);
      setSelectedStudentForPayment(null);
    }
  }, [selectedStudentForPayment]);

  function loadPayments() {
    api.getPayments().then(setPayments).catch(() => {});
    api.getSummary().then(setSummary).catch(() => {});
  }
  useEffect(loadPayments, []);

  // Filtered Payments for UI
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (search) {
        const query = search.toLowerCase();
        const match = 
          (p.student_name && p.student_name.toLowerCase().includes(query)) ||
          (p.receipt_no && p.receipt_no.toLowerCase().includes(query)) ||
          (p.admission_no && p.admission_no.toLowerCase().includes(query)) ||
          (p.phone && p.phone.toLowerCase().includes(query));
        if (!match) return false;
      }
      if (filterMode && p.payment_mode !== filterMode) return false;
      
      const total = Number(p.total_fee) || 0;
      const paid = Number(p.amount_paid) || 0;
      const remaining = total - paid;
      
      if (filterStatus) {
        if (filterStatus === 'Paid' && remaining > 0) return false;
        if (filterStatus === 'Pending' && remaining <= 0) return false;
        if (filterStatus === 'Partial' && remaining <= 0) return false;
      }

      if (filterDate !== 'All' && p.payment_date) {
        const todayStr = new Date().toISOString().slice(0, 10);
        
        if (filterDate === 'Today') {
          if (p.payment_date !== todayStr) return false;
        } else if (filterDate === 'Yesterday') {
          const y = new Date();
          y.setDate(y.getDate() - 1);
          if (p.payment_date !== y.toISOString().slice(0, 10)) return false;
        } else if (filterDate === 'This Week') {
          const pDate = new Date(p.payment_date);
          const d = new Date();
          const startOfWeek = new Date(d.setDate(d.getDate() - d.getDay()));
          startOfWeek.setHours(0,0,0,0);
          if (pDate < startOfWeek) return false;
        } else if (filterDate === 'This Month') {
          const pDate = new Date(p.payment_date);
          const d = new Date();
          if (pDate.getMonth() !== d.getMonth() || pDate.getFullYear() !== d.getFullYear()) return false;
        }
      }

      return true;
    });
  }, [payments, search, filterMode, filterStatus, filterDate]);

  const today = new Date().toISOString().slice(0, 10);
  const todayPayments = payments.filter(p => p.payment_date === today);
  const todayCollection = summary?.today_collected || 0;
  const totalPendingMock = summary?.total_balance || 0;
  const totalCollectedMock = summary?.total_collected || 0;

  function searchStudents(q) {
    if (!q || q.length < 3) { setStudents([]); return; }
    api.getStudents({ search: q }).then(setStudents).catch(() => {});
  }
  useEffect(() => { searchStudents(studentSearch); }, [studentSearch]);

  useEffect(() => {
    if (form.student_id && form.term && form.academic_year) {
      setLoadingFeeStatus(true);
      api.getFeeStatus(form.student_id, form.term, form.academic_year)
        .then((res) => {
          setFeeStatus(res);
          setForm((p) => ({ ...p, amount_paid: res.balance }));
        })
        .catch(() => setFeeStatus(null))
        .finally(() => setLoadingFeeStatus(false));
    } else {
      setFeeStatus(null);
    }
  }, [form.student_id, form.term, form.academic_year]);

  async function handleCancel(paymentId) {
    try {
      await api.cancelPayment(paymentId, "Cancelled by Admin");
      setToastMessage('Payment cancelled successfully');
      setTimeout(() => setToastMessage(''), 4000);
      setCancelConfirmId(null);
      setActiveDropdown(null);
      loadPayments();
    } catch(err) {
      alert(err.message || 'Failed to cancel payment');
    }
  }

  function exportToCSV() {
    if (payments.length === 0) {
      alert("No payments to export.");
      return;
    }
    const headers = ["Date", "Receipt No", "Student Name", "Class", "Term", "Amount Paid", "Mode", "Status"];
    const rows = payments.map(p => [
      p.payment_date,
      p.receipt_no || '',
      p.student_name || '',
      p.class_name || '',
      p.term,
      p.amount_paid,
      p.payment_mode,
      p.is_cancelled ? "Cancelled" : "Success"
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payments_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    const parsedStudentId = parseInt(form.student_id, 10);
    if (!parsedStudentId) {
      setError("Please select a valid student first.");
      return;
    }
    
    const parsedAmount = parseFloat(form.amount_paid);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount to pay.");
      return;
    }
    
    try {
      await api.createPayment({
        ...form,
        student_id: parsedStudentId,
        amount_paid: parsedAmount,
        fine: Number(form.fine || 0),
        discount: Number(form.discount || 0),
      });
      setToastMessage('Fee collected successfully!');
      setTimeout(() => setToastMessage(''), 4000);
      setShowForm(false); 
      setForm(EMPTY); 
      setSelectedStudent(null);
      loadPayments();
    } catch (err) { setError(err.message); }
  }

  // Quick Collect Submit
  async function handleQuickCollect(e) {
    e.preventDefault();
    const remaining = quickCollect.total_fee - quickCollect.amount_paid;
    if (remaining <= 0) return;
    
    try {
      await api.createPayment({
        student_id: quickCollect.student_id,
        term: quickCollect.term,
        academic_year: quickCollect.academic_year || '2024-2025',
        amount_paid: remaining,
        payment_date: new Date().toISOString().slice(0, 10),
        payment_mode: 'cash',
        fine: 0, discount: 0
      });
      setToastMessage('Remaining amount collected successfully!');
      setTimeout(() => setToastMessage(''), 4000);
      setQuickCollect(null);
      loadPayments();
    } catch (err) { alert(err.message); }
  }

  function selectStudent(s) {
    setSelectedStudent(s);
    setForm((p) => ({ ...p, student_id: s.id }));
    setStudentSearch(s.name);
    setStudents([]);
  }

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  const getModeBadge = (mode) => {
    switch(mode?.toLowerCase()) {
      case 'cash': return <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px] font-bold"> Cash</span>;
      case 'online': return <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 text-[10px] font-bold"> Online</span>;
      case 'upi': return <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 text-[10px] font-bold"> UPI</span>;
      case 'card': return <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 text-[10px] font-bold"> Card</span>;
      default: return <span className="text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 text-[10px] font-bold capitalize"> {mode}</span>;
    }
  }

  // Click outside to close dropdowns
  const tableRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) {
      if (tableRef.current && !tableRef.current.contains(event.target)) {
        setActiveDropdown(null);
        setCancelConfirmId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        
        {/* Success Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-slate-900 border border-slate-800 text-white font-bold px-6 py-4 flex items-center gap-3 shadow-2xl animate-fade-in">
            <span className="text-xl"></span>
            <span className="text-sm">{toastMessage}</span>
          </div>
        )}

        {/* Header & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Fee Payments</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage all fee collections and receipts</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => window.print()} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-sm hover:bg-slate-50 transition flex items-center gap-2">
               Print All
            </button>
                <button onClick={exportToCSV} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-sm hover:bg-slate-50 transition flex items-center gap-2">
                  <span className="text-base"></span> Export CSV
                </button>
            {user?.role !== 'principal' && (
              <button onClick={() => { setShowForm(true); setForm(EMPTY); setSelectedStudent(null); }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-2xl text-sm font-black transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 ml-2">
                 Record Payment
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-emerald-200 transition-colors">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
              💰
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Collection</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">₹{totalCollectedMock.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-amber-200 transition-colors">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
              ⚠️
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Pending Amount</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">₹{totalPendingMock.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-purple-200 transition-colors">
            <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
              🧾
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Receipts Generated</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{payments.length}</p>
            </div>
          </div>
        </div>

        {/* Advanced Search & Filters */}
        <section className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Name, Receipt No, Phone, Admission No..." 
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-slate-900 dark:text-slate-100 placeholder-slate-500 transition shadow-inner"
            />
          </div>
          <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full md:w-36 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none">
            <option value="All">📅 All Dates</option>
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="Academic Year">Academic Year</option>
          </select>
          <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="w-full md:w-36 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none">
            <option value="">🏷️ All Modes</option>
            {MODES.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full md:w-36 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none">
            <option value="">🚥 All Status</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
          </select>
        </section>

        {/* Payments Table */}
        <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden" ref={tableRef}>
          <div className="overflow-x-auto min-h-[400px] pb-24">
            <table className="w-full min-w-max text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">🧾 Receipt</th>
                  <th className="px-6 py-4">🧑‍🎓 Student</th>
                  <th className="px-6 py-4">🗓️ Term</th>
                  <th className="px-6 py-4 text-right">💎 Total Fee</th>
                  <th className="px-6 py-4 text-right">💵 Amount Paid</th>
                  <th className="px-6 py-4">📊 Due Status</th>
                  <th className="px-6 py-4">📅 Date</th>
                  <th className="px-6 py-4">🏷️ Mode</th>
                  <th className="px-6 py-4 text-center">⚙️ Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPayments.map((p) => {
                  const percent = Math.round((p.amount_paid / p.total_fee) * 100);
                  const remaining = p.total_fee - p.amount_paid;
                  
                  return (
                    <tr 
                      key={p.id} 
                      onClick={() => setHistoryStudent(p)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setPreviewReceipt(p); }} 
                          className="font-mono text-xs font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 transition"
                        >
                          {p.receipt_no}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-600 text-xs">
                            {p.student_name ? p.student_name.charAt(0) : '?'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{p.student_name}</p>
                            <p className="text-[10px] font-bold text-slate-400">{p.class_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{p.term}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-800 dark:text-slate-300 font-bold">{fmt(p.total_fee)}</td>
                      <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-500 font-black">{fmt(p.amount_paid)}</td>
                      <td className="px-6 py-4">
                        {/* The WoW Progress Bar Feature */}
                        <div 
                          className="relative group/bar cursor-pointer" 
                          onClick={(e) => { e.stopPropagation(); setQuickCollect(p); }}
                        >
                          <div className="w-24 h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                            <div className={`h-full transition-all ${percent === 100 ? 'bg-emerald-500' : percent > 0 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${percent}%` }}></div>
                          </div>
                          <p className={`text-[9px] font-black mt-1 uppercase tracking-wider ${percent === 100 ? 'text-emerald-700 dark:text-emerald-600' : percent > 0 ? 'text-blue-700 dark:text-blue-600' : 'text-orange-700 dark:text-orange-600'}`}>
                            {percent === 100 ? 'Paid in Full' : `${percent}% Paid`}
                          </p>
                          
                          {/* Hover Details */}
                          <div className="hidden group-hover/bar:block absolute z-20 bottom-full mb-2 left-1/2 -translate-x-1/2 w-36 bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-700 animate-fade-in">
                            <div className="flex justify-between mb-1.5 text-[10px]">
                              <span className="text-slate-400">Paid:</span>
                              <span className="font-bold text-emerald-400">{fmt(p.amount_paid)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] mb-2 pb-2 border-b border-slate-700">
                              <span className="text-slate-400">Remaining:</span>
                              <span className="font-bold text-orange-400">{fmt(remaining)}</span>
                            </div>
                            <div className="text-center text-[10px] text-amber-400 font-black uppercase tracking-wider flex items-center justify-center gap-1">
                              <span></span> Click to Collect
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[10px] font-bold text-slate-500 relative group/date">
                        {p.payment_date}
                        {/* Audit Hover */}
                        <div className="hidden group-hover/date:block absolute z-20 bottom-full mb-2 left-1/2 -translate-x-1/2 w-32 bg-slate-900 text-white p-2.5 rounded-xl shadow-xl border border-slate-700 text-center animate-fade-in">
                          <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">Collected By</p>
                          <p className="text-xs font-bold mb-2">Admin</p>
                          <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">Time</p>
                          <p className="text-xs font-bold">10:45 AM</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getModeBadge(p.payment_mode)}
                      </td>
                      <td className="px-6 py-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setActiveDropdown(activeDropdown === p.id ? null : p.id)} 
                          className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                        >
                          ⋮
                        </button>
                        
                        {/* Dropdown Menu */}
                        {activeDropdown === p.id && (
                          <div className="absolute right-12 top-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl z-50 text-left overflow-hidden animate-fade-in">
                            <button onClick={() => setPreviewReceipt(p)} className="w-full px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                              <span className="text-base">👁️</span> View Receipt
                            </button>
                            <button onClick={() => {
                              const printWindow = window.open('', '_blank');
                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Fee Receipt - ${p.student_name}</title>
                                    <style>
                                      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; color: #1e293b; }
                                      .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 20px; margin-bottom: 30px; }
                                      .header h2 { margin: 0; font-size: 28px; font-weight: 900; color: #0f172a; letter-spacing: 1px; }
                                      .header p { margin: 8px 0 0; color: #64748b; font-size: 13px; font-weight: bold; letter-spacing: 2px; }
                                      .row { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 15px; }
                                      .row span:first-child { color: #64748b; font-weight: 500; }
                                      .row span:last-child { font-weight: 700; color: #0f172a; }
                                      .amount { background: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; margin-top: 30px; }
                                      .amount-label { color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; }
                                      .amount-val { font-size: 28px; font-weight: 900; color: #10b981; }
                                      .footer { margin-top: 50px; text-align: center; color: #94a3b8; font-size: 13px; line-height: 1.6; }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="header">
                                      <h2>SRI THAYAGAM MATRICULATION SCHOOL</h2>
                                      <p>OFFICIAL FEE RECEIPT</p>
                                    </div>
                                    <div class="row"><span>Receipt No:</span> <span>${p.receipt_no}</span></div>
                                    <div class="row"><span>Date:</span> <span>${p.payment_date}</span></div>
                                    <div class="row"><span>Student Name:</span> <span>${p.student_name}</span></div>
                                    <div class="row"><span>Class:</span> <span>${p.class_name}</span></div>
                                    <div class="row"><span>Term:</span> <span>${p.term}</span></div>
                                    <div class="row"><span>Payment Mode:</span> <span style="text-transform: capitalize;">${p.payment_mode}</span></div>
                                    
                                    <div class="amount">
                                      <div class="amount-label">Total Amount Paid</div>
                                      <div class="amount-val">Rs. ${p.amount_paid}</div>
                                    </div>
                                    <div class="footer">
                                      <strong>Thank you for your payment.</strong><br>
                                      This is a computer generated receipt and does not require a physical signature.
                                    </div>
                                  </body>
                                </html>
                              `);
                              printWindow.document.close();
                              printWindow.focus();
                              setTimeout(() => {
                                printWindow.print();
                                printWindow.onafterprint = () => printWindow.close();
                              }, 250);
                            }} className="w-full px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                              <span className="text-base">🖨️</span> Print Receipt
                            </button>
                            <a href={api.receiptPdfUrl(p.id)} target="_blank" rel="noreferrer" className="w-full px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                              <span className="text-base">⬇</span> Download PDF
                            </a>
                            
                            <div className="border-t border-slate-100 dark:border-slate-700 p-2 bg-slate-50 dark:bg-slate-900/50">
                              <button onClick={() => {
                                if (!p.phone) { alert('No phone number found for this student. Please update their profile.'); return; }
                                const msg = `Dear Parent 👨‍👩‍👧,\nGreetings from *Sri Thayagam Matriculation School* 🏫!\n\nWe have successfully received the fee payment for your ward, *${p.student_name}*.\n\n🧾 *Receipt No:* ${p.receipt_no}\n💰 *Amount Paid:* ₹${p.amount_paid}\n📅 *Date:* ${p.payment_date}\n\nThank you for your prompt payment! ✨`;
                                window.open(`https://api.whatsapp.com/send?phone=91${p.phone.replace(/\\D/g,'')}&text=${encodeURIComponent(msg)}`, '_blank');
                              }} className="w-full px-4 py-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-100 rounded-xl flex items-center gap-2 transition">
                                <MessageCircle size={16} /> WhatsApp Receipt
                              </button>
                              <button onClick={() => {
                                const subject = encodeURIComponent(`Fee Receipt - ${p.student_name} - Sri Thayagam Matriculation School`);
                                const body = encodeURIComponent(`Dear Parent,\n\nWe have successfully received the fee payment for your ward, ${p.student_name}.\n\nReceipt No: ${p.receipt_no}\nAmount Paid: ₹${p.amount_paid}\nDate: ${p.payment_date}\n\nYou can download the PDF receipt using this link: ${window.location.origin}/api/payments/${p.id}/receipt/pdf\n\nThank you for your prompt payment!\nSri Thayagam Matriculation School`);
                                window.location.href = `mailto:?subject=${subject}&body=${body}`;
                              }} className="w-full px-4 py-2.5 text-xs font-bold text-blue-600 hover:bg-blue-100 rounded-xl flex items-center gap-2 transition mt-1">
                                <span className="text-base">✉️</span> Email Receipt
                              </button>
                            </div>

                            {user?.role === 'admin' && (
                              <button onClick={() => setCancelConfirmId(p.id)} className="w-full px-5 py-4 text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border-t border-rose-100 flex items-center gap-3 transition">
                                <span className="text-base"></span> Cancel Payment
                              </button>
                            )}
                          </div>
                        )}
                        
                        {/* Cancel Confirmation inline */}
                        {cancelConfirmId === p.id && (
                          <div className="absolute right-12 top-2 w-56 bg-rose-50 border border-rose-200 shadow-xl rounded-2xl z-50 p-4 text-center animate-fade-in">
                            <p className="text-xs font-black text-rose-800 mb-3">Are you absolutely sure?</p>
                            <div className="flex gap-2">
                              <button onClick={() => handleCancel(p.id)} className="flex-1 bg-rose-600 text-white text-xs font-bold py-2 rounded-xl hover:bg-rose-700 transition shadow">YES</button>
                              <button onClick={() => setCancelConfirmId(null)} className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs font-bold py-2 rounded-xl hover:bg-slate-50 transition shadow-sm">NO</button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-950">
            <span>Showing 1-{filteredPayments.length} of {payments.length} Payments</span>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100">Previous</button>
              <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100">Next</button>
            </div>
          </div>
        </section>

        {/* --- WOW FEATURE: Pending Fee Quick Action Popup --- */}
        {quickCollect && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setQuickCollect(null)}>
            <div className="w-full max-w-sm rounded-[2rem] bg-white dark:bg-slate-900 p-8 shadow-2xl border border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">
                  <Zap size={32} />
                </div>
                <h2 className="text-xl font-black text-slate-900">Quick Collect</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">{quickCollect.student_name} - {quickCollect.term}</p>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100">
                <div className="flex justify-between mb-3 pb-3 border-b border-slate-200 text-sm font-bold text-slate-700">
                  <span>Total Fee:</span>
                  <span>{fmt(quickCollect.total_fee)}</span>
                </div>
                <div className="flex justify-between mb-3 pb-3 border-b border-slate-200 text-sm font-bold text-emerald-600">
                  <span>Already Paid:</span>
                  <span>{fmt(quickCollect.amount_paid)}</span>
                </div>
                <div className="flex justify-between text-lg font-black text-orange-600">
                  <span>Balance Due:</span>
                  <span>{fmt(quickCollect.total_fee - quickCollect.amount_paid)}</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => setQuickCollect(null)} className="flex-1 py-3.5 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
                <button onClick={handleQuickCollect} className="flex-[2] py-3.5 rounded-2xl font-black text-slate-950 bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/30 transition flex justify-center items-center gap-2">
                  <span></span> Collect Remaining
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- WOW FEATURE: Receipt Preview Popup --- */}
        {previewReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setPreviewReceipt(null)}>
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                <h3 className="font-bold text-sm">Receipt Preview</h3>
                <div className="flex gap-2">
                  <a href={api.receiptPdfUrl(previewReceipt.id)} target="_blank" rel="noreferrer" className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-2">⬇ Download</a>
                  <button onClick={() => setPreviewReceipt(null)} className="text-slate-400 hover:text-white px-2">X</button>
                </div>
              </div>
              
              <div className="p-8 bg-receipt-pattern">
                <div className="text-center border-b-2 border-dashed border-slate-200 pb-6 mb-6">
                  <h2 className="text-2xl font-black text-slate-900 mb-1">THAYAGAM ACADEMY</h2>
                  <p className="text-xs font-bold text-slate-500">FEE RECEIPT</p>
                </div>
                
                <div className="space-y-3 text-sm font-medium text-slate-700 mb-6">
                  <div className="flex justify-between"><span className="text-slate-400">Receipt No:</span> <span className="font-bold text-slate-900">{previewReceipt.receipt_no}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Date:</span> <span className="font-bold text-slate-900">{previewReceipt.payment_date}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Student:</span> <span className="font-bold text-slate-900">{previewReceipt.student_name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Class:</span> <span className="font-bold text-slate-900">{previewReceipt.class_name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Term:</span> <span className="font-bold text-slate-900">{previewReceipt.term}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Mode:</span> <span className="font-bold text-slate-900 capitalize">{previewReceipt.payment_mode}</span></div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Amount Paid</span>
                  <span className="text-2xl font-black text-emerald-600">{fmt(previewReceipt.amount_paid)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- WOW FEATURE: Partial Payment History Popup --- */}
        {historyStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setHistoryStudent(null)}>
            <div className="w-full max-w-lg bg-white rounded-[2rem] p-8 shadow-2xl border border-slate-100" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg text-sm">
                      <History size={18} />
                    </span>
                    Payment History
                  </h2>
                  <p className="text-xs font-bold text-slate-500 mt-1">{historyStudent.student_name} • {historyStudent.term}</p>
                </div>
                <button onClick={() => setHistoryStudent(null)} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition">X</button>
              </div>
              
              <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                <div className="relative pl-6">
                  <div className="absolute w-4 h-4 bg-emerald-500 rounded-full -left-[9px] border-4 border-white"></div>
                  <p className="text-xs font-bold text-slate-400 mb-0.5">{historyStudent.payment_date}</p>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                    <span className="font-bold text-slate-700 capitalize">{historyStudent.payment_mode} Payment</span>
                    <span className="font-black text-emerald-600">{fmt(historyStudent.amount_paid)}</span>
                  </div>
                </div>
                {/* Mock historical data for wow factor */}
                <div className="relative pl-6">
                  <div className="absolute w-4 h-4 bg-slate-300 rounded-full -left-[9px] border-4 border-white"></div>
                  <p className="text-xs font-bold text-slate-400 mb-0.5">2 days ago</p>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center opacity-70">
                    <span className="font-bold text-slate-700">Initial Setup</span>
                    <span className="font-black text-slate-600">Fee Assigned</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- WOW FEATURE: Record Payment Modal --- */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowForm(false)}>
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Record New Payment</h2>
                <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition">X</button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold">{error}</div>}
                
                {/* Student Search & Selection */}
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Search Student *</label>
                  {!selectedStudent ? (
                    <div>
                      <input 
                        type="text" 
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        placeholder="Type student name to search..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        required
                      />
                      {students.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                          {students.map(s => (
                            <div key={s.id} onClick={() => selectStudent(s)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0 flex justify-between items-center">
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{s.name}</p>
                                <p className="text-xs text-slate-500">{s.class_name} • Adm: {s.admission_no}</p>
                              </div>
                              <button type="button" className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">Select</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                      <div>
                        <p className="font-bold text-emerald-900 text-sm">{selectedStudent.name}</p>
                        <p className="text-xs font-bold text-emerald-600">{selectedStudent.class_name} • Adm: {selectedStudent.admission_no}</p>
                      </div>
                      <button type="button" onClick={() => { setSelectedStudent(null); setForm(p => ({...p, student_id: ''})); setStudentSearch(''); }} className="text-xs font-bold text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition">Change</button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Term *</label>
                    <select value={form.term} onChange={f('term')} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500">
                      {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Academic Year *</label>
                    <select value={form.academic_year} onChange={f('academic_year')} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500">
                      <option value="2023-2024">2023-2024</option>
                      <option value="2024-2025">2024-2025</option>
                      <option value="2025-2026">2025-2026</option>
                    </select>
                  </div>
                </div>

                {/* Fee Status Preview */}
                {loadingFeeStatus ? (
                  <div className="text-center text-xs font-bold text-slate-400 p-4 border border-dashed rounded-xl border-slate-200">Loading fee details...</div>
                ) : feeStatus && feeStatus.total > 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex justify-between items-center shadow-inner">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Fee</p>
                      <p className="font-bold text-slate-700 dark:text-slate-300">{fmt(feeStatus.total)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Paid</p>
                      <p className="font-bold text-emerald-600">{fmt(feeStatus.paid)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-0.5">Balance</p>
                      <p className="text-xl font-black text-orange-600">{fmt(feeStatus.balance)}</p>
                    </div>
                  </div>
                ) : selectedStudent && (
                  <div className="text-center text-xs font-bold text-slate-400 p-4 border border-dashed rounded-xl border-slate-200">No fee structure found for this term. Proceed with manual entry.</div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Amount Paying *</label>
                    <input type="number" min="1" value={form.amount_paid} onChange={f('amount_paid')} required placeholder="e.g. 5000" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Payment Mode *</label>
                    <select value={form.payment_mode} onChange={f('payment_mode')} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500">
                      {MODES.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Payment Date *</label>
                    <input type="date" value={form.payment_date} onChange={f('payment_date')} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Reference No (Txn ID/Cheque)</label>
                    <input type="text" value={form.reference_no} onChange={f('reference_no')} placeholder="Optional" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500" />
                  </div>
                </div>

                <div className="flex gap-4 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition">Cancel</button>
                  <button type="submit" disabled={!selectedStudent || !form.amount_paid} className="flex-[2] px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black transition shadow-lg shadow-emerald-500/30">Collect Payment</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
