# Phase 1 Scope (locked)

This is the **product scope** for Phase 1 of the truck-IoT platform. Phase 1 corresponds to the work that lands when Stages 0–4 of the [migration plan](./migration-plan.md) are complete: a real, production-deployed fleet management platform that customers can log in to and use.

This scope is **locked**. Anything not listed here is explicitly out of scope for Phase 1 and waits for a later phase. Adding scope mid-phase requires an explicit re-locking conversation, not a side note in a PR.

---

## In scope (Phase 1 ships these)

- **Real-time fleet map showing actual trucks.** The dashboard's live map displays the current location of every truck in a customer's fleet, updating as the GPS trackers report new positions. This replaces the hardcoded city markers that are on the map today.
- **Geofence creation and breach alerts.** Customers (or admins on their behalf) can draw zones — circles or polygons — on the map. The system raises an alert when a truck enters or leaves a configured zone.
- **Power-cut, tow, SOS, and movement-when-parked alarms.** These are the alarms the G107 trackers are most useful for. The system surfaces them in the dashboard with timestamps, the truck involved, and the location at the time of the alarm.
- **Route history playback for the last 7–30 days.** A page where the user picks a truck and a date range and watches the truck's path replay on a map, with a time slider and a moving marker. The retention window (7 vs 14 vs 30 days) is a configuration value chosen at launch.
- **Customer login with proper authentication.** Real password hashing (bcrypt), real session management (JWT in httpOnly cookies), and authorization scoping so a customer can only see their own fleet — never another customer's trucks, devices, or events.
- **Production deployment on AWS, accessible via geotrenza.com.** The system runs on AWS infrastructure (the existing EC2 and RDS, hardened in Stage 4, or migrated to ECS/Fargate during Stage 4 if that decision lands that way). Customers reach it through the existing `geotrenza.com` domain.

---

## Out of scope for Phase 1 (deferred)

These are real, valuable features. They are not in Phase 1. They will be planned in their own phases.

- **Weight monitoring.** *Phase 2.* Reading load-sensor data from the trackers and surfacing weight changes per stop.
- **Driver scoring.** *Phase 3.* Scoring drivers on harsh acceleration, harsh braking, sharp turns, and idle time, then ranking and reporting.
- **Mobile app.** *Phase 3.* A native iOS/Android app for fleet managers and drivers. Phase 1 is web only.
- **AIS-140 certification.** AIS-140 is the Indian government's standard for vehicle tracking devices and the related software stack used in commercial transport. Certification is a multi-month process with formal audits. Out of Phase 1; revisit when there is a customer or regulator specifically requiring it.
- **Multi-language support.** Phase 1 ships in English only. i18n infrastructure is not built in Phase 1.
- **Automated SaaS billing and self-signup.** Customers in Phase 1 are onboarded manually. There is no Stripe integration, no plan tier system, no public sign-up page. Customers are created by an admin.

---

## Why this scope, briefly

The phase boundary is drawn so that Phase 1 produces something a real customer can use end-to-end (login → see their trucks → set up geofences → receive alarms → review history) without depending on any feature that is not yet built. Everything in the deferred list is either independent of the core map+events+history loop (mobile, billing, i18n) or is a separate product surface (weight, scoring, AIS-140) that benefits from the foundation Phase 1 lays down.

If a Phase 1 task starts pulling in a deferred feature, that's a signal we got the boundary wrong, and we re-lock the scope explicitly rather than letting it drift.
