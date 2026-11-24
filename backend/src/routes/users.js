// Клієнти (users). Користувач бачить і змінює тільки свій профіль.
const router = require('express').Router();
const db = require('../db');
const { auth } = require('../auth');

router.use(auth);

const FIELDS = 'id, name, email, phone, address';

// GET /api/users/me
router.get('/me', async (req, res) => {
  const result = await db.query(`SELECT ${FIELDS} FROM users WHERE id = $1`, [req.user.id]);
  res.json(result.rows[0]);
});

// PUT /api/users/me  { name, phone, address }
router.put('/me', async (req, res) => {
  const { name, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Потрібне name' });
  const result = await db.query(
    `UPDATE users SET name=$1, phone=$2, address=$3 WHERE id=$4 RETURNING ${FIELDS}`,
    [name, phone || null, address || null, req.user.id]
  );
  res.json(result.rows[0]);
});

// DELETE /api/users/me  (видалення акаунта разом із замовленнями)
router.delete('/me', async (req, res) => {
  await db.query('DELETE FROM users WHERE id = $1', [req.user.id]);
  res.status(204).end();
});

module.exports = router;
