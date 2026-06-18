import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import jwt from 'jsonwebtoken';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 9540;
const PAGAMENTO_SECRET = process.env.PAGAMENTO_JWT_SECRET || 'hotel_pagamento_secret';

app.use(express.json());

// Gera token para o MS Pagamento — secret fica server-side, não exposto no bundle
app.post('/api/payment-token', (_req, res) => {
  const token = jwt.sign({ usuario: 'hotel_front' }, PAGAMENTO_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

app.use(express.static(path.join(__dirname, 'dist')));

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hotel front rodando na porta ${PORT}`);
});
