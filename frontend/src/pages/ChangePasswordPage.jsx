import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ChangePasswordPage() {
  const { user, clearMustChangePassword } = useAuth();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = (() => {
    let s = 0;
    if (newPassword.length >= 8) s++;
    if (/[A-Z]/.test(newPassword)) s++;
    if (/[0-9]/.test(newPassword)) s++;
    if (/[^A-Za-z0-9]/.test(newPassword)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      clearMustChangePassword();
      setSuccess(true);
      setTimeout(() => {
        if (user.role === 'accountant') navigate('/payments');
        else if (user.role === 'principal') navigate('/reports');
        else navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-amber-500/20 border-2 border-amber-500/40 rounded-2xl flex items-center justify-center mb-4">
              <KeyRound size={28} className="text-amber-400" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Set Your Password</h1>
            <p className="text-slate-400 text-sm mt-2">
              Welcome, <span className="text-amber-400 font-bold">{user?.username}</span>!<br />
              You must set a new password before continuing.
            </p>
          </div>

          {/* Success state */}
          {success && (
            <div className="flex flex-col items-center gap-3 py-6">
              <ShieldCheck size={48} className="text-emerald-400" />
              <p className="text-emerald-400 font-bold text-lg">Password changed!</p>
              <p className="text-slate-400 text-sm">Redirecting you now…</p>
            </div>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm font-medium">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Current (temp) password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Temporary Password
                </label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    placeholder="Enter the password given by admin"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                  <button type="button" onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition">
                    {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="At least 8 characters"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition">
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Strength bar */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor[strength] : 'bg-white/10'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">{strengthLabel[strength]}</p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter new password"
                  className={`w-full rounded-xl bg-white/5 border px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition ${
                    confirmPassword && confirmPassword !== newPassword
                      ? 'border-red-500/50 focus:ring-red-500/20'
                      : 'border-white/10 focus:border-amber-500/50 focus:ring-amber-500/20'
                  }`}
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-red-400 mt-1">Passwords don't match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || (confirmPassword && confirmPassword !== newPassword)}
                className="w-full mt-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-3.5 rounded-xl text-sm transition-all duration-200 active:scale-[0.98] shadow-lg shadow-amber-500/20"
              >
                {loading ? 'Saving…' : 'Set New Password & Continue'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
