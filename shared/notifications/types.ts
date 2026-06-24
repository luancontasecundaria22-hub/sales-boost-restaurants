export type NotificationEvent =
  | 'NEW_COMPETITOR'
  | 'NEW_LEAD'
  | 'POST_APPROVED'
  | 'NEGATIVE_REVIEW'
  | 'OPPORTUNITY_DETECTED'
  | 'REPORT_READY';

export interface NotifyPayload {
  event: NotificationEvent;
  bot_type: 'marketing' | 'vendas';
  chat_id: number;
  company_id?: string;
  data?: Record<string, unknown>;
  message?: string;
}
