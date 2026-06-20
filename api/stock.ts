
const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_KEY!;
async function sb(method: string, endpoint: string, body?: any) {
  const res = await fetch(`${SB_URL}/rest/v1/${endpoint}`, { method, headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text(); return text ? JSON.parse(text) : null;
}
const mt = (t: any) => ({ id: t.id, productId: t.product_id, productName: t.product_name, type: t.type, subType: t.sub_type, quantity: t.quantity, date: t.date, supplierId: t.supplier_id, supplierName: t.supplier_name, notes: t.notes, userId: t.user_id, userName: t.user_name });
export default async function handler(req: any, res: any) {
  if (req.method === 'GET') { const data = await sb('GET', 'stock_transactions?select=*&order=date.desc'); return res.json((data||[]).map(mt)); }
  if (req.method === 'POST') {
    const { currentUserId, productId, type, subType, quantity, supplierId, notes } = req.body;
    if (!productId||!type||!subType||!quantity) return res.status(400).json({ error: 'Missing required fields.' });
    const prods = await sb('GET', `products?id=eq.${productId}&select=*`);
    const p = prods?.[0]; if (!p) return res.status(404).json({ error: 'Product not found.' });
    const qty = Number(quantity); if (qty<=0) return res.status(400).json({ error: 'Quantity must be greater than zero.' });
    const newQty = type==='IN' ? p.quantity+qty : p.quantity-qty;
    if (newQty<0) return res.status(400).json({ error: `Insufficient stock. Only ${p.quantity} available.` });
    await sb('PATCH', `products?id=eq.${productId}`, { quantity: newQty });
    const users = await sb('GET', `users?id=eq.${currentUserId}&select=*`); const user = users?.[0];
    let supName = null;
    if (supplierId) { const sups = await sb('GET', `suppliers?id=eq.${supplierId}&select=*`); supName = sups?.[0]?.name||null; }
    const txn = { id: `TXN-${Date.now()}`, product_id: productId, product_name: p.name, type, sub_type: subType, quantity: qty, date: new Date().toISOString(), supplier_id: supplierId||null, supplier_name: supName, notes: notes||'', user_id: currentUserId, user_name: user?.name||'Admin' };
    const data = await sb('POST', 'stock_transactions', txn);
    return res.status(201).json(mt(data?.[0]));
  }
  res.status(405).end();
}
