import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';
import { UserPlus, RefreshCw, Trash2, ToggleLeft, ToggleRight, Copy, Check, ShieldCheck, X, AlertCircle } from 'lucide-react';

const ROLE_COLORS = {
  admin:      'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  accountant: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  principal:  'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
};

function TempPasswordModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(data.temp_password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:px-4">
      <div className="bg-[#0a0f1e] border border-amber-500/20 rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck size={24} className="text-amber-400" />
          <div>
            <h2 className="text-white font-black text-lg">User Created!</h2>
            <p className="text-slate-400 text-sm">Share this temporary password with the user.</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-4">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Username</p>
          <p className="text-white font-bold">{data.username}</p>
        </div>

        <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20 mb-6">
          <p className="text-xs text-amber-400 uppercase tracking-widest mb-2">Temporary Password — shown once</p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-amber-300 font-mono font-bold text-lg tracking-wider">{data.temp_password}</p>
            <button onClick={copy} className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 transition">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-3 border border-white/5 mb-6">
          <p className="text-xs text-slate-400">
            ⚠ The user will be forced to change this password on their first login. This password will not be shown again.
          </p>
        </div>

        <button onClick={onClose} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-xl text-sm transition">
          I've saved the password — Close
        </button>
      </div>
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ username: '', email: '', role: 'accountant' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.createUser(form);
      onCreated(result);
    } catch (err) {
      setError(err.message || 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:px-4">
      <div className="bg-[#0a0f1e] border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <UserPlus size={22} className="text-amber-400" />
            <h2 className="text-white font-black text-lg">Create New User</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-5">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Username</label>
            <input
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="e.g. john_accountant"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="user@school.com"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition"
            >
              <option value="accountant" className="bg-slate-900">Accountant</option>
              <option value="principal" className="bg-slate-900">Principal</option>
              <option value="admin" className="bg-slate-900">Admin</option>
            </select>
          </div>
          <p className="text-xs text-slate-500">A random temporary password will be generated. The user must change it on first login.</p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-3 rounded-xl text-sm transition">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold py-3 rounded-xl text-sm transition">
              {loading ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [tempData, setTempData] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  function load() {
    setLoading(true);
    api.getUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function showMessage(msg) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3000);
  }

  async function handleToggle(id) {
    try {
      const res = await api.toggleUser(id);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_active: res.is_active } : u));
      showMessage(res.is_active ? 'User activated.' : 'User deactivated.');
    } catch (err) { showMessage(err.message); }
  }

  async function handleResetPassword(id, username) {
    if (!confirm(`Reset password for "${username}"? A new temporary password will be generated.`)) return;
    try {
      const res = await api.resetUserPassword(id);
      setTempData({ username, temp_password: res.temp_password });
    } catch (err) { showMessage(err.message); }
  }

  async function handleDelete(id, username) {
    if (!confirm(`Permanently delete user "${username}"? This cannot be undone.`)) return;
    try {
      await api.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showMessage('User deleted.');
    } catch (err) { showMessage(err.message); }
  }

  function handleCreated(result) {
    setShowCreate(false);
    setTempData(result);
    load();
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">User Management</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Create and manage staff accounts for this system.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-amber-500/20"
          >
            <UserPlus size={16} /> Create User
          </button>
        </div>

        {/* Toast */}
        {actionMsg && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium px-4 py-3 rounded-xl">
            {actionMsg}
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-600">{users.length} user{users.length !== 1 ? 's' : ''}</p>
            <button onClick={load} className="text-slate-400 hover:text-slate-700 transition">
              <RefreshCw size={16} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-slate-400">No users found.</div>
          ) : (
            <>
              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <div key={u.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white text-sm">{u.username}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{u.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${ROLE_COLORS[u.role] || ''}`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggle(u.id)}
                          disabled={u.role === 'admin'}
                          className={`p-1.5 rounded-lg ${u.role === 'admin' ? 'opacity-30' : 'hover:bg-slate-100'}`}
                        >
                          {u.is_active ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} className="text-slate-400" />}
                        </button>
                        <button onClick={() => handleResetPassword(u.id, u.username)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500">
                          <RefreshCw size={16} />
                        </button>
                        <button onClick={() => handleDelete(u.id, u.username)} disabled={u.role === 'admin'} className={`p-1.5 rounded-lg ${u.role === 'admin' ? 'opacity-30' : 'hover:bg-red-50 text-red-500'}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-6 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider">Password</th>
                  <th className="px-6 py-3 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{u.username}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{u.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${ROLE_COLORS[u.role] || ''}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.must_change_password ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Awaiting change</span>
                      ) : (
                        <span className="text-slate-400 text-xs">Set</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        {/* Toggle active */}
                        <button
                          onClick={() => handleToggle(u.id)}
                          disabled={u.role === 'admin'}
                          title={u.is_active ? 'Deactivate' : 'Activate'}
                          className={`p-2 rounded-lg transition ${u.role === 'admin' ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100'}`}
                        >
                          {u.is_active
                            ? <ToggleRight size={18} className="text-emerald-500" />
                            : <ToggleLeft size={18} className="text-slate-400" />}
                        </button>
                        {/* Reset password */}
                        <button
                          onClick={() => handleResetPassword(u.id, u.username)}
                          title="Reset Password"
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition"
                        >
                          <RefreshCw size={16} />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(u.id, u.username)}
                          disabled={u.role === 'admin'}
                          title="Delete User"
                          className={`p-2 rounded-lg transition ${u.role === 'admin' ? 'opacity-30 cursor-not-allowed' : 'hover:bg-red-50 text-red-500'}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
          )}
        </div>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {tempData && <TempPasswordModal data={tempData} onClose={() => setTempData(null)} />}
    </Layout>
  );
}
