import type { Alert } from "../../../entity/alert";

// Phase 3 stub. Will become a real Twilio / WhatsApp Cloud API client.
export const whatsappChannel = {
  name: "WHATSAPP" as const,
  async deliver(_alert: Alert, _userId: string): Promise<void> {
    return;
  },
};
