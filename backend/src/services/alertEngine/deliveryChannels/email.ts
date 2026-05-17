import type { Alert } from "../../../entity/alert";

// Stage 4 stub.
export const emailChannel = {
  name: "EMAIL" as const,
  async deliver(_alert: Alert, _userId: string): Promise<void> {
    return;
  },
};
