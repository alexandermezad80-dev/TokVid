export interface LikeOperationResult {
  error: string | null;
}

export type LikeOperation = (currentlyLiked: boolean) => Promise<LikeOperationResult>;

/**
 * Keeps optimistic like state consistent when a user taps the same video
 * multiple times before earlier network requests finish.
 */
export function createLikeOperationController(initial: Set<string> = new Set()) {
  let current = new Set(initial);
  const versions = new Map<string, number>();
  const queues = new Map<string, Promise<void>>();

  const snapshot = () => new Set(current);

  const replace = (next: Set<string>) => {
    current = new Set(next);
  };

  const toggle = (id: string, operation: LikeOperation): Promise<void> => {
    const currentlyLiked = current.has(id);
    const next = new Set(current);
    if (currentlyLiked) next.delete(id); else next.add(id);
    current = next;

    const version = (versions.get(id) ?? 0) + 1;
    versions.set(id, version);

    const previous = queues.get(id) ?? Promise.resolve();
    const task = previous.catch(() => undefined).then(async () => {
      const result = await operation(currentlyLiked);
      if (result.error && versions.get(id) === version) {
        const rollback = new Set(current);
        if (currentlyLiked) rollback.add(id); else rollback.delete(id);
        current = rollback;
      }
    });

    queues.set(id, task);
    return task;
  };

  return { snapshot, replace, toggle };
}
