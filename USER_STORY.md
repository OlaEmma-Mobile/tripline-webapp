Perfect — let’s turn the **data flow we just defined** into a **simple, clear user story** that follows a **rider, driver, and admin** through your V1 MVP. I’ll make it **step-by-step** and easy to follow.

---

# **User Story: Corporate Rider Booking a Ride**

**Actors:**

* Rider (employee)
* Driver
* Admin

---

## **Scenario: Rider books a ride on a corporate route, takes the ride, and ride is marked completed**

### **1️⃣ Rider Onboarding**

1. Rider downloads mobile app
2. Signs up with email/phone → `POST /api/auth/signup` → receives JWT
3. Logs in → `POST /api/auth/login` → JWT stored on mobile
4. Rider fills profile (optional: name, department) → `PATCH /api/users/me`

---

### **2️⃣ Subscription / Pass Purchase**

1. Rider selects subscription: “Weekly Pass”
2. Mobile app initiates payment → `POST /api/subscriptions` + Paystack
3. Payment verified → credits added to `subscriptions.remaining_credits`
4. Rider can now book rides without paying per trip

---

### **3️⃣ Rider Books a Ride**

1. Rider queries available routes → `GET /api/routes`
2. Rider selects route and date → `GET /api/routes/:id/availability`
3. Rider books a ride → `POST /api/bookings`

   * System checks subscription credits → decrements by 1
   * Booking created → `status = booked`
4. Rider sees booking confirmed in app
5. Seat availability updated in real-time for all riders

---

### **4️⃣ Driver KYC & Assignment**

1. Driver has submitted KYC documents (`POST /api/drivers/kyc`)
2. Admin reviews and approves KYC (`PATCH /api/drivers/kyc/:id/verify`)
3. Ride is assigned to verified driver + vehicle → `rides.driver_id`

---

### **5️⃣ Ride Day – Pickup**

1. Driver opens manifest → `GET /api/drivers/:id/manifest?date=YYYY-MM-DD`
2. Driver picks up riders
3. Driver marks each rider as picked up → `PATCH /api/bookings/:id/picked_up`

---

### **6️⃣ Ride Completion**

1. Ride ends → driver marks ride completed → `PATCH /api/rides/:id/complete`
2. All bookings with `status = picked_up` → updated to `completed`
3. Subscription credit consumed, ride history updated for rider
4. Admin dashboard shows completed ride, driver, and riders

---

### **7️⃣ Cancellations / Exceptions**

* If driver cancels → subscription credits returned to riders (`remaining_credits++`)
* If rider cancels 12+ hrs prior → credit returned
* No-show → credit consumed

---

### **8️⃣ Mobile & Admin Feedback**

* Rider sees updated ride status: “Picked Up” → “Completed”
* Driver sees manifest updates and completion confirmation
* Admin monitors bookings, rides, KYC, payments, and seat availability

---

# ✅ **Summary of Flow in Simple Terms**

**Rider → Mobile App → API → DB → Ride → Driver → Admin**

1. Signup/Login → JWT
2. Purchase pass → add credits
3. Book ride → booking record created → seat locked
4. Driver KYC verified → driver assigned
5. Driver marks pickup → bookings `picked_up`
6. Ride completed → bookings `completed`
7. Exceptions handled → credits updated
8. Realtime updates sent → mobile app reflects status

---

This user story **clearly demonstrates how data moves through your system** and how each actor interacts with the entities and APIs.
