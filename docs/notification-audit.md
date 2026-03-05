# Notification Audit (Driver, Rider, Realtime, Push)

Date: 2026-03-04

## 1) Event -> Channel Matrix (Current vs Target)

| Event | Trigger Actor | Postgres `notifications` | Firebase RTDB `realtime/notifications/*` | FCM Push |
|---|---|---:|---:|---:|
| `booking.boarded` | Driver | Yes | Yes | Yes |
| `booking.no_show` | Driver | Yes | Yes | Yes |
| `booking.cancelled` | Rider | Yes | Yes | Yes |
| `ride.status_changed` | Admin/System | No (by default) | Yes (`realtime/rides/{id}/status`) | No |
| `payment.success` | Webhook/System | Yes | Yes | Yes |
| `payment.failed` | Webhook/System | Yes | Yes | Yes |
| `auth.password_reset` | User/System | No | No | No |
| `auth.otp` | User/System | No | No | No |

## 2) Ownership Matrix

- Driver-triggered:
  - Marks booking `BOARDED`/`NO_SHOW` -> rider notification fanout.
- Rider-triggered:
  - Cancels booking -> rider notification fanout.
- Admin-triggered:
  - Ride status updates/cancel/delete -> realtime ride projection updates.
- Webhook/System-triggered:
  - Paystack success/failed -> rider notification fanout.

## 3) API Surface Inventory

### Existing notification-related APIs
- `PATCH /api/bookings/:id/board`
- `POST /api/bookings/:id/cancel`
- `PATCH /api/drivers/location`
- `GET /api/admin/ride-instances/:id/realtime`

### Added in hardening pass
- `PATCH /api/users/me/push-token`
- `DELETE /api/users/me/push-token`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `GET /api/admin/notifications`
- `GET /api/admin/notifications/delivery-attempts`
- `POST /api/admin/notifications/outbox/process`

## 4) Reliability Findings

### Before hardening
- Postgres notification persistence existed with idempotency (`user_id + reference + reason`).
- RTDB and FCM were best-effort and errors were only logged.
- No durable delivery attempt tracking table.
- No outbox retry queue.

### After hardening
- Delivery state is tracked in:
  - `notification_deliveries`
  - `notification_outbox`
- RTDB/FCM failures now update delivery status and enqueue retries.
- Outbox processing endpoint supports cron/admin retry execution.
- Token-missing case is tracked as failed delivery without infinite retries.

## 5) Security Findings

- API auth is enforced via JWT helpers (`requireAccessAuth` / `requireAdminAuth`).
- Notification read APIs are user-scoped to authenticated `userId`.
- Admin diagnostic APIs are `admin|sub_admin` scoped.
- Realtime write path remains backend-only via Firebase Admin SDK.
- Firebase rules baseline exists and should be narrowed as claims strategy matures.

## 6) Gaps Remaining (Recommended Next)

- Add event coverage for auth-critical notifications if product requires push.
- Add `notifications` websocket/SSE if read-after-write latency must be < polling.
- Add scheduled worker (not manual endpoint) for outbox retries in production.
- Add explicit alerting thresholds on failed delivery spikes by channel.
