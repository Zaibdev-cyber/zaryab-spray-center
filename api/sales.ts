
const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_KEY!;
async function sb(method: string, endpoint: string, body?: any) {
  const res = await fetch(`${SB_URL}/rest/v1/${endpoint}`, { method, headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text(); return text ? JSON.parse(text) : null;
}
const msa = (s: any) => ({ id: s.id, invoiceNumber: s.invoice_number, date: s.date, cashierId: s.cashier_id, cashierName: s.cashier_name, customerName: s.customer_name, subtotal: s.subtotal, discount: s.discount, grandTotal: s.grand_total, cashReceived: s.cash_received, balanceReturn: s.balance_return, items: s.items });
export default async function handler(req: any, res: any) {
  if (req.method === 'GET') { const data = await sb('GET', 'sales?select=*&order=date.desc'); return res.json((data || []).map(msa)); }
  if (req.method === 'POST') {
    const { currentUserId, customerName, discount, cashReceived, items } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'No products in cart.' });
    const users = await sb('GET', `users?id=eq.${currentUserId}&select=*`);
    const cashier = users?.[0];
    const ids = items.map((i: any) => i.productId).join(',');
    const products = await sb('GET', `products?id=in.(${ids})&select=*`);
    let subtotal = 0; const processed = [];
    for (const item of items) {
      const p = products.find((x: any) => x.id === item.productId);
      if (!p) return res.status(404).json({ error: `Product not found: ${item.productId}` });
      const qty = Number(item.quantity);
      if (p.quantity < qty) return res.status(400).json({ error: `Insufficient stock for ${p.name}. Available: ${p.quantity}` });
      const total = p.sale_price * qty; subtotal += total;
      processed.push({ productId: p.id, name: p.name, quantity: qty, unit: p.unit, unitPrice: p.sale_price, total });
    }
    const disc = Number(discount) || 0; const grand = Math.max(0, subtotal - disc); const paid = Number(cashReceived) || 0;
    if (paid < grand) return res.status(400).json({ error: `Insufficient cash. Bill: ${grand}, Paid: ${paid}` });
    for (const item of processed) {
      const p = products.find((x: any) => x.id === item.productId);
      await sb('PATCH', `products?id=eq.${item.productId}`, { quantity: p.quantity - item.quantity });
      await sb('POST', 'stock_transactions', { id: `TXN-SALE-${Date.now()}-${item.productId}`, product_id: item.productId, product_name: item.name, type: 'OUT', sub_type: 'MANUAL', quantity: item.quantity, date: new Date().toISOString(), notes: 'Sale', user_id: currentUserId, user_name: cashier?.name || 'Cashier' }).catch(() => {});
    }
    const allSales = await sb('GET', 'sales?select=id');
    const date = new Date().toISOString();
    const inv = `INV-${date.split('T')[0].replace(/-/g,'')}-${((allSales?.length||0)+1).toString().padStart(3,'0')}`;
    const sale = { id: `SAL-${Date.now()}`, invoice_number: inv, date, cashier_id: currentUserId, cashier_name: cashier?.name||'Admin', customer_name: (customerName||'').trim()||'Walk-in Customer', subtotal, discount: disc, grand_total: grand, cash_received: paid, balance_return: Math.max(0,paid-grand), items: processed };
    const data = await sb('POST', 'sales', sale);
    return res.status(201).json(msa(data?.[0]));
  }
  res.status(405).end();
}
