/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  Truck, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  AlertTriangle,
  X 
} from "lucide-react";
import { Supplier, UserRole } from "../types";

interface SupplierViewProps {
  currentUserRole: UserRole;
  currentUserId: string;
}

export default function SupplierView({ currentUserRole, currentUserId }: SupplierViewProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Modal control states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeSupplier, setActiveSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/suppliers");
      if (!res.ok) throw new Error("Offline node API failed to return supplier roster.");
      const data = await res.json();
      setSuppliers(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to sync supplier distributor registry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenAddModal = () => {
    setActiveSupplier(null);
    setName("");
    setCompanyName("");
    setContactNumber("");
    setEmail("");
    setAddress("");
    setNotes("");
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (s: Supplier) => {
    setActiveSupplier(s);
    setName(s.name);
    setCompanyName(s.companyName);
    setContactNumber(s.contactNumber);
    setEmail(s.email);
    setAddress(s.address);
    setNotes(s.notes || "");
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !companyName.trim() || !contactNumber.trim()) {
      setModalError("Please populate Supplier Name, Company Name and Contact Number.");
      return;
    }

    const payload = {
      currentUserId,
      name,
      companyName,
      contactNumber,
      email,
      address,
      notes
    };

    try {
      const url = activeSupplier ? `/api/suppliers/${activeSupplier.id}` : "/api/suppliers";
      const method = activeSupplier ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to edit supplier record indices.");
      }

      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      setModalError(err.message || "Failed to write supplier details.");
    }
  };

  const triggerDeleteSupplier = (s: Supplier) => {
    setSupplierToDelete(s);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    try {
      const res = await fetch(`/api/suppliers/${supplierToDelete.id}?currentUserId=${currentUserId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Resource is protected.");
      }

      setIsDeleteModalOpen(false);
      setSupplierToDelete(null);
      fetchSuppliers();
    } catch (err: any) {
      alert(err.message || "Could not delete supplier.");
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const query = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(query) ||
      s.companyName.toLowerCase().includes(query) ||
      s.contactNumber.includes(query) ||
      s.address.toLowerCase().includes(query)
    );
  });

  if (loading && suppliers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400 bg-slate-900/10">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono uppercase tracking-wider mt-2">Syncing external suppliers directory...</p>
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
            Suppliers & Distributors Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            Track fertilizer producers, seed importers and pesticide suppliers contact ledgers.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black tracking-wide rounded-xl shadow-lg hover:shadow-emerald-950/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4.5 h-4.5 stroke-[3] text-slate-950" />
          + Register Supplier Link
        </button>
      </div>

      {/* Sync Errors callouts */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm rounded-2xl flex items-center gap-3">
          <span className="font-bold">Error:</span>
          <span>{error}</span>
          <button onClick={fetchSuppliers} className="ml-auto underline text-xs font-bold font-mono">Retry</button>
        </div>
      )}

      {/* Search and counters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="relative w-full max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by supplier name, company name, phone, email, town..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">
          Total Registered Suppliers: {suppliers.length}
        </div>
      </div>

      {/* Grid mapping directory cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl italic text-slate-400">
            No supplier indices match this search query term.
          </div>
        ) : (
          filteredSuppliers.map((s) => (
            <div key={s.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all p-5 flex flex-col justify-between">
              <div>
                {/* ID & actions header */}
                <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl select-none">
                      <Truck className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono font-bold text-slate-400 block">{s.id}</span>
                      <h3 className="font-extrabold text-slate-800 dark:text-white leading-tight m-0 text-sm truncate max-w-[150px]">{s.name}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(s)}
                      className="p-1.5 hover:bg-slate-150 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-500 transition-colors"
                      title="Edit details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {currentUserRole === UserRole.Admin && (
                      <button
                        onClick={() => triggerDeleteSupplier(s)}
                        className="p-1.5 hover:bg-rose-500/10 rounded text-slate-400 hover:text-rose-500 transition-colors"
                        title="Delete supplier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Company details */}
                <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider w-16">Company:</span>
                    <span className="text-slate-800 dark:text-white font-bold">{s.companyName}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-slate-800 dark:text-emerald-450 leading-none">{s.contactNumber}</span>
                  </div>

                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[200px] text-slate-600 dark:text-slate-300 font-mono text-[11px]">{s.email}</span>
                    </div>
                  )}

                  {s.address && (
                    <div className="flex items-start gap-2 pt-1 border-t dark:border-slate-800/60 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-500 font-normal m-0 tracking-tight leading-sm">{s.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes footer */}
              {s.notes && (
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl text-[11px] text-slate-500 flex gap-2">
                  <FileText className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
                  <p className="font-medium m-0 truncate italic" title={s.notes}>{s.notes}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* REGISTER / EDIT SUPPLIER DIALOG BOX */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wide flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-500" />
                {activeSupplier ? `Modify Supplier: ${activeSupplier.name}` : "Register Supplier Distributor Link"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                  {modalError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Supplier Rep Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kaswar Saleem"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Company Name Corporation *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bayer CropScience Pakistan Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Contact phone */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +92 300 1234567"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. support@corp.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Physical Depot / Office Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grain Market Bypass Multan Road, Sahiwal"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Distributor Credits / Outstanding ledger terms notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Credit cycles terms, pending payment ratios, seasonal seed returns policy"
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                ></textarea>
              </div>

              {/* Button controllers */}
              <div className="pt-4 border-t dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-colors"
                >
                  Save Distributor Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFORMATION MODAL */}
      {isDeleteModalOpen && supplierToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 font-sans">
            <div className="flex items-center gap-3 text-rose-500 border-b dark:border-slate-800 pb-3 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-sm uppercase tracking-wide">
                Confirm Distributor Deletion
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              You are about to irreversibly delete <strong className="text-slate-800 dark:text-slate-100">"{supplierToDelete.name} ({supplierToDelete.companyName})"</strong> from the workstation memory registry database. Any product listing linked exclusively to this distributor will prevent this action until catalog parameters are safely altered.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSupplierToDelete(null);
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                No, Retain Entry
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs text-xs rounded-xl transition-colors cursor-pointer"
              >
                Yes, Delete From Workstation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
