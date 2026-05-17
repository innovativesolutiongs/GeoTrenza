import type { Alert } from "../../../entity/alert";

// Stage 4 stub.
export const smsChannel = {
  name: "SMS" as const,
  async deliver(_alert: Alert, _userId: string): Promise<void> {
    return;
  },
};
