# Firebase Realtime Rules (Baseline)

Canonical rules file:
- `/Users/mac/Documents/tripline-webapp/firebase/rules.realtime.json`

Use these as a starting point for mobile direct access. Backend writes use Admin SDK and bypass rules.

```json
{
  "rules": {
    "realtime": {
      "rides": {
        "$rideId": {
          ".read": "auth != null",
          ".write": false
        }
      },
      "notifications": {
        "$userId": {
          ".read": "auth != null && auth.uid == $userId",
          ".write": "auth != null && auth.uid == $userId"
        }
      }
    }
  }
}
```

Operational policy:
- Drivers should update location through backend API, not direct client write.
- Ride read access should be narrowed in app layer to users with bookings for that ride.
- Notifications are user-scoped by UID.
