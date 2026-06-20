import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sb } from './_sb';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { username, password } = req.body;
  const data = await sb('GET', `users?username=eq.${encodeURIComponent(username)}&select=*`);
  const user = data?.[0];
  if (!user) return res.status(401).json({ error: 'Invalid username. User not found.' });
  if (!user.active) return res.status(403).json({ error: 'Account deactivated.' });
  if (user.password !== password) return res.status(412).json({ error: 'Incorrect password.' });
  // Log login
  await sb('POST', 'activity_logs', { id: `LOG-${Date.now()}`, date: new Date().toISOString(), user_id: user.id, user_name: user.name, action: 'User Logged In', details: `${user.name} logged in` }).catch(() => {});
  res.json({ user: { id: user.id, username: user.username, name: user.name, role: user.role, active: user.active } });
}
