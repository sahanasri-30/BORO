# Database

MongoDB Mongoose collections: `users`, `categories`, `equipment`, `bookings`, `reviews`, `rentallogs`, `notifications`.

- **User**: unique normalized email, bcrypt password excluded from queries, CUSTOMER/OWNER/ADMIN role, phone, timestamps.
- **Category**: unique name, description and optional image.
- **Equipment**: owner and category references, name, description, image URLs, daily price, location, features, review summary and controlled operational state. Indexes cover owner, category, status and text search over name/description/location.
- **Booking**: references equipment/customer/owner; date range, amount, lifecycle, payment/pickup/return fields. Indexes cover equipment+status+date range, customer, owner, dates and status.
- **Review**: equipment/customer/booking references, 1–5 rating, comment; a unique booking index prevents duplicate reviews for one rental.
- **RentalLog**: booking/equipment references and timestamped lifecycle events.
- **Notification**: indexed user reference, type/message/read state and timestamps.

## Availability rules
Rental interval is `[startDate,endDate)`, in UTC. For requested `[s,e)`, a booking overlaps when `existing.startDate < e && existing.endDate > s`. This allows a checkout and the next pickup on the same date; equal or intersecting ranges conflict. PENDING, CONFIRMED, PICKUP_READY, ACTIVE and OVERDUE bookings block their interval. Equipment in MAINTENANCE is unavailable. An index on `{equipmentId,status,startDate,endDate}` narrows conflict queries. Booking check plus insert uses a MongoDB transaction and updates the equipment record inside that transaction to serialize concurrent requests; use a replica set or Atlas.

## Lifecycle
Status transitions are checked against a server-side graph. Each transition writes the Booking update, RentalLog, equipment state and Notification in one transaction. Customer return requests record the return workflow and notify the owner. A periodic service marks active rentals overdue after their exclusive return date passes. Inspection completion returns the equipment to AVAILABLE.

## Analytics
MongoDB aggregation pipelines use `$match`, `$lookup`, `$group`, `$project`, `$addFields`, `$map`, `$dateToString`, `$dayOfWeek` and date comparisons to calculate owner revenue/count/duration, booking trends, 30-day utilization, idle days, most rented equipment, category performance, weekday/weekend demand and platform totals. Opportunity rules operate on these persisted measurements and do not claim machine learning.
