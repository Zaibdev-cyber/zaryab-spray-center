/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  History, 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Truck, 
  Settings, 
  LogOut,
  Sprout,
  Users
} from "lucide-react";
import { UserRole } from "../types";

export type NavTab = 
  | "dashboard" 
  | "products" 
  | "billing" 
  | "stock" 
  | "suppliers" 
  | "reports" 
  | "settings" 
  | "logs"
  | "users";

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentUser: { id: string; username: string; name: string; role: UserRole };
  onLogout: () => void;
  shopName: string;
}

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout, shopName }: SidebarProps) {
  const menuItems = [
    { id: "dashboard" as NavTab, label: "Control Dashboard", icon: LayoutDashboard, roles: [UserRole.Admin, UserRole.Staff] },
    { id: "products" as NavTab, label: "Product Inventory", icon: Package, roles: [UserRole.Admin, UserRole.Staff] },
    { id: "billing" as NavTab, label: "POS billing", icon: ShoppingCart, roles: [UserRole.Admin, UserRole.Staff] },
    { id: "stock" as NavTab, label: "Stock Ledger In/Out", icon: TrendingUp, roles: [UserRole.Admin, UserRole.Staff] },
    { id: "suppliers" as NavTab, label: "Suppliers Index", icon: Truck, roles: [UserRole.Admin, UserRole.Staff] },
    { id: "reports" as NavTab, label: "Reports Module", icon: History, roles: [UserRole.Admin, UserRole.Staff] },
    { id: "logs" as NavTab, label: "Audit Log Trail", icon: History, roles: [UserRole.Admin] },
    { id: "users" as NavTab, label: "User Accounts", icon: Users, roles: [UserRole.Admin] },
  ];

  return (
    <aside className="w-66 bg-[#1B4332] text-white flex flex-col h-full shrink-0 font-sans border-r border-[#081C15]/15">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex items-center gap-3 bg-[#081C15]/20">
        <div className="p-2 bg-[#52B788] text-[#081C15] rounded-xl font-bold select-none">
          <Sprout className="w-5 h-5 text-[#081C15]" />
        </div>
        <div>
          <h2 className="text-sm font-black text-white tracking-tight truncate max-w-[150px] uppercase m-0">
            {shopName || "ZARYAB"}
          </h2>
          <span className="text-[9px] text-[#95D5B2] font-mono tracking-widest font-bold uppercase block mt-0.5">
            Spray Center
          </span>
        </div>
      </div>

      {/* Navigation Buttons */}
      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          // Verify role permissions
          if (!item.roles.includes(currentUser.role)) return null;

          const IconComponent = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-5 py-3 border-l-4 text-xs font-semibold tracking-wider uppercase transition-all duration-200 outline-none cursor-pointer ${
                isActive
                  ? "bg-white/15 border-[#52B788] text-white font-bold"
                  : "border-transparent text-white/75 hover:bg-white/10 hover:border-[#52B788]/60 hover:text-white"
              }`}
            >
              <IconComponent className={`w-4 h-4 shrink-0 transition-transform ${isActive ? "text-white scale-110" : "text-white/60"}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* System Settings (Admin Only shortcut) or General settings */}
      {currentUser.role === UserRole.Admin && (
        <div className="mb-2">
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-5 py-3 border-l-4 text-xs font-semibold tracking-wider uppercase transition-all duration-200 outline-none cursor-pointer ${
              activeTab === "settings"
                ? "bg-white/15 border-[#52B788] text-white font-bold"
                : "border-transparent text-white/75 hover:bg-white/10 hover:border-[#52B788]/60 hover:text-white"
            }`}
          >
            <Settings className={`w-4 h-4 shrink-0 ${activeTab === "settings" ? "text-white scale-110" : "text-white/60"}`} />
            <span>Store Settings</span>
          </button>
        </div>
      )}

      {/* Cashier Footer Profile */}
      <div className="p-5 bg-[#081C15] flex flex-col gap-3.5 mt-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#52B788] text-[#081C15] rounded-full flex items-center justify-center font-extrabold text-sm uppercase select-none shrink-0 shadow-inner">
            {currentUser.name ? currentUser.name.slice(0, 2) : "AD"}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-black text-white truncate m-0">
              {currentUser.name || "Admin User"}
            </h4>
            <span className="text-[10px] text-[#52B788] font-mono tracking-wider font-semibold uppercase flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-[#52B788] rounded-full inline-block animate-pulse"></span>
              {currentUser.role} online
            </span>
          </div>
        </div>

        {/* Exit Session Button */}
        <button
          onClick={onLogout}
          className="w-full py-2 bg-rose-500/15 hover:bg-rose-500 hover:text-white border border-rose-500/30 rounded-xl text-[11px] text-rose-350 font-bold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Session</span>
        </button>
      </div>
    </aside>
  );
}
