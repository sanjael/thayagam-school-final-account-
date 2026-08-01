import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../api';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { FileText, FileSpreadsheet, Plus, Search, MoreVertical, Edit, Trash2, Eye, Printer, Phone, History } from 'lucide-react';

const EMPTY = {
  admission_no: '', name: '', class_id: '', gender: '',
  parent_name: '', phone: '', address: '', status: 'Active'
};

export default function StudentsPage() {
  const { t, setSelectedStudentForPayment } = useApp();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [quickFilter, setQuickFilter] = useState('All');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);
  const [feeBreakdown, setFeeBreakdown] = useState(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  async function openFeeBreakdown(student) {
    setFeeBreakdown({ student, data: null });
    setLoadingBreakdown(true);
    try {
      const data = await api.getStudentFeeBreakdown(student.id);
      setFeeBreakdown({ student, data });
    } catch {
      setFeeBreakdown({ student, data: null });
    } finally {
      setLoadingBreakdown(false);
    }
  }

  function load() {
    const params = {};
    if (search) params.search = search;
    if (filterClass) params.class_id = filterClass;
    api.getStudents(params).then((data) => {
      // Mocking status if not available from backend
      const mapped = data.map(s => ({
        ...s,
        status: s.status || 'Active'
      }));
      setStudents(mapped);
      setCurrentPage(1); // Reset page on new load
    }).catch(() => {});
  }

  useEffect(() => { api.getClasses().then(setClasses).catch(() => {}); }, []);
  
  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, filterClass]);

  // Client-side filtering
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (filterGender && s.gender !== filterGender) return false;
      if (filterStatus && s.status !== filterStatus) return false;
      
      if (quickFilter === 'Active' && s.status !== 'Active') return false;
      if (quickFilter === 'Inactive' && s.status !== 'Inactive') return false;
      return true;
    });
  }, [students, filterGender, filterStatus, quickFilter]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = {
    total: students.length,
    active: students.filter(s => s.status === 'Active').length,
    inactive: students.filter(s => s.status === 'Inactive').length,
    newAdmissions: Math.floor(students.length * 0.1) // Mock value for visual presentation
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = { ...form, class_id: Number(form.class_id) };
    try {
      if (editId) await api.updateStudent(editId, payload);
      else await api.createStudent(payload);
      setShowForm(false); setForm(EMPTY); setEditId(null); load();
    } catch (err) { setError(err.message); }
  }

  function openEdit(s) {
    setForm({
      admission_no: s.admission_no, name: s.name, class_id: s.class_id,
      gender: s.gender || '', parent_name: s.parent_name || '',
      phone: s.phone || '', address: s.address || '', status: s.status || 'Active'
    });
    setEditId(s.id); setShowForm(true);
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete/deactivate this student?')) return;
    await api.deleteStudent(id); load();
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedStudents.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Silent copy for better UX
  };

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleExportSelected = () => {
    const selectedStudents = students.filter(s => selectedIds.includes(s.id));
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Adm No,Name,Class,Parent Name,Phone,Status\n"
      + selectedStudents.map(s => `${s.admission_no},${s.name},${s.class_name},${s.parent_name || ''},${s.phone || ''},${s.status}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "students_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkDeactivate = async () => {
    if (!window.confirm(`Are you sure you want to deactivate ${selectedIds.length} selected students?`)) return;
    try {
      const selectedStudents = students.filter(s => selectedIds.includes(s.id));
      await Promise.all(selectedStudents.map(s => {
        const payload = {
          admission_no: s.admission_no, name: s.name, class_id: Number(s.class_id),
          gender: s.gender || '', parent_name: s.parent_name || '',
          phone: s.phone || '', address: s.address || '', status: 'Inactive'
        };
        return api.updateStudent(s.id, payload);
      }));
      load();
      setSelectedIds([]);
    } catch (err) {
      alert("Error deactivating students: " + err.message);
    }
  };

  const handlePrintIDCards = () => {
    const selectedStudents = students.filter(s => selectedIds.includes(s.id));
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print ID Cards</title>
          <style>
            body { font-family: sans-serif; }
            .id-card { border: 2px solid #1e293b; border-radius: 12px; width: 3.375in; height: 2.125in; padding: 15px; margin: 10px; display: inline-block; text-align: center; box-sizing: border-box; position: relative; overflow: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .header-bg { position: absolute; top: 0; left: 0; right: 0; height: 40px; background-color: #02021c; z-index: 1; }
            .school-name { font-weight: bold; font-size: 12px; color: #efc000; position: relative; z-index: 2; margin-top: -5px; letter-spacing: 1px; text-transform: uppercase; }
            .student-name { font-weight: 900; font-size: 18px; margin-top: 25px; margin-bottom: 8px; color: #0f172a; text-transform: uppercase; }
            .detail { font-size: 11px; margin-bottom: 4px; color: #475569; font-weight: 600; text-align: left; padding-left: 20px; }
            .footer { position: absolute; bottom: 0; left: 0; right: 0; height: 15px; background-color: #efc000; }
          </style>
        </head>
        <body>
          ${selectedStudents.map(s => `
            <div class="id-card">
              <div class="header-bg"></div>
              <div class="school-name">THAYAGAM ACADEMY</div>
              <div class="student-name">${s.name}</div>
              <div class="detail">Adm No: &nbsp;&nbsp;<b>${s.admission_no}</b></div>
              <div class="detail">Class: &nbsp;&nbsp;&nbsp;&nbsp;<b>${s.class_name}</b></div>
              <div class="detail">Parent: &nbsp;&nbsp;<b>${s.parent_name || 'N/A'}</b></div>
              <div class="detail">Phone: &nbsp;&nbsp;<b>${s.phone || 'N/A'}</b></div>
              <div class="footer"></div>
            </div>
          `).join('')}
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  function exportToCSV() {
    if (students.length === 0) {
      alert("No students to export.");
      return;
    }
    const headers = ["Adm No", "Student Name", "Class", "Parent Name", "Phone", "Status", "Gender", "Fee Route", "Transport Route"];
    const rows = filteredStudents.map(s => [
      s.admission_no || '',
      s.name || '',
      s.class_name || '',
      s.parent_name || '',
      s.phone || '',
      s.status || 'Active',
      s.gender || '',
      s.fee_route || '',
      s.transport_route || ''
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `students_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Quick Filter Bar */}
        <div className="flex flex-wrap gap-2 mb-2 print:hidden">
          {['All', 'Active', 'Inactive', 'New Admissions', 'Fee Pending'].map(qf => (
            <button 
              key={qf} 
              onClick={() => setQuickFilter(qf)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${quickFilter === qf ? 'bg-amber-500 text-slate-950 shadow-md border-amber-500' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              {qf === 'Active' && ' '}
              {qf === 'Inactive' && ' '}
              {qf === 'New Admissions' && ' '}
              {qf === 'Fee Pending' && ' '}
              {qf}
            </button>
          ))}
        </div>

        {/* Top Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Students</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
            <p className="text-[9px] sm:text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Active Students</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{stats.active}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
            <p className="text-[9px] sm:text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">New Admissions</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{stats.newAdmissions}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
            <p className="text-[9px] sm:text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1">Inactive Students</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{stats.inactive}</p>
          </div>
        </div>

        <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 shadow-sm relative z-10 overflow-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 sm:pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{t('students')}</h1>
              <p className="text-xs text-slate-500 mt-0.5 print:hidden">Manage and view student information</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 print:hidden">
              <button onClick={() => window.print()} className="rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 shadow-sm">
                 <FileText size={14} /> <span className="hidden sm:inline">Export</span> PDF
              </button>
              <button onClick={exportToCSV} className="rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 shadow-sm">
                 <FileSpreadsheet size={14} /> <span className="hidden sm:inline">Export</span> CSV
              </button>
              {user?.role === 'admin' && (
                <button
                  onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY); }}
                  className="rounded-xl sm:rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-2 text-xs font-bold transition shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                >
                   <Plus size={14} /> {t('addStudent')}
                </button>
              )}
            </div>
          </div>

          {/* Search & Filters */}
          <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 print:hidden">
            <div className="col-span-2 sm:col-span-2 md:col-span-1">
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Name, Adm No, Phone..."
                className="w-full rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 sm:px-4 py-2.5 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 text-slate-900 dark:text-slate-100 font-medium"
              />
            </div>
            <select
              value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
              className="rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 sm:px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
            >
              <option value="">All Classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.section ? `${c.name} - ${c.section}` : c.name}</option>)}
            </select>
            <select
              value={filterGender} onChange={(e) => setFilterGender(e.target.value)}
              className="rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 sm:px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
            >
              <option value="">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <select
              value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 sm:px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Bulk Actions Menu */}
          {selectedIds.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800/50 flex flex-wrap items-center justify-between gap-3 animate-fade-in print:hidden">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-500 ml-2">
                <span className="bg-white dark:bg-amber-950 px-2 py-0.5 rounded-lg shadow-sm border border-amber-200 dark:border-amber-800 mr-1">{selectedIds.length}</span> students selected
              </span>
              <div className="flex gap-2">
                <button onClick={handlePrintIDCards} className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition shadow-sm flex items-center gap-1.5">
                   Print ID Cards
                </button>
                <button onClick={handleExportSelected} className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition shadow-sm flex items-center gap-1.5">
                   Export Selected
                </button>
                {user?.role === 'admin' && (
                  <button onClick={handleBulkDeactivate} className="px-3 py-1.5 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition shadow-sm">
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Mobile Card List (visible only on small screens) ── */}
          <div className="md:hidden mt-4 space-y-3 print:hidden">
            {paginatedStudents.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <span className="text-3xl">🔍</span>
                <p className="mt-2 text-sm font-medium">No students found.</p>
              </div>
            )}
            {paginatedStudents.map((s) => (
              <div key={s.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-black text-base flex-shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{s.admission_no}</p>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${s.status === 'Active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-800/30'}`}>
                    <span className={`w-1 h-1 rounded-full ${s.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    {s.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg font-bold text-slate-700 dark:text-slate-300">{s.class_name || 'N/A'}</span>
                  {s.phone && <span className="flex items-center gap-1"><Phone size={10} />{s.phone}</span>}
                  {s.parent_name && <span>{s.parent_name}</span>}
                </div>
                {s.pending_fees > 0 && (
                  <div className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-lg w-fit">
                    ₹{s.pending_fees.toLocaleString('en-IN')} pending
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={() => setViewStudent(s)} className="flex-1 py-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center gap-1.5 transition hover:bg-blue-100">
                    <Eye size={13} /> View
                  </button>
                  {user?.role === 'admin' && (
                    <button onClick={() => openEdit(s)} className="flex-1 py-2 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center gap-1.5 transition hover:bg-amber-100">
                      <Edit size={13} /> Edit
                    </button>
                  )}
                  <button onClick={() => { setSelectedStudentForPayment(s); navigate('/payments'); }} className="flex-1 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center gap-1.5 transition hover:bg-emerald-100">
                    <History size={13} /> Fees
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop Table (hidden on mobile) ── */}
          <div className="hidden md:block mt-6 overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800 max-h-[500px] overflow-y-auto custom-scrollbar relative pb-24">
            <table className="w-full min-w-max text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-400 font-bold uppercase tracking-wider sticky top-0 z-20 shadow-sm border-b border-slate-100 dark:border-slate-800 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-slate-200 dark:after:bg-slate-800">
                <tr>
                  <th className="px-4 py-3.5 w-10 text-center print:hidden">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      checked={paginatedStudents.length > 0 && selectedIds.length === paginatedStudents.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-5 py-3.5">Adm. No</th>
                  <th className="px-5 py-3.5">{t('studentCol')}</th>
                  <th className="px-5 py-3.5">Class & Sec</th>
                  <th className="px-5 py-3.5">Pending Fees</th>
                  <th className="px-5 py-3.5">{t('parentName')}</th>
                  <th className="px-5 py-3.5">{t('phone')}</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center print:hidden">{t('actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {paginatedStudents.map((s, index) => (
                  <tr 
                    key={s.id} 
                    className={`hover:bg-amber-50/50 dark:hover:bg-slate-800/80 transition-colors group ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/50'} ${selectedIds.includes(s.id) ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}
                  >
                    <td className="px-4 py-3 text-center print:hidden">
                      <input 
                        type="checkbox"
                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => handleSelect(s.id)}
                      />
                    </td>
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-800 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        {s.admission_no}
                        <button onClick={() => copyToClipboard(s.admission_no)} className="text-slate-300 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Copy">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900 dark:text-slate-100">{s.name}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm">
                        {s.class_name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {s.pending_fees > 0 ? (
                        <button
                          onClick={() => openFeeBreakdown(s)}
                          className="font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-md text-xs hover:bg-rose-100 transition underline underline-offset-2 cursor-pointer"
                          title="Click to see term-wise breakdown"
                        >
                          ₹{s.pending_fees.toLocaleString('en-IN')}
                        </button>
                      ) : (
                        <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md text-xs">
                          Nil
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400 font-medium relative">
                      <span className="peer cursor-default">{s.parent_name || '—'}</span>
                      {/* Parent Phone Hover Tooltip */}
                      {s.phone && (
                        <div className="absolute bottom-full left-5 mb-1 hidden peer-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-30 font-semibold">
                           {s.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400 font-medium">
                      {s.phone ? (
                        <a href={`tel:${s.phone}`} className="flex items-center gap-1.5 hover:text-amber-500 transition group/phone">
                          <span className="bg-slate-100 dark:bg-slate-800 group-hover/phone:bg-amber-100 dark:group-hover/phone:bg-amber-900/30 text-slate-400 group-hover/phone:text-amber-600 p-1.5 rounded-full transition-colors"><Phone size={12} /></span>
                          {s.phone}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${s.status === 'Active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-800/30'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center print:hidden">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setViewStudent(s)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition" title="View Profile">
                          <Eye size={16} />
                        </button>
                        {user?.role === 'admin' && (
                          <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition" title="Edit">
                            <Edit size={16} />
                          </button>
                        )}
                        <button onClick={() => { setSelectedStudentForPayment(s); navigate('/payments'); }} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition" title="Fee History">
                          <History size={16} />
                        </button>
                        {user?.role === 'admin' && (
                          <div className="relative group/menu">
                            <button className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 p-1.5 rounded-lg transition" title="More Options">
                              <MoreVertical size={16} />
                            </button>
                            <div className="absolute right-0 mt-1 hidden group-hover/menu:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 min-w-[140px] overflow-hidden">
                              <button onClick={() => handleDelete(s.id)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2">
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedStudents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400 font-medium">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-4xl mb-3">🔍</span>
                        <p>No students found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div> {/* end desktop table wrapper */}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 print:hidden">
              <span className="text-xs font-bold text-slate-500">
                Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredStudents.length)} of {filteredStudents.length} students
              </span>
              <div className="flex gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 shadow-sm"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button 
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-colors shadow-sm ${currentPage === i + 1 ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </section>

        {/* View Profile Modal */}
        {viewStudent && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 sm:p-4 backdrop-blur-sm animate-fade-in print:hidden">
            <div className="w-full sm:max-w-md sm:rounded-[2rem] rounded-t-[2rem] bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden relative max-h-[90vh] overflow-y-auto">
              <div className="bg-amber-500 h-28 relative flex items-center p-6">
                <div className="absolute -bottom-10 left-6 w-20 h-20 bg-white dark:bg-slate-900 rounded-full border-[5px] border-white dark:border-slate-900 flex items-center justify-center shadow-lg">
                   <span className="text-3xl font-black text-amber-500">{viewStudent.name.charAt(0).toUpperCase()}</span>
                </div>
                <button onClick={() => setViewStudent(null)} className="absolute top-4 right-4 text-white hover:text-slate-900 bg-black/10 hover:bg-white/50 p-2 rounded-full backdrop-blur-md transition">X</button>
              </div>
              <div className="pt-14 px-7 pb-7">
                <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{viewStudent.name}</h2>
                    <p className="text-sm font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 inline-block px-2 py-0.5 rounded-md mt-1">{viewStudent.admission_no}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${viewStudent.status === 'Active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                    {viewStudent.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-5 text-sm">
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Class</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{viewStudent.class_name}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Gender</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 capitalize">{viewStudent.gender || '—'}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Parent Name</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{viewStudent.parent_name || '—'}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Phone</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{viewStudent.phone || '—'}</p>
                  </div>
                  <div className="col-span-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Address</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{viewStudent.address || '—'}</p>
                  </div>
                </div>
                <div className="mt-8 flex gap-3">
                  <button onClick={() => { setSelectedStudentForPayment(viewStudent); navigate('/payments'); }} className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 py-3 rounded-2xl text-sm font-black transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
                    <span className="text-lg"></span> View Fee History
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 sm:p-4 backdrop-blur-sm animate-fade-in print:hidden">
            <div className="w-full sm:max-w-lg sm:rounded-[2rem] rounded-t-[2rem] bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 relative max-h-[95vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center pb-5 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 p-2 rounded-xl shadow-sm">
                    {editId ? '️' : ''}
                  </span>
                  {editId ? t('editStudent') : t('registerStudent')}
                </h2>
                <button 
                  onClick={() => setShowForm(false)} 
                  className="text-slate-400 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-2.5 rounded-full transition"
                >
                  X
                </button>
              </div>

              {error && (
                <div className="mt-5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-4 text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
                  <span className="text-base">️</span> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                {[
                  ['Admission No', 'admission_no', 'text', !editId],
                  ['Full Name',    'name',         'text', true],
                  [t('parentName'),'parent_name',  'text', false],
                  [t('phone'),     'phone',        'tel',  false],
                ].map(([label, key, type, req]) => (
                  <div key={key} className={key === 'name' ? 'col-span-2' : ''}>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      {label} {req && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type={type} value={form[key]} onChange={f(key)} required={req}
                      disabled={key === 'admission_no' && !!editId}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 text-slate-900 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-900 font-bold transition shadow-sm"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    {t('classCol')} <span className="text-rose-500">*</span>
                  </label>
                  <select required value={form.class_id} onChange={f('class_id')}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 text-slate-900 dark:text-slate-100 font-bold transition shadow-sm">
                    <option value="">Select class</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.section ? `${c.name} - ${c.section}` : c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">{t('gender')}</label>
                  <select value={form.gender} onChange={f('gender')}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 text-slate-900 dark:text-slate-100 font-bold transition shadow-sm">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">{t('address')}</label>
                  <textarea value={form.address} onChange={f('address')} rows={2}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 text-slate-900 dark:text-slate-100 font-bold transition shadow-sm resize-none" />
                </div>
                
                {editId && (
                  <div className="col-span-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-3">Student Status</label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.status === 'Active' ? 'border-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                          {form.status === 'Active' && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                        </div>
                        <input type="radio" name="status" value="Active" checked={form.status === 'Active'} onChange={f('status')} className="hidden" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-500 transition-colors">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.status === 'Inactive' ? 'border-rose-500' : 'border-slate-300 dark:border-slate-600'}`}>
                          {form.status === 'Inactive' && <div className="w-2 h-2 rounded-full bg-rose-500"></div>}
                        </div>
                        <input type="radio" name="status" value="Inactive" checked={form.status === 'Inactive'} onChange={f('status')} className="hidden" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-rose-500 transition-colors">Inactive</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="col-span-2 flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-2 sticky bottom-0 bg-white dark:bg-slate-900">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="rounded-2xl px-6 py-3 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    {t('cancel')}
                  </button>
                  <button type="submit"
                    className="rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 px-8 py-3 text-sm font-black transition shadow-lg shadow-amber-500/30 flex items-center gap-2">
                    {editId ? 'Update Record' : 'Create Student'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      {/* Fee Breakdown Modal */}
      {feeBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-white font-black text-base">{feeBreakdown.student.name}</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {feeBreakdown.student.admission_no} · {feeBreakdown.student.class_name}
                </p>
              </div>
              <button
                onClick={() => setFeeBreakdown(null)}
                className="text-slate-400 hover:text-white transition p-1"
              >✕</button>
            </div>

            <div className="px-6 py-5">
              {loadingBreakdown ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
                </div>
              ) : feeBreakdown.data ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {feeBreakdown.data.academic_year} · Up to {feeBreakdown.data.current_term}
                    </p>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      feeBreakdown.data.total_pending > 0
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      Total Pending: ₹{feeBreakdown.data.total_pending.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {feeBreakdown.data.breakdown.map((t) => (
                      <div
                        key={t.term}
                        className={`rounded-xl p-4 border ${
                          t.status === 'Paid'
                            ? 'bg-emerald-50 border-emerald-200'
                            : t.status === 'Pending'
                            ? 'bg-rose-50 border-rose-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${
                              t.status === 'Paid' ? 'bg-emerald-500' :
                              t.status === 'Pending' ? 'bg-rose-500' : 'bg-slate-400'
                            }`} />
                            <span className="font-bold text-sm text-slate-800">{t.term}</span>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            t.status === 'Paid' ? 'bg-emerald-200 text-emerald-800' :
                            t.status === 'Pending' ? 'bg-rose-200 text-rose-800' :
                            'bg-slate-200 text-slate-600'
                          }`}>{t.status}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <p className="text-slate-500 font-medium">Total Fee</p>
                            <p className="font-bold text-slate-800 mt-0.5">₹{t.total_fee.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-emerald-600 font-medium">Paid</p>
                            <p className="font-bold text-emerald-700 mt-0.5">₹{t.paid.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-rose-600 font-medium">Balance</p>
                            <p className="font-bold text-rose-700 mt-0.5">₹{t.balance.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-slate-500 text-sm text-center py-6">No fee data available.</p>
              )}
            </div>

            <div className="px-6 pb-5">
              <button
                onClick={() => setFeeBreakdown(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
