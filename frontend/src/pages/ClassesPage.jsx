import { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../api';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';

export default function ClassesPage() {
  const { t } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  
  // Form State
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [teacher, setTeacher] = useState('');
  const [capacity, setCapacity] = useState('');
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Search & Filter
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('filter') || 'All Classes';
  const initialExactClass = searchParams.get('exact_class') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [exactClassFilter, setExactClassFilter] = useState(initialExactClass);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Click outside listener for dropdown
  const dropdownRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync URL params to state on navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get('search') || '');
    setCategoryFilter(params.get('filter') || 'All Classes');
    setExactClassFilter(params.get('exact_class') || '');
  }, [location.search]);

  function load() { 
    api.getClasses().then(data => {
      // Sort classes naturally: LKG, UKG, Class 1, Class 2...
      const sorted = data.sort((a, b) => {
        const order = { "LKG": -2, "UKG": -1 };
        const getRank = (n) => {
          const upper = n.toUpperCase();
          if (order[upper] !== undefined) return order[upper];
          const m = upper.match(/\d+/);
          return m ? parseInt(m[0], 10) : 999;
        };
        const rankDiff = getRank(a.name) - getRank(b.name);
        if (rankDiff !== 0) return rankDiff;
        // if same class name, sort by section
        return (a.section || '').localeCompare(b.section || '');
      });
      setClasses(sorted);
    }).catch(() => {}); 
  }
  useEffect(load, []);

  // Filter & Search Logic
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
       if (exactClassFilter && c.name !== exactClassFilter) {
         return false;
       }

       const upper = c.name.toUpperCase();
       let cat = 'All Classes';
       if (upper.includes('KG')) cat = 'Pre-Primary';
       else {
         const m = upper.match(/\d+/);
         if (m) {
           const num = parseInt(m[0], 10);
           if (num >= 1 && num <= 5) cat = 'Primary';
           else if (num >= 6 && num <= 8) cat = 'Middle';
           else if (num >= 9 && num <= 10) cat = 'High School';
           else if (num >= 11 && num <= 12) cat = 'Higher Secondary';
         }
       }

       if (categoryFilter !== 'All Classes' && categoryFilter !== cat) {
         return false;
       }
       if (searchQuery) {
         const searchLower = searchQuery.toLowerCase();
         if (!c.name.toLowerCase().includes(searchLower) && 
             !(c.section && c.section.toLowerCase().includes(searchLower))) {
           return false;
         }
       }
       return true;
    });
  }, [classes, categoryFilter, searchQuery, exactClassFilter]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createClass({ name, section: section || null });
      setName(''); setSection(''); setTeacher(''); setCapacity('');
      setShowAddForm(false);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this class section?')) return;
    await api.deleteClass(id);
    setActiveDropdown(null);
    load();
  }

  const uniqueClassesCount = new Set(classes.map(c => c.name)).size;
  const totalStudents = classes.reduce((sum, c) => sum + (c.student_count || 0), 0);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Classes & Sections</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage school grades, capacity, and assignments</p>
          </div>
          {user?.role === 'admin' && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-6 py-3 rounded-2xl text-sm font-black transition shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <span className="text-lg">➕</span> Add New Class
            </button>
          )}
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-amber-200 dark:hover:border-amber-800 transition-colors">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner">🏫</div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Classes</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{uniqueClassesCount}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner">🧑‍🎓</div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Students</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{totalStudents}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center text-2xl"></div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Active Sections</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{classes.length}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center text-2xl"></div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Occupied</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{classes.length}</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></span>
            <input 
              type="text" 
              placeholder="Search Class or Section..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 text-slate-900 dark:text-slate-100 transition"
            />
          </div>
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-64 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition cursor-pointer"
          >
            <option value="All Classes">All Classes</option>
            <option value="Pre-Primary">Pre-Primary (KG)</option>
            <option value="Primary">Primary (1-5)</option>
            <option value="Middle">Middle (6-8)</option>
            <option value="High School">High School (9-10)</option>
            <option value="Higher Secondary">Higher Secondary (11-12)</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" ref={dropdownRef}>
          {filteredClasses.map((c) => {
            return (
              <div key={c.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl hover:shadow-amber-500/5 hover:border-amber-200 dark:hover:border-amber-800 transition-all group relative">
                
                {/* Card Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 group-hover:scale-105 transition-transform">
                      {c.name.match(/\d+/) ? c.name.match(/\d+/)[0] : c.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        {c.name}
                        <span className="text-xs font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded-lg border border-amber-200/50 dark:border-amber-500/30">
                          {c.section || 'No Section'}
                        </span>
                      </h3>
                    </div>
                  </div>
                  
                  {/* Action Dropdown */}
                  {user?.role === 'admin' && (
                  <div className="relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === c.id ? null : c.id); }} 
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 w-8 h-8 rounded-xl flex items-center justify-center transition border border-slate-200 dark:border-slate-700"
                    >
                      ⋮
                    </button>
                    {activeDropdown === c.id && (
                      <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-fade-in">
                        <button className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2">
                          ️ Edit
                        </button>
                        <button className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2">
                           Archive
                        </button>
                        {user?.role === 'admin' && (
                          <button onClick={() => handleDelete(c.id)} className="w-full text-left px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition flex items-center gap-2 border-t border-slate-50 dark:border-slate-700/50">
                             Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 transition-colors">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">Students</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{c.student_count || 0}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 group-hover:bg-rose-50 dark:group-hover:bg-rose-900/10 transition-colors">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">Pending Fees</p>
                    <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">₹{(c.pending_fees || 0).toLocaleString()}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Link 
                    to={`/classes/${c.id}`} 
                    className="flex-1 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-500 py-3 rounded-2xl text-xs font-black transition-colors text-center flex items-center justify-center gap-2 border border-amber-200/50 dark:border-amber-800/30"
                  >
                    <span className="text-base"></span> View Students
                  </Link>
                  <Link 
                    to={`/reports/class-wise?class_id=${c.id}`} 
                    className="flex-1 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 py-3 rounded-2xl text-xs font-black transition-colors text-center flex items-center justify-center gap-2 border border-indigo-200/50 dark:border-indigo-800/30"
                  >
                    <span className="text-base"></span> Fee Report
                  </Link>
                </div>
              </div>
            );
          })}
          
          {filteredClasses.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 border-dashed">
              <span className="text-5xl mb-4"></span>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No classes found</h3>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>

        {/* Add Class Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg rounded-[2.5rem] bg-white dark:bg-slate-900 p-8 shadow-2xl border border-slate-100 dark:border-slate-800 relative">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 p-2.5 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-800"></span> 
                  Add New Class
                </h2>
                <button 
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-3 rounded-full transition"
                >
                  X
                </button>
              </div>

              {error && (
                <div className="mb-6 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-4 text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
                  <span className="text-base">️</span> {error}
                </div>
              )}

              <form onSubmit={handleAdd} className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Class Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Grade 5, Class 10"
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-5 py-3.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 text-slate-900 dark:text-slate-100 font-bold transition shadow-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Section <span className="text-slate-400 lowercase normal-case text-[9px]">(Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        value={section} 
                        onChange={(e) => setSection(e.target.value)}
                        placeholder="e.g. A"
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-5 py-3.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 text-slate-900 dark:text-slate-100 font-bold transition shadow-sm uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Capacity <span className="text-slate-400 lowercase normal-case text-[9px]">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      value={capacity} 
                      onChange={(e) => setCapacity(e.target.value)}
                      placeholder="e.g. 40"
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-5 py-3.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 text-slate-900 dark:text-slate-100 font-bold transition shadow-sm"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Class Teacher <span className="text-slate-400 lowercase normal-case text-[9px]">(Optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">‍</span>
                      <input
                        value={teacher} 
                        onChange={(e) => setTeacher(e.target.value)}
                        placeholder="Teacher Name"
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-11 pr-5 py-3.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 text-slate-900 dark:text-slate-100 font-bold transition shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setShowAddForm(false)}
                    className="rounded-2xl px-6 py-3.5 text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    Cancel
                  </button>
                  <button type="submit"
                    className="rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 px-8 py-3.5 text-sm font-black transition shadow-xl shadow-amber-500/30 flex items-center gap-2">
                    <span className="text-lg"></span> Add Class
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
