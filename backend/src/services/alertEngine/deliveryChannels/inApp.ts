/**
 * In-app channel — Phase 1's only real delivery channel.
 *
 * For in-app, "delivery" is just persistence: the alert row is already in
 * the DB, and the dashboard polls /api/alerts for the badge + list. So
 * this channel is essentially a no-op marker that records who would
 * normally have been notified, in case we want to add per-user read
 * receipts later.
 */
import type { Alert } from "../../../entity/alert";

export const inAppChannel = {
  name: "IN_APP" as const,

  async deliver(_alert: Alert, _userId: string): Promise<void> {
    // No-op. The bell polls /api/alerts; persistence in the alerts table
    // is the delivery mechanism. We log nothing here on purpose — the
    // alert row creation log line already covers it.
  },
};
