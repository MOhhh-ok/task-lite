import { TaskLite } from '../src';

async function main() {
  const taskLite = await TaskLite.create({ path: 'test4.db' });
  await taskLite.process(
    async (task) => {
      console.log({ task });
    },
    { keepAfterProcess: true, statuses: ['completed'] }
  );
}

main();
