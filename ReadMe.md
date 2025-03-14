# Тестовое задание "Планировщик задач"

* Каждая отдельная задача выглядит следующим образом:
  ```
  interface ITask {
    targetId: number
    action: 'init' | 'prepare' | 'work' | 'finalize' | 'cleanup'
  }
  ```

  Использовать специальные хуки `_onComplete` или `_onExecute` нельзя, они используются для диагностики и логирования.

* Есть специальный класс `Executor` (`src/Executor.ts`), который умеет исполнять одну задачу:
  ```
  Executor.executeTask(task: ITask): Promise<void>
  ```

  В решении нельзя использовать внутреннее состояние `Executor`, только `IExecutor.executeTask()`.

Надо реализовать асинхронную функцию, которая получает на вход очередь
задач `AsyncIterable<ITask>` и максимальное кол-во одновременных "потоков" `maxThreads` и возвращает промис, который будет разрезолвлен, когде все задачи
отработают.

```
async function run(executor: IExecutor, queue: AsyncIterable<ITask>, maxThreads = 0): Promise<{...}>
```
При `maxThreads == 0` ограничения на кол-во одновременных "потоков" нету.

Функция должна исполнить задачи максимально быстро, стараясь как можно больше задач исполнить параллельно. Но, есть ограничение (в нем заключается основная сложность задачи): в один момент времени `Executor` не может исполнять несколько разных задач с одним и тем же `Task.targetId`, но при этом он может исполнять много разных задач с разными `Task.targetId` параллельно.

* Например, если мы вызовем  
  ```
  executor.executeTask({ targetId: 0, action: 'init' });
  executor.executeTask({ targetId: 0, action: 'prepare' });
  ```  
  то, второй вызов кинет исключение.

* При этом  
  ```
  executor.executeTask({ targetId: 0, action: 'init' });
  executor.executeTask({ targetId: 1, action: 'prepare' });
  ```  
  или
  ```
  await executor.executeTask({ targetId: 0, action: 'init' });
  await executor.executeTask({ targetId: 0, action: 'prepare' });
  ```  
  отработают нормально.

При взятии задачи из очереди (вызов `iterator.next()` или итерация через `for ... of`) она автоматически удаляется из очереди, при этом существующие итераторы не инвалидируются. При этом надо учесть, что очередь может быть пополнена во время исполнения задач, а также, никто не гарантирует, что очередь конечна в принципе.

Критерий остановки исполнения функции `run()`: все полученные из очереди задачи выполнены и в очереди больше нету новых новых задач.

Все задачи для одного и того же `ITask.targetId` должны быть исполнены последовательно в том порядке, в котором они находятся в очереди.

## Настройка окружения:

* `Node.js version >= 12`

## Установка и подготовка

`npm install`

## Разработка решения
* Заготовка для функции `run()` лежит в `./src/run.ts`. 
* Никакие другие файлы, кроме `./src/run.ts` менять нельзя. 
* Обвязочный код в `run.ts` менять нельзя
* Внутри одного вызова `run()` создавать дополнительные эксземпляры `Executor` нельзя.

## Самостоятельная проверка правильности решения

Для удобства я написал тесты для `run()`, которые проверяют правильность её работы.

`npm run test`

Также тесты генерят детальные отчеты-логи `./test/*.log.html`.

Если при выполнении тестов они зависают в таком состоянии, как ниже на скриншоте, то вероятно вы написали очень неоптимальный алгоритм, который вычитывает слишком много task-ов наперед (больше, чем это необходимо в моменте).
В системе тестов срабатывает защита от таких решений.

<img width="369" alt="Code_O2bY8fy5hD" src="https://github.com/user-attachments/assets/50278778-01fc-40df-aeda-884de73e7577">


У коректного решения `npm run test` дает следующий вывод:

<img width="440" alt="Code_RLL5YHVeFu" src="https://github.com/user-attachments/assets/76743e2a-5fdb-4d19-8d3e-0a0a8f01c6b8">

---
---

# Test Task "Task Scheduler"

## Task Description

Each individual task is structured as follows:

```typescript
interface ITask {
  targetId: number;
  action: 'init' | 'prepare' | 'work' | 'finalize' | 'cleanup';
}
```

Special hooks `_onComplete` or `_onExecute` **cannot** be used, as they are reserved for diagnostics and logging.

A special class, `Executor` (`src/Executor.ts`), is available to execute a single task:

```typescript
Executor.executeTask(task: ITask): Promise<void>
```

When implementing the solution, **internal state** of `Executor` cannot be used—only `IExecutor.executeTask()` is allowed.

---

## Task Requirements

You need to implement an **asynchronous function** that takes in a queue of tasks (`AsyncIterable<ITask>`) and a maximum number of concurrent "threads" (`maxThreads`). It should return a promise that resolves **when all tasks are completed**.

```typescript
async function run(
  executor: IExecutor,
  queue: AsyncIterable<ITask>,
  maxThreads = 0
): Promise<{...}>
```

- If `maxThreads == 0`, there are **no limits** on concurrency.
- The function should execute tasks **as quickly as possible**, maximizing parallel execution.
- **Key Constraint:** `Executor` **cannot execute multiple tasks simultaneously** with the same `Task.targetId`. However, it **can** run multiple tasks in parallel for different `Task.targetId`s.

### Examples

- The following will **throw an exception** because they have the same `targetId`:

  ```typescript
  executor.executeTask({ targetId: 0, action: 'init' });
  executor.executeTask({ targetId: 0, action: 'prepare' }); // ❌ Throws an error
  ```

- However, these are **valid**:

  ```typescript
  executor.executeTask({ targetId: 0, action: 'init' });
  executor.executeTask({ targetId: 1, action: 'prepare' }); // ✅ Works
  ```

  ```typescript
  await executor.executeTask({ targetId: 0, action: 'init' });
  await executor.executeTask({ targetId: 0, action: 'prepare' }); // ✅ Works (executed sequentially)
  ```

---

## Queue Behavior

- Retrieving a task from the queue (`iterator.next()` or `for ... of` loop) **automatically removes it** from the queue.
- Existing iterators **remain valid** even as the queue updates.
- The queue **can receive new tasks** while execution is in progress.
- There is **no guarantee** that the queue is finite.

---

## Stopping Condition

The function `run()` should stop execution **only when**:

1. **All tasks received from the queue have been completed**.
2. **The queue contains no more new tasks**.

Tasks with the **same `targetId` must be executed sequentially** in the **order they appear** in the queue.

---

## Environment Setup

- Requires **Node.js v12 or later**.

### Installation

```sh
npm install
```

### Implementation

- The function template is in `./src/run.ts`.
- **Only `./src/run.ts` can be modified**.
- Wrapper code in `run.ts` **must not be changed**.
- **New instances of `Executor` cannot be created** within a single `run()` execution.

---

## Self-Testing

For convenience, tests are available to verify the correctness of `run()`:

```sh
npm run test
```

- The tests generate **detailed logs** in `./test/*.log.html`.
- If the tests **hang** in a state like the screenshot below, your implementation is likely inefficient—reading too many tasks in advance.

  **Example of a bad execution (hanging test run)**:  
  ![Hanging Test](https://github.com/user-attachments/assets/50278778-01fc-40df-aeda-884de73e7577)

A **correct solution** should produce the following output:

  ![Correct Test Output](https://github.com/user-attachments/assets/76743e2a-5fdb-4d19-8d3e-0a0a8f01c6b8)