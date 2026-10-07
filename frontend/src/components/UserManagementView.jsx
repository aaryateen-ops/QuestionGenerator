import React, { useState, useEffect } from 'react';
import { Shield, User, UserPlus, CheckCircle2, AlertCircle, RefreshCw, Lock, Mail, Building, Check, X, ShieldAlert } from 'lucide-react';
import { api } from '../api/client';

export default function UserManagementView({ currentUser, theme }) {
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm';
  const subBg = isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900';
  const inputBg = isDark
    ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500'
    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // New User Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDept, setNewDept] = useState('Computer Science & Engineering');
  const [newRole, setNewRole] = useState('FACULTY');
  const [creating, setCreating] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  const fetchUsers = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch user list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [isAdmin]);

  const handleToggleStatus = async (user) => {
    try {
      const updated = await api.updateUserStatus(user.id, {
        is_active: !user.is_active,
      });
      setUsers(users.map((u) => (u.id === user.id ? updated : u)));
      setSuccess(`Account status for ${user.full_name} updated successfully.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update user status.');
    }
  };

  const handleToggleRole = async (user) => {
    const nextRole = user.role === 'ADMIN' ? 'FACULTY' : 'ADMIN';
    try {
      const updated = await api.updateUserStatus(user.id, {
        role: nextRole,
      });
      setUsers(users.map((u) => (u.id === user.id ? updated : u)));
      setSuccess(`Role for ${user.full_name} changed to ${nextRole}.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update user role.');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.register({
        full_name: newFullName,
        email: newEmail,
        username: newUsername,
        password: newPassword,
        department: newDept,
        role: newRole,
      });
      setShowAddModal(false);
      setNewFullName('');
      setNewEmail('');
      setNewUsername('');
      setNewPassword('');
      setSuccess('New institutional account provisioned successfully.');
      setTimeout(() => setSuccess(null), 3000);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setCreating(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className={`${cardBg} border rounded-lg p-12 text-center space-y-3`}>
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold">Administrator Access Required</h2>
        <p className="text-xs text-zinc-500 max-w-md mx-auto">
          The User Management module is restricted to Academic Administrators and Examination Controllers.
          Please switch to an Administrator account to manage institutional credentials.
        </p>
      </div>
    );
  }

  const facultyCount = users.filter((u) => u.role === 'FACULTY').length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const activeCount = users.filter((u) => u.is_active).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className={`${cardBg} border rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-zinc-400" />
            <h2 className="text-base font-bold tracking-tight">Institutional User & Faculty Management</h2>
          </div>
          <p className="text-xs text-zinc-500">
            Provision faculty accounts, manage role permissions, and control exam creation authorization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className={`p-2 rounded-md border text-xs transition-colors ${
              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
            }`}
            title="Refresh user list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md shadow-sm transition-colors ${
              isDark ? 'bg-zinc-100 text-zinc-950 hover:bg-white font-bold' : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Account
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`${cardBg} border rounded-lg p-4`}>
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
            Total Authorized Users
          </span>
          <div className="text-2xl font-bold font-mono mt-1">{users.length}</div>
          <span className="text-[10px] text-emerald-500 font-mono mt-0.5 block">
            {activeCount} Active Sessions
          </span>
        </div>

        <div className={`${cardBg} border rounded-lg p-4`}>
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
            Faculty Members
          </span>
          <div className="text-2xl font-bold font-mono mt-1 text-sky-500">{facultyCount}</div>
          <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
            Question & Paper Creators
          </span>
        </div>

        <div className={`${cardBg} border rounded-lg p-4`}>
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
            Administrators
          </span>
          <div className="text-2xl font-bold font-mono mt-1 text-emerald-500">{adminCount}</div>
          <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
            Academic Controllers & Deans
          </span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className={`p-4 rounded-lg border text-xs flex items-center gap-2 ${
          isDark ? 'bg-rose-950/60 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-800'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className={`p-4 rounded-lg border text-xs flex items-center gap-2 ${
          isDark ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Users Table */}
      <div className={`${cardBg} border rounded-lg overflow-hidden shadow-sm`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[11px] font-semibold text-zinc-400 uppercase tracking-wider ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <tr>
                <th className="p-3 pl-4">User</th>
                <th className="p-3">Department</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
                <th className="p-3 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-zinc-800/80' : 'divide-zinc-200'}`}>
              {users.map((u) => {
                const isCurrent = currentUser?.id === u.id;

                return (
                  <tr key={u.id} className={isDark ? 'hover:bg-zinc-800/30' : 'hover:bg-zinc-50'}>
                    <td className="p-3 pl-4">
                      <div className="font-bold flex items-center gap-2">
                        <span>{u.full_name}</span>
                        {isCurrent && (
                          <span className={`text-[9px] font-mono px-1 rounded border ${
                            isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-200 text-zinc-700 border-zinc-300'
                          }`}>
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        {u.email} • @{u.username}
                      </div>
                    </td>

                    <td className="p-3 text-zinc-400 font-medium">
                      {u.department || 'General Administration'}
                    </td>

                    <td className="p-3">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        u.role === 'ADMIN'
                          ? isDark ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : isDark ? 'bg-sky-950/80 text-sky-400 border-sky-800' : 'bg-sky-50 text-sky-700 border-sky-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                        u.is_active
                          ? isDark ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isDark ? 'bg-zinc-900 text-zinc-500 border-zinc-800' : 'bg-zinc-100 text-zinc-500 border-zinc-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="p-3 font-mono text-[11px] text-zinc-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>

                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleRole(u)}
                          disabled={isCurrent}
                          className={`text-[10px] font-medium px-2 py-1 rounded border transition-colors ${
                            isCurrent
                              ? 'opacity-40 cursor-not-allowed'
                              : isDark
                                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                          }`}
                          title={`Change role to ${u.role === 'ADMIN' ? 'FACULTY' : 'ADMIN'}`}
                        >
                          Change Role
                        </button>

                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isCurrent}
                          className={`text-[10px] font-medium px-2 py-1 rounded border transition-colors ${
                            isCurrent
                              ? 'opacity-40 cursor-not-allowed'
                              : u.is_active
                                ? isDark ? 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border-rose-800' : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300'
                                : isDark ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-800' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`${cardBg} border rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-zinc-400" />
                Provision Institutional User
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Full Name with Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="Prof. Meenakshi Sundaram"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className={`w-full rounded-md py-2 px-3 text-xs border focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="meenakshi@university.edu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
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
                  placeholder="meenakshi_s"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className={`w-full rounded-md py-2 px-3 text-xs border focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full rounded-md py-2 px-3 text-xs border focus:outline-none ${inputBg}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    required
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className={`w-full rounded-md py-2 px-3 text-xs border focus:outline-none ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className={`w-full rounded-md py-2 px-3 text-xs border focus:outline-none ${inputBg}`}
                  >
                    <option value="FACULTY">Faculty</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              </div>

              <div className={`flex justify-end gap-2 pt-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
                    isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md shadow-sm transition-colors ${
                    isDark ? 'bg-zinc-100 text-zinc-950 hover:bg-white' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
                >
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
