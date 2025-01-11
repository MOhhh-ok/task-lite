import { TaskLite } from '../dist';

async function main() {
  const taskLite = await TaskLite.create({ path: 'test.db' });
  const category = 'category1';
  await taskLite.addOrUpdateTask({
    category,
    key: 'abc',
    data: {
      a: 1,
      b: 2,
    },
  });
}

main();
