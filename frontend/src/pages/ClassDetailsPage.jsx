import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useApp } from '../AppContext';

export default function ClassDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { setSelectedStudentForPayment } = useApp();
  
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getClass(id),
      api.getClassFees(id)
    ])
      .then(([classData, feesData]) => {
        setCls(classData);
        setStudents(feesData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  function exportCSV() {
    if (!cls || students.length === 0) return;
    
    // Header row
    const headers = [
      "Adm. No", "Student Name", "Phone", "Class", "Section",
      "Term 1 Total", "Term 1 Paid", "Term 1 Balance",
      "Term 2 Total", "Term 2 Paid", "Term 2 Balance",
      "Term 3 Total", "Term 3 Paid", "Term 3 Balance",
      "Overall Total", "Overall Paid", "Overall Balance", "Status"
    ];
    
    const rows = students.map(s => {
      const row = [
        s.admission_no, 
        `"${s.student_name.replace(/"/g, '""')}"`,
        `"${s.phone || ''}"`,
        `"${cls.name}"`,
        `"${cls.section || ''}"`
      ];
      
      // Terms
      ['Term 1', 'Term 2', 'Term 3'].forEach(tName => {
        const t = s.terms?.find(x => x.term === tName);
        if (t) {
          row.push(t.total_fee, t.amount_paid, t.balance);
        } else {
          row.push(0, 0, 0);
        }
      });
      
      // Overall
      row.push(s.total_fee, s.amount_paid, s.balance, s.status);
      return row;
    });
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `Class_${cls.name}${cls.section ? `_${cls.section}` : ''}_Fee_Report.csv`.replace(/\s+/g, '_');
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Layout>
      <div className="space-y-6">
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
          <div className="pb-4 sm:pb-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <Link to="/classes" className="text-slate-400 hover:text-slate-600 bg-slate-100 dark:bg-slate-800 p-2 rounded-full transition flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {cls ? `${cls.name}${cls.section ? ` - Section ${cls.section}` : ''}` : 'Loading...'}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">Student Fee Information</p>
              </div>
            </div>
            
            {cls && (
              <div className="flex gap-3 items-center">
                <div className="text-right border-r border-slate-100 dark:border-slate-800 pr-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Students</p>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-200">{students.length}</p>
                </div>
                <button
                  onClick={exportCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  <span className="hidden sm:inline">Download </span>Excel
                </button>
              </div>
            )}
          </div>

          {/* Mobile Card List — visible only on small screens */}
          <div className="md:hidden mt-4 space-y-3">
            {loading ? (
              <p className="text-center text-slate-400 py-10 font-medium">Loading...</p>
            ) : students.length === 0 ? (
              <p className="text-center text-slate-400 py-10 font-medium">No active students found in this class.</p>
            ) : (
              students.map((s) => (
                <div key={s.student_id} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{s.student_name}</p>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">{s.admission_no}</p>
                    </div>
                    {s.balance <= 0 ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-600 px-2.5 py-0.5 text-xs font-bold border border-emerald-200">Paid</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-rose-50 text-rose-600 px-2.5 py-0.5 text-xs font-bold border border-rose-200">Pending</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center bg-white dark:bg-slate-900 rounded-xl p-2 border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">Total</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">{fmt(s.total_fee)}</p>
                    </div>
                    <div className="text-center bg-white dark:bg-slate-900 rounded-xl p-2 border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold uppercase text-emerald-500 tracking-wide">Paid</p>
                      <p className="text-xs font-bold text-emerald-600 mt-0.5">{fmt(s.amount_paid)}</p>
                    </div>
                    <div className="text-center bg-white dark:bg-slate-900 rounded-xl p-2 border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold uppercase text-rose-500 tracking-wide">Balance</p>
                      <p className="text-xs font-bold text-rose-600 mt-0.5">{fmt(s.balance)}</p>
                    </div>
                  </div>
                  <Link
                    to="/payments"
                    onClick={() => setSelectedStudentForPayment(s)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-500 hover:text-white px-3 py-2 rounded-xl transition"
                  >
                    Collect Fee
                  </Link>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table — hidden on mobile */}
          <div className="hidden md:block mt-6 overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full min-w-max text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Adm. No</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5 text-right">Total Fee</th>
                  <th className="px-5 py-3.5 text-right">Paid</th>
                  <th className="px-5 py-3.5 text-right">Balance</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 font-medium">Loading...</td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 font-medium">No active students found in this class.</td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s.student_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-850 dark:text-slate-350">{s.admission_no}</td>
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-100">{s.student_name}</td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-600">{fmt(s.total_fee)}</td>
                      <td className="px-5 py-4 text-right font-bold text-emerald-600">{fmt(s.amount_paid)}</td>
                      <td className="px-5 py-4 text-right font-black text-rose-600">{fmt(s.balance)}</td>
                      <td className="px-5 py-4 text-center">
                        {s.balance <= 0 ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-600 px-2.5 py-0.5 text-xs font-bold border border-emerald-200">Paid</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-rose-50 text-rose-600 px-2.5 py-0.5 text-xs font-bold border border-rose-200">Pending</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Link
                          to="/payments"
                          onClick={() => setSelectedStudentForPayment(s)}
                          className="text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-500 hover:text-white px-3 py-1.5 rounded-xl transition"
                        >
                          Collect Fee
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
}
