# TaskLite

A lightweight, SQLite-based task queue system for Node.js applications.

## Features

- Simple and lightweight task queue implementation
- Persistent storage using SQLite
- Support for task status management (pending, processing, completed, failed)
- Upsert capability for tasks with the same key
- Configurable task retention after processing

## Installation

```bash
npm install @masa-dev/tesk-lite better-sqlite3
```

## Usage

### Basic Example

```typescript
import { TaskLite } from '@masa-dev/task-lite';

// Initialize TaskLite with sqlite database path. Also :memory: is available
const taskLite = await TaskLite.create({ path: './tasks.db' });

// Enqueue a task
await taskLite.enqueue({
  key: 'user@example.com',
  value: JSON.stringify({ subject: 'Hello' }), // Optional.
});

// Process tasks
await taskLite.process(async (task) => {
  const data = JSON.parse(task.value);
  await sendEmail(task.key, data);
}, {
  statuses: ['pending', 'completed', 'failed']; // Optional. Target for retrieving. Default is ['pending'].
  keepAfterProcess: true, // Optional. If this is set, do not delete task after successful processing, so you can get completed record after process.
});
```

### TaskTable type

TaskTable is defined with kysely

```typescript
export interface TaskTable {
  id: Generated<number>;
  key: string;
  value?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_at?: ColumnType<string, string | undefined, string | undefined>;
  completed_at?: ColumnType<string, string | undefined, string | undefined>;
  failed_at?: ColumnType<string, string | undefined, string | undefined>;
  queued_at: ColumnType<string, string | undefined, string | undefined>;
  created_at: ColumnType<string, never, never>;
}
```

## License

MIT
