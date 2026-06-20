export const URL = process.env.SUPABASE_URL!;
export const KEY = process.env.SUPABASE_KEY!;

export async function sb(method: string, endpoint: string, body?: any) {
  const res = await fetch(`${URL}/rest/v1/${endpoint}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const mp = (p: any) => ({ id: p.id, name: p.name, category: p.category, brand: p.brand, description: p.description, batchNumber: p.batch_number, purchasePrice: p.purchase_price, salePrice: p.sale_price, quantity: p.quantity, unit: p.unit, manufacturingDate: p.manufacturing_date, expiryDate: p.expiry_date, supplierId: p.supplier_id, imageUrl: p.image_url });
export const ms = (s: any) => ({ id: s.id, name: s.name, companyName: s.company_name, contactNumber: s.contact_number, email: s.email, address: s.address, notes: s.notes });
export const msa = (s: any) => ({ id: s.id, invoiceNumber: s.invoice_number, date: s.date, cashierId: s.cashier_id, cashierName: s.cashier_name, customerName: s.customer_name, subtotal: s.subtotal, discount: s.discount, grandTotal: s.grand_total, cashReceived: s.cash_received, balanceReturn: s.balance_return, items: s.items });
export const mset = (s: any) => ({ shopName: s.shop_name, shopAddress: s.shop_address, contactNumber: s.contact_number, emailAddress: s.email_address, receiptFooterMessage: s.receipt_footer_message, currencySymbol: s.currency_symbol, themeMode: s.theme_mode });
