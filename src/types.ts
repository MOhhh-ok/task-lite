export interface Task {
  id: number;
  category: string;
  key: string;
  data: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at: Date | null;
  completed_at: Date | null;
  queue_order: Date | null;
  created_at: Date;
  updated_at: Date;
}
