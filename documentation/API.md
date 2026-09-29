# API

All endpoints are prefixed `/api`. Success: `{ "ok": true, "data": ... }`. Error: `{ "ok": false, "error": ... }`. Authenticated routes require `Authorization: Bearer <JWT>`.

## Authentication and profile
- `POST /auth/register` `{name,email,password,role?,phone?}`. Public roles: CUSTOMER or OWNER.
- `POST /auth/login` `{email,password}`.
- `GET /auth/me`, `PUT /auth/me` `{name?,phone?}`.

## Marketplace
- `GET /categories`; admin `POST/PUT/DELETE /categories`.
- `GET /equipment?q=&category=&location=&maxPrice=&minRating=`; `GET /equipment/:id`.
- `POST /equipment/match` `{categoryId?,purpose?,budget?,days?,startDate?,endDate?,minRating?}`. Scores and reasons are deterministic rule matches; result includes estimated total and real availability when dates are given.
- `GET /equipment/:id/availability?start=<ISO>&end=<ISO>` returns only blocking date ranges and maintenance state.
- Owner/admin `POST /equipment`, `PUT/DELETE /equipment/:id`, `PUT /equipment/:id/availability` (`AVAILABLE` or `MAINTENANCE`). Owners can only mutate their own assets.
- `GET /equipment/:id/reviews`.

## Media
- `GET /media/status` returns provider and configured state.
- Owner/admin `POST /media/equipment-image` `{dataUri}` accepts JPEG/PNG/WebP up to 5 MB and returns a Cloudinary URL. With no credentials, it responds with HTTP 503 and directs the client to use an image URL.

## Bookings and reviews
- `POST /bookings/check-availability` `{equipmentId,startDate,endDate}` (public availability check).
- Customer `POST /bookings` `{equipmentId,startDate,endDate}`; booking availability is rechecked inside the creation transaction.
- `GET /bookings/my` (customer bookings and owner listings), `GET /bookings/:id` (participant/admin; includes rental logs).
- Customer `POST /bookings/:id/return-request` requests return processing.
- Owner/admin `PUT /bookings/:id/status` `{status,notes?}` follows the lifecycle transition graph.
- Customer `POST /reviews` `{bookingId,rating,comment?}` after completion/inspection.

## Owner
- `GET /owner/equipment`, `GET /owner/bookings`, `GET /owner/analytics`, `GET /owner/opportunities`.

## Admin
- `GET /admin/users`, `PUT/DELETE /admin/users/:id` (deletion is blocked when rental/equipment history must be retained).
- `GET /admin/equipment`, `GET /admin/bookings`, `GET /admin/reviews`, `DELETE /admin/reviews/:id`.
- `GET /admin/stats`, `GET /admin/analytics` include aggregate monthly activity, rental status and category performance.
- `GET /notifications`.

Owner/admin protected endpoints require the corresponding role. Invalid input returns HTTP 400, missing/invalid authentication 401, role/ownership failures 403, conflicts 409, and missing records 404.
