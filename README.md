# BORO · EQUIPRO

**Access equipment when you need it.** BORO is an equipment rental marketplace and asset lifecycle platform. Customers discover and match gear, check real date availability, book, track their rentals, request returns and review completed rentals. Owners manage listings, bookings, pickup, active rentals, return inspection, revenue analytics and transparent rule-based opportunities. Admins manage users, equipment, categories, bookings and review moderation.

## Architecture
One TypeScript monorepo: React/Vite/React Router/Axios/FullCalendar/Recharts client; Express REST API, JWT/bcryptjs/Zod, Mongoose/MongoDB server. MongoDB owns equipment, users, bookings, reviews, logs and notifications. See [ARCHITECTURE.md](documentation/ARCHITECTURE.md), [API.md](documentation/API.md), and [DATABASE.md](documentation/DATABASE.md).

## Prerequisites
- Node.js 20 or newer and npm.
- MongoDB Atlas (recommended) or a local MongoDB **replica set**. Booking check-and-create and lifecycle transitions use MongoDB transactions.
- Cloudinary is optional. Without credentials, equipment can use image URLs; the UI reports the upload provider state.

## Local setup (PowerShell)
From this repository folder:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```
Edit `server/.env`: set `MONGODB_URI` to an Atlas database URI or local replica-set URI, and replace `JWT_SECRET` with a unique random string of at least 32 characters. Keep `.env` files private; they are ignored by Git. For Atlas, configure a database user and network/IP access in Atlas. Do not paste credentials into source files. Configure distinct `SEED_ADMIN_PASSWORD` and `SEED_DEMO_PASSWORD` values locally; both must be at least 24 characters. These values are not printed by the application.

Install and prepare demo data:

```powershell
npm install
npm run seed
```
Start the API and client in development (the API requires a reachable MongoDB and valid `JWT_SECRET`; an API startup failure will no longer stop Vite):

```powershell
npm run dev
```
Open http://localhost:5173. API health is at http://localhost:4000/api/health. The API will stop with a clear message if MongoDB cannot be reached or the JWT secret is still the example value.

For a web preview without a database, build the client with `npm run build -w client`, then serve that build on port 5173 with `npm run preview:web`. For hot reload, use `npm run dev:web`. The API can be started separately with `npm run dev:api` after MongoDB and `server/.env` are configured. These commands are also useful for isolating frontend or API startup issues.

### Local MongoDB replica set
The local example URI expects replica set `rs0`. Start MongoDB with a replica-set name (choose a persistent data path):

```powershell
New-Item -ItemType Directory -Force C:\data\boro | Out-Null
mongod --replSet rs0 --dbpath C:\data\boro
```
In a second terminal, initialize it once:

```powershell
mongosh --eval "rs.initiate()"
```
Then set `MONGODB_URI=mongodb://127.0.0.1:27017/boro?replicaSet=rs0` in `server/.env`.

## Demo accounts
Seed account passwords are configured locally in the ignored `server/.env`. Set distinct values for `SEED_ADMIN_PASSWORD` and `SEED_DEMO_PASSWORD`; do not commit or share them.

- Admin: `admin@boro.demo`
- Owner: `owner@boro.demo`
- Owner: `riley@boro.demo`
- Customer: `customer@boro.demo`
- Customer: `taylor@boro.demo`

`npm run seed` **clears and recreates BORO domain collections** in the configured database. Use only with a development database.

To rotate existing seeded accounts without replacing demo data, run 
pm run seed:credentials -w server. It reads the two password values from the ignored server/.env and does not print them.

## Demo flow
Customer login → Browse or BORO Match (category, use case, budget, duration, minimum rating, optional dates) → equipment detail with interactive FullCalendar and busy rental ranges → server-side Conflict Shield → booking confirmation → customer dashboard → owner workspace accepts and manages pickup/active/return/inspection → successful inspection releases equipment → owner analytics and rule-based opportunities update from stored bookings.

Rental intervals are half-open `[pickup, return)`: a return date can be booked by the next renter on that date. Conflict predicate: `existing.startDate < requested.endDate && existing.endDate > requested.startDate`.

## Useful commands

```powershell
npm run typecheck
npm run test -w server
npm run build
```

## Media
Set all three `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` variables to enable Cloudinary uploads. The workspace shows the configured provider; if absent, the equipment manager accepts an image URL. No credentials are checked into this repository.

## Deployment
Build with `npm run build`; run `npm run start -w server` and host `client/dist` on a static host with SPA history fallback. Provide `MONGODB_URI`, a random `JWT_SECRET`, `CLIENT_URL`, and a client build-time `VITE_API_URL`. Use MongoDB Atlas or a replica-set MongoDB deployment for transaction support, HTTPS, a secret manager and a suitable Atlas IP allowlist. Payments are status fields only; no payment provider is integrated.

## Security and scope
Passwords are bcrypt-hashed; JWT protected routes use role middleware; Zod validates mutations; Helmet, CORS allowlisting and API rate limits are enabled. Image uploads are restricted to owner/admin roles. Booking status updates follow a transition graph and are written with rental logs and notifications in a transaction. This repository does not implement payment processing or identity verification.
