export type MicroCMSWebhookPayload = {
  service: string;
  api: string;
  id: string;
  type: string;
  contents?: {
    new?: { id?: string };
    old?: { id?: string };
  };
};
