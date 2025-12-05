import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use(express.static(path.join(__dirname, 'dist')));

app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    return res.status(500).json({ error: 'Admin password not configured' });
  }
  
  if (password === adminPassword) {
    return res.json({ success: true });
  } else {
    return res.status(401).json({ error: 'Invalid password' });
  }
});

app.post('/api/admin/verify-badge-password', (req, res) => {
  const { password } = req.body;
  const badgePassword = process.env.BADGE_PASSWORD;
  
  if (!badgePassword) {
    return res.status(500).json({ error: 'Badge password not configured' });
  }
  
  if (password === badgePassword) {
    return res.json({ success: true });
  } else {
    return res.status(401).json({ error: 'Invalid badge password' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
