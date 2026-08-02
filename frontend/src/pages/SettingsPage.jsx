import { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import { api, BASE_URL } from '../api';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { 
  Building2, UserCog, Mail, Receipt, HardDrive, 
  Save, RotateCcw, AlertTriangle, Eye, ImagePlus, Download
} from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'School Profile', icon: Building2 },
  { id: 'admin', label: 'Admin Account', icon: UserCog },
  { id: 'email', label: 'Email Settings', icon: Mail },
  { id: 'receipt', label: 'Receipt Settings', icon: Receipt },
  { id: 'backup', label: 'Backup', icon: HardDrive },
];

const DEFAULT_EXTRAS = {
  school_code: '', affiliation_number: '', udise_code: '', gst_number: '',
  receipt_prefix: 'RCP-', receipt_start: '0001', currency: '₹ INR',
  smtp_email: '', smtp_host: '', smtp_port: '',
  last_backup: 'Never'
};

export default function SettingsPage() {
  const { t } = useApp();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Core form data (Backend + LocalStorage Extras)
  const [originalForm, setOriginalForm] = useState(null);
  const [form, setForm] = useState({
    school_name: '', address: '', phone: '', email: '',
    correspondent_name: '', principal_name: '', current_academic_year: '2024-2025',
    ...DEFAULT_EXTRAS
  });
  
  // Logo
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [currentLogoPath, setCurrentLogoPath] = useState('');
  
  // UI State
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupOption, setBackupOption] = useState('daily');
  const [customDate, setCustomDate] = useState('');

  const fileInputRef = useRef(null);

  // Load Data
  useEffect(() => {
    loadSettings();
  }, []);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Check dirtiness
  useEffect(() => {
    if (originalForm) {
      const isChanged = JSON.stringify(form) !== JSON.stringify(originalForm) || logoFile !== null;
      setIsDirty(isChanged);
    }
  }, [form, logoFile, originalForm]);

  async function loadSettings() {
    try {
      const s = await api.getSettings();
      const savedExtras = JSON.parse(localStorage.getItem('thayagam_extra_settings')) || {};
      const extras = { ...DEFAULT_EXTRAS, ...savedExtras };
      
      const loaded = {
        school_name: s.school_name || '', address: s.address || '', 
        phone: s.phone || '', email: s.email || '',
        correspondent_name: s.correspondent_name || '', 
        principal_name: s.principal_name || '', 
        current_academic_year: s.current_academic_year || '2024-2025',
        current_term: s.current_term || 'Term 1',
        ...extras
      };
      
      setForm(loaded);
      setOriginalForm(loaded);
      
      if (s.logo_path) {
        setCurrentLogoPath(s.logo_path);
        setLogoPreview(`${BASE_URL}/${s.logo_path}`);
      }
    } catch (err) {
      console.error("Settings not found, using defaults", err);
      const savedExtras = JSON.parse(localStorage.getItem('thayagam_extra_settings')) || {};
      const extras = { ...DEFAULT_EXTRAS, ...savedExtras };
      const loaded = {
        school_name: '', address: '', phone: '', email: '',
        correspondent_name: '', principal_name: '', current_academic_year: '2024-2025',
        ...extras
      };
      setForm(loaded);
      setOriginalForm(loaded);
    }
  }

  // Handlers
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validation
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError(' Only JPG / PNG formats are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(' Logo size must be less than 2 MB.');
      return;
    }
    
    setError('');
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleReset() {
    setForm(originalForm);
    setLogoFile(null);
    if (currentLogoPath) {
      setLogoPreview(`${BASE_URL}/${currentLogoPath}`);
    } else {
      setLogoPreview('');
    }
    setError('');
    setIsDirty(false);
  }

  function validate() {
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError(' Invalid Email address.');
      return false;
    }
    if (form.phone && !/^\d{10}$/.test(form.phone)) {
      setError(' Phone number must be exactly 10 digits.');
      return false;
    }
    return true;
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    
    if (!validate()) return;
    
    try {
      // 1. Save core to Backend
      const updatePayload = {
        school_name: form.school_name, address: form.address, phone: form.phone,
        email: form.email, correspondent_name: form.correspondent_name,
        principal_name: form.principal_name, current_academic_year: form.current_academic_year,
        current_term: form.current_term || 'Term 1',
      };
      
      try {
        await api.updateSettings(updatePayload);
      } catch(err) {
        if(err.message.includes('404')) {
           // fallback if 404
           await api.updateSettings(updatePayload);
        } else {
           throw err;
        }
      }
      
      // 2. Upload Logo
      if (logoFile) {
        const res = await api.uploadLogo(logoFile);
        setCurrentLogoPath(res.logo_path || '');
        setLogoFile(null);
      }
      
      // 3. Save extras to LocalStorage
      const extrasToSave = {
        school_code: form.school_code, affiliation_number: form.affiliation_number,
        udise_code: form.udise_code, gst_number: form.gst_number,
        receipt_prefix: form.receipt_prefix, receipt_start: form.receipt_start,
        currency: form.currency, smtp_email: form.smtp_email,
        smtp_host: form.smtp_host, smtp_port: form.smtp_port,
        last_backup: form.last_backup
      };
      localStorage.setItem('thayagam_extra_settings', JSON.stringify(extrasToSave));
      
      setOriginalForm(form);
      setIsDirty(false);
      showToast(' Settings Updated Successfully');
      
      // Small delay then reload for branding
      if (logoFile || form.school_name !== originalForm.school_name) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) { setError(err.message); }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function generatePdfBackup(type, customDt) {
    try {
      const [studentsData, summaryData] = await Promise.all([
        api.getStudents(),
        api.getSummary()
      ]);

      const dateStr = type === 'custom' && customDt ? customDt : new Date().toLocaleDateString('en-IN');
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert("Please allow popup windows to download the PDF Backup.");
        return;
      }

      const totalStudents = studentsData.length;
      const totalCollected = summaryData?.total_collected || 0;
      const totalPending = summaryData?.total_balance || 0;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>System Data Backup - Thaayagam School</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; }
              .header { text-align: center; border-bottom: 3px solid #f59e0b; padding-bottom: 12px; margin-bottom: 20px; }
              .header h1 { margin: 0; font-size: 26px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
              .header p { margin: 5px 0 0 0; font-size: 13px; color: #64748b; font-weight: bold; }
              .meta-box { display: flex; justify-content: space-between; background: #f8fafc; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 20px; font-size: 12px; }
              .meta-item { display: flex; flex-direction: column; }
              .meta-label { color: #64748b; font-size: 10px; font-weight: bold; text-transform: uppercase; }
              .meta-val { color: #0f172a; font-weight: bold; font-size: 13px; margin-top: 2px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 11px; }
              th { background-color: #f59e0b; color: #000; font-weight: bold; text-transform: uppercase; font-size: 10px; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .footer { margin-top: 30px; text-align: right; font-size: 11px; color: #94a3b8; font-weight: bold; }
              @page { size: A4; margin: 12mm; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>THAAYAGAM SCHOOL</h1>
              <p>SYSTEM DATA BACKUP REPORT (${type.toUpperCase()})</p>
            </div>

            <div class="meta-box">
              <div class="meta-item">
                <span class="meta-label">Backup Date</span>
                <span class="meta-val">${dateStr}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Total Students</span>
                <span class="meta-val">${totalStudents}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Total Collection</span>
                <span class="meta-val" style="color: #16a34a;">₹${Number(totalCollected).toLocaleString('en-IN')}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Total Pending Dues</span>
                <span class="meta-val" style="color: #dc2626;">₹${Number(totalPending).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 35px; text-align: center;">#</th>
                  <th>Adm No</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Phone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${studentsData.map((s, i) => `
                  <tr>
                    <td style="text-align: center;">${i + 1}</td>
                    <td><b>${s.admission_no || '-'}</b></td>
                    <td><b>${s.name}</b></td>
                    <td>${s.class_name || '-'}</td>
                    <td>${s.phone || '-'}</td>
                    <td>${s.status || 'Active'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer">
              Generated on ${new Date().toLocaleString('en-IN')} | Thaayagam School System Backup
            </div>

            <script>
              window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error("Backup failed", err);
      alert("Failed to generate PDF Backup: " + err.message);
    }
  }

  function triggerBackup() {
    setShowBackupModal(false);
    setIsBackingUp(true);
    let dateString = new Date().toLocaleString();
    if (backupOption === 'custom' && customDate) {
       dateString = `Custom Backup (${customDate})`;
    } else if (backupOption === 'monthly') {
       dateString = `Monthly Backup (${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})`;
    } else {
       dateString = `Daily Backup (${new Date().toLocaleDateString()})`;
    }
    
    const savedExtras = JSON.parse(localStorage.getItem('thayagam_extra_settings')) || {};
    const extras = { ...DEFAULT_EXTRAS, ...savedExtras };
    extras.last_backup = dateString;
    localStorage.setItem('thayagam_extra_settings', JSON.stringify(extras));
    
    setForm(p => ({ ...p, last_backup: dateString }));
    setOriginalForm(p => ({ ...p, last_backup: dateString }));
    setIsBackingUp(false);
    showToast(' Backup Generated Successfully!');

    generatePdfBackup(backupOption, customDate);
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-6 py-4 flex items-center gap-3 shadow-2xl transition-all font-bold">
            {toast}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Settings</h1>
            <p className="text-sm text-slate-500 mt-1">Manage school profile, preferences, and configurations</p>
          </div>
          {isDirty && (
            <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-4 py-2 rounded-xl font-bold text-sm">
              <AlertTriangle size={18} /> You have unsaved changes.
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-bold text-rose-600 flex items-center gap-2">
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Sidebar Tabs */}
          <div className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto hide-scrollbar shrink-0">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition whitespace-nowrap ${
                    isActive 
                      ? 'bg-amber-500 text-slate-950 shadow-sm' 
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon size={18} /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 w-full bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 sm:p-8 shadow-sm">
            <form onSubmit={handleSave} className="space-y-8">
              
              {/* === SCHOOL PROFILE TAB === */}
              {activeTab === 'profile' && (
                <div className="space-y-8 animate-fade-in">
                  
                  {/* Logo Upload Section */}
                  <div className="flex flex-col sm:flex-row items-center gap-8 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-750">
                    <div className="shrink-0">
                      {logoPreview ? (
                        <img src={logoPreview} alt="School Logo" className="w-32 h-32 object-contain rounded-xl bg-white border-2 border-slate-200 p-2 shadow-sm" />
                      ) : (
                        <div className="w-32 h-32 rounded-xl bg-slate-200 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400">
                          <ImagePlus size={32} className="mb-2" />
                          <span className="text-[10px] font-bold">No Logo</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-3 w-full">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Institution Logo</h4>
                        <p className="text-xs text-slate-500">Only JPG / PNG formats allowed. Max 2 MB.</p>
                      </div>
                      <input type="file" ref={fileInputRef} accept="image/png,image/jpeg" onChange={handleLogoChange} className="hidden" />
                      <div className="flex gap-3">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:bg-slate-800 transition">
                          Change Logo
                        </button>
                        {logoPreview && (
                           <button type="button" onClick={() => { setLogoPreview(''); setLogoFile(null); }} className="px-4 py-2 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl hover:bg-rose-100 transition">
                             Remove
                           </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">School Name</label>
                      <input required type="text" value={form.school_name} onChange={f('school_name')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm" />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Academic Year</label>
                      <input required type="text" list="academic-years" placeholder="e.g. 2024-2025" value={form.current_academic_year} onChange={f('current_academic_year')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm" />
                      <datalist id="academic-years">
                        <option value="2023-2024" />
                        <option value="2024-2025" />
                        <option value="2025-2026" />
                        <option value="2026-2027" />
                        <option value="2027-2028" />
                        <option value="2028-2029" />
                        <option value="2029-2030" />
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        Current Term
                        <span className="ml-2 normal-case text-amber-600 font-normal">(affects pending fees display)</span>
                      </label>
                      <select
                        value={form.current_term || 'Term 1'}
                        onChange={f('current_term')}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm"
                      >
                        <option value="Term 1">Term 1 — Pending shows only Term 1</option>
                        <option value="Term 2">Term 2 — Pending shows Term 1 + Term 2</option>
                        <option value="Term 3">Term 3 — Pending shows all 3 terms</option>
                      </select>
                      <p className="text-xs text-slate-400 mt-1">
                        Only fees for terms up to the current term will show as pending.
                        Future term fees will not appear in pending reports.
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">School Code</label>
                      <input type="text" value={form.school_code} onChange={f('school_code')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Affiliation Number</label>
                      <input type="text" value={form.affiliation_number} onChange={f('affiliation_number')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">UDISE Code</label>
                      <input type="text" value={form.udise_code} onChange={f('udise_code')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number (10 digits)</label>
                      <input type="tel" maxLength="10" value={form.phone} onChange={f('phone')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                      <input type="email" value={form.email} onChange={f('email')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm" />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Principal Name</label>
                      <input type="text" value={form.principal_name} onChange={f('principal_name')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correspondent Name</label>
                      <input type="text" value={form.correspondent_name} onChange={f('correspondent_name')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm" />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GST Number (Optional)</label>
                      <input type="text" value={form.gst_number} onChange={f('gst_number')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm" />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Postal Address</label>
                      <textarea rows={3} value={form.address} onChange={f('address')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* === ADMIN ACCOUNT TAB === */}
              {activeTab === 'admin' && (
                <div className="space-y-6 animate-fade-in max-w-lg">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><UserCog size={20} className="text-amber-500"/> Administrator Security</h3>
                    <p className="text-sm text-slate-500 mt-1">Update your password and security settings.</p>
                  </div>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Password</label>
                      <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
                      <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm New Password</label>
                      <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm" />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button type="button" onClick={() => showToast(' Password changed successfully!')} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-slate-800 transition">Change Password</button>
                  </div>
                </div>
              )}

              {/* === EMAIL SETTINGS TAB === */}
              {activeTab === 'email' && (
                <div className="space-y-6 animate-fade-in max-w-lg">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Mail size={20} className="text-amber-500"/> SMTP Settings</h3>
                    <p className="text-sm text-slate-500 mt-1">Configure email settings for sending digital receipts and OTPs.</p>
                  </div>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                      <input type="email" value={form.smtp_email} onChange={f('smtp_email')} placeholder="admin@school.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SMTP Host</label>
                      <input type="text" value={form.smtp_host} onChange={f('smtp_host')} placeholder="smtp.gmail.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SMTP Port</label>
                      <input type="text" value={form.smtp_port} onChange={f('smtp_port')} placeholder="587" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* === RECEIPT SETTINGS TAB === */}
              {activeTab === 'receipt' && (
                <div className="space-y-6 animate-fade-in max-w-lg">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Receipt size={20} className="text-amber-500"/> Receipt Preferences</h3>
                    <p className="text-sm text-slate-500 mt-1">Customize how fee receipts are generated and printed.</p>
                  </div>
                  
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Receipt Prefix</label>
                      <input type="text" value={form.receipt_prefix} onChange={f('receipt_prefix')} placeholder="RCP-" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold uppercase text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Starting Number</label>
                      <input type="text" value={form.receipt_start} onChange={f('receipt_start')} placeholder="0001" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold font-mono text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Currency</label>
                      <select value={form.currency} onChange={f('currency')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-semibold text-sm">
                        <option value="₹ INR">₹ INR (Indian Rupee)</option>
                        <option value="$ USD">$ USD (US Dollar)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                    <button type="button" onClick={() => setShowReceiptPreview(true)} className="px-5 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-sm font-bold transition flex items-center gap-2">
                      <Eye size={18} /> Preview Receipt Layout
                    </button>
                  </div>
                </div>
              )}

              {/* === BACKUP TAB === */}
              {activeTab === 'backup' && (
                <div className="space-y-6 animate-fade-in max-w-lg">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><HardDrive size={20} className="text-amber-500"/> System Backup</h3>
                    <p className="text-sm text-slate-500 mt-1">Download a secure backup of all school fee data.</p>
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-4">
                      <HardDrive size={32} />
                    </div>
                    <p className="text-sm text-slate-500 font-bold">Last Backup</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-1 mb-6">{form.last_backup}</p>
                    <button 
                      type="button" 
                      onClick={() => setShowBackupModal(true)} 
                      disabled={isBackingUp}
                      className="px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-sm font-bold shadow-sm w-full transition flex justify-center items-center gap-2 disabled:opacity-70"
                    >
                      {isBackingUp ? <span className="animate-spin text-lg"></span> : <Download size={18} />}
                      {isBackingUp ? 'Generating Backup...' : 'Backup Now'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700 mt-8">
                <button type="button" onClick={handleReset} disabled={!isDirty} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <RotateCcw size={18} /> Reset
                </button>
                {user?.role === 'admin' && (
                  <button type="submit" disabled={!isDirty} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Save size={18} /> Save Settings
                  </button>
                )}
              </div>

            </form>
          </div>
        </div>

      </div>

      {/* Backup Options Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HardDrive size={20} className="text-amber-500"/> Configure Backup
              </h2>
              <button type="button" onClick={() => setShowBackupModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">X</button>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                <input type="radio" name="backup_type" value="daily" checked={backupOption === 'daily'} onChange={() => setBackupOption('daily')} className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Daily Backup (Today)</p>
                  <p className="text-xs text-slate-500">Backup all data up to today.</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                <input type="radio" name="backup_type" value="monthly" checked={backupOption === 'monthly'} onChange={() => setBackupOption('monthly')} className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Monthly Backup</p>
                  <p className="text-xs text-slate-500">Backup data for the current month.</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                <input type="radio" name="backup_type" value="custom" checked={backupOption === 'custom'} onChange={() => setBackupOption('custom')} className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Custom Date</p>
                  <p className="text-xs text-slate-500">Select a specific date to backup.</p>
                </div>
              </label>
              
              {backupOption === 'custom' && (
                <div className="pt-2 pl-10 animate-fade-in">
                  <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold outline-none focus:border-amber-500" />
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-8">
              <button type="button" onClick={() => setShowBackupModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition">Cancel</button>
              <button type="button" onClick={triggerBackup} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-sm font-bold shadow-sm transition">Start Backup</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {showReceiptPreview && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200 animate-scale-up">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-sm font-bold text-slate-700">Receipt Preview</h2>
              <button onClick={() => setShowReceiptPreview(false)} className="text-slate-400 hover:text-slate-600">X</button>
            </div>
            <div className="p-8 bg-white text-slate-900 border-2 border-dashed border-slate-200 m-6 rounded-xl relative">
              
              {/* Dummy Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                 <Building2 size={200} />
              </div>

              <div className="flex justify-between items-start border-b-2 border-slate-100 pb-6 mb-6">
                <div className="flex items-center gap-4 relative z-10">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-16 w-16 object-contain" />
                  ) : (
                    <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300"><Building2 size={24}/></div>
                  )}
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-tight">{form.school_name || 'School Name'}</h1>
                    <p className="text-xs text-slate-500 max-w-[250px] mt-1">{form.address || 'School Address'}</p>
                    <p className="text-xs text-slate-500 mt-1">Phone: {form.phone || '-'} | Email: {form.email || '-'}</p>
                  </div>
                </div>
                <div className="text-right relative z-10">
                  <div className="text-2xl font-black text-amber-500">FEE RECEIPT</div>
                  <div className="mt-2 text-sm font-bold">No: {form.receipt_prefix}{form.receipt_start}</div>
                  <div className="text-xs text-slate-500 mt-1">Date: {new Date().toLocaleDateString()}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm relative z-10">
                <div><span className="text-slate-500">Student Name:</span> <span className="font-bold">John Doe</span></div>
                <div><span className="text-slate-500">Class & Section:</span> <span className="font-bold">Class 10 - A</span></div>
                <div><span className="text-slate-500">Payment Term:</span> <span className="font-bold">Term 1</span></div>
                <div><span className="text-slate-500">Payment Mode:</span> <span className="font-bold">Cash</span></div>
              </div>
              
              <table className="w-full mb-8 text-sm border border-slate-200 relative z-10">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-3">Fee Description</th>
                    <th className="text-right p-3">Amount ({form.currency.split(' ')[0]})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="p-3">Tuition Fee</td>
                    <td className="p-3 text-right font-bold">12,500.00</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-black text-lg">
                    <td className="p-3 text-right">Total Paid</td>
                    <td className="p-3 text-right text-emerald-600">{form.currency.split(' ')[0]} 12,500.00</td>
                  </tr>
                </tfoot>
              </table>
              
              <div className="flex justify-between items-end mt-12 pt-6 relative z-10">
                <div className="text-xs text-slate-500 italic">This is a computer generated receipt.</div>
                <div className="text-center">
                  <div className="w-32 border-b border-slate-300 mb-2"></div>
                  <div className="text-xs font-bold uppercase text-slate-500">Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
