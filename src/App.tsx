/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useEffect, useState } from "react";
import { UserRole, ShopSettings, User } from "./types";

// Import modules
import LoginView from "./components/LoginView";
import Sidebar, { NavTab } from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import ProductView from "./components/ProductView";
import BillingView from "./components/BillingView";
import StockView from "./components/StockView";
import SupplierView from "./components/SupplierView";
import ReportView from "./components/ReportView";
import SettingsView from "./components/SettingsView";
import LogsView from "./components/LogsView";
import UserAccountsView from "./components/UserAccountsView";

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; name: string; role: UserRole } | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync state on load
  useEffect(() => {
    // 1. Restore local session if any
    const session = localStorage.getItem("zaryab_operator_session");
    if (session) {
      try {
        setCurrentUser(JSON.parse(session));
      } catch (e) {
        console.error("Failed to restore session keys:", e);
      }
    }

    // 2. Fetch business configuration settings
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          
          // Enable light/dark mode triggers
          if (data.themeMode === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
      } catch (err) {
        console.error("Settings handshake failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleLoginSuccess = (user: { id: string; username: string; name: string; role: UserRole }) => {
    setCurrentUser(user);
    localStorage.setItem("zaryab_operator_session", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("zaryab_operator_session");
    setActiveTab("dashboard");
  };

  const handleUpdateSettings = (newSettings: Partial<ShopSettings>) => {
    if (settings) {
      const merged = { ...settings, ...newSettings };
      setSettings(merged);
      
      if (merged.themeMode === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-sans gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-450">Booting Zaryab Spray Workstation...</p>
      </div>
    );
  }

  // Gateway screen
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Surrounding classes for responsive container
  const darkModeClass = settings?.themeMode === "dark" ? "dark bg-slate-950 text-white" : "bg-[#F0F4F2] text-[#1B4332]";

  return (
    <div className={`min-h-screen flex h-screen overflow-hidden font-sans select-none ${darkModeClass}`}>
      
      {/* Navigation sidebar Left */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        shopName={settings?.shopName || "Zaryab Spray Center"}
      />

      {/* Main operational view right */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === "dashboard" && (
          <DashboardView
            currencySymbol={settings?.currencySymbol || "Rs."}
            onNavigate={(target) => setActiveTab(target)}
            currentUserRole={currentUser.role}
          />
        )}
        {activeTab === "products" && (
          <ProductView
            currencySymbol={settings?.currencySymbol || "Rs."}
            currentUser={currentUser}
          />
        )}
        {activeTab === "billing" && (
          <BillingView
            currentUser={currentUser}
            currencySymbol={settings?.currencySymbol || "Rs."}
            shopSettings={settings!}
          />
        )}
        {activeTab === "stock" && (
          <StockView
            currentUser={currentUser}
            currencySymbol={settings?.currencySymbol || "Rs."}
          />
        )}
        {activeTab === "suppliers" && (
          <SupplierView
            currentUserRole={currentUser.role}
            currentUserId={currentUser.id}
          />
        )}
        {activeTab === "reports" && (
          <ReportView
            currencySymbol={settings?.currencySymbol || "Rs."}
          />
        )}
        {activeTab === "settings" && (
          <SettingsView
            currentUserRole={currentUser.role}
            currentUserId={currentUser.id}
            shopSettings={settings!}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
        {activeTab === "logs" && currentUser.role === UserRole.Admin && (
          <LogsView />
        )}
        {activeTab === "users" && currentUser.role === UserRole.Admin && (
          <UserAccountsView
            currentUserId={currentUser.id}
          />
        )}
      </main>

    </div>
  );
}
