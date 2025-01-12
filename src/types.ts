import {
  ColumnType,
  Generated,
  Insertable,
  JSONColumnType,
  Selectable,
  Updateable,
} from 'kysely';

export interface Database {
  tasks: TaskTable;
}

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TaskTable {
  id: Generated<number>;
  key: string;
  value?: string;
  status: ColumnType<
    TaskStatus,
    TaskStatus | undefined,
    TaskStatus | undefined
  >;
  processed_at?: ColumnType<string, string | undefined, string | undefined>;
  completed_at?: ColumnType<string, string | undefined, string | undefined>;
  failed_at?: ColumnType<string, string | undefined, string | undefined>;
  queued_at: ColumnType<string, string | undefined, string | undefined>;
  created_at: ColumnType<string, never, never>;
}

export type Task = Selectable<TaskTable>;
export type NewTask = Insertable<TaskTable>;
export type TaskUpdate = Updateable<TaskTable>;
