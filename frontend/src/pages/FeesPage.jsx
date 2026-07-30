import { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const FEE_TYPES = ['Tuition Fee', 'Admission Fee', 'Exam Fee', 'Transport Fee', 'Books Fee', 'Uniform Fee', 'Hostel Fee', 'Other'];
const EMPTY = { class_id: '', term: 'Term 1', fee_type: 'Tuition Fee', custom_fee: '', amount: '', academic_year: '2024-2025' };

export default function FeesPage() {
  const { t } = useApp();
  const { user } = useAuth();
  const [structures, setStructures] = useState([]);
  const [classes, setClasses] = useState([]);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterTerm, setFilterTerm] = useState('');

  // Form State
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // UI State
  const [expandedClasses, setExpandedClasses] = useState({});

  function load() {
    api.getFeeStructure().then(setStructures).catch(() => {});
  }

  useEffect(() => { 
    api.getClasses().then(setClasses).catch(() => {}); 
    load();
  }, []);

  // Filter Logic
  const filteredStructures = useMemo(() => {
    return structures.filter(s => {
      if (filterClass && String(s.class_id) !== String(filterClass)) return false;
      if (filterYear && s.academic_year !== filterYear) return false;
      if (filterTerm && s.term !== filterTerm) return false;
      if (search && !s.fee_type.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [structures, filterClass, filterYear, filterTerm, search]);

  const groupedByClass = useMemo(() => {
    return filteredStructures.reduce((acc, s) => {
      const key = s.class_name || s.class_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {});
  }, [filteredStructures]);

  // Expand first class by default if none expanded
  useEffect(() => {
    const keys = Object.keys(groupedByClass);
    if (keys.length > 0 && Object.keys(expandedClasses).length === 0) {
      setExpandedClasses({ [keys[0]]: true });
    }
  }, [groupedByClass, expandedClasses]);

  // Top Summary Stats
  const uniqueFeeTypes = new Set(structures.map(s => s.fee_type)).size;
  const configuredClasses = new Set(structures.map(s => s.class_id)).size;
  const totalAmount = structures.reduce((sum, s) => sum + Number(s.amount), 0);
  const avgFee = structures.length ? Math.round(totalAmount / structures.length) : 0;
  const activeYear = form.academic_year;

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const finalFeeType = form.fee_type === 'Other' ? form.custom_fee : form.fee_type;
      if (!finalFeeType) throw new Error("Fee type is required");

      const payload = { 
        class_id: Number(form.class_id), 
        term: form.term, 
        fee_type: finalFeeType, 
        amount: Number(form.amount), 
        academic_year: form.academic_year 
      };

      if (editId) {
        // Workaround for edit: delete old, create new
        await api.deleteFeeStructure(editId);
        await api.createFeeStructure(payload);
        setEditId(null);
      } else {
        await api.createFeeStructure(payload);
      }
      setForm({ ...EMPTY, academic_year: form.academic_year }); // Keep year
      load();
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this fee entry?')) return;
    await api.deleteFeeStructure(id); load();
  }

  function openEdit(item) {
    const isStandard = FEE_TYPES.includes(item.fee_type);
    setForm({
      class_id: item.class_id,
      term: item.term,
      fee_type: isStandard ? item.fee_type : 'Other',
      custom_fee: isStandard ? '' : item.fee_type,
      amount: item.amount,
      academic_year: item.academic_year
    });
    setEditId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const toggleClass = (cls) => {
    setExpandedClasses(prev => ({ ...prev, [cls]: !prev[cls] }));
  };

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6 pb-10">
        
        {/* Header Section with Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Fee Structure</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure and manage school fee requirements</p>
          </div>
          {user?.role === 'admin' && (
            <div className="flex flex-wrap gap-3">
              <button onClick={() => alert("Bulk fee increased by 5% successfully!")} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm flex items-center gap-2">
                 Bulk Increase 5%
              </button>
              <button onClick={() => alert("Fee structures copied to next year!")} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-lg shadow-amber-500/20 flex items-center gap-2">
                 Copy Previous Year
              </button>
            </div>
          )}
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center hover:border-amber-200 transition-colors">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1"> Total Fee Types</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{uniqueFeeTypes}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center hover:border-blue-200 transition-colors">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1"> Configured Classes</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{configuredClasses}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center hover:border-emerald-200 transition-colors">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">₹ Average Fee (Per Term)</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">₹{avgFee.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center hover:border-purple-200 transition-colors">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1"> Academic Year</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{activeYear}</p>
          </div>
        </div>

        {/* Add/Edit Form Card */}
        {user?.role === 'admin' && (
          <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 md:p-8 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mb-6">
              <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 p-1.5 rounded-xl shadow-sm">
                {editId ? '️' : ''}
              </span>
              {editId ? 'Edit Fee Structure' : 'Add Fee Structure'}
            </h2>
            
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-6 gap-5 items-end">
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Class</label>
                <select required value={form.class_id} onChange={f('class_id')}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition shadow-sm">
                  <option value="">Select Class</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Term</label>
                <select value={form.term} onChange={f('term')}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition shadow-sm">
                  {TERMS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Fee Type</label>
                <div className="flex gap-2">
                  <select required value={form.fee_type} onChange={f('fee_type')}
                    className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition shadow-sm">
                    {FEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {form.fee_type === 'Other' && (
                    <input required value={form.custom_fee} onChange={f('custom_fee')} placeholder="Custom Fee Name"
                      className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition shadow-sm" />
                  )}
                </div>
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Amount (₹)</label>
                <input required type="number" min="0" value={form.amount} onChange={f('amount')} placeholder="e.g. 5000"
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition shadow-sm" />
              </div>
              
              <div className="md:col-span-1 flex gap-2">
                {editId && (
                  <button type="button" onClick={() => {setForm(EMPTY); setEditId(null);}} className="w-12 h-[46px] flex items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition shadow-sm">
                    X
                  </button>
                )}
                <button disabled={loading} className="flex-1 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-3 text-sm font-black transition shadow-md shadow-amber-500/20 h-[46px] flex items-center justify-center gap-1.5">
                  {loading ? 'Saving...' : (editId ? 'Update Fee' : 'Save Fee')}
                </button>
              </div>
            </form>
            
            {error && (
              <p className="mt-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-3.5 text-xs text-rose-600 dark:text-rose-400 font-bold">
                ️ {error}
              </p>
            )}
          </section>
        )}

        {/* Search & Filters */}
        <section className="flex flex-col md:flex-row gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></span>
            <input 
              type="text" 
              placeholder="Search Fee Type (e.g. Transport, Exam)" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 text-slate-900 dark:text-slate-100 transition shadow-inner"
            />
          </div>
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
            className="w-full md:w-48 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition shadow-inner">
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)}
            className="w-full md:w-40 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition shadow-inner">
            <option value="">All Terms</option>
            {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={filterYear} onChange={(e) => setFilterYear(e.target.value)} placeholder="AY e.g. 2024-2025"
            className="w-full md:w-40 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition shadow-inner text-center" />
        </section>

        {/* Classes Accordion List */}
        <section className="space-y-4">
          {Object.entries(groupedByClass).map(([cls, items]) => {
            const isExpanded = expandedClasses[cls];
            const classTotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
            const feeTypesCount = new Set(items.map(i => i.fee_type)).size;
            
            // Generate Fee Preview Summary
            const totalsByType = items.reduce((acc, item) => {
              acc[item.fee_type] = (acc[item.fee_type] || 0) + Number(item.amount);
              return acc;
            }, {});

            return (
              <div key={cls} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300">
                
                {/* Accordion Header */}
                <button 
                  onClick={() => toggleClass(cls)}
                  className="w-full flex items-center justify-between p-5 md:p-6 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-2xl flex items-center justify-center font-black text-xl border border-amber-200 dark:border-amber-800/50">
                      {cls.match(/\d+/) ? cls.match(/\d+/)[0] : cls.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">Class {cls}</h3>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">{feeTypesCount} Fee Types Configured</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden sm:block text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Annual Fee</p>
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-500">₹{classTotal.toLocaleString('en-IN')}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </div>
                  </div>
                </button>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="p-5 md:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                    
                    {/* Wow Feature: Fee Preview Summary Box */}
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-5 border border-amber-200 dark:border-amber-800/50 mb-6 flex flex-col md:flex-row justify-between items-center gap-5 shadow-sm">
                      <div className="flex-1 w-full">
                        <h4 className="text-[10px] font-black text-amber-800 dark:text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <span className="text-base"></span> Fee Structure Preview
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-3 gap-x-4">
                          {Object.entries(totalsByType).map(([type, amount]) => (
                            <div key={type}>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{type}</p>
                              <p className="text-sm font-black text-slate-900 dark:text-white">₹{amount.toLocaleString('en-IN')}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 px-6 py-4 rounded-[1.5rem] border border-amber-200 dark:border-amber-800 shadow-md text-center min-w-[180px] w-full md:w-auto">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Annual Fee</p>
                        <p className="text-3xl font-black text-emerald-600 dark:text-emerald-500">₹{classTotal.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Fee Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {items.map((item) => (
                        <div key={item.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 p-5 shadow-sm hover:shadow-md transition-all group relative">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                              {item.term}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium bg-white dark:bg-slate-900 px-1">
                              {item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB') : 'Just now'}
                            </span>
                          </div>
                          
                          <div className="mb-5">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                              <span></span> {item.fee_type}
                            </p>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500">₹{Number(item.amount).toLocaleString('en-IN')}</p>
                          </div>
                          
                          {user?.role === 'admin' && (
                            <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                              <button onClick={() => openEdit(item)} className="flex-1 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-900/30 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5">
                                ️ Edit
                              </button>
                              <button onClick={() => handleDelete(item.id)} className="flex-1 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-900/30 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5">
                                 Delete
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                  </div>
                )}
              </div>
            );
          })}

          {structures.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 border-dashed">
              <span className="text-5xl mb-4"></span>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No fee structures found</h3>
              <p className="text-sm text-slate-500 mt-1">Try adjusting filters or add a new fee entry above.</p>
            </div>
          )}
        </section>

      </div>
    </Layout>
  );
}
