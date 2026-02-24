Perfect — let’s **update your full V1 plan** to include **intermediate pickup points**, route mapping with latitude/longitude, ride completion, driver KYC, subscription credits, and JWT-secured APIs. I’ll integrate **everything we’ve discussed** into a single, actionable developer roadmap.

---

# **Updated Full V1 Plan – Shared Corporate Mobility MVP**

**Tech Stack:**

* **Frontend (Web/Admin):** Next.js + Tailwind
* **Mobile App:** Flutter / React Native
* **Backend:** Next.js API Routes (JWT authentication)
* **Database:** Supabase Postgres
* **Realtime:** Supabase Realtime (seat availability + ride status)
* **Payments:** Paystack (subscription passes)
* **Auth:** JWT for all API requests

---

# **1️⃣ Entities, APIs, and UI**

| Entity                  | API Endpoints                                                                                                                                                                                        | Web/Admin UI                                                                         | Mobile UI                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **User**                | `POST /api/auth/signup` <br> `POST /api/auth/login` <br> `GET /api/users/me` <br> `PATCH /api/users/:id`                                                                                             | Admin: list users, assign roles                                                      | Rider: signup/login, profile <br> Driver: signup/login, profile                                 |
| **Company**             | `POST /api/companies` <br> `GET /api/companies` <br> `PATCH /api/companies/:id`                                                                                                                      | Admin: create/edit companies, view list                                              | n/a                                                                                             |
| **Route**               | `POST /api/routes` <br> `GET /api/routes` <br> `GET /api/routes/:id` <br> `PATCH /api/routes/:id` <br> `DELETE /api/routes/:id` <br> `GET /api/routes/:id/availability`                              | Admin: create/edit route, view total seats, bookings per route, manage pickup points | Rider: search routes, see seat availability, select pickup/dropoff points                       |
| **Route Pickup Points** | `POST /api/routes/:route_id/pickup_points` <br> `GET /api/routes/:route_id/pickup_points` <br> `PATCH /api/routes/:route_id/pickup_points/:id` <br> `DELETE /api/routes/:route_id/pickup_points/:id` | Admin: add/edit/remove pickup points, map view optional                              | Rider: select nearest pickup/dropoff point                                                      |
| **Ride / Trip**         | `POST /api/rides` <br> `GET /api/rides?date=YYYY-MM-DD` <br> `PATCH /api/rides/:id/complete` <br> `PATCH /api/rides/:id/cancel`                                                                      | Admin: create rides, track status                                                    | Driver: daily schedule, mark ride completed/cancelled <br> Rider: see ride status/notifications |
| **Booking**             | `POST /api/bookings` <br> `GET /api/bookings` <br> `PATCH /api/bookings/:id/cancel` <br> `PATCH /api/bookings/:id/picked_up` <br> `PATCH /api/bookings/:id/completed`                                | Admin: view bookings per ride                                                        | Rider: book ride, see status, completed rides <br> Driver: manifest, mark picked up/completed   |
| **Subscription / Pass** | `POST /api/subscriptions` <br> `GET /api/subscriptions` <br> `PATCH /api/subscriptions/:id`                                                                                                          | Admin: view subscriptions, adjust credits                                            | Rider: view remaining credits, see expiry, purchase pass                                        |
| **Vehicle**             | `POST /api/vehicles` <br> `GET /api/vehicles` <br> `PATCH /api/vehicles/:id` <br> `DELETE /api/vehicles/:id`                                                                                         | Admin: create/edit/delete vehicles, assign to rides                                  | Driver: view assigned vehicle                                                                   |
| **Payment**             | `POST /api/payments/init` <br> `POST /api/payments/verify` <br> `GET /api/payments`                                                                                                                  | Admin: view payments, verify                                                         | Rider: make payment, view status                                                                |
| **Driver KYC**          | `POST /api/drivers/kyc` <br> `GET /api/drivers/kyc` <br> `PATCH /api/drivers/kyc/:id/verify` <br> `GET /api/drivers/:id`                                                                             | Admin: review documents, approve/reject                                              | Driver: submit documents, view status                                                           |

---

# **2️⃣ Updated Database Design**

**Users**

```sql
users (id, name, email, phone, role, created_at)
```

**Companies**

```sql
companies (id, name, contact_info, address, created_at)
```

**Routes**

```sql
routes (id, name, start_address, start_lat, start_lng, end_address, end_lat, end_lng, departure_times ARRAY, capacity INT, price INT, status ENUM('active','inactive'), created_at)
```

**Route Pickup Points**

```sql
route_pickup_points (id, route_id, name, lat, lng, sequence_order INT, created_at)
```

**Rides**

```sql
rides (id, route_id, driver_id, vehicle_id, date, status ENUM('scheduled','ongoing','completed','cancelled'), created_at)
```

**Bookings**

```sql
bookings (id, user_id, ride_id, seat_number, from_pickup_point_id, to_pickup_point_id, status ENUM('booked','picked_up','completed','cancelled'), created_at)
```

**Subscriptions**

```sql
subscriptions (id, user_id, route_id, total_credits, remaining_credits, valid_from, valid_until)
```

**Vehicles**

```sql
vehicles (id, driver_id, registration_number, capacity, status, created_at)
```

**Payments**

```sql
payments (id, user_id, subscription_id, amount, status ENUM('pending','successful','failed'), transaction_ref, created_at)
```

**Driver KYC**

```sql
driver_kyc (id, user_id, license_number, license_photo_url, vehicle_registration_photo_url, guarantor_name, guarantor_contact, kyc_status ENUM('pending','verified','rejected'), created_at, updated_at)
```

---

# **3️⃣ Updated Booking / Ride Flow With Intermediate Pickup Points**

**Step 1: Rider searches**

* Enters “From” → finds nearest `pickup_points`
* Enters “To” → finds nearest `pickup_points` further along route (`sequence_order` must be increasing)

**Step 2: Backend finds matching route**

* Checks active routes
* Checks `from_pickup_point.sequence_order < to_pickup_point.sequence_order`
* Checks seat availability

**Step 3: Rider books**

* Booking created → decrement subscription credit
* Booking stores: `from_pickup_point_id` → `to_pickup_point_id`

**Step 4: Ride Day**

* Driver marks `picked_up` per rider
* Ride ends → all `picked_up` → `completed`

**Step 5: Admin / Mobile**

* Seat availability updated in realtime
* Rider sees booking and completion status

---

# **4️⃣ Updated Admin Route Page UI**

1. **List All Routes**

   * Route name, start → end, departure times, capacity, price, status
   * Actions: Edit / Delete / View Bookings

2. **Add/Edit Route**

   * Name
   * Start/End addresses → Google Places Autocomplete → lat/lng stored
   * Add pickup points → sequence order + map preview
   * Departure times
   * Capacity & price

3. **View Bookings per Route**

   * Quick link to see riders for each ride

---

# **5️⃣ Updated 2-Week V1 Development Plan**

**Week 1 – Core Setup & Route + Booking Flow**

1. Day 1–2: Next.js + Supabase setup; create all DB tables (users, companies, routes, route_pickup_points, rides, bookings, subscriptions, vehicles, payments, driver KYC)
2. Day 3: JWT auth, signup/login APIs; mobile auth test
3. Day 4: Route APIs (CRUD + pickup points) + web UI (map + table)
4. Day 5: Ride creation APIs + admin UI + route → pickup points mapping
5. Day 6: Booking APIs + seat locking + subscription credit logic
6. Day 7: Driver KYC submission API + admin verification UI

**Week 2 – Payments, Ride Completion, Realtime**
7. Day 8: Payment integration (Paystack) + subscription APIs
8. Day 9: Driver manifest APIs + mobile UI (mark picked up)
9. Day 10: Ride completion APIs → update bookings
10. Day 11: Admin dashboard for all entities + manage pickup points
11. Day 12: Mobile integration for bookings, subscriptions, ride status
12. Day 13: Realtime updates via Supabase Realtime
13. Day 14: Deploy V1, QA, API documentation

---

# ✅ **V1 Key Notes / Simplifications**

* Pickup points allow riders to board/disembark **mid-route**
* Fare is fixed per route for V1 → no segment pricing
* Seat availability is per ride → optional Realtime via Supabase
* Driver KYC required before assignment
* Ride completion tracked by driver marking picked up → completed
* No wallet → subscription credit system only
* Google Maps / Places API for addresses and lat/lng
* Admin manages routes, pickup points, rides, bookings, vehicles, KYC, and payments

---

This updated plan **fully integrates the “between points” scenario**, route mapping, ride completion, and KYC while keeping it lean for a V1 MVP.

---

If you want, I can **draw a complete flow diagram** showing:

```
Admin → Route + Pickup Points → Ride → Driver → Rider → Bookings → Subscription Credits → Realtime Updates
```

This visual map will make **implementation crystal clear**.
