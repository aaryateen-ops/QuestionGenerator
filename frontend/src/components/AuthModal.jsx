import React, { useRef, useState } from 'react';
import useDialogFocus from '../hooks/useDialogFocus';
import { Shield, User, Lock, Mail, Building, CheckCircle2, AlertCircle, X, KeyRound, ArrowRight } from 'lucide-react';
import { api } from '../api/client';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, theme, canClose = true, demoMode = false }) {
  const dialog = useRef(null);
  useDialogFocus(dialog, isOpen, onClose, canClose);
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-xl';
  const subBg = isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900';
  const inputBg = isDark
    ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500'
    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500';

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  
  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDept, setRegDept] = useState('Computer Science & Engineering');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleQuickLogin = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ username_or_email: username, password });
      localStorage.setItem('qp_token', res.access_token);
      localStorage.setItem('qp_user', JSON.stringify(res.user));
      onAuthSuccess(res.user);
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginIdentifier || !loginPassword) {
      setError('Please provide both username/email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({
        username_or_email: loginIdentifier,
        password: loginPassword,
      });
      localStorage.setItem('qp_token', res.access_token);
      localStorage.setItem('qp_user', JSON.stringify(res.user));
      onAuthSuccess(res.user);
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regEmail || !regUsername || !regPassword || !regFullName) {
      setError('All fields are required for registration.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.register({
        email: regEmail,
        username: regUsername,
        password: regPassword,
        full_name: regFullName,
        role: 'FACULTY',
        department: regDept,
      });
      localStorage.setItem('qp_token', res.access_token);
      localStorage.setItem('qp_user', JSON.stringify(res.user));
      setSuccessMsg('Account registered successfully!');
      setTimeout(() => {
        onAuthSuccess(res.user);
        if (onClose) onClose();
      }, 500);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="auth-title" className={`${cardBg} border rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto p-6 space-y-5 shadow-2xl relative`}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-100 text-zinc-900'}`}>
                <KeyRound className="w-4 h-4" />
              </div>
              <h2 id="auth-title" className="text-base font-bold tracking-tight">Institutional User Access</h2>
            </div>
            <p className="text-xs text-zinc-500">
              Role-Based Access Control (RBAC) • Exam Controller & Faculty Workspace
            </p>
          </div>

          {canClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick Demo Login Preset Bar */}
        {demoMode && <div className={`${subBg} p-3 rounded-lg border space-y-2`}>
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">
              Instant Demo Access (1-Click)
            </span>
            <span className="font-mono text-zinc-500 text-[10px]">Pre-configured Seeds</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className={`p-2 rounded-md border text-left transition-colors flex items-center justify-between group ${
                isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                  : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-900'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Admin / Dean</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">admin@university.edu</div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('faculty', 'faculty123')}
              className={`p-2 rounded-md border text-left transition-colors flex items-center justify-between group ${
                isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                  : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-900'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <User className="w-3.5 h-3.5 text-sky-500" />
                  <span>Faculty Member</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">faculty@university.edu</div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        }
        {/* Tab Toggle: Sign In vs Register */}
        <div className={`flex rounded-lg p-1 border ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
              mode === 'login'
                ? isDark
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Sign In with Existing Account
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
              mode === 'register'
                ? isDark
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Register New Account
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
            isDark ? 'bg-rose-950/60 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
            isDark ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Sign In Form */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Username or Institutional Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="admin or faculty@university.edu"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className={`w-full rounded-md py-2 px-3 text-xs border focus:outline-none ${inputBg}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Account Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className={`w-full rounded-md py-2 px-3 text-xs border focus:outline-none ${inputBg}`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 text-xs font-bold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 ${
                isDark
                  ? 'bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-50'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50'
              }`}
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Full Name with Title
              </label>
              <input
                type="text"
                required
                placeholder="Prof. Ananya Rao"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                className={`w-full rounded-md py-2 px-3 text-xs border focus:outline-none ${inputBg}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Institutional Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="ananya@university.edu"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className={`w-full rounded-md py-2 px-3 text-xs border focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="ananya_r"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className={`w-full rounded-md py-2 px-3 text-xs border focus:outline-none ${inputBg}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  required
                  value={regDept}
                  onChange={(e) => setRegDept(e.target.value)}
                  className={`w-full rounded-md py-2 px-3 text-xs border focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Institutional Role
                </label>
                <p className="text-xs py-2 text-zinc-500">Faculty · courses assigned by an administrator</p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Create Secure Password
              </label>
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className={`w-full rounded-md py-2 px-3 text-xs border focus:outline-none ${inputBg}`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 text-xs font-bold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 ${
                isDark
                  ? 'bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-50'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50'
              }`}
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
