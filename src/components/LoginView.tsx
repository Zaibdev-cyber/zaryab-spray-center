/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Lock, User, ShieldCheck, Sprout, ShoppingBag } from "lucide-react";
import { UserRole } from "../types";

interface LoginViewProps {
  onLoginSuccess: (user: { id: string; username: string; name: string; role: UserRole }) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please fill in both fields.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || "Login attempt failed.");
        return;
      }

      const data = await res.json();
      onLoginSuccess(data.user);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the offline SQLite database server.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (userType: "admin" | "staff") => {
    setUsername(userType);
    setPassword(userType);
  };

  return (
    <div className="min-h-screen bg-[#F0F4F2] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e1e8e4_1px,transparent_1px),linear-gradient(to_bottom,#e1e8e4_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-70"></div>
      
      {/* Decorative Brand Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#95D5B2]/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#52B788]/15 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-white rounded-2xl border border-black/5 p-8 shadow-xl relative z-10">
        
        {/* Header and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-[#2D6A4F] to-[#1B4332] rounded-2xl shadow-md mb-4 hover:scale-105 transition-transform duration-300">
            <Sprout className="w-9 h-9 text-white stroke-[2]" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#1B4332] m-0">
            Zaryab Spray Center
          </h1>
          <p className="text-[10px] text-[#52B788] uppercase font-mono tracking-widest mt-1.5 font-extrabold">
            OFFLINE WORKSTATION • STOCK MANAGER
          </p>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <span className="font-bold shrink-0">Error:</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Operator Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <User className="w-4.5 h-4.5" />
              </span>
              <input
                id="login-username"
                type="text"
                placeholder="e.g. admin or staff"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#F8FAF9] border border-gray-300/60 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F]/20 transition-all font-medium"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Secure Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <Lock className="w-4.5 h-4.5" />
              </span>
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#F8FAF9] border border-gray-300/60 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F]/20 transition-all font-medium"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-600">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 bg-white text-[#2D6A4F] focus:ring-[#2D6A4F]"
              />
              Remember workstation
            </label>
            <span className="hover:underline hover:text-[#2D6A4F] cursor-pointer">Security Policy</span>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-[#2D6A4F] to-[#1B4332] hover:from-[#1B4332] hover:to-[#081C15] text-white font-extrabold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.99] mt-2 flex items-center justify-center gap-2 cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span>
            ) : (
              <>
                <ShieldCheck className="w-4.5 h-4.5 stroke-[2]" />
                Authenticate Operator
              </>
            )}
          </button>
        </form>

        {/* Preset Operator Logins For Convenience */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-center text-[10px] text-gray-400 mb-3 font-bold uppercase tracking-widest">
            Quick Station Access:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickLogin("admin")}
              className="py-2.5 px-3 bg-white hover:bg-[#F8FAF9] border border-gray-200 hover:border-[#2D6A4F]/40 rounded-xl text-xs text-gray-700 font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              disabled={loading}
            >
              <span className="w-2 h-2 bg-[#2D6A4F] rounded-full"></span>
              Admin Account
            </button>
            <button
              onClick={() => handleQuickLogin("staff")}
              className="py-2.5 px-3 bg-white hover:bg-[#F8FAF9] border border-gray-200 hover:border-[#2D6A4F]/40 rounded-xl text-xs text-gray-700 font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              disabled={loading}
            >
              <span className="w-2 h-2 bg-[#52B788] rounded-full"></span>
              Staff Account
            </button>
          </div>
        </div>

        {/* Footer Credit */}
        <p className="text-center text-[9px] text-gray-400 mt-6 tracking-wide font-medium">
          Offline secure sandbox transaction validation
        </p>

      </div>
    </div>
  );
}
