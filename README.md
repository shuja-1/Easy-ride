# EasyRide — Online Car Rental Platform

A full-stack self-drive car rental marketplace built with **React (Vite)** and **Node.js + Express + MongoDB**. It supports three roles — Customer, Car Provider and Administrator — with real authentication, listing moderation, booking approvals, UPI payments and server-side verification.

## Feature summary

**Public**
- Responsive landing page with hero search (location, car type, pickup/return dates), fleet preview, services, about, how-it-works and contact sections
- Car listing page with search, city/type/price/date filters and sorting
- Car detail page with specs, similar cars, live price calculation and booking request

**Customer**
- Email/phone/password signup, secure login/logout (JWT + bcrypt)
- Search and filter available cars, choose dates, view auto-calculated total
- Send booking requests, view history and statuses, cancel unpaid requests
- Pay approved bookings by UPI (Razorpay UPI checkout or built-in demo verification flow)
- Payment history, profile and password updates

**Car Provider**
- Add cars with photo upload (Multer), name, model, registration number, type, price/day, fuel, seats, city and description
- Edit or delete own listings, toggle availability
- New listings stay pending until an administrator approves them
- Approve or reject incoming booking requests; net earnings after the platform fee

**Administrator**
- KPI dashboard: revenue, verified payments, users, providers, cars and bookings
- Revenue trend chart (last 6 months)
- Approve/reject car listings (with rejection reason), delete listings
- Manage customers and providers (block/unblock, delete)
- Update booking statuses and review all UPI payment records

**Security / correctness**
- Password hashing with bcrypt, JWT auth middleware, role-based route protection
- Server-side payment verification (HMAC signature for Razorpay, verified demo references)
- Booking overlap checks, approval-before-payment rule, cancellation only while unpaid
- Centralised validation and error handling, upload type/size checks
- Security headers and CORS allow-list

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 18, React Router 6, Vite 6, hand-written CSS design system |
| Backend | Node.js (ESM), Express 4, Mongoose 8 |
| Database | MongoDB |
| Auth | JWT, bcryptjs |
| Uploads | Multer (disk storage under `backend/uploads/cars`) |
| Payments | Razorpay Orders API + signature verification; demo UPI mode without keys |

## Project structure

```
easyride/
├── backend/
│   ├── config/db.js
│   ├── middleware/          # auth, roles, upload, errors
│   ├── models/              # User, Car, Booking, Payment
│   ├── routes/              # auth, cars, bookings, payments, admin
│   ├── utils/               # token, admin bootstrap, helpers
│   ├── uploads/cars/        # uploaded car photos
│   ├── seed.js              # sample users + fleet
│   ├── server.js
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/      # layout, cards, modals, forms, icons
    │   ├── context/         # Auth + Toast providers
    │   ├── pages/           # Home, Cars, CarDetails, auth, 3 dashboards
    │   ├── api.js
    │   ├── utils.js
    │   └── styles.css
    └── vite.config.js       # dev proxy: /api and /uploads -> :5050
```

## Prerequisites

- Node.js 18+ (tested on Node 24)
- npm 9+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas connection string

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env: set MONGO_URI, JWT_SECRET, and optionally Razorpay keys
npm run seed     # creates demo users, fleet and an admin account
npm start        # http://localhost:5050  (npm run dev for nodemon)
```

The API refuses to start without `JWT_SECRET`. An admin account is also created automatically on first start from `ADMIN_*` values if it does not exist.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

Vite proxies `/api` and `/uploads` to `http://localhost:5050`, so no frontend env file is required.

Production build:

```bash
cd frontend
npm run build
npm run preview  # http://localhost:4173
```

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@easyride.com` | `Admin@123` |
| Car Provider (Arjun) | `provider@easyride.com` | `Demo@123` |
| Car Provider (Priya) | `priya@easyride.com` | `Demo@123` |
| Customer | `customer@easyride.com` | `Demo@123` |

The login page has one-click autofill for the three primary accounts. The seeded fleet belongs to Arjun and Priya — use Priya's account when approving a booking on the Swift Dzire or Creta.

## Payments

**Demo mode (default):** with empty `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`, the payment modal shows a UPI ID, deep links for GPay/PhonePe/Paytm and a reference field. "Use a demo reference" generates a `DEMO...` UTR; the backend validates and stores the payment, then marks the booking paid. No real money moves.

**Razorpay test/live mode:** add both keys to `backend/.env` and restart. The backend creates an order, the frontend opens Razorpay's UPI checkout, and the backend verifies the `razorpay_signature` with HMAC-SHA256 before recording the payment. Add your webhook/test cards as needed in the Razorpay dashboard.

### Platform fee and provider share

Every verified payment is split at the moment it is recorded, using `PLATFORM_FEE_PERCENT` in `backend/.env` (default **5%**):

- Customer pays the full booking amount.
- EasyRide retains `platformFee` = amount × 5%.
- The provider's share is `providerAmount` = amount − fee.
- The split is stored on each `Payment` record (`platformFeePercent`, `platformFee`, `providerAmount`).

Where it appears in the app:

- **Customer → Payments** history shows the platform/provider breakup under the amount.
- **Provider → Earnings** and each request card show the net payout after the fee; the stat card reads "Net earnings".
- **Admin → Overview and Payments** show gross collected, platform fee and provider payouts, plus per-payment fee/payout columns.

This is an in-app accounting ledger — no bank transfer is triggered in demo mode. With Razorpay Route (or manual monthly settlement) the stored `providerAmount` values can drive actual payouts later. Changing `PLATFORM_FEE_PERCENT` affects new payments; legacy records without a stored split are computed on the fly.

## API overview

| Method / path | Purpose |
| --- | --- |
| `POST /api/auth/register`, `POST /api/auth/login` | Signup and login |
| `GET/PUT /api/auth/me` | Current profile, profile/password update |
| `GET /api/cars`, `GET /api/cars/:id`, `GET /api/cars/locations` | Public fleet |
| `POST /api/cars` | Provider creates listing (multipart + photo) |
| `PUT/DELETE /api/cars/:id` | Provider edits/deletes own listing |
| `GET /api/cars/provider/mine` | Provider fleet |
| `POST /api/bookings` | Customer booking request |
| `GET /api/bookings/mine`, `PATCH /api/bookings/:id/cancel` | Customer bookings, cancellation |
| `GET /api/bookings/provider/all`, `PATCH /api/bookings/provider/:id` | Provider review/approve/reject |
| `POST /api/payments/create-order`, `POST /api/payments/verify` | UPI order + verification |
| `GET /api/payments/mine` | Customer payment history |
| `GET /api/admin/stats`, `/users`, `/cars`, `/bookings`, `/payments` | Admin views |
| `PATCH /api/admin/cars/:id/status`, `/users/:id/block`, `/bookings/:id` | Admin moderation |
| `GET /api/health` | Service + payment mode health check |

## Notes for the presentation

- Start MongoDB, then the backend and frontend; open `http://localhost:5173`.
- Suggested flow: Customer books a car → Provider approves → Customer pays via demo UPI → Admin sees revenue/payment → Admin approves new listings.
- Uploaded photos live in `backend/uploads/cars`; delete a car removes its uploaded file when it has no bookings.
- `backend/.env` is excluded from version control by the root `.gitignore`; commit only `.env.example`.
- Ports: backend **5050**, Vite dev **5173**, preview **4173**. If port 5050 is busy, change `PORT` and the proxy target in `frontend/vite.config.js`.

## Troubleshooting

- **Cannot reach the server** — confirm the backend is running on 5050 and `/api/health` responds.
- **Mongo connection error** — start `mongod`/MongoDB service or correct `MONGO_URI`.
- **Images not loading** — ensure `/uploads` is served by the backend and the Vite proxy is active.
- **Razorpay not opening** — keys missing or invalid; the app falls back to demo UPI instead of failing.
- **Fresh database** — run `npm run seed` again; the script skips existing emails.
