// Замовлення поточного користувача (всі маршрути потребують токен)
const router = require('express').Router();
const db = require('../db');
const { auth } = require('../auth');

router.use(auth);

const STATUSES = ['new', 'paid', 'shipped', 'done'];

// GET /api/orders?status=new
router.get('/', async (req, res) => {
  const status = req.query.status;
  let sql = `SELECT o.*, p.name AS product_name FROM orders o
             JOIN products p ON p.id = o.product_id WHERE o.user_id = $1`;
  const params = [req.user.id];
  if (status) {
    sql += ' AND o.status = $2';
    params.push(status);
  }
  const result = await db.query(sql + ' ORDER BY o.id DESC', params);
  res.json(result.rows);
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  const result = await db.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [
    req.params.id,
    req.user.id,
  ]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Замовлення не знайдено' });
  res.json(result.rows[0]);
});

// POST /api/orders  { product_id, quantity }
router.post('/', async (req, res) => {
  const { product_id, quantity } = req.body;
  if (!product_id || !Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: 'Потрібні product_id і quantity (ціле число >= 1)' });
  }
  const product = (await db.query('SELECT * FROM products WHERE id = $1', [product_id])).rows[0];
  if (!product) return res.status(404).json({ error: 'Товар не знайдено' });
  if (product.stock < quantity) return res.status(400).json({ error: 'Недостатньо товару на складі' });

  const total = product.price * quantity;
  await db.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, product_id]);
  const result = await db.query(
    'INSERT INTO orders (user_id, product_id, quantity, total) VALUES ($1, $2, $3, $4) RETURNING *',
    [req.user.id, product_id, quantity, total]
  );
  res.status(201).json(result.rows[0]);
});

// PUT /api/orders/:id  { status }
router.put('/:id', async (req, res) => {
  if (!STATUSES.includes(req.body.status)) {
    return res.status(400).json({ error: 'status має бути: ' + STATUSES.join(', ') });
  }
  const result = await db.query(
    'UPDATE orders SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
    [req.body.status, req.params.id, req.user.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Замовлення не знайдено' });
  res.json(result.rows[0]);
});

// DELETE /api/orders/:id  (повертає товар на склад)
router.delete('/:id', async (req, res) => {
  const result = await db.query('DELETE FROM orders WHERE id = $1 AND user_id = $2 RETURNING *', [
    req.params.id,
    req.user.id,
  ]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Замовлення не знайдено' });
  const order = result.rows[0];
  await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [order.quantity, order.product_id]);
  res.status(204).end();
});

module.exports = router;
