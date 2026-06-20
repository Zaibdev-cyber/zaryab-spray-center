/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  Package, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Filter, 
  Eye, 
  Layers, 
  AlertTriangle,
  X,
  FileSpreadsheet
} from "lucide-react";
import { Product, Category, Supplier, UserRole } from "../types";

interface ProductViewProps {
  currencySymbol: string;
  currentUser: { id: string; role: UserRole };
}

export default function ProductView({ currencySymbol, currentUser }: ProductViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortField, setSortField] = useState<keyof Product>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Active records for editing/viewing/delete
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [activeViewProduct, setActiveViewProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Form states for adding/editing product
  const [barcodeId, setBarcodeId] = useState("");
  const [productName, setProductName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("Bottle");
  const [mDate, setMDate] = useState("");
  const [eDate, setEDate] = useState("");
  const [supplierId, setSupplierId] = useState("");

  // Form states for Category adding
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  // General message systems
  const [modalError, setModalError] = useState<string | null>(null);

  const syncData = async () => {
    try {
      setLoading(true);
      const [pRes, cRes, sRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
        fetch("/api/suppliers")
      ]);

      if (!pRes.ok || !cRes.ok || !sRes.ok) throw new Error("Incomplete handshake from offline server ledger");

      const pData = await pRes.json();
      const cData = await cRes.json();
      const sData = await sRes.json();

      setProducts(pData);
      setCategories(cData);
      setSuppliers(sData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Database catalog sync error. Is server database active?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncData();
  }, []);

  const handleOpenAddModal = () => {
    setActiveProduct(null);
    setBarcodeId("");
    setProductName("");
    setCategoryName(categories[0]?.name || "");
    setBrand("");
    setDescription("");
    setBatchNumber(`B-${Math.floor(100 + Math.random() * 900)}`);
    setPurchasePrice("");
    setSalePrice("");
    setQuantity("0");
    setUnit("Bottle");
    
    const today = new Date().toISOString().split("T")[0];
    setMDate(today);

    // Default expiry 2 years in future
    const exp = new Date();
    exp.setFullYear(exp.getFullYear() + 2);
    setEDate(exp.toISOString().split("T")[0]);

    setSupplierId(suppliers[0]?.id || "");
    setModalError(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setActiveProduct(p);
    setBarcodeId(p.id);
    setProductName(p.name);
    setCategoryName(p.category);
    setBrand(p.brand);
    setDescription(p.description);
    setBatchNumber(p.batchNumber);
    setPurchasePrice(p.purchasePrice.toString());
    setSalePrice(p.salePrice.toString());
    setQuantity(p.quantity.toString());
    setUnit(p.unit);
    setMDate(p.manufacturingDate || "");
    setEDate(p.expiryDate || "");
    setSupplierId(p.supplierId);
    setModalError(null);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !categoryName || !purchasePrice || !salePrice || !supplierId) {
      setModalError("Please log all required fields (*) properly.");
      return;
    }

    if (Number(purchasePrice) <= 0 || Number(salePrice) <= 0) {
      setModalError("Purchase value and sale prices must be superior to zero.");
      return;
    }

    if (Number(salePrice) < Number(purchasePrice)) {
      setModalError("Pricing alert: Sale price is less than catalog purchase cost. Check margins.");
    }

    const payload = {
      currentUserId: currentUser.id,
      barcodeId: barcodeId,
      name: productName,
      category: categoryName,
      brand,
      description,
      batchNumber,
      purchasePrice: Number(purchasePrice),
      salePrice: Number(salePrice),
      quantity: Number(quantity) || 0,
      unit,
      manufacturingDate: mDate,
      expiryDate: eDate,
      supplierId
    };

    try {
      const url = activeProduct ? `/api/products/${activeProduct.id}` : "/api/products";
      const method = activeProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save rejected from database rules.");
      }

      setIsProductModalOpen(false);
      syncData();
    } catch (err: any) {
      setModalError(err.message || "Failed to commit chemical parameters.");
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setModalError("Please provide category name.");
      return;
    }

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentUserId: currentUser.id, name: newCatName, description: newCatDesc })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Category saving failed.");
      }

      setNewCatName("");
      setNewCatDesc("");
      setIsCategoryModalOpen(false);
      syncData();
    } catch (err: any) {
      setModalError(err.message || "Unable to save category descriptor.");
    }
  };

  const triggerDeleteProduct = (p: Product) => {
    setProductToDelete(p);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      const res = await fetch(`/api/products/${productToDelete.id}?currentUserId=${currentUser.id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete action rejected.");
      }

      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      syncData();
    } catch (err: any) {
      alert(err.message || "Could not delete product listing.");
    }
  };

  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter & Search computation
  const filteredProducts = products
    .filter((p) => {
      const searchLower = searchQuery.toLowerCase();
      const matchSearch = 
        p.name.toLowerCase().includes(searchLower) ||
        p.id.toLowerCase().includes(searchLower) ||
        p.brand.toLowerCase().includes(searchLower) ||
        p.batchNumber.toLowerCase().includes(searchLower);

      const matchCategory = selectedCategory === "All" || p.category === selectedCategory;

      return matchSearch && matchCategory;
    })
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === "string") {
        aVal = (aVal as string).toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  const getSupplierName = (id: string) => {
    const sup = suppliers.find((s) => s.id === id);
    return sup ? `${sup.name} (${sup.companyName})` : "Unknown Supplier";
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400 bg-slate-900/10">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono uppercase tracking-wider mt-2">Syncing agricultural chemical catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-150">
      
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-slate-800 pb-5 border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Store Catalogue Items
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            Manage insecticide sprays, crop herbicides, hybrid seeds and organic growth promoters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {currentUser.role === UserRole.Admin && (
            <button
              onClick={() => {
                setModalError(null);
                setNewCatName("");
                setNewCatDesc("");
                setIsCategoryModalOpen(true);
              }}
              className="px-4 py-2.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4 text-emerald-500" />
              + Add Category
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black tracking-wide rounded-xl shadow-lg hover:shadow-emerald-950/20 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            + New Crop Product
          </button>
        </div>
      </div>

      {/* Catalog Search, Filter, and statistics rail bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 w-full">
          {/* Text Search matches barcode, name, brand */}
          <div className="relative w-full max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              id="product-search-input"
              type="text"
              placeholder="Search by name, barcode, serial, brand, batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Categories Quick Filter dropdown */}
          <div className="relative w-full sm:w-56 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              id="category-filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="All">All Chemical categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Items Counter Badge */}
        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold shrink-0">
          Showing {filteredProducts.length} of {products.length} Products
        </div>
      </div>

      {/* Database Main Catalog Listings Table Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono tracking-wider select-none border-b dark:border-slate-800">
                <th className="p-3 font-semibold cursor-pointer rounded-l-xl hover:text-emerald-500" onClick={() => handleSort("id")}>
                  Code / Barcode {sortField === "id" && (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th className="p-3 font-semibold cursor-pointer hover:text-emerald-500" onClick={() => handleSort("name")}>
                  Product Label Name {sortField === "name" && (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th className="p-3 font-semibold cursor-pointer hover:text-emerald-500" onClick={() => handleSort("category")}>
                  Category {sortField === "category" && (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th className="p-3 font-semibold cursor-pointer hover:text-emerald-500" onClick={() => handleSort("brand")}>
                  Brand / Manufacturer
                </th>
                <th className="p-3 font-semibold cursor-pointer hover:text-emerald-500" onClick={() => handleSort("purchasePrice")}>
                  Cost Price
                </th>
                <th className="p-3 font-semibold cursor-pointer hover:text-emerald-500" onClick={() => handleSort("salePrice")}>
                  Retail Price
                </th>
                <th className="p-3 font-semibold cursor-pointer hover:text-emerald-500" onClick={() => handleSort("quantity")}>
                  Stock balance {sortField === "quantity" && (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th className="p-3 font-semibold">Expiry status</th>
                <th className="p-3 font-semibold text-right rounded-r-xl">Operations</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 italic">No products match your active search terms.</td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.quantity > 0 && p.quantity <= 10;
                  const isOut = p.quantity === 0;

                  // Expiry calculations
                  const today = new Date().toISOString().split("T")[0];
                  const sixMonthsFromNow = new Date();
                  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
                  const sixMonthsStr = sixMonthsFromNow.toISOString().split("T")[0];
                  
                  const isExpired = p.expiryDate && p.expiryDate < today;
                  const isExpiringSoon = p.expiryDate && p.expiryDate >= today && p.expiryDate <= sixMonthsStr;

                  return (
                    <tr key={p.id} className="border-b dark:border-slate-800 border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      {/* Barcode/ID with font mono */}
                      <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-300">
                        {p.id}
                      </td>
                      {/* Product Name */}
                      <td className="p-3">
                        <div>
                          <span className="font-extrabold text-slate-800 dark:text-slate-100 block">{p.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Batch: {p.batchNumber}</span>
                        </div>
                      </td>
                      {/* Category Badge */}
                      <td className="p-3">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold">
                          {p.category}
                        </span>
                      </td>
                      {/* Brand */}
                      <td className="p-3 text-slate-500 font-medium">
                        {p.brand}
                      </td>
                      {/* Cost price */}
                      <td className="p-3 font-mono text-slate-500">
                        {currencySymbol} {p.purchasePrice}
                      </td>
                      {/* Sale price */}
                      <td className="p-3 font-mono font-extrabold text-slate-800 dark:text-slate-200">
                        {currencySymbol} {p.salePrice}
                      </td>
                      {/* Stock units balance count */}
                      <td className="p-3">
                        {isOut ? (
                          <span className="px-2.5 py-0.5 bg-rose-500 text-slate-950 font-black tracking-widest text-[9px] rounded uppercase select-none">
                            OUT
                          </span>
                        ) : isLow ? (
                          <div>
                            <span className="font-black text-amber-500 font-mono text-xs">{p.quantity} {p.unit}(s)</span>
                            <span className="block text-[8px] text-amber-500 font-black tracking-widest uppercase">LOW STOCK</span>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-700 dark:text-slate-200 font-mono text-xs">{p.quantity} {p.unit}(s)</span>
                        )}
                      </td>
                      {/* Expiry alerts indicators */}
                      <td className="p-3">
                        {isExpired ? (
                          <span className="px-2 py-0.5 bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider rounded select-none">
                            EXPIRED
                          </span>
                        ) : isExpiringSoon ? (
                          <div>
                            <span className="text-amber-500 font-extrabold text-[10px] block font-mono">{p.expiryDate}</span>
                            <span className="text-[8px] text-amber-500 block font-black uppercase tracking-wider mt-0.5">SOON EXPIRE</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-medium font-mono text-[11px]">{p.expiryDate || "---"}</span>
                        )}
                      </td>
                      {/* Option operations */}
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => {
                              setActiveViewProduct(p);
                              setIsViewModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded bg-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
                            title="Quick details view"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded bg-transparent text-slate-500 hover:text-emerald-500 transition-all cursor-pointer"
                            title="Edit product parameters"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {currentUser.role === UserRole.Admin && (
                            <button
                              onClick={() => triggerDeleteProduct(p)}
                              className="p-1.5 hover:bg-rose-500/10 rounded bg-transparent text-slate-500 hover:text-rose-500 transition-all cursor-pointer"
                              title="Delete from catalogue"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRODUCT DIALOG (Add / Edit dynamic container) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
            
            {/* Modal Title bar */}
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wide flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-500" />
                {activeProduct ? `Modify Product: ${activeProduct.name}` : "Log New Spray / Chemical Product Entry"}
              </h3>
              <button 
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-semibold bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Product Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Product Label Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Glyphosate 480 SL"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Barcode/ID input field */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Barcode ID / Item Serial (Optional, Auto-Gen if empty)
                  </label>
                  <input
                    type="text"
                    placeholder="Scan barcode or type serial code"
                    value={barcodeId}
                    onChange={(e) => setBarcodeId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold font-mono text-slate-950 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
                    disabled={!!activeProduct} // Lock serial key during edits
                  />
                  {activeProduct && <span className="text-[9px] text-slate-400 mt-0.5 block">Barcode sequence is static for recorded database indices.</span>}
                </div>

                {/* Category Select menu */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Agricultural Category *
                  </label>
                  <select
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Brand / Packager */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Brand / Chemical Manufacturer
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Engro Corp, Bayer Crop"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Cost price numbers */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Purchase Cost ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 1200"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Sale retail numbers */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Retail Sale Price ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 1550"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Unit type selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Unit Packing Format *
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="Bottle">Bottle (1 Liter)</option>
                    <option value="Liter">Liters (Bulk)</option>
                    <option value="Kg">Kilogram (Sack)</option>
                    <option value="Pack">Pack (500g Box)</option>
                  </select>
                </div>

                {/* Initial stock balance */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Chemical Stock Quantity Count
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Mfg Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Manufacturing Date (Mfg)
                  </label>
                  <input
                    type="date"
                    value={mDate}
                    onChange={(e) => setMDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
                  />
                </div>

                {/* Exp Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Expiry Threshold Date (Exp)
                  </label>
                  <input
                    type="date"
                    value={eDate}
                    onChange={(e) => setEDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
                  />
                </div>

                {/* Supplier selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Preferred Supplier Distributor *
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="">-- Choose registered supplier distributor --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.companyName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Batch Code */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Batch Manufacturing Number
                  </label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="e.g. BATCH-L90"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Chemical Purpose Description / Usage Guidelines
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Safe crop spray rates, pest tolerances or protective precautions"
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-colors"
                >
                  Commit Product Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY DIALOG (Only for admin setup) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wide flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" /> Convert New Category Segment
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              {modalError && (
                <div className="p-2 bg-rose-500/10 text-rose-300 text-xs rounded-lg">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Category Segment Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Biological Biostimulants"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Segment Description
                </label>
                <textarea
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Focus areas, pest classes or storage alerts"
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl transition-colors"
                >
                  Add Category Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 font-sans">
            <div className="flex items-center gap-3 text-rose-500 border-b dark:border-slate-800 pb-3 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-sm uppercase tracking-wide">
                Confirm Relational Record Deletion
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              You are about to irreversibly delete <strong className="text-slate-800 dark:text-slate-200">"{productToDelete.name}"</strong> (ID: {productToDelete.id}) from the active pesticide inventory registry. This may affect historical product queries.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setProductToDelete(null);
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                No, Keep Product
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Yes, Delete Catalog Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED VIEW MODAL */}
      {isViewModalOpen && activeViewProduct && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wide flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                Product Ledger Specs
              </h3>
              <button onClick={() => {
                setIsViewModalOpen(false);
                setActiveViewProduct(null);
              }} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="border-b dark:border-slate-800 pb-3">
                <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold uppercase tracking-wider font-mono">{activeViewProduct.category}</span>
                <h4 className="text-lg font-black text-slate-800 dark:text-white leading-tight mt-0.5">{activeViewProduct.name}</h4>
                <p className="text-xs text-slate-400 mt-1">Barcode Serial: <span className="font-mono font-bold">{activeViewProduct.id}</span></p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-mono">Brand Partner</span>
                  <span className="text-slate-700 dark:text-slate-200 block">{activeViewProduct.brand || "Generic"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-mono">Batch Identification</span>
                  <span className="text-slate-700 dark:text-slate-200 block">{activeViewProduct.batchNumber || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-mono">Purchase Cost price</span>
                  <span className="text-slate-500 font-mono block">{currencySymbol} {activeViewProduct.purchasePrice}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-mono">Retail sales rate</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono master block">{currencySymbol} {activeViewProduct.salePrice}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-mono">Physical inventory count</span>
                  <span className="text-slate-700 dark:text-slate-200 block">{activeViewProduct.quantity} {activeViewProduct.unit}(s)</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-mono">Expiration limits</span>
                  <span className={`block font-mono ${
                    activeViewProduct.expiryDate && activeViewProduct.expiryDate < new Date().toISOString().split("T")[0]
                      ? "text-rose-500 font-bold" 
                      : "text-slate-700 dark:text-slate-200"
                  }`}>{activeViewProduct.expiryDate || "N/A"}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl text-xs">
                <span className="text-slate-400 block text-[9px] uppercase font-mono mb-1">Registered distributor link</span>
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{getSupplierName(activeViewProduct.supplierId)}</span>
              </div>

              {activeViewProduct.description && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl text-xs">
                  <span className="text-slate-400 block text-[9px] uppercase font-mono mb-1">Chemical comments / warnings</span>
                  <p className="text-slate-600 dark:text-slate-350 leading-relaxed font-medium m-0">{activeViewProduct.description}</p>
                </div>
              )}

              <div className="pt-4 border-t dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setActiveViewProduct(null);
                  }}
                  className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Dismiss Specs View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
