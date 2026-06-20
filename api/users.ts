
const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_KEY!;
async function sb(method: string, endpoint: string, body?: any) {
  const res = await fetch(`${SB_URL}/rest/v1/${endpoint}`, { method, headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text(); return text ? JSON.parse(text) : null;
}
export default async function handler(req: any, res: any) {
  const id = req.query.id as string;
  const toggle = req.query.toggle === '1';
  if (req.method === 'GET') {
    const data = await sb('GET', 'users?select=*');
    return res.json((data || []).map((u: any) => ({ id: u.id, username: u.username, name: u.name, role: u.role, active: u.active })));
  }
  if (req.method === 'POST') {
    const { username, name, role, password } = req.body;
    if (!username || !name || !role || !password) return res.status(400).json({ error: 'Missing required fields.' });
    const exists = await sb('GET', `users?username=eq.${encodeURIComponent(username)}&select=id`);
    if (exists?.length > 0) return res.status(400).json({ error: 'Username already exists.' });
    const data = await sb('POST', 'users', { id: `USR-${Date.now()}`, username: username.trim().toLowerCase(), name: name.trim(), role, password, active: true });
    const u = data?.[0];
    return res.status(201).json({ id: u.id, username: u.username, name: u.name, role: u.role, active: u.active });
  }
  if (req.method === 'PUT' && id && toggle) {
    const users = await sb('GET', `users?id=eq.${id}&select=*`);
    const user = users?.[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    await sb('PATCH', `users?id=eq.${id}`, { active: !user.active });
    return res.json({ success: true, active: !user.active });
  }
  if (req.method === 'PUT' && id) {
    const { username, name, role, password } = req.body;
    const upd: any = {};
    if (username) upd.username = username.trim().toLowerCase();
    if (name) upd.name = name.trim();
    if (role) upd.role = role;
    if (password?.trim()) upd.password = password;
    await sb('PATCH', `users?id=eq.${id}`, upd);
    return res.json({ success: true });
  }
  if (req.method === 'DELETE' && id) { await sb('DELETE', `users?id=eq.${id}`); return res.json({ success: true }); }
  res.status(405).end();
}
