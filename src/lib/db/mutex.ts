/**
 * Serialises async operations within one server instance. It prevents two overlapping
 * read-modify-write cycles from clobbering each other; it does not coordinate across
 * serverless instances.
 */
export function createMutex() {
  let tail: Promise<unknown> = Promise.resolve();

  return function runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const result = tail.then(task, task);
    tail = result.catch(() => undefined);
    return result;
  };
}
