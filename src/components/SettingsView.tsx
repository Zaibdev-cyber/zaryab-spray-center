/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Settings, 
  Store, 
  Printer, 
  Database, 
  Download, 
  Upload, 
  Sparkles,
  ToggleLeft,
  X,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { ShopSettings, UserRole } from "../types";

interface SettingsViewProps {
  currentUserRole: UserRole;
  currentUserId: string;
  shopSettings: ShopSettings;
  onUpdateSettings: (newSettings: Partial<ShopSettings>) => void;
}

export default function SettingsView({ currentUserRole, currentUserId, shopSettings, onUpdateSettings }: SettingsViewProps) {
  // Local form states
  const [shopName, setShopName] = useState(shopSettings.shopName);
  const [shopAddress, setShopAddress] = useState(shopSettings.shopAddress);
  const [contactNumber, setContactNumber] = useState(shopSettings.contactNumber);
  const [emailAddress, setEmailAddress] = useState(shopSettings.emailAddress);
  const [receiptFooterMessage, setReceiptFooterMessage] = useState(shopSettings.receiptFooterMessage);
  const [currencySymbol, setCurrencySymbol] = useState(shopSettings.currencySymbol);
  
  // Statuses
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Db states upload
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  const handleUpdateStoreProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !shopAddress.trim() || !contactNumber.trim()) {
      setErrorMsg("Please populate required fields: Shop Name, Address, Contact Number.");
      return;
    }

    const payload = {
      currentUserId,
      shopName,
      shopAddress,
      contactNumber,
      emailAddress,
      receiptFooterMessage,
      currencySymbol
    };

    try {
      setSaveLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save rejected.");
      }

      const updated = await res.json();
      onUpdateSettings(updated);
      setSuccessMsg("System settings updated on workstation successfully!");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to commit system preferences.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Trigger db backup download
  const handleDownloadDatabaseBackup = () => {
    window.open("/api/database/backup", "_blank");
  };

  // Dynamic uploader restoration file reader
  const handleDatabaseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setUploadError(null);
        setUploadSuccess(false);

        const parsedJson = JSON.parse(event.target?.result as string);
        
        const res = await fetch("/api/database/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentUserId, backupData: parsedJson })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed database restoration handshake.");
        }

        setUploadSuccess(true);
        const data = await res.json();
        onUpdateSettings(data.settings);
        alert("Workstation completely restored database. Application will auto-refresh!");
        window.location.reload();
      } catch (err: any) {
        console.error(err);
        setUploadError(err.message || "Could not parse JSON file. Ensure correct format.");
      }
    };
    reader.readAsText(file);
  };

  if (currentUserRole !== UserRole.Admin) {
    return (
      <div className="flex-1 p-8 text-rose-400 bg-slate-905 flex items-center justify-center font-sans">
        <div className="max-w-md p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center space-y-2">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="font-extrabold text-white text-base uppercase">Access Denied</h3>
          <p className="text-xs">Only Admin accounts can modify terminal credentials or restore backups.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-150 font-sans h-full">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-slate-800 pb-5 border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Workstation settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            Manage public store details, change printed receipt layouts, and create physical database backups.
          </p>
        </div>
      </div>

      {/* Grid configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Profile Card & Printer Config */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="font-extrabold text-sm text-slate-950 dark:text-white uppercase tracking-tight flex items-center gap-2 border-b dark:border-slate-800 pb-3">
            <Store className="w-5 h-5 text-emerald-500" />
            Agricultural Spray Center Profile
          </h3>

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleUpdateStoreProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Shop Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Shop Business Name *
                </label>
                <input
                  id="settings-shop-name"
                  type="text"
                  required
                  placeholder="Zaryab Spray Center"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Currency Symbol */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Currency Symbol Prefix
                </label>
                <input
                  id="settings-shop-currency"
                  type="text"
                  placeholder="Rs."
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              {/* Contact number */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Workstation Contact Number *
                </label>
                <input
                  id="settings-shop-contact"
                  type="text"
                  required
                  placeholder="+92 300 7601234"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Shop Email Address
                </label>
                <input
                  id="settings-shop-email"
                  type="email"
                  placeholder="contact@zaryab.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Shop Location Physical Address *
              </label>
              <input
                id="settings-shop-address"
                type="text"
                required
                placeholder="Main Bypass Road, opposite New Grain Market Sahiwal"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            {/* Printed invoice message */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Thermal Printed Invoice Receipt Disclaimer / Footer Message
              </label>
              <textarea
                id="settings-shop-footer"
                value={receiptFooterMessage}
                onChange={(e) => setReceiptFooterMessage(e.target.value)}
                placeholder="Thank you message, guarantee limits, chemical cautions warning details..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
              ></textarea>
            </div>

            <div className="pt-4 border-t dark:border-slate-800 flex justify-end">
              <button
                id="settings-save-btn"
                type="submit"
                disabled={saveLoading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black tracking-widest uppercase rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                {saveLoading ? "Saving Preferences..." : "Commit Store Profile"}
              </button>
            </div>
          </form>
        </div>

        {/* Database backup card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="font-extrabold text-sm text-slate-950 dark:text-white uppercase tracking-tight flex items-center gap-2 border-b dark:border-slate-800 pb-3">
            <Database className="w-5 h-5 text-teal-400" />
            Database Ledger Backup Facility
          </h3>

          <p className="text-xs text-slate-400 leading-normal font-semibold">
            Since this system runs complete offline storage within safe local SQLite containers, it is critical to periodically backup parameters data to transfer records.
          </p>

          <div className="space-y-4 pt-2">
            
            {/* Backup export */}
            <div className="p-4 bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-850 rounded-2xl flex flex-col gap-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono flex items-center gap-1.5">
                <Download className="w-4 h-4 text-emerald-500" /> 1. Generate Backup File
              </span>
              <p className="text-[10px] text-slate-500 m-0">Compiles products counts, registered cash receipts, supplier notes into standard JSON schemas.</p>
              <button
                id="db-backup-download-btn"
                onClick={handleDownloadDatabaseBackup}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Local Database Backup (.json)
              </button>
            </div>

            {/* Backup restore */}
            <div className="p-4 bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-850 rounded-2xl flex flex-col gap-3">
              <span className="text-[10px] uppercase font-bold text-amber-500 font-mono flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-amber-500" /> 2. Overwrite / Restore Data
              </span>
              <p className="text-[10px] text-slate-500 m-0">Select a previously downloadable backup JSON file. Doing so resets all active counts.</p>
              
              {uploadError && (
                <div className="p-2 bg-rose-500/10 text-rose-300 text-[10px] rounded-lg">
                  {uploadError}
                </div>
              )}

              <label className="w-full py-2.5 border-dashed border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center relative">
                <Upload className="w-4 h-4 text-slate-400" />
                Upload & Restore Backup
                <input
                  id="db-backup-upload"
                  type="file"
                  accept=".json"
                  onChange={handleDatabaseUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                />
              </label>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
