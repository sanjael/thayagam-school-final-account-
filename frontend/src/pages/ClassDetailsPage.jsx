import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api, BASE_URL } from '../api';
import { useAuth } from '../AuthContext';
import { useApp } from '../AppContext';

export default function ClassDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { setSelectedStudentForPayment } = useApp();
  
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [logoBase64, setLogoBase64] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    async function loadData() {
      try {
        const [classData, feesData, settingsData] = await Promise.all([
          api.getClass(id),
          api.getClassFees(id),
          api.getSettings().catch(() => null)
        ]);
        setCls(classData);
        setStudents(feesData);
        
        let targetUrl = window.location.origin + '/logo.jpg';
        if (settingsData?.logo_path) {
          targetUrl = settingsData.logo_path.startsWith('data:image') ? settingsData.logo_path : `${BASE_URL.replace(/\/+$/, '')}/${settingsData.logo_path}`;
        }
        const res = await fetch(targetUrl);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const exportPDF = () => {
    if (!cls || students.length === 0) return;

    const classNameFull = `${cls.name}${cls.section ? ` - Section ${cls.section}` : ''}`;
    const title = `Class Fee Report - ${classNameFull}`;

    const contentHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center; border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">#</th>
            <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Adm. No</th>
            <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Student Name</th>
            <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Total Fee</th>
            <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Paid</th>
            <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">Balance</th>
            <th style="border: 1px solid #cbd5e1; padding: 9px 12px; background-color: #f8fafc; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${students.map((s, i) => `
            <tr style="${i % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
              <td style="text-align: center; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;">${i + 1}</td>
              <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;"><b>${s.admission_no || ''}</b></td>
              <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px;"><b>${s.student_name}</b></td>
              <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; text-align: right;">₹${Number(s.total_fee || 0).toLocaleString('en-IN')}</td>
              <td style="color: #16a34a; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; text-align: right;">₹${Number(s.amount_paid || 0).toLocaleString('en-IN')}</td>
              <td style="color: #dc2626; font-weight: bold; border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; text-align: right;">₹${Number(s.balance || 0).toLocaleString('en-IN')}</td>
              <td style="border: 1px solid #cbd5e1; padding: 9px 12px; font-size: 12px; text-align: center;">
                <span style="font-weight: bold; color: ${s.balance <= 0 ? '#16a34a' : '#dc2626'};">
                  ${s.balance <= 0 ? 'Paid' : 'Pending'}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

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
          Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} | Thaayagam School Class Reports
        </div>
      </div>
    `;

    const opt = {
      margin:       10,
      filename:     `Class_${cls.name}${cls.section ? `_${cls.section}` : ''}_Fee_Report.pdf`.replace(/\s+/g, '_'),
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
                  onClick={exportPDF}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span className="hidden sm:inline">Download </span>PDF
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
