# EasyRide — deploy live on Render + MongoDB Atlas

The app is prepared as **one Render web service** that serves both the React build and the Express API from the same URL. This avoids CORS and API-URL configuration entirely.

You need: a GitHub account, a Render account (sign up with GitHub), and a MongoDB Atlas account (free). No credit card is required for any step below.

---

## 1. Create the free MongoDB database (Atlas)

1. Go to https://cloud.mongodb.com and sign up / log in.
2. Create a project, then **Build a Database** → choose **M0 FREE** → provider AWS, region **Mumbai (ap-south-1)** → Create.
3. **Database Access** → **Add New Database User** → Authentication: Password → username `easyride`, click **Autogenerate Secure Password** and save it somewhere.
4. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) → Confirm. (Required because Render uses changing IPs.)
5. **Database → Connect → Drivers** → copy the connection string. It looks like:
   `mongodb+srv://easyride:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   Replace `<password>` with the saved password and add the database name before `?`:
   `.../easyride?retryWrites=true&w=majority`
   Keep this string — it is your `MONGO_URI`.

## 2. Push the code to a new GitHub repository

Create an **empty** repository on GitHub (no README), e.g. `easyride`. Then in a terminal:

```bash
cd ~/Documents/Qoder/2026-11-15/ff99c514
git init -b main
git add .
git commit -m "EasyRide full-stack car rental platform"
git remote add origin https://github.com/<your-username>/easyride.git
git push -u origin main
```

`.env`, `node_modules` and `dist` are excluded by `.gitignore`; the 11 car photos under `backend/uploads/cars` are included so the seeded fleet has images.

## 3. Deploy on Render

1. Go to https://render.com → **Get Started** → sign in with GitHub.
2. **New → Blueprint** → select your `easyride` repository → **Connect**.
3. Render reads `render.yaml` and asks for `MONGO_URI`. Paste the Atlas string from step 1.
4. Click **Apply / Deploy** and wait 3–6 minutes.
5. Your site is live at `https://easyride-XXXX.onrender.com` (shown at the top of the service page).

`JWT_SECRET` is generated automatically; the admin, 5% platform fee, and demo UPI settings are already in `render.yaml`.

## 4. Load the demo fleet once

The database starts empty. Seed it **once** from the Render dashboard:

Free instances do not include the Render **Shell**. Seed from your laptop against the same Atlas database instead:

1. Put the Render `MONGO_URI` value into `backend/.env`.
2. Run:
   ```bash
   cd backend
   npm run seed
   ```

This creates the admin, two providers, one customer, and 11 cars (it is safe to run again — it never duplicates). Then open the site and log in:

| Role | Email | Password |
| --- | --- | --- |
| Admin | private — set by the owner | — |
| Provider | `priya@easyride.com` | `Demo@123` |
| Customer | `customer@easyride.com` | `Demo@123` |

---

## Important notes before your presentation

- **Free tier sleeps:** after ~15 minutes with no visitors the service sleeps; the next visit takes 30–60 seconds to wake. Open the site once a few minutes before presenting.
- **New photo uploads are temporary:** Render's free filesystem resets on restart/redeploy. The 11 bundled fleet photos always remain; photos uploaded through "Add car" may disappear after a restart. A paid Render Disk fixes this later.
- **Payments stay in Demo UPI mode** (no real money) until you add Razorpay keys in Render → Environment.
- **Demo passwords are public.** That is fine for a college demo; change `ADMIN_PASSWORD` in Render if you want a private admin.
- **Data persists** in Atlas, so cars, bookings, and payments survive redeploys and restarts.
- To update the live site later: `git add . && git commit -m "update" && git push` — Render redeploys automatically.
