import { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { Search, Plus, Trash2, Printer, XCircle, CreditCard, Check, AlertTriangle, Users, Bus } from 'lucide-react';

export default function VanFeesPage() {
  const { t } = useApp();
  const { user } = useAuth();
  
  const [tab, setTab] = useState('riders');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [riders, setRiders] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [duesReport, setDuesReport] = useState([]);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Forms
  const [riderForm, setRiderForm] = useState({ student_id: '', monthly_fee: '' });
  const [payForm, setPayForm] = useState({ student_id: '', month: '', amount_paid: '', payment_date: new Date().toISOString().slice(0, 10), payment_mode: 'cash' });
  const [receiptToPrint, setReceiptToPrint] = useState(null);

  // Month options
  const months = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April"];
  const activeYear = '2026-2027';

  useEffect(() => {
    loadTabSpecificData();
  }, [tab]);

  // Load all students for the allocation drop-down on mount
  useEffect(() => {
    api.getStudents().then(setAllStudents).catch(console.error);
  }, []);

  function loadTabSpecificData() {
    setLoading(true);
    setError('');
    setSuccess('');
    
    if (tab === 'riders') {
      api.getVanRiders()
        .then(setRiders)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    } else if (tab === 'pay') {
      api.getVanRiders()
        .then(setRiders)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    } else if (tab === 'history') {
      api.getVanPayments(activeYear)
        .then(setPayments)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    } else if (tab === 'dues') {
      api.getVanDuesReport(activeYear)
        .then(setDuesReport)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }

  // Format currency
  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  // Form handlers
  function handleAddRider(e) {
    e.preventDefault();
    if (!riderForm.student_id || !riderForm.monthly_fee) return;
    setLoading(true);
    api.allocateVanRider(Number(riderForm.student_id), Number(riderForm.monthly_fee))
      .then(() => {
        setSuccess("Student allocated to van successfully!");
        setRiderForm({ student_id: '', monthly_fee: '' });
        api.getVanRiders().then(setRiders);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  function handleDeallocate(studentId) {
    if (!window.confirm("Are you sure you want to remove this student from the van?")) return;
    setLoading(true);
    api.deallocateVanRider(studentId)
      .then(() => {
        setSuccess("Student removed from van.");
        api.getVanRiders().then(setRiders);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  function handleRiderChange(studentId) {
    const selectedRider = riders.find(r => r.student_id === Number(studentId));
    if (selectedRider) {
      setPayForm(f => ({
        ...f,
        student_id: studentId,
        amount_paid: selectedRider.monthly_fee
      }));
    } else {
      setPayForm(f => ({ ...f, student_id: studentId, amount_paid: '' }));
    }
  }

  function handleRecordPayment(e) {
    e.preventDefault();
    if (!payForm.student_id || !payForm.month || !payForm.amount_paid) {
      setError("Please fill all required fields");
      return;
    }
    setLoading(true);
    api.payVanFee({
      student_id: Number(payForm.student_id),
      month: payForm.month,
      amount_paid: Number(payForm.amount_paid),
      payment_date: payForm.payment_date,
      payment_mode: payForm.payment_mode,
      academic_year: activeYear
    })
      .then((payment) => {
        setSuccess("Payment recorded successfully!");
        setReceiptToPrint(payment);
        setPayForm({
          student_id: '',
          month: '',
          amount_paid: '',
          payment_date: new Date().toISOString().slice(0, 10),
          payment_mode: 'cash'
        });
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  function handleCancelPayment(id) {
    if (!window.confirm("Are you sure you want to cancel this payment? This action is irreversible.")) return;
    setLoading(true);
    api.cancelVanPayment(id)
      .then(() => {
        setSuccess("Payment cancelled successfully.");
        api.getVanPayments(activeYear).then(setPayments);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  // Filtered riders for search
  const filteredRiders = useMemo(() => {
    return riders.filter(r => {
      const name = r.student_name || '';
      const adm = r.admission_no || '';
      const cls = r.class_name || '';
      const matchSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          adm.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = classFilter ? cls.includes(classFilter) : true;
      return matchSearch && matchClass;
    });
  }, [riders, searchQuery, classFilter]);

  // Filtered dues report
  const filteredDues = useMemo(() => {
    return duesReport.filter(d => {
      const name = d.student_name || '';
      const adm = d.admission_no || '';
      const cls = d.class_name || '';
      const matchSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          adm.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = classFilter ? cls.includes(classFilter) : true;
      return matchSearch && matchClass;
    });
  }, [duesReport, searchQuery, classFilter]);

  // Filter out students who are already van riders
  const unassignedStudents = useMemo(() => {
    const riderIds = new Set(riders.map(r => r.student_id));
    return allStudents.filter(s => !riderIds.has(s.id) && s.is_active);
  }, [allStudents, riders]);

  // Print Receipt handler
  function printReceipt(receipt) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Van Fee Receipt - ${receipt.receipt_no}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; }
            .receipt-card { border: 2px solid #e2e8f0; padding: 25px; border-radius: 12px; max-width: 500px; margin: auto; }
            .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 15px; margin-bottom: 20px; }
            .school-name { font-size: 20px; font-weight: bold; text-transform: uppercase; color: #1e293b; }
            .receipt-title { font-size: 14px; color: #64748b; margin-top: 5px; font-weight: bold; }
            .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
            .label { color: #64748b; }
            .value { font-weight: bold; color: #0f172a; }
            .total-row { border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; padding: 10px 0; margin-top: 15px; }
            .total-label { font-size: 16px; font-weight: bold; }
            .total-value { font-size: 18px; font-weight: bold; color: #059669; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            <div class="header">
              <div class="school-name">Thaayagam School</div>
              <div class="receipt-title">MONTHLY VAN FEE RECEIPT</div>
            </div>
            <div class="row">
              <span class="label">Receipt No:</span>
              <span class="value" style="color: #059669;">${receipt.receipt_no}</span>
            </div>
            <div class="row">
              <span class="label">Date:</span>
              <span class="value">${receipt.payment_date}</span>
            </div>
            <div class="row">
              <span class="label">Admission No:</span>
              <span class="value">${receipt.admission_no}</span>
            </div>
            <div class="row">
              <span class="label">Student Name:</span>
              <span class="value">${receipt.student_name}</span>
            </div>
            <div class="row">
              <span class="label">Class:</span>
              <span class="value">${receipt.class_name || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Fee Month:</span>
              <span class="value">${receipt.month}</span>
            </div>
            <div class="row">
              <span class="label">Payment Mode:</span>
              <span class="value" style="text-transform: capitalize;">${receipt.payment_mode}</span>
            </div>
            <div class="row total-row">
              <span class="total-label">Amount Paid:</span>
              <span class="total-value">₹${Number(receipt.amount_paid).toLocaleString('en-IN')}</span>
            </div>
            <div class="footer">
              Thank you for your payment. Keep this receipt for your records.
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <Layout>
      <div className="space-y-5">
        
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 to-transparent dark:from-amber-900/20 border border-amber-100 dark:border-amber-900/30 p-5 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bus className="text-amber-500" size={24} />
              Van Fees Dashboard
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Manage van riders, collect monthly transport fees, and check payment statuses.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 lg:pb-0">
            {['riders', 'pay', 'history', 'dues'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  tab === t ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300'
                } border border-slate-200 dark:border-slate-700`}
              >
                {t === 'riders' ? 'Van Riders' :
                 t === 'pay' ? 'Collect Payment' :
                 t === 'history' ? 'Payment History' :
                 'Monthly Dues Report'}
              </button>
            ))}
          </div>
        </header>

        {/* Feedback messages */}
        {error && (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-4 text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-4 text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
            <Check size={16} /> {success}
          </div>
        )}

        {/* Tab view layout */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm relative min-h-[350px]">
          
          {loading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-[1px]">
              <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
            </div>
          )}

          {/* RIDERS TAB */}
          {tab === 'riders' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
              {/* Allocation form */}
              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Plus size={16} className="text-amber-500" /> Allocate Van Rider
                </h3>
                <form onSubmit={handleAddRider} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Select Student</label>
                    <select
                      value={riderForm.student_id}
                      onChange={e => setRiderForm(f => ({ ...f, student_id: e.target.value }))}
                      required
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-amber-500 text-slate-900 dark:text-slate-100 transition"
                    >
                      <option value="">Choose student...</option>
                      {unassignedStudents.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.admission_no}) · {s.class_name || 'N/A'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monthly Van Fee Amount</label>
                    <input
                      type="number"
                      placeholder="e.g. 1500"
                      value={riderForm.monthly_fee}
                      onChange={e => setRiderForm(f => ({ ...f, monthly_fee: e.target.value }))}
                      required
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-amber-500 text-slate-900 dark:text-slate-100 transition"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-bold py-2.5 rounded-xl text-xs transition shadow-md"
                  >
                    Allocate Van Route
                  </button>
                </form>
              </div>

              {/* Riders table */}
              <div className="lg:col-span-2 space-y-4">
                {/* Search / Filters */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search van rider..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                  <select 
                    value={classFilter} 
                    onChange={e => setClassFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-amber-500 text-slate-750 dark:text-slate-300"
                  >
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
                </div>

                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                  {filteredRiders.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">No van riders allocated.</div>
                  ) : (
                    <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                      <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="px-5 py-3.5">Student</th>
                          <th className="px-5 py-3.5">Class</th>
                          <th className="px-5 py-3.5 text-right">Monthly Fee</th>
                          <th className="px-5 py-3.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredRiders.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                            <td className="px-5 py-3.5">
                              <p className="font-bold text-slate-900 dark:text-white">{r.student_name}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{r.admission_no}</p>
                            </td>
                            <td className="px-5 py-3.5">{r.class_name || 'N/A'}</td>
                            <td className="px-5 py-3.5 text-right font-bold text-slate-850 dark:text-slate-100">{fmt(r.monthly_fee)}</td>
                            <td className="px-5 py-3.5 text-center">
                              <button
                                onClick={() => handleDeallocate(r.student_id)}
                                className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition"
                                title="Remove student from van"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* COLLECT PAYMENT TAB */}
          {tab === 'pay' && (
            <div className="max-w-xl mx-auto p-6 space-y-6">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <CreditCard size={18} className="text-amber-500" /> Collect Monthly Van Fee
              </h3>

              {receiptToPrint && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Receipt Generated: {receiptToPrint.receipt_no}</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Payment for {receiptToPrint.student_name} ({receiptToPrint.month})</p>
                  </div>
                  <button
                    onClick={() => printReceipt(receiptToPrint)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition flex items-center gap-1.5"
                  >
                    <Printer size={14} /> Print Receipt
                  </button>
                </div>
              )}

              <form onSubmit={handleRecordPayment} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Select Van Rider</label>
                  <select
                    value={payForm.student_id}
                    onChange={e => handleRiderChange(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-amber-500 text-slate-900 dark:text-slate-100 transition"
                  >
                    <option value="">Choose active rider...</option>
                    {riders.map(r => (
                      <option key={r.student_id} value={r.student_id}>
                        {r.student_name} - ₹{Number(r.monthly_fee).toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fee Month</label>
                  <select
                    value={payForm.month}
                    onChange={e => setPayForm(f => ({ ...f, month: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-amber-500 text-slate-900 dark:text-slate-100 transition"
                  >
                    <option value="">Choose month...</option>
                    {months.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount Paid</label>
                  <input
                    type="number"
                    value={payForm.amount_paid}
                    onChange={e => setPayForm(f => ({ ...f, amount_paid: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-amber-500 text-slate-900 dark:text-slate-100 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment Date</label>
                  <input
                    type="date"
                    value={payForm.payment_date}
                    onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-amber-500 text-slate-900 dark:text-slate-100 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment Mode</label>
                  <select
                    value={payForm.payment_mode}
                    onChange={e => setPayForm(f => ({ ...f, payment_mode: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-amber-500 text-slate-900 dark:text-slate-100 transition"
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online Transfer</option>
                    <option value="upi">UPI / GPay</option>
                    <option value="card">Card Payment</option>
                  </select>
                </div>

                <div className="sm:col-span-2 pt-4">
                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-bold py-3 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
                  >
                    Collect & Print Receipt
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PAYMENTS HISTORY TAB */}
          {tab === 'history' && (
            <div className="p-6 space-y-4">
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                {payments.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">No payments recorded.</div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-5 py-3.5">Date</th>
                        <th className="px-5 py-3.5">Receipt No</th>
                        <th className="px-5 py-3.5">Student</th>
                        <th className="px-5 py-3.5">Class</th>
                        <th className="px-5 py-3.5">Month</th>
                        <th className="px-5 py-3.5">Mode</th>
                        <th className="px-5 py-3.5 text-right">Paid</th>
                        <th className="px-5 py-3.5 text-center">Print</th>
                        {user?.role === 'admin' && <th className="px-5 py-3.5 text-center">Cancel</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {payments.map((p, idx) => (
                        <tr key={idx} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${p.is_cancelled ? 'line-through opacity-50 bg-rose-50/20' : ''}`}>
                          <td className="px-5 py-3.5">{p.payment_date}</td>
                          <td className="px-5 py-3.5 font-bold font-mono text-slate-600 dark:text-slate-400">{p.receipt_no}</td>
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-slate-900 dark:text-white">{p.student_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.admission_no}</p>
                          </td>
                          <td className="px-5 py-3.5">{p.class_name || 'N/A'}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300">{p.month}</td>
                          <td className="px-5 py-3.5 capitalize">{p.payment_mode}</td>
                          <td className="px-5 py-3.5 text-right font-black text-emerald-600">{fmt(p.amount_paid)}</td>
                          <td className="px-5 py-3.5 text-center">
                            <button
                              onClick={() => printReceipt(p)}
                              disabled={p.is_cancelled}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition disabled:opacity-50"
                              title="Print Receipt"
                            >
                              <Printer size={15} />
                            </button>
                          </td>
                          {user?.role === 'admin' && (
                            <td className="px-5 py-3.5 text-center">
                              <button
                                onClick={() => handleCancelPayment(p.id)}
                                disabled={p.is_cancelled}
                                className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition disabled:opacity-50"
                                title="Cancel Payment"
                              >
                                <XCircle size={15} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* MONTHLY DUES REPORT TAB */}
          {tab === 'dues' && (
            <div className="p-6 space-y-4">
              {/* Search / Filters */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by student, class..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-none focus:border-amber-500"
                  />
                </div>
                <select 
                  value={classFilter} 
                  onChange={e => setClassFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-amber-500 text-slate-750 dark:text-slate-300"
                >
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
              </div>

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                {filteredDues.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">No van dues report available.</div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3.5">Student</th>
                        <th className="px-4 py-3.5">Class</th>
                        <th className="px-4 py-3.5 text-center">Monthly Fee</th>
                        {months.map(m => (
                          <th key={m} className="px-2 py-3.5 text-center text-[9px]">{m.slice(0, 3)}</th>
                        ))}
                        <th className="px-4 py-3.5 text-right">Total Paid</th>
                        <th className="px-4 py-3.5 text-right">Total Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredDues.map((d, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-slate-900 dark:text-white">{d.student_name}</p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{d.admission_no}</p>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">{d.class_name || 'N/A'}</td>
                          <td className="px-4 py-3.5 text-center font-bold text-slate-500">{fmt(d.monthly_fee)}</td>
                          {d.months.map((m, mIdx) => (
                            <td key={mIdx} className="px-1.5 py-3.5 text-center">
                              <span className={`inline-block w-4 h-4 rounded-full ${
                                m.status === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-rose-100 text-rose-600 dark:bg-rose-950/20'
                              } text-[9px] font-black text-center leading-4`}>
                                {m.status === 'Paid' ? '✓' : '—'}
                              </span>
                            </td>
                          ))}
                          <td className="px-4 py-3.5 text-right font-black text-emerald-600">{fmt(d.total_paid)}</td>
                          <td className="px-4 py-3.5 text-right font-black text-rose-600">{fmt(d.total_pending)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
