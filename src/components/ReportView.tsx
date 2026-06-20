/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  History, 
  Calendar, 
  BarChart2, 
  FileCheck, 
  TrendingUp, 
  DollarSign, 
  Boxes, 
  AlertOctagon,
  Printer,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { Sale, Product, Supplier, UserRole } from "../types";

interface ReportStats {
  salesList: Sale[];
  productsList: Product[];
  suppliersList: Supplier[];
  totalValue: number;
}

interface ReportViewProps {
  currencySymbol: string;
}

export default function ReportView({ currencySymbol }: ReportViewProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active report scope
  const [activeReportTab, setActiveReportTab] = useState<"sales" | "inventory" | "expired" | "suppliers">("sales");
  const [timePeriod, setTimePeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  const syncStats = async () => {
    try {
      setLoading(true);
      const [sRes, pRes, suRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/products"),
        fetch("/api/suppliers")
      ]);

      if (!sRes.ok || !pRes.ok || !suRes.ok) throw new Error("Offline communication link broke.");

      const sData = await sRes.json();
      const pData = await pRes.json();
      const suData = await suRes.json();

      setSales(sData);
      setProducts(pData);
      setSuppliers(suData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to compile structured report files.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncStats();
  }, []);

  // Compute Sales relative to selected period
  const getPeriodSales = () => {
    const today = new Date().toISOString().split("T")[0];
    const todayDate = new Date();
    
    return sales.filter((item) => {
      const itemDate = new Date(item.date);
      const itemDateStr = item.date.split("T")[0];

      if (timePeriod === "daily") {
        return itemDateStr === today;
      } else if (timePeriod === "weekly") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return itemDate >= oneWeekAgo && itemDate <= todayDate;
      } else if (timePeriod === "monthly") {
        // match year & month strings
        return itemDateStr.substring(0, 7) === today.substring(0, 7);
      }
      return true;
    });
  };

  const periodSales = getPeriodSales();
  const salesAggregateTotal = periodSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const salesAggregateSubtotal = periodSales.reduce((acc, s) => acc + s.subtotal, 0);
  const salesAggregateDiscounts = periodSales.reduce((acc, s) => acc + s.discount, 0);

  // Inventory analysis math
  const lowStockThreshold = 10;
  const lowStockItems = products.filter((p) => p.quantity > 0 && p.quantity <= lowStockThreshold);
  const outOfStockItems = products.filter((p) => p.quantity === 0);
  const totalValuation = products.reduce((acc, p) => acc + (p.purchasePrice * p.quantity), 0);
  const totalRetailValuation = products.reduce((acc, p) => acc + (p.salePrice * p.quantity), 0);

  // Expired products analytics
  const todayStr = new Date().toISOString().split("T")[0];
  const expiredItems = products.filter((p) => p.expiryDate && p.expiryDate < todayStr);

  const sixMonthsAlert = new Date();
  sixMonthsAlert.setMonth(sixMonthsAlert.getMonth() + 6);
  const sixMonthsStr = sixMonthsAlert.toISOString().split("T")[0];
  const expiringSoonItems = products.filter((p) => p.expiryDate && p.expiryDate >= todayStr && p.expiryDate <= sixMonthsStr);

  const handleTriggerReportPrint = () => {
    const printArea = document.getElementById("report-data-printable-scope");
    if (!printArea) return;

    const originalHTML = document.body.innerHTML;
    document.body.innerHTML = `
      <div style="font-family: sans-serif; padding: 40px; color: black;">
        <h2 style="text-align: center; font-size: 20px; text-transform: uppercase;">Zaryab Spray Center - Agricultural Metrics Report</h2>
        <p style="text-align: center; font-size: 11px; margin-bottom: 20px;">Compiled Date: ${new Date().toLocaleString()}</p>
        <hr/>
        ${printArea.innerHTML}
      </div>
    `;
    window.print();
    window.location.reload();
  };

  if (loading && sales.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400 bg-slate-900/10">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono uppercase tracking-wider mt-2">Compiling administrative accounting reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-150 font-sans h-full flex flex-col">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-slate-800 pb-5 border-slate-200 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Workstation Reports Terminals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            Evaluate pesticide profit sheets, current investment value, expiring product alerts, and supplier stats.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={syncStats}
            className="p-2.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
            title="Refresh database entries"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleTriggerReportPrint}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4.5 h-4.5 text-white" />
            Print Custom Report Layout (LPT)
          </button>
        </div>
      </div>

      {/* Scope Toggles Tabs layout */}
      <div className="flex flex-wrap gap-2 shrink-0">
        <button
          onClick={() => setActiveReportTab("sales")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all tracking-wide ${
            activeReportTab === "sales" 
              ? "bg-emerald-600 text-slate-950 shadow" 
              : "border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          }`}
        >
          Sales & Cash Sheets
        </button>
        <button
          onClick={() => setActiveReportTab("inventory")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all tracking-wide ${
            activeReportTab === "inventory" 
              ? "bg-emerald-600 text-slate-950 shadow" 
              : "border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          }`}
        >
          Valuation & Reorders
        </button>
        <button
          onClick={() => setActiveReportTab("expired")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all tracking-wide ${
            activeReportTab === "expired" 
              ? "bg-emerald-600 text-slate-950 shadow" 
              : "border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          }`}
        >
          Chemical Expiry Watch
        </button>
      </div>

      {/* MAIN REPORT SCOPE WRAPPER */}
      <div id="report-data-printable-scope" className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm overflow-y-auto">
        
        {/* VIEW 1: Sales Sheet Scope */}
        {activeReportTab === "sales" && (
          <div className="space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b dark:border-slate-800 pb-3 gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                  <BarChart2 className="w-5 h-5 text-emerald-500" />
                  Sales Volume & Cash Receipts Sheet
                </h3>
                <span className="text-[10px] text-slate-400 block mt-1 tracking-wider uppercase font-mono">Filter time scale parameters:</span>
              </div>

              {/* Time scales daily, weekly, monthly */}
              <div className="flex items-center bg-slate-105 dark:bg-slate-950 p-1.5 rounded-xl border dark:border-slate-805 gap-1">
                {(["daily", "weekly", "monthly"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`px-3 py-1 text-[11px] font-bold uppercase rounded-lg transition-all ${
                      timePeriod === period 
                        ? "bg-slate-900 dark:bg-slate-800 text-white" 
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* Sales aggregators cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Total Invoice Value</span>
                  <p className="text-sm font-extrabold font-mono text-slate-850 dark:text-slate-100">{currencySymbol} {salesAggregateSubtotal.toLocaleString()}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Discounts Conceded</span>
                  <p className="text-sm font-extrabold font-mono text-rose-550 dark:text-rose-450">- {currencySymbol} {salesAggregateDiscounts.toLocaleString()}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-emerald-500">Gross Sales Volume</span>
                  <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">{currencySymbol} {salesAggregateTotal.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Period sales log listing table */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase font-mono tracking-wider">
                COMPRESSED INVOICES LEDGER ({timePeriod.toUpperCase()} SCOPE)
              </h4>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono border-b dark:border-slate-805">
                      <th className="p-3 font-semibold">Ref Invoice No.</th>
                      <th className="p-3 font-semibold">Arrival Date</th>
                      <th className="p-3 font-semibold">Farmer Recipient</th>
                      <th className="p-3 font-semibold text-right">Items Units Count</th>
                      <th className="p-3 font-semibold text-right">Invoice gross</th>
                      <th className="p-3 font-semibold text-right">Invoice net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodSales.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400 italic">No sales invoiced during selected parameter threshold.</td>
                      </tr>
                    ) : (
                      periodSales.map((s) => (
                        <tr key={s.id} className="border-b dark:border-slate-805 border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                          <td className="p-3 font-mono font-bold text-emerald-650 dark:text-emerald-400">{s.invoiceNumber}</td>
                          <td className="p-3 text-slate-400 whitespace-nowrap">{new Date(s.date).toLocaleString()}</td>
                          <td className="p-3 font-bold text-slate-700 dark:text-slate-100">{s.customerName}</td>
                          <td className="p-3 text-right font-mono text-slate-500">{s.items.reduce((acc, i) => acc + i.quantity, 0)} Units</td>
                          <td className="p-3 text-right font-mono text-slate-400">{currencySymbol} {s.subtotal.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-black text-slate-800 dark:text-slate-200">{currencySymbol} {s.grandTotal.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Inventory Valuation & Reorder Sheets */}
        {activeReportTab === "inventory" && (
          <div className="space-y-6">
            <div className="border-b dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                <Boxes className="w-5 h-5 text-emerald-500" />
                Capital Investment & Low Stock Levels sheet
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Estimations are aggregated from current cost parameters multiplied by physical shelf items.</p>
            </div>

            {/* Aggregator widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Cost Capital Bound Up</span>
                <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-150 block mt-1">{currencySymbol} {totalValuation.toLocaleString()}</span>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Predicted Retail Yields</span>
                <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 block mt-1">{currencySymbol} {totalRetailValuation.toLocaleString()}</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl">
                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wide block">Low Stock products</span>
                <span className="text-sm font-black font-mono text-amber-500 block mt-1">{lowStockItems.length} Products</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl">
                <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wide block">Totally Out of Stock</span>
                <span className="text-sm font-black font-mono text-rose-500 block mt-1">{outOfStockItems.length} Products</span>
              </div>
            </div>

            {/* List for REORDERS items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              
              {/* Out of Stock Block */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase font-mono tracking-wider flex items-center gap-1.5 border-b dark:border-slate-805 pb-1">
                  <AlertOctagon className="w-4.5 h-4.5" /> REORDER TO RUN: OUT OF STOCK [REALLOCATE CAPITAL]
                </h4>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {outOfStockItems.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center italic">Excellent! There are no out of stock products in catalog memory registry.</p>
                  ) : (
                    outOfStockItems.map((item) => (
                      <div key={item.id} className="p-3 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 rounded-xl flex justify-between gap-4 text-xs">
                        <div>
                          <span className="font-extrabold text-slate-800 dark:text-rose-100">{item.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono block mt-0.5">Code barcode keys: {item.id} • Brand: {item.brand}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-rose-500 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded h-max shrink-0">OUT</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Low Stock Block */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-amber-500 uppercase font-mono tracking-wider flex items-center gap-1.5 border-b dark:border-slate-805 pb-1">
                  <Boxes className="w-4.5 h-4.5" /> CRITICAL REORDER LISTS: LOW STOCK CHANNELS
                </h4>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {lowStockItems.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center italic">All pesticide stocks are high; no urgent reorder threshold alerts.</p>
                  ) : (
                    lowStockItems.map((item) => (
                      <div key={item.id} className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 rounded-xl flex justify-between gap-4 text-xs font-semibold">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-amber-100">{item.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono block mt-0.5">Barcode: {item.id} • Unit format: {item.unit}</span>
                        </div>
                        <span className="font-mono text-amber-500 dark:text-amber-200">Only {item.quantity} Left</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 3: Expiration Analysis Report */}
        {activeReportTab === "expired" && (
          <div className="space-y-6">
            <div className="border-b dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                <AlertOctagon className="w-5 h-5 text-rose-500" />
                Pesticide Chemical Lifetime Expiration sheet
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Chemicals past expiration must be isolated and returned to supplier for refunds.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Expired Spray cans section */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-rose-600 dark:text-rose-450 uppercase font-mono tracking-wider border-b dark:border-slate-805 pb-1">
                  ❌ PAST EXPIRATION: DISCHARGE CRITICAL ACTION
                </h4>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {expiredItems.length === 0 ? (
                    <p className="text-xs text-slate-500 py-8 text-center italic">Fantastic! No chemical batches have exceeded their expiration thresholds.</p>
                  ) : (
                    expiredItems.map((item) => (
                      <div key={item.id} className="p-3 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-xl flex justify-between gap-4 text-xs">
                        <div>
                          <span className="font-extrabold text-slate-800 dark:text-rose-100">{item.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono block mt-0.5">Batch index: {item.batchNumber} • Code serial: {item.id}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-rose-500 font-black font-mono block">{item.expiryDate}</span>
                          <span className="text-[8px] tracking-wide font-black uppercase text-rose-500">EXPIRED</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Expiring soon */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-amber-500 uppercase font-mono tracking-wider border-b dark:border-slate-805 pb-1">
                  ⚠️ IMMINENT EXPIRATION: SELL PROMPTLY (NEXT 6 MONTHS)
                </h4>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {expiringSoonItems.length === 0 ? (
                    <p className="text-xs text-slate-500 py-8 text-center italic">No chemical volumes are expiring within 6 months.</p>
                  ) : (
                    expiringSoonItems.map((item) => (
                      <div key={item.id} className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl flex justify-between gap-4 text-xs">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{item.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono block mt-0.5">Batch: {item.batchNumber} • Stock units: {item.quantity}</span>
                        </div>
                        <span className="text-amber-500 font-extrabold font-mono text-xs text-right whitespace-nowrap">{item.expiryDate}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
