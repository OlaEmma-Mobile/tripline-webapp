Absolutely! Let’s take a **step back** and go over the **full data flow of your V1 MVP**, so every interaction—rider, driver, admin, and mobile app—is clear. I’ll also integrate the **previous entity/API/UI plan** into this explanation so you have a single, complete picture.

---

# **Full V1 Data Flow – Shared Corporate Mobility MVP**

We’ll discuss **each major flow**:

1. **User Onboarding (Rider & Driver)**
2. **Driver KYC**
3. **Subscription / Pass Purchase**
4. **Booking a Ride**
5. **Ride Day Flow (Pickup → Completion)**
6. **Admin Dashboard Monitoring**
7. **Payments & Credit Management**
8. **Realtime Seat & Ride Status Updates**

---

## **1️⃣ User Onboarding Flow**

### **Rider**

1. Signs up via mobile app (`POST /api/auth/signup`) → receives JWT
2. Logs in (`POST /api/auth/login`) → JWT stored on mobile
3. Profile info saved in `users` table

### **Driver**

1. Signs up via mobile (`POST /api/auth/signup`) → JWT issued
2. Fills KYC documents (`POST /api/drivers/kyc`) → stored in `driver_kyc` table with status `pending`
3. Cannot view rides or pickup until KYC verified

**Key Points:**

* JWT token ensures mobile API calls are secure
* Supabase is DB only; all authentication logic is in your Next.js backend
* Admin views and approves driver KYC (`PATCH /api/drivers/kyc/:id/verify`) → sets `kyc_status = verified`

---

## **2️⃣ Driver KYC Flow**

* Driver submits:

  * License number + photo
  * Vehicle registration photo
  * Guarantor info
* Admin reviews on web dashboard
* Status updated:

  * `pending → verified` → driver can be assigned to rides
  * `rejected` → driver must resubmit documents

**V1 Simplification:**

* No automated OCR
* Manual admin verification sufficient for 3–5 pilot drivers

**Tables involved:** `driver_kyc`, `users`, `vehicles`

---

## **3️⃣ Subscription / Pass Purchase Flow**

* Rider selects subscription type: daily/weekly/monthly pass
* Mobile app calls `POST /api/subscriptions` → Paystack payment initiated
* Payment verified (`POST /api/payments/verify`) → subscription credits added (`subscriptions.remaining_credits`)
* Rider can now book rides using credits

**Tables involved:** `subscriptions`, `payments`

**V1 Simplification:**

* No wallet system; credits are tied to route/subscription
* Refund/credit adjustments handled if ride cancelled by driver

---

## **4️⃣ Booking a Ride Flow**

1. Rider queries available routes and rides:

   * `GET /api/routes`
   * `GET /api/routes/:id/availability?date=YYYY-MM-DD`
2. Mobile app shows seat availability in real time (Supabase Realtime optional)
3. Rider books a ride (`POST /api/bookings`)

   * System checks remaining subscription credits → decrement by 1
   * Booking created in `bookings` table, status = `booked`
4. Seat availability updates automatically via Realtime

**Tables involved:** `bookings`, `subscriptions`, `rides`, `routes`

**Mobile UI:**

* Rider sees bookings
* View status: booked / cancelled / completed

**Driver UI:**

* Rider appears on manifest once booked

---

## **5️⃣ Ride Day Flow (Pickup → Completion)**

1. **Driver receives manifest:** `GET /api/drivers/:id/manifest?date=YYYY-MM-DD`
2. **Pickup confirmation:**

   * Driver marks riders as picked up: `PATCH /api/bookings/:id/picked_up`
   * Booking status updated
3. **Ride Completion:**

   * At end of route, driver marks ride completed: `PATCH /api/rides/:id/complete`
   * All picked_up bookings → status = completed
4. **Compensation / credits:**

   * If driver cancels → increment subscription credits for riders
   * Rider no-show → credit consumed

**Tables involved:** `rides`, `bookings`, `subscriptions`

**Mobile UI:**

* Driver: mark picked up / completed
* Rider: see ride status / completed rides

---

## **6️⃣ Admin Dashboard Monitoring**

**Web UI functions:**

* View users / companies
* Manage routes, vehicles, rides
* Approve driver KYC submissions
* View bookings, subscription credits, payments
* Track ride completion & cancellations

**Tables involved:** all core tables

**Flow:**

* Admin can adjust credits if a ride is cancelled
* Can see driver compliance and booking history

---

## **7️⃣ Payments & Credit Management Flow**

1. Rider initiates payment for subscription
2. Backend calls Paystack API (`POST /api/payments/init`)
3. Payment verified via webhook (`POST /api/payments/verify`)
4. Credits added to `subscriptions.remaining_credits`
5. Any ride cancellation → update remaining credits

**Tables involved:** `payments`, `subscriptions`

**Simplification for V1:**

* No wallet storage
* Credits tied to subscription only
* Admin can manually adjust credits if needed

---

## **8️⃣ Realtime Seat & Ride Status Updates**

* **Seat availability:**

  * Triggered when bookings created/cancelled
  * Supabase Realtime broadcasts updates to rider mobile apps

* **Ride status:**

  * Triggered when driver marks `picked_up` or ride `completed`
  * Mobile app receives real-time notifications

**Benefits:**

* Riders always see up-to-date seat availability
* Drivers see accurate manifest updates
* Admin can monitor in near real-time

---

# **Putting It All Together – Full V1 Overview**

### **Entities + API + Mobile/Web UI**

| Entity       | API Endpoints           | Web/Admin                         | Rider Mobile                          | Driver Mobile                            |
| ------------ | ----------------------- | --------------------------------- | ------------------------------------- | ---------------------------------------- |
| User         | Signup/Login, profile   | Manage users                      | Signup/login, profile                 | Signup/login, profile                    |
| Company      | CRUD                    | Manage companies                  | n/a                                   | n/a                                      |
| Route        | CRUD, availability      | Create/edit routes, view bookings | Search routes, view seats             | Assigned route info                      |
| Ride         | CRUD, complete/cancel   | Create rides, track status        | See ride status                       | Daily schedule, mark picked_up/completed |
| Booking      | CRUD, pickup/completion | View bookings per ride            | Book, see status, completed rides     | Manifest, mark picked_up/completed       |
| Subscription | Purchase/adjust credits | View subscriptions                | View remaining credits, purchase pass | n/a                                      |
| Vehicle      | CRUD                    | Manage vehicles                   | n/a                                   | View assigned vehicle                    |
| Payment      | Init/verify, view       | View payments                     | Make payment, view status             | n/a                                      |
| Driver KYC   | Submit, approve/reject  | Review & approve/reject           | Submit documents, view status         | Submit documents, view status            |

---

### **V1 MVP 2-Week Plan (Step-by-Step)**

**Week 1 – Core Setup & Booking Flow**

1. Day 1–2: Next.js + Supabase setup, create DB tables
2. Day 3: JWT auth + signup/login APIs, mobile test
3. Day 4: Route APIs + UI (seat availability)
4. Day 5: Ride APIs + web UI (schedule & status)
5. Day 6: Booking APIs + seat locking, subscription credit logic
6. Day 7: Driver KYC submission + admin verification UI

**Week 2 – Payments, Ride Completion, Realtime**
7. Day 8: Payment integration (Paystack) + subscription pass APIs
8. Day 9: Driver manifest APIs + mobile UI (mark picked up)
9. Day 10: Ride completion API → update bookings
10. Day 11: Admin dashboard for all entities
11. Day 12: Mobile integration for bookings, subscriptions, ride status
12. Day 13: Realtime updates via Supabase Realtime
13. Day 14: Deploy V1, final QA, generate API docs

---

### **V1 Constraints / Simplifications**

* Wallet: ❌ (subscription credit system only)
* Ride completion: ✅ driver marks picked up → completed
* Driver KYC: ✅ required before ride assignment
* Supabase: strictly database + optional realtime
* JWT: ✅ required for all API calls
* Pilot route: ✅ single route initially

---

This plan now gives you a **full understanding of data flow**, who interacts with which entity, how APIs are consumed, and how web and mobile UI are linked to the backend.

---

If you want, I can now **draw a visual flow diagram** showing **all interactions between entities, APIs, mobile, driver, and admin**, so you’ll have a **single map of data flow for your V1 MVP**.

Do you want me to create that diagram next?
