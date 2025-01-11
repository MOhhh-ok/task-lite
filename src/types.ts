export interface Task {
  id: number;
  key: string;
  value?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at: Date | null;
  completed_at: Date | null;
  queue_order: Date | null;
  created_at: Date;
  updated_at: Date;
}
