import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api, BASE_URL } from '../api';
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
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [classWise, setClassWise] = useState([]);
  const [daybook, setDaybook] = useState(null);
  const [logoBase64, setLogoBase64] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [dateFilter, setDateFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');

  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState('2024 - 2025');
  const [isCustomYear, setIsCustomYear] = useState(false);

  // ─── Stale-While-Revalidate helpers ───────────────────────────
  const lsGet = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } };
  const lsSet = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

  useEffect(() => {
    // Logo: sessionStorage cache (binary blob - don't put in localStorage)
    async function loadLogo() {
      try {
        const c = sessionStorage.getItem('cache_logo');
        if (c) { setLogoBase64(c); return; }
        const s = await api.getSettings();
        let url = window.location.origin + '/logo.jpg';
        if (s?.logo_path) url = s.logo_path.startsWith('data:image') ? s.logo_path : `${BASE_URL.replace(/\/+$/, '')}/${s.logo_path}`;
        const res = await fetch(url);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => { setLogoBase64(reader.result); try { sessionStorage.setItem('cache_logo', reader.result); } catch {} };
        reader.readAsDataURL(blob);
      } catch {}
    }
    loadLogo();
  }, []);

  // Summary: show cached instantly, refresh in background
  useEffect(() => {
    const cached = lsGet('ls_summary');
    if (cached) setSummary(cached);                          // ← instant display
    api.getSummary()
      .then(data => { setSummary(data); lsSet('ls_summary', data); })
      .catch(console.error);
  }, [dateFilter]);

  // Pending: show cached instantly (NO spinner if cache exists), refresh in background
  useEffect(() => {
    // Clear old sessionStorage keys
    try { ['cache_pending','cache_pending_v2','cache_pending_v3'].forEach(k => sessionStorage.removeItem(k)); } catch {}

    const cached = lsGet('ls_pending');
    if (cached) {
      setPending(cached);                                    // ← instant display
    } else {
      setLoading(true);                                      // ← show spinner only if no cache
    }
    api.getPendingReport()
      .then(data => { setPending(data); lsSet('ls_pending', data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);


  // Lazy-load tab data with localStorage SWR
  useEffect(() => {
    if (tab === 'overall' && students.length === 0) {
      const c = lsGet('ls_rpt_students'); if (c) setStudents(c);
      api.getStudents()
        .then(data => { setStudents(data); lsSet('ls_rpt_students', data); })
        .catch(console.error);
    } else if (tab === 'collection' && payments.length === 0) {
      const c = lsGet('ls_rpt_payments');
      if (c) { setPayments(c); } else { setLoading(true); }
      api.getPayments()
        .then(data => { setPayments(data); lsSet('ls_rpt_payments', data); })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else if (tab === 'classwise' && classWise.length === 0) {
      const c = lsGet('ls_rpt_classwise'); if (c) setClassWise(c);
      api.getClassWiseReport()
        .then(data => { setClassWise(data); lsSet('ls_rpt_classwise', data); })
        .catch(console.error);
    } else if (tab === 'daybook' && !daybook) {
      setLoading(true);
      api.getDayBook(new Date().toISOString().slice(0, 10))
        .then(setDaybook).catch(console.error).finally(() => setLoading(false));
    }
  }, [tab]);


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

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (p.is_cancelled) return false;
      const studentName = p.student_name || '';
      const className = p.class_name || p.class || '';
      const matchSearch = studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          className.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = classFilter ? className === classFilter : true;
      const matchTerm = termFilter ? p.term === termFilter : true;
      if (!matchSearch || !matchClass || !matchTerm) return false;
      
      if (dateFilter && dateFilter !== 'All') {
        const pDate = new Date(p.payment_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (dateFilter === 'Today') {
          const compDate = new Date(p.payment_date);
          return compDate.toDateString() === new Date().toDateString();
        } else if (dateFilter === 'Yesterday') {
          const compDate = new Date(p.payment_date);
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          return compDate.toDateString() === yesterday.toDateString();
        } else if (dateFilter === 'This Week') {
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          return pDate >= startOfWeek;
        } else if (dateFilter === 'This Month') {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          return pDate >= startOfMonth;
        }
      }
      return true;
    });
  }, [payments, searchQuery, classFilter, termFilter, dateFilter]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const studentName = s.name || '';
      const className = s.class_name || '';
      const matchSearch = studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          className.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = classFilter ? className.includes(classFilter) : true;
      return matchSearch && matchClass;
    });
  }, [students, searchQuery, classFilter]);

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
    const message = `Dear Parent 👨‍👩‍👧,\nGreetings from *Thaayagam School* 🏫!\n\nThis is a gentle reminder regarding the pending fee balance for your ward, *${studentName}*.\n\n💰 *Pending Amount:* ${fmt(balance)}\n\nKindly clear the dues at the earliest to ensure uninterrupted services for your child's education 📚.\n\nIf you have already paid, please ignore this message.\nThank you for your cooperation! ✨`;
    window.open(`https://api.whatsapp.com/send?phone=91${phone.replace(/\D/g,'')}&text=${encodeURIComponent(message)}`, '_blank');
  }

  function handleExportReports() {
    if (tab === 'pending') {
      if (filteredPending.length === 0) {
        alert("No pending fee records to export.");
        return;
      }
      const headers = ["Admission No", "Student Name", "Class", "Term", "Total Fee", "Amount Paid", "Balance", "Phone"];
      const rows = filteredPending.map(p => [
        `"${p.admission_no || ''}"`,
        `"${p.student_name.replace(/"/g, '""')}"`,
        `"${p.class || ''}"`,
        `"${p.term || ''}"`,
        p.total_fee || 0,
        p.amount_paid || 0,
        p.balance || 0,
        `"\t${p.phone || ''}"`
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Pending_Fees_Report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (tab === 'overall') {
      if (filteredStudents.length === 0) {
        alert("No overall fee records to export.");
        return;
      }
      const headers = ["Admission No", "Student Name", "Class", "Total Fees", "Amount Paid", "Balance"];
      const rows = filteredStudents.map(s => {
        const total = s.total_fees || 0;
        const balance = s.pending_fees || 0;
        const paid = Math.max(0, total - balance);
        return [
          `"${s.admission_no || ''}"`,
          `"${s.name.replace(/"/g, '""')}"`,
          `"${s.class_name || ''}"`,
          total,
          paid,
          balance
        ];
      });
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Overall_Fees_Report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (tab === 'collection') {
      if (filteredPayments.length === 0) {
        alert("No fee collection records to export.");
        return;
      }
      const headers = ["Date", "Receipt No", "Student Name", "Class", "Term", "Payment Mode", "Amount Paid"];
      const rows = filteredPayments.map(p => [
        `"${p.payment_date || ''}"`,
        `"${p.receipt_no || ''}"`,
        `"${p.student_name.replace(/"/g, '""')}"`,
        `"${p.class_name || p.class || ''}"`,
        `"${p.term || ''}"`,
        `"${p.payment_mode || p.mode || ''}"`,
        p.amount_paid || 0
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Fees_Collection_Report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (tab === 'classwise' || tab === 'class') {
      if (classWise.length === 0) {
        alert("No class-wise collection data to export.");
        return;
      }
      const headers = ["Class", "Collected Amount", "Remaining Dues", "Transactions"];
      const rows = classWise.map(c => [
        `"${c.class || c.class_name || ''}"`,
        c.collected ?? c.collected_amount ?? 0,
        c.balance ?? c.remaining_dues ?? 0,
        c.payments ?? c.transactions ?? 0
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Class_Collection_Report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (tab === 'daybook') {
      const payments = daybook?.transactions || daybook?.payments || [];
      if (payments.length === 0) {
        alert("No daily report records to export.");
        return;
      }
      const headers = ["Time", "Receipt No", "Student Name", "Class", "Payment Mode", "Amount Paid"];
      const rows = payments.map(p => [
        `"${p.time || ''}"`,
        `"${p.receipt_no || ''}"`,
        `"${p.student_name || ''}"`,
        `"${p.class_name || p.class || ''}"`,
        `"${p.mode || p.payment_mode || ''}"`,
        p.amount ?? p.amount_paid ?? 0
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Daily_Report_${daybook?.date || new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  const handlePrintReportsPDF = () => {
    const printWindow = window.open('', '_blank');
    let title = "Financial Report";
    let contentHtml = "";

    if (tab === 'pending') {
      title = "Pending Fees Report";
      contentHtml = `
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Adm No</th>
              <th>Student Name</th>
              <th>Class</th>
              <th>Term</th>
              <th>Total Fee</th>
              <th>Paid</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${filteredPending.map((p, i) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td><b>${p.admission_no || ''}</b></td>
                <td><b>${p.student_name}</b></td>
                <td>${p.class || ''}</td>
                <td>${p.term || ''}</td>
                <td>₹${Number(p.total_fee || 0).toLocaleString('en-IN')}</td>
                <td style="color: #16a34a;">₹${Number(p.amount_paid || 0).toLocaleString('en-IN')}</td>
                <td style="color: #dc2626; font-weight: bold;">₹${Number(p.balance || 0).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; border-top: 2px solid #cbd5e1; background-color: #f8fafc;">
              <td colspan="5" style="padding: 9px 12px; font-size: 12px; text-align: left;">Total</td>
              <td style="padding: 9px 12px; font-size: 12px; font-weight: bold;">₹${filteredPending.reduce((sum, p) => sum + (p.total_fee || 0), 0).toLocaleString('en-IN')}</td>
              <td style="color: #16a34a; padding: 9px 12px; font-size: 12px; font-weight: bold;">₹${filteredPending.reduce((sum, p) => sum + (p.amount_paid || 0), 0).toLocaleString('en-IN')}</td>
              <td style="color: #dc2626; padding: 9px 12px; font-size: 12px; font-weight: bold;">₹${filteredPending.reduce((sum, p) => sum + (p.balance || 0), 0).toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (tab === 'overall') {
      title = "Overall Fees Report";
      contentHtml = `
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Adm No</th>
              <th>Student Name</th>
              <th>Class</th>
              <th>Total Fees</th>
              <th>Paid</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${filteredStudents.map((s, i) => {
              const total = s.total_fees || 0;
              const balance = s.pending_fees || 0;
              const paid = Math.max(0, total - balance);
              return `
                <tr>
                  <td style="text-align: center;">${i + 1}</td>
                  <td><b>${s.admission_no || ''}</b></td>
                  <td><b>${s.name}</b></td>
                  <td>${s.class_name || ''}</td>
                  <td>₹${total.toLocaleString('en-IN')}</td>
                  <td style="color: #16a34a;">₹${paid.toLocaleString('en-IN')}</td>
                  <td style="color: #dc2626; font-weight: bold;">₹${balance.toLocaleString('en-IN')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; border-top: 2px solid #cbd5e1; background-color: #f8fafc;">
              <td colspan="4" style="padding: 9px 12px; font-size: 12px; text-align: left;">Total</td>
              <td style="padding: 9px 12px; font-size: 12px; font-weight: bold;">₹${filteredStudents.reduce((sum, s) => sum + (s.total_fees || 0), 0).toLocaleString('en-IN')}</td>
              <td style="color: #16a34a; padding: 9px 12px; font-size: 12px; font-weight: bold;">₹${filteredStudents.reduce((sum, s) => sum + Math.max(0, (s.total_fees || 0) - (s.pending_fees || 0)), 0).toLocaleString('en-IN')}</td>
              <td style="color: #dc2626; padding: 9px 12px; font-size: 12px; font-weight: bold;">₹${filteredStudents.reduce((sum, s) => sum + (s.pending_fees || 0), 0).toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (tab === 'collection') {
      title = "Fees Collection Report";
      contentHtml = `
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Date</th>
              <th>Receipt No</th>
              <th>Student Name</th>
              <th>Class</th>
              <th>Term</th>
              <th>Mode</th>
              <th>Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            ${filteredPayments.map((p, i) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td>${p.payment_date || ''}</td>
                <td><b style="color: #059669;">${p.receipt_no || ''}</b></td>
                <td><b>${p.student_name || ''}</b></td>
                <td>${p.class_name || p.class || ''}</td>
                <td>${p.term || ''}</td>
                <td style="text-transform: capitalize;">${p.payment_mode || p.mode || ''}</td>
                <td style="color: #16a34a; font-weight: bold;">₹${Number(p.amount_paid || 0).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; border-top: 2px solid #cbd5e1; background-color: #f8fafc;">
              <td colspan="7" style="padding: 9px 12px; font-size: 12px; text-align: left;">Total Collection</td>
              <td style="color: #16a34a; padding: 9px 12px; font-size: 12px; font-weight: bold;">₹${filteredPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0).toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (tab === 'classwise' || tab === 'class') {
      title = "Class-wise Collection Report";
      contentHtml = `
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Class Name</th>
              <th>Collected Amount</th>
              <th>Remaining Dues</th>
              <th>Transactions</th>
            </tr>
          </thead>
          <tbody>
            ${classWise.map((c, i) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td><b>${c.class || c.class_name || ''}</b></td>
                <td style="color: #16a34a; font-weight: bold;">₹${Number(c.collected ?? c.collected_amount ?? 0).toLocaleString('en-IN')}</td>
                <td style="color: #dc2626; font-weight: bold;">₹${Number(c.balance ?? c.remaining_dues ?? 0).toLocaleString('en-IN')}</td>
                <td>${c.payments ?? c.transactions ?? 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (tab === 'daybook') {
      title = `Daily Collection Report (${daybook?.date || new Date().toISOString().slice(0, 10)})`;
      const payments = daybook?.transactions || daybook?.payments || [];
      contentHtml = `
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Time</th>
              <th>Receipt No</th>
              <th>Student Name</th>
              <th>Class</th>
              <th>Payment Mode</th>
              <th>Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            ${payments.map((p, i) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td>${p.time || '—'}</td>
                <td><b>${p.receipt_no || '—'}</b></td>
                <td><b>${p.student_name || '—'}</b></td>
                <td>${p.class_name || p.class || '—'}</td>
                <td style="text-transform: capitalize;">${p.mode || p.payment_mode || '—'}</td>
                <td style="color: #16a34a; font-weight: bold;">₹${Number(p.amount ?? p.amount_paid ?? 0).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - Thaayagam School</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 9px 12px; text-align: left; font-size: 12px; }
            th { background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 25px; text-align: right; font-size: 11px; color: #94a3b8; font-weight: bold; }
            @page { size: A4; margin: 12mm; }
          </style>
        </head>
        <body>
          <div class="header" style="display: flex; align-items: center; justify-content: center; gap: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 12px; margin-bottom: 20px;">
            <img src="${logoBase64}" style="height: 60px; width: 60px; object-fit: contain; display: inline-block; vertical-align: middle;" />
            <div style="text-align: left; display: inline-block; vertical-align: middle;">
              <h1 style="margin: 0; font-size: 24px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; line-height: 1.2;">THAAYAGAM SCHOOL</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-weight: bold;">${title.toUpperCase()}</p>
            </div>
          </div>
          ${contentHtml}
          <div class="footer">
            Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} | Thaayagam School Financial Reports
          </div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  function handlePrint() {
    handlePrintReportsPDF();
  }
  
  const handleExportPDF = () => {
    let title = "Financial Report";
    let contentHtml = "";

    if (tab === 'pending') {
      title = "Pending Fees Report";
      contentHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center; border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">#</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Adm No</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Student Name</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Class</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Term</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Total Fee</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Paid</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${filteredPending.map((p, i) => `
              <tr style="${i % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                <td style="text-align: center; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">${i + 1}</td>
                <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;"><b>${p.admission_no || ''}</b></td>
                <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;"><b>${p.student_name}</b></td>
                <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">${p.class || ''}</td>
                <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">${p.term || ''}</td>
                <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; text-align: right;">₹${Number(p.total_fee || 0).toLocaleString('en-IN')}</td>
                <td style="color: #16a34a; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; text-align: right;">₹${Number(p.amount_paid || 0).toLocaleString('en-IN')}</td>
                <td style="color: #dc2626; font-weight: bold; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; text-align: right;">₹${Number(p.balance || 0).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; border-top: 2px solid #cbd5e1; background-color: #f8fafc;">
              <td colspan="5" style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; text-align: left;">Total</td>
              <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; font-weight: bold; text-align: right;">₹${filteredPending.reduce((sum, p) => sum + (p.total_fee || 0), 0).toLocaleString('en-IN')}</td>
              <td style="color: #16a34a; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; font-weight: bold; text-align: right;">₹${filteredPending.reduce((sum, p) => sum + (p.amount_paid || 0), 0).toLocaleString('en-IN')}</td>
              <td style="color: #dc2626; font-weight: bold; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; font-weight: bold; text-align: right;">₹${filteredPending.reduce((sum, p) => sum + (p.balance || 0), 0).toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (tab === 'overall') {
      title = "Overall Fees Report";
      contentHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center; border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">#</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Adm No</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Student Name</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Class</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Total Fees</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Paid</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${filteredStudents.map((s, i) => {
              const total = s.total_fees || 0;
              const balance = s.pending_fees || 0;
              const paid = Math.max(0, total - balance);
              return `
                <tr style="${i % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                  <td style="text-align: center; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">${i + 1}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;"><b>${s.admission_no || ''}</b></td>
                  <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;"><b>${s.name}</b></td>
                  <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">${s.class_name || ''}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; text-align: right;">₹${total.toLocaleString('en-IN')}</td>
                  <td style="color: #16a34a; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; text-align: right;">₹${paid.toLocaleString('en-IN')}</td>
                  <td style="color: #dc2626; font-weight: bold; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; text-align: right;">₹${balance.toLocaleString('en-IN')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; border-top: 2px solid #cbd5e1; background-color: #f8fafc;">
              <td colspan="4" style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; text-align: left;">Total</td>
              <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; font-weight: bold; text-align: right;">₹${filteredStudents.reduce((sum, s) => sum + (s.total_fees || 0), 0).toLocaleString('en-IN')}</td>
              <td style="color: #16a34a; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; font-weight: bold; text-align: right;">₹${filteredStudents.reduce((sum, s) => sum + Math.max(0, (s.total_fees || 0) - (s.pending_fees || 0)), 0).toLocaleString('en-IN')}</td>
              <td style="color: #dc2626; font-weight: bold; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; font-weight: bold; text-align: right;">₹${filteredStudents.reduce((sum, s) => sum + (s.pending_fees || 0), 0).toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (tab === 'collection') {
      title = "Fees Collection Report";
      contentHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center; border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">#</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Date</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Receipt No</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Student Name</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Class</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Term</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Mode</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            ${filteredPayments.map((p, i) => `
              <tr style="${i % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                <td style="text-align: center; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">${i + 1}</td>
                <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">${p.payment_date || ''}</td>
                <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; color: #059669; font-weight: bold;"><b>${p.receipt_no || ''}</b></td>
                <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;"><b>${p.student_name || ''}</b></td>
                <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">${p.class_name || p.class || ''}</td>
                <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">${p.term || ''}</td>
                <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; text-transform: capitalize;">${p.payment_mode || p.mode || ''}</td>
                <td style="color: #16a34a; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; text-align: right;">₹${Number(p.amount_paid || 0).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; border-top: 2px solid #cbd5e1; background-color: #f8fafc;">
              <td colspan="7" style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; text-align: left;">Total Collection</td>
              <td style="color: #16a34a; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; font-weight: bold; text-align: right;">₹${filteredPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0).toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (tab === 'classwise' || tab === 'class') {
      title = "Class-wise Collection Report";
      contentHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center; border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">#</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Class Name</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Collected Amount</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Remaining Dues</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Transactions</th>
            </tr>
          </thead>
          <tbody>
            ${classWise.map((c, i) => `
              <tr style="${i % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                <td style="text-align: center; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">${i + 1}</td>
                <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;"><b>${c.class || c.class_name || ''}</b></td>
                <td style="color: #16a34a; font-weight: bold; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">₹${Number(c.collected ?? c.collected_amount ?? 0).toLocaleString('en-IN')}</td>
                <td style="color: #dc2626; font-weight: bold; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">₹${Number(c.balance ?? c.remaining_dues ?? 0).toLocaleString('en-IN')}</td>
                <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">${c.payments ?? c.transactions ?? 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (tab === 'daybook') {
      title = `Daily Collection Report (${daybook?.date || new Date().toISOString().slice(0, 10)})`;
      const payments = daybook?.transactions || daybook?.payments || [];
      contentHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center; border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">#</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Time</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Receipt No</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Student Name</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Class</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Payment Mode</th>
              <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            ${payments.map((p, i) => `
              <tr style="${i % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                <td style="text-align: center; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">${i + 1}</td>
                <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">${p.time || '—'}</td>
                <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;"><b>${p.receipt_no || '—'}</b></td>
                <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;"><b>${p.student_name || '—'}</b></td>
                <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">${p.class_name || p.class || '—'}</td>
                <td style="text-transform: capitalize; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">${p.mode || p.payment_mode || '—'}</td>
                <td style="color: #16a34a; font-weight: bold; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">₹${Number(p.amount ?? p.amount_paid ?? 0).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const container = document.createElement('div');
    container.innerHTML = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #1e293b;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 12px; margin-bottom: 20px;">
          <img src="${logoBase64}" style="height: 60px; width: 60px; object-fit: contain; display: inline-block; vertical-align: middle;" />
          <div style="text-align: left; display: inline-block; vertical-align: middle;">
            <h1 style="margin: 0; font-size: 24px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; line-height: 1.2;">THAAYAGAM SCHOOL</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-weight: bold;">${title.toUpperCase()}</p>
          </div>
        </div>
        ${contentHtml}
        <div style="margin-top: 25px; text-align: right; font-size: 11px; color: #94a3b8; font-weight: bold;">
          Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} | Thaayagam School Financial Reports
        </div>
      </div>
    `;

    const opt = {
      margin:       10,
      filename:     `${title.replace(/\\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const runHtml2Pdf = () => {
      window.html2pdf().from(container).set(opt).save();
    };

    if (window.html2pdf) {
      runHtml2Pdf();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = runHtml2Pdf;
      document.head.appendChild(script);
    }
  };
  
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-xs font-bold text-slate-500 uppercase truncate">Total Collection</p>
              <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-1 truncate">{fmt(summary?.total_collected)}</h3>
            </div>
            <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <IndianRupee size={20} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-xs font-bold text-slate-500 uppercase truncate">Pending Amount</p>
              <h3 className="text-lg sm:text-2xl font-black text-rose-600 mt-1 truncate">{fmt(summary?.total_balance)}</h3>
            </div>
            <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-xs font-bold text-slate-500 uppercase truncate">Students Paid</p>
              <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-1 truncate">{paidStudentsCount}</h3>
            </div>
            <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-xs font-bold text-slate-500 uppercase truncate">Pending Students</p>
              <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-1 truncate">{pendingStudentsCount}</h3>
            </div>
            <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Users size={20} />
            </div>
          </div>
        </div>


        {/* Main Content Area */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col lg:flex-row gap-4 justify-between items-center print:hidden">
            
            {/* Tabs Dropdown/Buttons */}
            <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
              {['pending', 'overall', 'collection', 'classwise', 'daybook'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                    tab === t ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300'
                  } border border-slate-200 dark:border-slate-700`}
                >
                  {t === 'pending' ? 'Pending Fees' : 
                   t === 'overall' ? 'Overall Fees' :
                   t === 'collection' ? 'Fees Collection' : 
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
                <option>All</option>
                <option>Today</option>
                <option>Yesterday</option>
                <option>This Week</option>
                <option>This Month</option>
                <option>Custom Range</option>
              </select>
              
              <button onClick={handleExportPDF} title="Export PDF Report" className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 transition flex items-center gap-1.5 font-bold text-xs shadow-sm">
                <FileText size={16} /> Export PDF
              </button>
            </div>
          </div>

          {/* Filters Bar (Only for Pending, Overall or Collection) */}
          {(tab === 'pending' || tab === 'overall' || tab === 'collection') && (
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
              {tab !== 'overall' && (
                <select value={termFilter} onChange={e => setTermFilter(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-amber-500">
                  <option value="">All Terms</option>
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                  <option value="Old Fee">Old Fee</option>
                </select>
              )}
            </div>
          )}

          {/* Content Area */}
          <div className="p-0 relative min-h-[250px]">
            {loading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 dark:bg-slate-800/70 backdrop-blur-[1px] transition-all">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full" />
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Loading data...</p>
                </div>
              </div>
            )}
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
                    {/* ── Old Fees Section ── */}
                    {filteredPending.some(p => p.term === 'Old Fee') && (
                      <tbody className="divide-y divide-amber-100 dark:divide-amber-900/30"  >
                        <tr>
                          <td colSpan={7} className="px-6 pt-4 pb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 px-3 py-1 rounded-full">⏳ Previous Year Old Fees</span>
                              <span className="text-[10px] text-slate-400 font-semibold">— Balance from previous academic year</span>
                            </div>
                          </td>
                        </tr>
                        {filteredPending.filter(p => p.term === 'Old Fee').map((p, i) => (
                          <tr key={'of-' + i} className="bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                            <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">{p.student_name}</td>
                            <td className="px-6 py-3.5 text-slate-500">{p.class}</td>
                            <td className="px-6 py-3.5">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">⏳ Old Fee</span>
                            </td>
                            <td className="px-6 py-3.5 text-right text-amber-700 dark:text-amber-400 font-bold">{fmt(p.total_fee)}</td>
                            <td className="px-6 py-3.5 text-right text-emerald-600">{fmt(p.amount_paid)}</td>
                            <td className="px-6 py-3.5 text-right font-black text-amber-600 dark:text-amber-400">{fmt(p.balance)}</td>
                            <td className="px-6 py-3.5 text-center print:hidden">
                              <div className="flex justify-center gap-2">
                                <button onClick={() => handleSendReminder(p.phone, p.student_name, p.balance)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition border border-emerald-200" title="Send WhatsApp Reminder">
                                  <MessageCircle size={14} /> Send Reminder
                                </button>
                                <button onClick={() => handleCollectNow(p.student_id)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition shadow-sm">Collect</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    )}

                    {/* ── Regular Term Fees Section ── */}
                    {filteredPending.some(p => p.term !== 'Old Fee') && (
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredPending.some(p => p.term === 'Old Fee') && (
                          <tr>
                            <td colSpan={7} className="px-6 pt-4 pb-1">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full"> Current Year Term Fees</span>
                            </td>
                          </tr>
                        )}
                        {filteredPending.filter(p => p.term !== 'Old Fee').map((p, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{p.student_name}</td>
                            <td className="px-6 py-4 text-slate-500">{p.class}</td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">{p.term}</span>
                            </td>
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
                    )}

                    <tfoot className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700 font-extrabold text-slate-900 dark:text-white">
                      <tr>
                        <td className="px-6 py-4" colSpan={3}>Total</td>
                        <td className="px-6 py-4 text-right font-black">{fmt(filteredPending.reduce((sum, p) => sum + (p.total_fee || 0), 0))}</td>
                        <td className="px-6 py-4 text-right font-black text-emerald-600">{fmt(filteredPending.reduce((sum, p) => sum + (p.amount_paid || 0), 0))}</td>
                        <td className="px-6 py-4 text-right font-black text-rose-600">{fmt(filteredPending.reduce((sum, p) => sum + (p.balance || 0), 0))}</td>
                        <td className="px-6 py-4 print:hidden"></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}

            {tab === 'overall' && (
              <div className="overflow-x-auto">
                {filteredStudents.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
                      <Users size={48} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Students Found</h3>
                    <p className="text-slate-500 mt-1 max-w-sm">No students match your filters.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-4">Adm No</th>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">Class</th>
                        <th className="px-6 py-4 text-right">Total Fees</th>
                        <th className="px-6 py-4 text-right">Paid</th>
                        <th className="px-6 py-4 text-right">Balance</th>
                        <th className="px-6 py-4 text-center print:hidden">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredStudents.map((s, i) => {
                        const total = s.total_fees || 0;
                        const balance = s.pending_fees || 0;
                        const paid = Math.max(0, total - balance);
                        return (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{s.admission_no}</td>
                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{s.name}</td>
                            <td className="px-6 py-4 text-slate-500">{s.class_name}</td>
                            <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-slate-200">{fmt(total)}</td>
                            <td className="px-6 py-4 text-right text-emerald-600 font-bold">{fmt(paid)}</td>
                            <td className="px-6 py-4 text-right font-bold text-rose-600">{fmt(balance)}</td>
                            <td className="px-6 py-4 text-center print:hidden">
                              <button onClick={() => handleCollectNow(s.id)} className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-lg hover:bg-slate-800 transition shadow-sm">Collect</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700 font-extrabold text-slate-900 dark:text-white">
                      <tr>
                        <td className="px-6 py-4" colSpan={3}>Total</td>
                        <td className="px-6 py-4 text-right font-black">{fmt(filteredStudents.reduce((sum, s) => sum + (s.total_fees || 0), 0))}</td>
                        <td className="px-6 py-4 text-right font-black text-emerald-600">{fmt(filteredStudents.reduce((sum, s) => sum + Math.max(0, (s.total_fees || 0) - (s.pending_fees || 0)), 0))}</td>
                        <td className="px-6 py-4 text-right font-black text-rose-600">{fmt(filteredStudents.reduce((sum, s) => sum + (s.pending_fees || 0), 0))}</td>
                        <td className="px-6 py-4 print:hidden"></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}

            {tab === 'collection' && (
              <div className="overflow-x-auto">
                {filteredPayments.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4">
                      <IndianRupee size={48} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Fees Collected</h3>
                    <p className="text-slate-500 mt-1 max-w-sm">No payment records match your filters.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Receipt No</th>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">Class</th>
                        <th className="px-6 py-4">Term</th>
                        <th className="px-6 py-4">Mode</th>
                        <th className="px-6 py-4 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredPayments.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 text-slate-500">{p.payment_date}</td>
                          <td className="px-6 py-4 font-mono text-xs font-bold text-emerald-600">{p.receipt_no}</td>
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{p.student_name}</td>
                          <td className="px-6 py-4 text-slate-500">{p.class_name || p.class}</td>
                          <td className="px-6 py-4"><span className="bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold">{p.term}</span></td>
                          <td className="px-6 py-4 capitalize"><span className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-xs font-bold">{p.payment_mode || p.mode}</span></td>
                          <td className="px-6 py-4 text-right font-bold text-emerald-600">{fmt(p.amount_paid)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700 font-extrabold text-slate-900 dark:text-white">
                      <tr>
                        <td className="px-6 py-4" colSpan={6}>Total Collected</td>
                        <td className="px-6 py-4 text-right font-black text-emerald-600">{fmt(filteredPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0))}</td>
                      </tr>
                    </tfoot>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Academic Year</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomYear(!isCustomYear)}
                    className="text-[11px] font-bold text-amber-500 hover:underline flex items-center gap-1"
                  >
                    {isCustomYear ? '📋 Select Dropdown' : '✏️ Edit / Custom Year'}
                  </button>
                </div>

                {isCustomYear ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      placeholder="e.g. 2025 - 2026 or 2026 - 2027"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-2 border-amber-500 rounded-xl outline-none font-bold text-sm text-slate-900 dark:text-white"
                      autoFocus
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Type any custom academic year above</span>
                  </div>
                ) : (
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM_EDIT') {
                        setIsCustomYear(true);
                      } else {
                        setSelectedYear(e.target.value);
                      }
                    }}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold text-sm text-slate-900 dark:text-white"
                  >
                    <option value="2026 - 2027">2026 - 2027</option>
                    <option value="2025 - 2026">2025 - 2026</option>
                    <option value="2024 - 2025">2024 - 2025</option>
                    <option value="2023 - 2024">2023 - 2024</option>
                    <option value="2022 - 2023">2022 - 2023</option>
                    <option value="CUSTOM_EDIT">✏️ Edit / Type Custom Year...</option>
                  </select>
                )}
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
