# Architecture

BORO is one TypeScript monorepo with a React/Vite client and an Express REST API. The browser uses React Router, Axios, FullCalendar and Recharts. Express routes validate request input, authenticate JWTs and enforce CUSTOMER/OWNER/ADMIN roles. Mongoose persists the domain in MongoDB Atlas or a local replica set.

## Component boundaries
- `client/src/main.tsx`: app routing, marketplace, matching, availability calendar, booking confirmation, customer/owner/admin workspaces and profile.
- `client/src/style.css`: responsive BORO design system.
- `server/src/routes.ts`: REST endpoints.
- `server/src/models/index.ts`: User, Equipment, Category, Booking, Review, RentalLog, Notification schemas and indexes.
- `server/src/services/booking.ts`: date overlap, lifecycle transitions, logs, notifications and overdue processing.
- `server/src/services/analytics.ts`: owner/admin MongoDB aggregation pipelines and rule-based recommendations.
- `server/src/services/media.ts`: optional Cloudinary provider and URL-based fallback state.
- `server/src/middleware/auth.ts`: JWT verification and role middleware.
- `server/src/scripts/seed.ts`: disposable demo database setup.

## Data and booking consistency
The API owns all booking availability decisions. Intervals are half-open `[startDate,endDate)`. An overlap exists where `existing.startDate < requested.endDate && existing.endDate > requested.startDate`. PENDING, CONFIRMED, PICKUP_READY, ACTIVE and OVERDUE bookings block their dates. Maintenance blocks the equipment. Booking check and insertion, plus lifecycle changes and their event records, use MongoDB transactions. Run MongoDB as a replica set; Atlas clusters support this. A per-equipment write inside booking transactions serializes competing booking attempts for that equipment.

Lifecycle path: PENDING → CONFIRMED → PICKUP_READY → ACTIVE → RETURNED → INSPECTION → COMPLETED; inspections can transition through MAINTENANCE before completion. Owners process status changes. Active rentals that pass their return date are swept once a minute and marked OVERDUE. Customer return requests are persisted and notify the owner. Completing inspection returns equipment to AVAILABLE.

## Analytics and opportunities
Revenue, booking counts, monthly activity, utilization over the trailing 30 days, idle days since the last completed return, top assets, category performance, rental duration and weekday demand are queried from MongoDB. Opportunities use explicit rules over these aggregates; they are labeled `RULE_BASED`, not AI/ML.

## Media
Cloudinary is selected only when all required environment values exist. Authenticated owner/admin uploads return a Cloudinary secure URL. Without configured credentials, the API exposes URL-provider state and the listing form accepts externally hosted image URLs; uploads return a clear configuration error.

## Security boundaries
Passwords use bcrypt. JWTs require an environment secret. Mutations use Zod schemas and role/ownership checks. Helmet, a configured CORS origin and API rate limits are enabled. Error responses avoid returning stack traces. Seed users and passwords are development-only.
