/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  UserPlus, 
  X, 
  RefreshCw,
  Edit2,
  Trash2
} from "lucide-react";
import { User, UserRole } from "../types";

interface UserAccountsProps {
  currentUserId: string;
}

export default function UserAccountsView({ currentUserId }: UserAccountsProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Modal control states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>(UserRole.Staff);
  const [newPassword, setNewPassword] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Offline users directory unreachable.");
      const data = await res.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to synch workstation operator table.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newName.trim()) {
      setModalError("Please populate all variables properly.");
      return;
    }

    if (!editingUser && !newPassword.trim()) {
      setModalError("Please provide a password for the new workstation operator.");
      return;
    }

    const payload = {
      currentUserId: currentUserId,
      username: newUsername.trim(),
      name: newName.trim(),
      role: newRole,
      password: newPassword.trim() ? newPassword : undefined
    };

    try {
      setModalError(null);
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save rejected due to database checks.");
      }

      setIsModalOpen(false);
      setEditingUser(null);
      setNewUsername("");
      setNewName("");
      setNewPassword("");
      fetchUsers();
    } catch (err: any) {
      setModalError(err.message || "Failed to commit user.");
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete operator "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${id}?currentUserId=${currentUserId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete action rejected.");
      }

      // If the admin deleted someone, fetch user list
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Could not remove user account.");
    }
  };

  const handleToggleUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}/toggle`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentUserId: currentUserId })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Deactivation lock triggered.");
      }

      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Could not change status of operator terminal.");
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  });

  if (loading && users.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400 bg-slate-900/10 font-sans">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono uppercase tracking-wider mt-2 font-bold">Summoning active operators...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-150 font-sans h-full flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-slate-800 pb-5 border-slate-200 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Workstation Operator Accounts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            Define system operator profiles and authorize staff to complete farmer retail cash sales in the database.
          </p>
        </div>

        <button
          onClick={() => {
            setModalError(null);
            setEditingUser(null);
            setNewUsername("");
            setNewName("");
            setNewPassword("");
            setNewRole(UserRole.Staff);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black tracking-wide rounded-xl shadow-lg hover:shadow-emerald-950/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <UserPlus className="w-4.5 h-4.5 stroke-[3] text-slate-950" />
          + Authorize New Employee
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm rounded-2xl flex items-center gap-3">
          <span className="font-bold">Error:</span>
          <span>{error}</span>
        </div>
      )}

      {/* Filter and stats table */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm shrink-0">
        <div className="relative w-full max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="operator-accounts-search"
            type="text"
            placeholder="Search representative name, login username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="text-xs font-bold text-slate-500 dark:text-slate-450 font-mono">
          Authorized Accounts: {users.length} logins
        </div>
      </div>

      {/* Grid mapping employee panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 shrink-0">
        {filteredUsers.length === 0 ? (
          <p className="col-span-full p-8 text-center text-slate-400 italic">No operators mapped to this specific query parameters.</p>
        ) : (
          filteredUsers.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <div key={u.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center font-bold text-slate-700 dark:text-emerald-400 text-sm select-none">
                      {u.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-mono font-bold text-slate-400 block">{u.id}</span>
                      <h4 className="font-extrabold text-slate-800 dark:text-white text-xs truncate">{u.name}</h4>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase select-none ${
                    u.role === UserRole.Admin 
                      ? "bg-purple-150 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border border-purple-500/20" 
                      : "bg-blue-150 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border border-blue-500/20"
                  }`}>
                    {u.role}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-semibold text-slate-500 dark:text-slate-300">
                  <div className="flex justify-between items-center">
                    <span>Workstation Username ID:</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-emerald-450">{u.username}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Account Key status:</span>
                    {u.active ? (
                      <span className="text-emerald-500 inline-flex items-center gap-1 font-bold"><ShieldCheck className="w-3.5 h-3.5" /> AUTHORIZED</span>
                    ) : (
                      <span className="text-rose-500 inline-flex items-center gap-1 font-bold"><ShieldAlert className="w-3.5 h-3.5" /> DISABLED</span>
                    )}
                  </div>
                </div>

                {/* Card control footer (Edit, Toggle, Delete) */}
                <div className="pt-3 border-t dark:border-slate-805 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUser(u);
                        setNewName(u.name);
                        setNewUsername(u.username);
                        setNewRole(u.role);
                        setNewPassword(""); // Empty means keep current
                        setModalError(null);
                        setIsModalOpen(true);
                      }}
                      className="p-2 border border-gray-200 dark:border-slate-800 hover:border-emerald-500/50 text-gray-600 dark:text-slate-400 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                      title="Edit Operator Profile Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="p-2 border border-rose-100 hover:border-rose-300 dark:border-slate-800 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer"
                        title="Delete Operator Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {isSelf ? (
                    <span className="text-[10px] text-gray-400 italic">Current Session</span>
                  ) : (
                    <button
                      onClick={() => handleToggleUser(u.id)}
                      className={`px-3 py-1.5 font-bold text-xs rounded-xl border transition-all cursor-pointer ${
                        u.active 
                          ? "hover:bg-rose-50 border-rose-200 hover:border-rose-300 text-rose-500" 
                          : "hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 text-emerald-500"
                      }`}
                    >
                      {u.active ? "Revoke Access" : "Grant Access"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT OPERATOR DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-extrabold text-xs uppercase tracking-wide flex items-center gap-1.5 text-white">
                <UserPlus className="w-5 h-5 text-emerald-500" />
                {editingUser ? "Edit Workstation Operator details" : "Authorize Employee Terminal Access"}
              </h3>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingUser(null);
                }} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                  {modalError}
                </div>
              )}

              {/* Rep name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Employee Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kaswar Saleem"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Login username */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Login Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. kaswar_spray"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> {editingUser ? "Change Password" : "Account Entry Password *"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder={editingUser ? "Leave blank to keep current" : "Enter login password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                />
                {editingUser && (
                  <span className="text-[10px] text-slate-450 block mt-1 hover:text-slate-500">
                    Leave blank to preserve current login password.
                  </span>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Workstation Assignment Rights *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value={UserRole.Staff}>Staff (Counter Billing & Stock arrivals)</option>
                  <option value={UserRole.Admin}>Admin (Full credentials, settings & user lists)</option>
                </select>
              </div>

              {/* Buttons footer */}
              <div className="pt-4 border-t dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {editingUser ? "Save Changes" : "Authorize Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
