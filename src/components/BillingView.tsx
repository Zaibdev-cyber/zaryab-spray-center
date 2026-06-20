/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { 
  ShoppingCart, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  Printer, 
  Coins, 
  CheckCircle, 
  Sparkles,
  Users,
  X,
  FileSpreadsheet
} from "lucide-react";
import { Product, Sale, ShopSettings, UserRole } from "../types";

interface BillingViewProps {
  currentUser: { id: string; name: string };
  currencySymbol: string;
  shopSettings: ShopSettings;
}

interface CartItem {
  product: Product;
  quantity: number;
  price: number; // cached salePrice
}

export default function BillingView({ currentUser, currencySymbol, shopSettings }: BillingViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cart ledger states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [discount, setDiscount] = useState("0");
  const [cashReceived, setCashReceived] = useState("");

  // Search references
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeScanInput, setBarcodeScanInput] = useState("");

  // Success completed checkout display modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Could not sync catalog details.");
      const data = await res.json();
      setProducts(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Database fetch barrier in billing terminal registry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Handle barcode match quickly
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBarcode = barcodeScanInput.trim();
    if (!cleanBarcode) return;

    const matched = products.find((p) => p.id === cleanBarcode);
    if (matched) {
      handleAddToCart(matched);
      setBarcodeScanInput("");
    } else {
      alert(`No product listing registered for code / Barcode: "${cleanBarcode}"`);
    }
  };

  const handleAddToCart = (product: Product) => {
    if (product.quantity <= 0) {
      alert(`Pesticide Alert: '${product.name}' is physically out of stock.`);
      return;
    }

    setCart((prevCart) => {
      const idx = prevCart.findIndex((item) => item.product.id === product.id);
      if (idx > -1) {
        const item = prevCart[idx];
        if (item.quantity + 1 > product.quantity) {
          alert(`Quantity warning: Remaining stock level limit is only ${product.quantity} ${product.unit}(s).`);
          return prevCart;
        }

        const updated = [...prevCart];
        updated[idx] = { ...item, quantity: item.quantity + 1 };
        return updated;
      } else {
        return [...prevCart, { product, quantity: 1, price: product.salePrice }];
      }
    });
  };

  const handleUpdateQuantity = (productId: string, newQty: number) => {
    const itemIdx = cart.findIndex((i) => i.product.id === productId);
    if (itemIdx === -1) return;

    const item = cart[itemIdx];
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    if (newQty > item.product.quantity) {
      alert(`Quantity Cap: Physical stock limit is ${item.product.quantity} packings.`);
      return;
    }

    const updated = [...cart];
    updated[itemIdx] = { ...item, quantity: newQty };
    setCart(updated);
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Math totals computations
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const discountAmt = Number(discount) || 0;
  const grandTotal = Math.max(0, subtotal - discountAmt);
  const cashPaidVal = Number(cashReceived) || 0;
  const changeBalance = Math.max(0, cashPaidVal - grandTotal);

  const handleReceiptCheckout = async () => {
    if (cart.length === 0) {
      setCheckoutError("Cart is empty. Please choose products.");
      return;
    }

    if (cashPaidVal < grandTotal) {
      setCheckoutError(`Checkout Alert: Received Cash must equal or exceed total balance of ${grandTotal} ${currencySymbol}.`);
      return;
    }

    const payload = {
      currentUserId: currentUser.id,
      customerName: customerName || "Walk-in Farmer Client",
      discount: discountAmt,
      cashReceived: cashPaidVal,
      items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity }))
    };

    try {
      setCheckoutLoading(true);
      setCheckoutError(null);
      const res = await fetch("/api/sales/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Invoice checkout rejected from system database rules.");
      }

      const saleReceipt = await res.json();
      setCompletedSale(saleReceipt);
      setIsReceiptModalOpen(true);
      
      // Clear cart
      setCart([]);
      setCustomerName("");
      setDiscount("0");
      setCashReceived("");
      setSearchQuery("");
      setBarcodeScanInput("");
      
      // Refresh items state
      fetchItems();
    } catch (err: any) {
      setCheckoutError(err.message || "Failed to checkout invoice.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Filter lists matching click searches
  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.id.includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query)
    );
  });

  const handleTriggerNativePrint = () => {
    const printContent = document.getElementById("thermal-receipt-printable");
    if (!printContent) return;

    const originalContent = document.body.innerHTML;
    // Create simple print container isolated look
    document.body.innerHTML = `
      <div style="font-family: monospace; padding: 20px; color: black; font-size: 11px; max-width: 300px; margin: auto;">
        ${printContent.innerHTML}
      </div>
    `;
    window.print();
    // Restore
    window.location.reload();
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400 bg-slate-900/10">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono uppercase tracking-wider mt-2">Loading interactive retail billing registry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 flex flex-col md:flex-row gap-6 overflow-hidden bg-brand-bg dark:bg-slate-950 transition-colors duration-150 font-sans h-full">
      
      {/* LEFT SECTION: Search catalog and products tray */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full">
        
        {/* Rapid POS controllers row */}
        <div className="flex flex-col sm:flex-row gap-3">
          
          {/* Barcode Quick Entry scanner simulate */}
          <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-mono text-[9px] font-bold">
              [BARCODE]
            </span>
            <input
              id="billing-barcode-scan"
              type="text"
              placeholder="Press enter to match code (e.g. 69101112)..."
              value={barcodeScanInput}
              onChange={(e) => setBarcodeScanInput(e.target.value)}
              className="w-full pl-[65px] pr-4 py-2 bg-white dark:bg-slate-905 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-emerald-450 placeholder-gray-400 focus:outline-none focus:border-[#2D6A4F] shadow-sm"
            />
          </form>

          {/* Regular Search */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              id="billing-catalogue-search"
              type="text"
              placeholder="Filter item name, type, brand or contents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-905 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-gray-400 focus:outline-none focus:border-[#2D6A4F] shadow-sm"
            />
          </div>

        </div>

        {/* Dynamic products catalog selector container */}
        <div className="flex-1 overflow-y-auto pr-1">
          {products.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl text-gray-400 italic">
              Chemical store catalog is completely empty. Add products first.
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl text-gray-400 italic">
              No chemical matches this search terms profile.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map((p) => {
                const isOut = p.quantity === 0;
                const isLow = p.quantity > 0 && p.quantity <= 10;

                return (
                  <button
                    key={p.id}
                    disabled={isOut}
                    onClick={() => handleAddToCart(p)}
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-36 transition-all relative overflow-hidden select-none cursor-pointer ${
                      isOut
                        ? "bg-[#eef2ef]/60 dark:bg-slate-900/50 border-gray-150 dark:border-slate-850 opacity-40 cursor-not-allowed"
                        : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-[#2D6A4F] hover:scale-[1.02] hover:shadow-md"
                    }`}
                  >
                    <div>
                      {/* Category row */}
                      <span className="text-[9px] font-mono font-bold text-gray-400 block tracking-widest uppercase">
                        {p.category}
                      </span>
                      {/* Name */}
                      <h4 className="font-extrabold text-[#1B4332] dark:text-slate-100 mt-1 lines-2 text-xs leading-sm max-w-[150px] truncate m-0">
                        {p.name}
                      </h4>
                      {/* Serial */}
                      <span className="text-[10px] text-gray-400 font-mono inline-block mt-0.5">Code: {p.id}</span>
                    </div>

                    <div className="flex items-end justify-between mt-2 pt-2 border-t border-gray-100 dark:border-slate-850 w-full">
                      {/* Price */}
                      <span className="font-mono text-xs font-black text-[#2D6A4F] dark:text-[#52B788] block">
                        {currencySymbol} {p.salePrice.toLocaleString()}
                      </span>

                      {/* Stock units summary */}
                      {isOut ? (
                        <span className="text-[8px] bg-rose-500 text-white px-1 py-0.5 rounded font-black uppercase">OUT</span>
                      ) : isLow ? (
                        <span className="text-[9px] font-bold text-amber-600 font-mono animate-pulse">Low [{p.quantity}]</span>
                      ) : (
                        <span className="text-[9px] font-semibold text-gray-400 font-mono">Stock: {p.quantity}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SECTION: Cart list, discounting and payment cash checkout */}
      <div className="w-full md:w-80 lg:w-[440px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between shrink-0 h-full overflow-hidden">
        
        {/* Customer mapping section */}
        <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
          
          <div className="border-b dark:border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-500" />
              Farmer Billing Cart
            </h3>
            <button 
              onClick={() => setCart([])}
              className="text-slate-400 hover:text-rose-500 text-xs font-bold font-mono transition-colors"
              disabled={cart.length === 0}
            >
              Clear Cart
            </button>
          </div>

          {/* Customer input fields */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Farmer Client Name
            </label>
            <input
              id="billing-customer-name"
              type="text"
              placeholder="e.g. Chaudhary Muhammad Akram (Optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Cart Contents list */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center italic space-y-2">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
                  <ShoppingCart className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">Farmers cart is empty</p>
                  <p className="text-[10px] text-slate-400 mt-1">Tap products on catalog or enter product codes above.</p>
                </div>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="p-3 bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-center justify-between gap-3 text-xs font-sans">
                  <div className="min-w-0 flex-1">
                    <h5 className="font-extrabold text-slate-800 dark:text-white truncate m-0">{item.product.name}</h5>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{currencySymbol} {item.price} / {item.product.unit}</span>
                  </div>

                  {/* Quantity adjustments */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                    <span className="font-extrabold font-mono text-slate-800 dark:text-white text-xs w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </div>

                  {/* Total price for product line */}
                  <div className="text-right shrink-0 min-w-[70px]">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                      {currencySymbol} {(item.price * item.quantity).toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleRemoveItem(item.product.id)}
                      className="block text-[10px] text-rose-500 hover:underline hover:text-rose-450 ml-auto mt-0.5 font-bold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Discount, cash billing evaluation blocks */}
        <div className="border-t dark:border-slate-850 pt-4 mt-4 space-y-4">
          
          {/* Bill summary outputs */}
          <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
            {/* Discounting */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Volume Discount ({currencySymbol})
              </label>
              <input
                id="billing-discount-amt"
                type="number"
                min="0"
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* Cash Received */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Cash Paid ({currencySymbol}) *
              </label>
              <input
                id="billing-cash-received"
                type="number"
                min="0"
                placeholder="Receive cash from farmer"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-extrabold font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t dark:border-slate-850 text-xs">
            {/* Subtotal */}
            <div className="flex justify-between text-slate-500">
              <span className="font-semibold">Subtotal (Items gross)</span>
              <span className="font-mono font-medium">{currencySymbol} {subtotal.toLocaleString()}</span>
            </div>
            {/* Discount */}
            <div className="flex justify-between text-slate-500">
              <span className="font-semibold">Applied Discount</span>
              <span className="font-mono font-medium text-rose-500">- {currencySymbol} {discountAmt}</span>
            </div>
            {/* Grand Total */}
            <div className="flex justify-between border-b dark:border-slate-850 pb-2 text-slate-800 dark:text-white font-extrabold text-sm uppercase">
              <span className="font-sans">Grand Total Due</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 text-lg">
                {currencySymbol} {grandTotal.toLocaleString()}
              </span>
            </div>
            {/* Cash Paid and Returns */}
            {cashPaidVal > 0 && (
              <div className="flex justify-between text-slate-500 font-bold">
                <span>Returns Balance to Farmer</span>
                <span className={`font-mono text-sm ${changeBalance > 0 ? "text-amber-500" : "text-slate-400"}`}>
                  {currencySymbol} {changeBalance.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Checkout Operational Errors */}
          {checkoutError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <span className="font-black">Warn:</span>
              <span>{checkoutError}</span>
            </div>
          )}

          {/* Final Commit Button layout */}
          <button
            id="billing-checkout-btn"
            onClick={handleReceiptCheckout}
            disabled={cart.length === 0 || checkoutLoading}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {checkoutLoading ? (
              <span className="animate-spin border-2 border-slate-950 border-t-transparent rounded-full w-5 h-5"></span>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 stroke-[2.5]" />
                Checkout & Print Invoice Slip
              </>
            )}
          </button>

        </div>
      </div>

      {/* COMPLETED SUCCESS DIALOG / THERMAL RECEIPT SLIP POPUP */}
      {isReceiptModalOpen && completedSale && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-white text-slate-900 border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] font-sans">
            
            {/* Modal Title bar */}
            <div className="bg-slate-900 border-b border-slate-800 px-5 py-3 flex items-center justify-between shrink-0 text-white">
              <h3 className="font-extrabold text-xs uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Invoice Complete
              </h3>
              <button 
                onClick={() => {
                  setIsReceiptModalOpen(false);
                  setCompletedSale(null);
                }} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Preview */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <div 
                id="thermal-receipt-printable" 
                className="p-6 bg-white border border-slate-200 shadow-sm rounded-2xl text-xs font-mono text-black uppercase max-w-[320px] mx-auto space-y-4"
              >
                {/* Store Header */}
                <div className="text-center space-y-1">
                  <h4 className="font-black text-sm tracking-wide m-0">
                    {shopSettings.shopName || "ZARYAB SPRAY CENTER"}
                  </h4>
                  <p className="text-[9px] text-slate-600 m-0 leading-sm tracking-tight">
                    {shopSettings.shopAddress}
                  </p>
                  <p className="text-[9px] text-slate-600 m-0">
                    Phone: {shopSettings.contactNumber}
                  </p>
                  {shopSettings.emailAddress && (
                    <p className="text-[9px] text-slate-600 m-0">
                      Email: {shopSettings.emailAddress}
                    </p>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Metadata */}
                <div className="space-y-0.5 text-[9px] text-slate-700">
                  <div className="flex justify-between">
                    <span>Invoice No:</span>
                    <span className="font-bold">{completedSale.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date & Time:</span>
                    <span>{new Date(completedSale.date).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cashier Name:</span>
                    <span>{completedSale.cashierName}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 mt-1 font-bold text-black border-dashed">
                    <span>Customer Name:</span>
                    <span>{completedSale.customerName}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Items list */}
                <div className="space-y-2 text-[9px] text-black">
                  <div className="grid grid-cols-4 font-bold text-[8px] text-slate-500">
                    <span className="col-span-2">Product Description</span>
                    <span className="text-center">Qty / Rate</span>
                    <span className="text-right">Total</span>
                  </div>
                  
                  {completedSale.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-4 items-start gap-1">
                      <span className="col-span-2 font-bold text-[10px] lowercase capitalize">{item.name}</span>
                      <span className="text-center text-slate-600 font-bold whitespace-nowrap">
                        {item.quantity} x {item.unitPrice}
                      </span>
                      <span className="text-right font-bold font-mono">
                        {(item.quantity * item.unitPrice).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Financial breakdown math */}
                <div className="space-y-1 text-[10px] text-slate-800">
                  <div className="flex justify-between">
                    <span>Gross Subtotal</span>
                    <span>{currencySymbol} {completedSale.subtotal.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Applied Discount</span>
                    <span>- {currencySymbol} {completedSale.discount.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between border-t border-dashed border-slate-305 pt-1.5 font-bold text-black text-sm">
                    <span>GRAND TOTAL DUE</span>
                    <span>{currencySymbol} {completedSale.grandTotal.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between pt-1 text-[9px]">
                    <span>Cash Received Cashier</span>
                    <span>{currencySymbol} {completedSale.cashReceived.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-slate-600 font-bold text-[9px]">
                    <span>Balance Returned Change</span>
                    <span>{currencySymbol} {completedSale.balanceReturn.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Footer Message */}
                <div className="text-center space-y-1">
                  <p className="text-[8px] font-bold text-slate-600 leading-tight">
                    {shopSettings.receiptFooterMessage}
                  </p>
                  <p className="text-[10px] font-bold text-black mt-2">
                    *** Thank You For Your Valued Purchase ***
                  </p>
                  <p className="text-[9px] text-slate-550">
                    Visit Us Again Simple CRM Ledgers
                  </p>
                </div>

              </div>
            </div>

            {/* Print and dismiss actions bar */}
            <div className="p-4 border-t border-slate-200 bg-white shrink-0 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setIsReceiptModalOpen(false);
                  setCompletedSale(null);
                }}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Dismiss Receipt
              </button>
              
              <button
                onClick={handleTriggerNativePrint}
                className="py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-white" />
                Print Cash Slip (Prn)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
