// Платежі за замовлення поточного користувача
const router = require('express').Router();
const db = require('../db');
const { auth } = require('../auth');

router.use(auth);

// GET /api/payments
router.get('/', async (req, res) => {
  const result = await db.query(
    `SELECT pay.* FROM payments pay JOIN orders o ON o.id = pay.order_id
     WHERE o.user_id = $1 ORDER BY pay.id DESC`,
    [req.user.id]
  );
  res.json(result.rows);
});

// GET /api/payments/:id
router.get('/:id', async (req, res) => {
  const result = await db.query(
    `SELECT pay.* FROM payments pay JOIN orders o ON o.id = pay.order_id
     WHERE pay.id = $1 AND o.user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Платіж не знайдено' });
  res.json(result.rows[0]);
});

// POST /api/payments  { order_id, method }  - сума береться із замовлення
router.post('/', async (req, res) => {
  const { order_id, method } = req.body;
  if (!order_id || !['card', 'cash'].includes(method)) {
    return res.status(400).json({ error: 'Потрібні order_id і method (card або cash)' });
  }
  const order = (
    await db.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [order_id, req.user.id])
  ).rows[0];
  if (!order) return res.status(404).json({ error: 'Замовлення не знайдено' });
  if (order.status !== 'new') return res.status(400).json({ error: 'Замовлення вже оплачене' });

  const result = await db.query(
    'INSERT INTO payments (order_id, amount, method) VALUES ($1, $2, $3) RETURNING *',
    [order_id, order.total, method]
  );
  await db.query("UPDATE orders SET status = 'paid' WHERE id = $1", [order_id]);
  res.status(201).json(result.rows[0]);
});

// DELETE /api/payments/:id  (скасування платежу, замовлення знову 'new')
router.delete('/:id', async (req, res) => {
  const result = await db.query(
    `DELETE FROM payments USING orders o
     WHERE payments.id = $1 AND o.id = payments.order_id AND o.user_id = $2
     RETURNING payments.order_id`,
    [req.params.id, req.user.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Платіж не знайдено' });
  await db.query("UPDATE orders SET status = 'new' WHERE id = $1", [result.rows[0].order_id]);
  res.status(204).end();
});

module.exports = router;
