/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Plus, 
  Truck, 
  ShieldAlert, 
  Clock, 
  Filter,
  X
} from "lucide-react";
import { Product, Supplier, StockTransaction, UserRole } from "../types";

interface StockViewProps {
  currentUser: { id: string; name: string };
  currencySymbol: string;
}

export default function StockView({ currentUser, currencySymbol }: StockViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal control states
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"IN" | "OUT">("IN");

  // Form states for transaction
  const [productId, setProductId] = useState("");
  const [subType, setSubType] = useState<string>("PURCHASE");
  const [quantity, setQuantity] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  // Search & Filters on transaction hist
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("All");

  const syncData = async () => {
    try {
      setLoading(true);
      const [pRes, sRes, tRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/suppliers"),
        fetch("/api/stock/history")
      ]);

      if (!pRes.ok || !sRes.ok || !tRes.ok) throw new Error("Offline endpoint communication breakdown.");

      const pData = await pRes.json();
      const sData = await sRes.json();
      const tData = await tRes.json();

      setProducts(pData);
      setSuppliers(sData);
      setTransactions(tData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch server-side ledger transaction state.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncData();
  }, []);

  const handleOpenModal = (type: "IN" | "OUT") => {
    setModalType(type);
    setProductId(products[0]?.id || "");
    setSubType(type === "IN" ? "PURCHASE" : "DAMAGE");
    setQuantity("");
    setSupplierId(suppliers[0]?.id || "");
    setNotes("");
    setModalError(null);
    setIsTxnModalOpen(true);
  };

  // Adjust subType options on flight
  useEffect(() => {
    if (modalType === "IN") {
      setSubType("PURCHASE");
    } else {
      setSubType("DAMAGE");
    }
  }, [modalType]);

  const handleCommitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !quantity || Number(quantity) <= 0) {
      setModalError("Please specify product and quantity.");
      return;
    }

    if (modalType === "OUT") {
      const selectedProduct = products.find((p) => p.id === productId);
      if (selectedProduct && selectedProduct.quantity < Number(quantity)) {
        setModalError(`Stock alert. Current product balance is only ${selectedProduct.quantity} ${selectedProduct.unit}. Cannot remove ${quantity}.`);
        return;
      }
    }

    const payload = {
      currentUserId: currentUser.id,
      productId,
      type: modalType,
      subType,
      quantity: Number(quantity),
      supplierId: modalType === "IN" && subType === "PURCHASE" ? supplierId : undefined,
      notes
    };

    try {
      const res = await fetch("/api/stock/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to commit ledger correction.");
      }

      setIsTxnModalOpen(false);
      syncData();
    } catch (err: any) {
      setModalError(err.message || "Database transactional commit rejected.");
    }
  };

  // Filter computation
  const filteredTransactions = transactions.filter((t) => {
    const matchSearch = 
      t.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.productId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.notes || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.userName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchType = 
      filterType === "All" ||
      (filterType === "IN" && t.type === "IN") ||
      (filterType === "OUT" && t.type === "OUT") ||
      (filterType === "PURCHASE" && t.subType === "PURCHASE") ||
      (filterType === "DAMAGE" && t.subType === "DAMAGE") ||
      (filterType === "RETURN" && t.subType === "RETURN");

    return matchSearch && matchType;
  });

  if (loading && transactions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400 bg-slate-900/10">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono uppercase tracking-wider">Syncing stock transactions history ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-150 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-slate-800 pb-5 border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Stock ledger In/Out
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            Track purchase orders arrivals, chemical damages, shelf returns, or manual system adjustments.
          </p>
        </div>

        {/* Transaction rapid buttons */}
        <div className="flex items-center gap-3">
          <button
            id="stock-in-btn"
            onClick={() => handleOpenModal("IN")}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5 text-slate-950 stroke-[3]" />
            Stock arrival (IN)
          </button>
          
          <button
            id="stock-out-btn"
            onClick={() => handleOpenModal("OUT")}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-4.5 h-4.5 text-white" />
            Stock Adjust (OUT)
          </button>
        </div>
      </div>

      {/* Database sync error callout */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm rounded-2xl flex items-center gap-3">
          <span className="font-bold">Error:</span>
          <span>{error}</span>
          <button onClick={syncData} className="ml-auto underline text-xs font-bold font-mono">Retry sync</button>
        </div>
      )}

      {/* Filter and Search controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 w-full">
          {/* Text Search field */}
          <div className="relative w-full max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by chemical name, barcode, cashier, or batch notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Quick Filters category */}
          <div className="relative w-full sm:w-56 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="All">All stock actions</option>
              <option value="IN">Stock Inwards (All)</option>
              <option value="OUT">Stock Outwards (All)</option>
              <option value="PURCHASE">Purchase Supplies (IN)</option>
              <option value="DAMAGE">Damages & Bad Batches (OUT)</option>
              <option value="RETURN">Sales Returns (IN)</option>
            </select>
          </div>
        </div>

        {/* Dynamic transaction metrics counter */}
        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold shrink-0">
          Showing {filteredTransactions.length} of {transactions.length} Entries
        </div>
      </div>

      {/* Transaction History log table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono tracking-wider select-none border-b dark:border-slate-800">
                <th className="p-3 font-semibold rounded-l-xl">Date & Time</th>
                <th className="p-3 font-semibold">Barcode / ID</th>
                <th className="p-3 font-semibold">Chemical Name</th>
                <th className="p-3 font-semibold">Ledger Direction</th>
                <th className="p-3 font-semibold">Action Subtype</th>
                <th className="p-3 font-semibold">Quantity</th>
                <th className="p-3 font-semibold">Assoc. Supplier/Dist.</th>
                <th className="p-3 font-semibold">Responsible Cashier</th>
                <th className="p-3 font-semibold rounded-r-xl">Notes Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 italic">No ledger transaction logs match your active filters.</td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const isIn = t.type === "IN";
                  return (
                    <tr key={t.id} className="border-b dark:border-slate-800 border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      {/* Date */}
                      <td className="p-3 text-slate-500 whitespace-nowrap font-medium">
                        {new Date(t.date).toLocaleString()}
                      </td>
                      {/* Product barcode */}
                      <td className="p-3 font-mono font-bold text-slate-400">
                        {t.productId}
                      </td>
                      {/* Chemical Product Name */}
                      <td className="p-3 font-black text-slate-850 dark:text-slate-100">
                        {t.productName}
                      </td>
                      {/* Direction In / Out */}
                      <td className="p-3">
                        {isIn ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-500 font-bold text-[10px] uppercase rounded-full">
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                            STOCK IN (Arrival)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-500/10 text-rose-500 font-bold text-[10px] uppercase rounded-full">
                            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500" />
                            STOCK OUT (Loss)
                          </span>
                        )}
                      </td>
                      {/* Subtype action */}
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          t.subType === "PURCHASE" 
                            ? "bg-blue-500/10 text-blue-500" 
                            : t.subType === "DAMAGE" 
                            ? "bg-amber-500/10 text-amber-500" 
                            : t.subType === "RETURN"
                            ? "bg-teal-500/10 text-teal-400"
                            : "bg-purple-500/10 text-purple-400"
                        }`}>
                          {t.subType}
                        </span>
                      </td>
                      {/* Quantity of shift */}
                      <td className="p-3 font-mono font-bold text-slate-800 dark:text-silver-100">
                        <span className={isIn ? "text-emerald-550 dark:text-emerald-400" : "text-rose-550 dark:text-rose-400"}>
                          {isIn ? "+" : "-"} {t.quantity} Units
                        </span>
                      </td>
                      {/* Associated Supplier */}
                      <td className="p-3 text-slate-500 font-medium">
                        {t.supplierName || "---"}
                      </td>
                      {/* Responsible Operator */}
                      <td className="p-3 text-xs text-slate-500 font-semibold font-sans">
                        {t.userName}
                      </td>
                      {/* Notes description */}
                      <td className="p-3 max-w-[200px] text-slate-400 truncate" title={t.notes}>
                        {t.notes || "---"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TRANSACTION MODAL BOX CONTAINER */}
      {isTxnModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
            
            {/* Header tab based on Inward or Outward selection */}
            <div className={`px-6 py-4 flex items-center justify-between border-b dark:border-slate-800 text-white ${
              modalType === "IN" ? "bg-slate-900" : "bg-slate-1000"
            }`}>
              <h3 className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
                {modalType === "IN" ? (
                  <>
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    New Stock arrival (IN)
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-5 h-5 text-rose-500" />
                    Record Inventory correction / Removal (OUT)
                  </>
                )}
              </h3>
              <button onClick={() => setIsTxnModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCommitTransaction} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                  {modalError}
                </div>
              )}

              {/* Product selector dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Inventory Product Label *
                </label>
                <select
                  required
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="">-- Choose catalog item --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Barcode/ID: {p.id}) [Bal: {p.quantity} {p.unit}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Subtype specification */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Adjust Action Reason *
                </label>
                {modalType === "IN" ? (
                  <select
                    value={subType}
                    onChange={(e) => setSubType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="PURCHASE">Procured Supplies Purchase (IN)</option>
                    <option value="RETURN">Sales Return from Farmer Customer (IN)</option>
                    <option value="MANUAL">Manual Count Alignment (IN)</option>
                  </select>
                ) : (
                  <select
                    value={subType}
                    onChange={(e) => setSubType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    <option value="DAMAGE">Broken Packaging / Expired Chemical (OUT)</option>
                    <option value="RETURN">Supplier Return (OUT)</option>
                    <option value="MANUAL">Manual Stock Alignment Adjustment (OUT)</option>
                  </select>
                )}
              </div>

              {/* Supplier link - only show if Inward Purchase */}
              {modalType === "IN" && subType === "PURCHASE" && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Supplying Distributor *
                  </label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="">-- Choose registered supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.companyName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Adjust Quantity *
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  placeholder="e.g. 50"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Notes guidelines description */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Audit Comments / Adjust Remarks Details
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record order numbers, damage descriptions, or context notes. Important for audits."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                ></textarea>
              </div>

              {/* Buttons footer */}
              <div className="pt-4 border-t dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTxnModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 font-black text-xs rounded-xl text-slate-950 shadow-md transition-colors ${
                    modalType === "IN" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500 text-white"
                  }`}
                >
                  Confirm Ledger Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
