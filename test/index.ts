import { TaskLite } from '../src';

async function main() {
  const taskLite = await TaskLite.create({ path: 'test2.db' });
  const category = 'category1';
  for (let i = 0; i < 10; i++) {
    const n = await taskLite.addOrUpdateTask({
      key: `abc-${i}`,
      value: `def-${i}`,
    });
    console.log({ n });
  }
  for (let i = 0; i < 3; i++) {
    const task = await taskLite.processTask({
      process: async (task) => {
        console.log({ task });
      },
    });
    console.log({ task });
  }
}

main();
