/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  Package, 
  Layers, 
  Boxes, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  AlertOctagon,
  CalendarCheck,
  Coins,
  ArrowRight,
  ShoppingCart
} from "lucide-react";
import { Product, Sale, UserRole } from "../types";

interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalStockQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValue: number;
  todaySales: number;
  monthlySales: number;
  recentSales: Sale[];
  lowStockItems: Product[];
  outOfStockItems: Product[];
  expiringSoonItems: Product[];
  expiredItems: Product[];
}

interface DashboardViewProps {
  currencySymbol: string;
  onNavigate: (tab: "products" | "stock" | "billing" | "reports") => void;
  currentUserRole: UserRole;
}

export default function DashboardView({ currencySymbol, onNavigate, currentUserRole }: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) throw new Error("Failed to load live database ledger summary");
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Unable to sync dashboard stats. Is database server offline?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-950/20 text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono font-bold uppercase tracking-wider">Compiling Local Ledger Data...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-1 p-8 bg-slate-950/10 text-rose-300">
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl max-w-lg mx-auto">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" /> Database Link Broken
          </h3>
          <p className="text-sm mb-4">{error || "Data sync error."}</p>
          <button 
            onClick={fetchStats}
            className="px-4 py-2 bg-rose-600 font-semibold text-slate-950 rounded-xl hover:bg-rose-500 transition-colors"
          >
            Retry Database Handshake
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-brand-bg dark:bg-slate-950 transition-colors font-sans duration-150">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-slate-800 pb-5 border-[#e1e8e4]">
        <div>
          <h1 className="text-2xl font-black text-[#1B4332] dark:text-white uppercase tracking-tight">
            Inventory & Sales Ledger Dashboard
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 bg-[#52B788] rounded-full inline-block animate-pulse"></span>
            Offline database connected and actively monitoring {stats.totalProducts} catalog listings.
          </p>
        </div>
        
        {/* Rapid Actions Shortcuts */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate("billing")}
            className="px-4 py-2.5 bg-gradient-to-r from-[#2D6A4F] to-[#1B4332] hover:from-[#1B4332] hover:to-[#081C15] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-white" />
            + New Sales Invoice
          </button>
          
          <button
            onClick={() => onNavigate("stock")}
            className="px-4 py-2.5 border border-gray-300/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#F8FAF9] dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Boxes className="w-4 h-4 text-[#2D6A4F]" />
            Replenish Stock
          </button>
        </div>
      </div>

      {/* KPI Stats Board */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Products */}
        <div className="p-5 card-polish dark:bg-slate-900 dark:border-slate-800 flex items-center gap-4 hover:scale-[1.01]">
          <div className="p-3 bg-[#52B788]/10 text-[#2D6A4F] rounded-xl select-none">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Total Products</span>
            <h3 className="metric-val-polish dark:text-white m-0 leading-none mt-1">
              {stats.totalProducts}
            </h3>
            <span className="text-[10px] text-gray-400 mt-1 block font-medium">In {stats.totalCategories} Categories</span>
          </div>
        </div>

        {/* Total Stock Quantity */}
        <div className="p-5 card-polish dark:bg-slate-900 dark:border-slate-800 flex items-center gap-4 hover:scale-[1.01]">
          <div className="p-3 bg-[#2D6A4F]/10 text-[#2D6A4F] dark:text-[#52B788] rounded-xl select-none">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Total Stock Units</span>
            <h3 className="metric-val-polish dark:text-white m-0 leading-none mt-1">
              {stats.totalStockQuantity}
            </h3>
            <span className="text-[10px] text-[#2D6A4F] dark:text-[#52B788] mt-1 block font-bold hover:underline cursor-pointer" onClick={() => onNavigate("products")}>
              View physical counts
            </span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className={`p-5 card-polish flex items-center gap-4 hover:scale-[1.01] ${
          stats.lowStockCount > 0 
            ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400" 
            : "dark:bg-slate-900 dark:border-slate-800"
        }`}>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl select-none">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Low Stock Alerts</span>
            <h3 className="metric-val-polish dark:text-white m-0 leading-none mt-1">
              {stats.lowStockCount}
            </h3>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block font-bold hover:underline cursor-pointer" onClick={() => onNavigate("products")}>
              Replenish needed
            </span>
          </div>
        </div>

        {/* Out of Stock */}
        <div className={`p-5 card-polish flex items-center gap-4 hover:scale-[1.01] ${
          stats.outOfStockCount > 0 
            ? "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400" 
            : "dark:bg-slate-900 dark:border-slate-800"
        }`}>
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl select-none">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Out of Stock Items</span>
            <h3 className="metric-val-polish dark:text-white m-0 leading-none mt-1">
              {stats.outOfStockCount}
            </h3>
            <span className="text-[10px] text-rose-600 dark:text-rose-450 mt-1 block font-bold hover:underline cursor-pointer" onClick={() => onNavigate("products")}>
              Reorder stock
            </span>
          </div>
        </div>
      </div>

      {/* Financial Valuation and Cash KPI widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Estimated Value */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#2D6A4F] to-[#1B4332] text-white border-0 shadow-md flex flex-col justify-between h-36 hover:scale-[1.01] transition-transform duration-250">
          <div className="flex items-start justify-between">
            <div className="p-2 bg-white/10 rounded-lg text-[#95D5B2]">
              <Coins className="w-5 h-5" />
            </div>
            <span className="text-[10px] uppercase font-bold text-[#95D5B2] tracking-wider">Inventory Cost Value</span>
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight text-white m-0">
              {currencySymbol} {stats.totalInventoryValue.toLocaleString()}
            </h3>
            <p className="text-[10px] text-[#95D5B2] mt-1 m-0">
              Current investment stored in pesticide & seed stocks.
            </p>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="p-5 card-polish dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between h-36 hover:scale-[1.01]">
          <div className="flex items-start justify-between">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-[#2D6A4F] dark:text-emerald-400">
              <TrendingUp className="w-5 h-5 font-bold" />
            </div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Today's Total Sales</span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-[#1B4332] dark:text-emerald-400 tracking-tight m-0">
              {currencySymbol} {stats.todaySales.toLocaleString()}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1 m-0">
              Consolidated cash received today.
            </p>
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="p-5 card-polish dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between h-36 hover:scale-[1.01]">
          <div className="flex items-start justify-between">
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-600 dark:text-teal-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Monthly Invoice Volume</span>
          </div>
          <div>
            <h3 className="text-2xl font-black text-[#1B4332] dark:text-teal-400 tracking-tight m-0">
              {currencySymbol} {stats.monthlySales.toLocaleString()}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1 m-0">
              Current calendar month invoice volume.
            </p>
          </div>
        </div>
      </div>

      {/* alerts Section: Low Stock & Expiry Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Warnings Box for Low Stock / Expired */}
        <div className="p-5 card-polish dark:bg-slate-900 dark:border-slate-800 space-y-4 hover:scale-[1.01]">
          <h3 className="text-sm font-bold text-[#1B4332] dark:text-slate-200 border-b pb-2 flex items-center gap-2 border-gray-100 dark:border-slate-800">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            STOCK CRITICAL REORDERS
          </h3>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {stats.lowStockItems.length === 0 && stats.outOfStockItems.length === 0 && (
              <p className="text-xs text-gray-500 py-6 text-center italic mt-2">All inventory levels conform to safe healthy thresholds.</p>
            )}

            {/* Out of Stock */}
            {stats.outOfStockItems.map((item) => (
              <div key={item.id} className="p-3 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between gap-4 text-xs">
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-rose-100">{item.name}</h4>
                  <div className="flex items-center gap-2 text-slate-400 mt-1 text-[10px] font-mono">
                    <span>Category: {item.category}</span>
                    <span>•</span>
                    <span>Item Code: {item.id}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-2 py-0.5 bg-rose-500 text-white font-black text-[9px] uppercase tracking-wider rounded">OUT OF STOCK</span>
                  <button 
                    onClick={() => onNavigate("stock")}
                    className="block text-[10px] text-rose-500 font-bold hover:underline mt-1 cursor-pointer"
                  >
                    Order Stock →
                  </button>
                </div>
              </div>
            ))}

            {/* Low Stock Alerts */}
            {stats.lowStockItems.map((item) => (
              <div key={item.id} className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-amber-100">{item.name}</h4>
                  <div className="flex items-center gap-2 text-slate-400 mt-1 text-[10px] font-mono">
                    <span>Brand: {item.brand}</span>
                    <span>•</span>
                    <span>Item Code: {item.id}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-black font-mono text-amber-600 dark:text-amber-300 mr-2 text-xs">Only {item.quantity} {item.unit} left</span>
                  <button 
                    onClick={() => onNavigate("stock")}
                    className="block text-[10px] text-[#2D6A4F] dark:text-amber-300 font-bold hover:underline mt-1 cursor-pointer"
                  >
                    Replenish →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warnings Box for Chemical expiry */}
        <div className="p-5 card-polish dark:bg-slate-900 dark:border-slate-800 space-y-4 hover:scale-[1.01]">
          <h3 className="text-sm font-bold text-[#1B4332] dark:text-slate-200 border-b pb-2 flex items-center gap-2 border-gray-100 dark:border-slate-800">
            <CalendarCheck className="w-4 h-4 text-rose-500" />
            CRITICAL EXPIRY WATCHLIST
          </h3>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {stats.expiredItems.length === 0 && stats.expiringSoonItems.length === 0 && (
              <p className="text-xs text-gray-500 py-6 text-center italic mt-2">No spray chemical batches are expiring within the next 6 months.</p>
            )}

            {/* Expired Products */}
            {stats.expiredItems.map((item) => (
              <div key={item.id} className="p-3 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between gap-4 text-xs">
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-rose-100">{item.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono m-0">Batch: {item.batchNumber} • Expiry: <span className="text-rose-500 font-bold">{item.expiryDate}</span></p>
                </div>
                <span className="px-2 py-0.5 bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider rounded select-none shrink-0">
                  EXPIRED
                </span>
              </div>
            ))}

            {/* Expiring Soon */}
            {stats.expiringSoonItems.map((item) => (
              <div key={item.id} className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">{item.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono m-0">Batch: {item.batchNumber} • Expiry Alert: <span className="text-amber-600 font-extrabold">{item.expiryDate}</span></p>
                </div>
                <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded select-none shrink-0">
                  EXPIRING SOON
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Recent Invoices Table list */}
      <div className="p-5 card-polish dark:bg-slate-900 dark:border-slate-800 space-y-4 hover:scale-[1.005]">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-black text-[#1B4332] dark:text-white uppercase tracking-tight m-0">
            RECENT COMPLETED BILLING SALES
          </h3>
          <button 
            onClick={() => onNavigate("reports")}
            className="text-xs text-[#2D6A4F] dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            Audit detailed metrics ledger <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="table-header-polish dark:bg-slate-800 text-gray-500 dark:text-slate-400 font-mono tracking-wider">
                <th className="p-3.5 font-bold">Invoice Ref</th>
                <th className="p-3.5 font-bold">Date & Time</th>
                <th className="p-3.5 font-bold">Farmer Name</th>
                <th className="p-3.5 font-bold">Operator / Cashier</th>
                <th className="p-3.5 font-bold">Subtotal</th>
                <th className="p-3.5 font-bold text-right">Sale total</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 italic">No historical invoices detected in current database registry.</td>
                </tr>
              ) : (
                stats.recentSales.map((sale) => (
                  <tr key={sale.id} className="border-b dark:border-slate-800 border-gray-100 hover:bg-[#F8FAF9] dark:hover:bg-slate-800/50">
                    <td className="p-3.5 font-bold text-[#2D6A4F] dark:text-emerald-400 font-mono">
                      {sale.invoiceNumber}
                    </td>
                    <td className="p-3.5 text-gray-400">
                      {new Date(sale.date).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-bold text-[#1B4332] dark:text-slate-200">
                      {sale.customerName}
                    </td>
                    <td className="p-3.5 text-gray-500">
                      {sale.cashierName}
                    </td>
                    <td className="p-3.5 font-mono text-gray-400">
                      {currencySymbol} {sale.subtotal.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-black font-mono text-[#2D6A4F] dark:text-emerald-400">
                      {currencySymbol} {sale.grandTotal.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
