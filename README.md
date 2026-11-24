# Інтернет-магазин — клієнт-серверний застосунок (Лабораторна №8)

Простий застосунок: **Node.js + Express** (REST API), **PostgreSQL**, фронтенд на **звичайному JS**, авторизація через **JWT**.

## Структура

```
shop/
├─ backend/
│  ├─ src/            app.js, server.js, db.js, auth.js, swagger.json, routes/
│  ├─ migrations/     init.sql (таблиці), seed.sql (початкові дані)
│  ├─ tests/          api.test.js (5 тестів)
│  └─ Dockerfile
├─ frontend/          index.html, app.js, style.css
├─ docker-compose.yml
└─ README.md
```

## Запуск через Docker (рекомендовано)

```bash
docker-compose up --build
```

- Сайт: http://localhost:3000
- Swagger (документація API): http://localhost:3000/api-docs
- Демо-користувач: `demo@shop.com` / `demo1234`

Таблиці створюються автоматично при старті сервера (міграція `init.sql`), товари додаються з `seed.sql`.

## Запуск без Docker

1. Встановити PostgreSQL і створити БД:
   ```sql
   CREATE USER shop WITH PASSWORD 'shop';
   CREATE DATABASE shop OWNER shop;
   ```
2. Запустити сервер:
   ```bash
   cd backend
   npm install
   npm start
   ```
   (Інший рядок підключення можна задати змінною `DATABASE_URL`.)

## Тести

Потрібна запущена БД (див. вище).

```bash
cd backend
npm test
```

Через Docker: `docker-compose run --rm backend npm test`

## API

Захищені маршрути потребують заголовок `Authorization: Bearer <token>`.

| Метод | URL | Доступ | Опис |
|-------|-----|--------|------|
| POST | /api/register | всі | Реєстрація |
| POST | /api/login | всі | Логін, повертає токен |
| GET | /api/products?search=&page=&limit= | всі | Товари: пошук + пагінація |
| GET | /api/products/:id | всі | Один товар |
| POST / PUT / DELETE | /api/products[/:id] | токен | Створити / змінити / видалити товар |
| GET | /api/orders?status= | токен | Мої замовлення (фільтр за статусом) |
| GET | /api/orders/:id | токен | Одне замовлення |
| POST | /api/orders | токен | Створити замовлення |
| PUT | /api/orders/:id | токен | Змінити статус |
| DELETE | /api/orders/:id | токен | Видалити замовлення |
| GET | /api/payments, /api/payments/:id | токен | Мої платежі |
| POST | /api/payments | токен | Оплатити замовлення |
| DELETE | /api/payments/:id | токен | Скасувати платіж |
| GET / PUT / DELETE | /api/users/me | токен | Мій профіль |

## Приклади запитів (curl)

```bash
# Логін
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@shop.com","password":"demo1234"}'

# Список товарів (пошук + пагінація)
curl "http://localhost:3000/api/products?search=миша&page=1&limit=5"

# Створити товар (підстав свій токен)
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Планшет","description":"10 дюймів","price":6999,"stock":5}'

# Замовити 2 штуки товару з id=1
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":2}'

# Оплатити замовлення
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"order_id":1,"method":"card"}'
```

Приклад відповіді `GET /api/products/1`:

```json
{ "id": 1, "name": "Ноутбук Lenovo IdeaPad", "description": "15.6\", 8 ГБ RAM, 512 ГБ SSD", "price": "24999.00", "stock": 10 }
```

Коди помилок: `400` — невірні дані, `401` — немає/невірний токен, `404` — не знайдено, `500` — помилка сервера.
