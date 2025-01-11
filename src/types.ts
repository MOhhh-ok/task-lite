import {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely';

export interface Database {
  tasks: TaskTable;
}

export interface TaskTable {
  id: Generated<number>;
  key: string;
  value?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_at?: ColumnType<string, string | undefined, string | undefined>;
  completed_at?: ColumnType<string, string | undefined, string | undefined>;
  failed_at?: ColumnType<string, string | undefined, string | undefined>;
  queue_order: ColumnType<string, string | undefined, string | undefined>;
  created_at: ColumnType<string, never, never>;
}

export type Task = Selectable<TaskTable>;
export type NewTask = Insertable<TaskTable>;
export type TaskUpdate = Updateable<TaskTable>;
