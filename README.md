# Fleurish & Co. Delivery

Florist delivery management for **Fleurish & Co.** — Django, Django REST Framework, and React (Vite).

## Features

- **Auth:** create user (max **2** free seats), login, logout; upgrade request when seats are full
- **Customers** with name, business name, address, area, phone, delivery frequency, and active status
- **Delivery schedules** such as Friday Only, Wednesday + Friday, Mon/Wed/Fri, and Tuesday + Thursday
- **Auto-generated daily delivery records** for customers due on the selected day
- **Dashboard** with total / delivered / pending / not delivered counts
- Searchable and filterable delivery list with status updates and optional remarks
- Add / edit customers via modals
- Branded landing page and dashboard using the Fleurish & Co. logo and earthy floral theme

## Quick start

### Backend

```bash
cd /path/to/PetalRun
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py runserver 8800
```

API base: `http://127.0.0.1:8800/api/`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://127.0.0.1:5173`

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/signup-info/` | Seat usage / can signup |
| POST | `/api/auth/register/` | Create user (blocked after 2) |
| POST | `/api/auth/login/` | Login → token |
| POST | `/api/auth/logout/` | Logout (auth required) |
| GET | `/api/auth/me/` | Current user (auth required) |
| POST | `/api/auth/upgrade-request/` | Request more seats |
| GET | `/api/dashboard/?date=YYYY-MM-DD` | Stats for a day (auth) |
| GET | `/api/today/?date=&search=&status=&area=` | Today's delivery list (auth) |
| GET/POST | `/api/customers/` | List / create customers (auth) |
| GET/PUT/PATCH | `/api/customers/:id/` | Retrieve / update customer (auth) |
| GET | `/api/customers/areas/` | Distinct customer areas (auth) |
| GET | `/api/schedules/` | Delivery frequency options (auth) |
| PATCH | `/api/deliveries/:id/update_status/` | Set status + remarks (auth) |

Send `Authorization: Token <key>` on protected routes.

## Models

- `DeliverySchedule` — named patterns with weekday flags
- `Customer` — client details + FK to schedule + `is_active`
- `DeliveryRecord` — per-customer, per-date status (`pending`, `delivered`, `not_delivered`) and remarks

## Notes

Delivery rows for the selected date are created on demand when you hit `/api/dashboard/` or `/api/today/`. Changing a customer’s schedule affects future auto-generation; existing records keep their status.
