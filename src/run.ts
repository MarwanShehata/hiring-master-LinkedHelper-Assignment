import { IExecutor } from "./Executor";
import ITask from "./Task";

export default async function run(
  executor: IExecutor,
  queue: AsyncIterable<ITask>,
  maxThreads = 0
) {
  // Semaphore implementation as you defined
  class Semaphore {
    private permits: number;
    private promiseResolverQueue: Array<() => void> = [];

    constructor(initialCount: number) {
      this.permits = initialCount > 0 ? initialCount : Infinity;
    }

    async acquire() {
      if (this.permits > 0) {
        this.permits -= 1;
        return;
      }
      return new Promise<void>(resolve => this.promiseResolverQueue.push(resolve));
    }

    release() {
      if (this.promiseResolverQueue.length > 0) {
        const resolve = this.promiseResolverQueue.shift();
        if (resolve) resolve();
      } else {
        this.permits += 1;
      }
    }
  }

  const semaphore = new Semaphore(maxThreads);
  const targetPromises = new Map<number, Promise<void>>();
  const runningPromises = new Set<Promise<void>>();
  const iterator = queue[Symbol.asyncIterator]();
  // Start the executor
  executor.start();
  
  try {
    while (true) {
      const iterResult = await iterator.next();
      if (iterResult.done && runningPromises.size === 0) {
        break; // Exit when no more tasks to yield and no tasks running
      }
      if (!iterResult.done) {
        const task = iterResult.value;
        const targetId = task.targetId;
        let tail = targetPromises.get(targetId) || Promise.resolve();
        const taskPromise = tail.then(async () => {
          await semaphore.acquire();
          try {
            await executor.executeTask(task);
          } catch (error) {
            console.error(`Error executing task ${targetId}:${task.action}:`, error);
            throw error; // Re-throw to maintain the error chain
          } finally {
            semaphore.release();
            
            // Clean up the targetPromises map if this was the last task for this target
            if (targetPromises.get(targetId) === taskPromise) {
              targetPromises.delete(targetId);
            }
          }
        });
        targetPromises.set(targetId, taskPromise);
        runningPromises.add(taskPromise);
        taskPromise.then(() => runningPromises.delete(taskPromise)).catch(() => {
          // Ensure we remove the promise from runningPromises even if it fails
          runningPromises.delete(taskPromise);
        });
      } else {
        // Iterator is done but tasks are running; wait for one to complete
        await Promise.race(runningPromises);
      }
    }
  } finally {
    // Ensure executor is stopped
    executor.stop();
  }
}