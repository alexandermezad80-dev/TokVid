import { describe, expect, it } from "vitest";
import { createLikeOperationController } from "../artifacts/mobile/lib/video/likeOperationController";

describe("like operation concurrency", () => {
  it("toggles optimistically from the current state", async () => {
    const controller = createLikeOperationController();
    const calls: boolean[] = [];

    await controller.toggle("video-1", async (currentlyLiked) => {
      calls.push(currentlyLiked);
      return { error: null };
    });

    expect(calls).toEqual([false]);
    expect([...controller.snapshot()]).toEqual(["video-1"]);
  });

  it("serializes rapid taps for the same video", async () => {
    const controller = createLikeOperationController();
    const calls: boolean[] = [];
    let releaseFirst!: () => void;
    const firstFinished = new Promise<void>((resolve) => { releaseFirst = resolve; });

    const first = controller.toggle("video-1", async (currentlyLiked) => {
      calls.push(currentlyLiked);
      await firstFinished;
      return { error: null };
    });

    const second = controller.toggle("video-1", async (currentlyLiked) => {
      calls.push(currentlyLiked);
      return { error: null };
    });

    // Let the queued first operation start before asserting its call arguments.
    await Promise.resolve();

    expect([...controller.snapshot()]).toEqual([]);
    expect(calls).toEqual([false]);

    releaseFirst();
    await Promise.all([first, second]);

    expect(calls).toEqual([false, true]);
    expect([...controller.snapshot()]).toEqual([]);
  });

  it("does not let an older failed request undo a newer tap", async () => {
    const controller = createLikeOperationController();
    let releaseFirst!: () => void;
    const firstFinished = new Promise<void>((resolve) => { releaseFirst = resolve; });

    const first = controller.toggle("video-1", async () => {
      await firstFinished;
      return { error: "network failure" };
    });

    const second = controller.toggle("video-1", async () => ({ error: null }));

    releaseFirst();
    await Promise.all([first, second]);

    expect([...controller.snapshot()]).toEqual([]);
  });

  it("rolls back the latest failed request", async () => {
    const controller = createLikeOperationController();

    await controller.toggle("video-1", async () => ({ error: "network failure" }));

    expect([...controller.snapshot()]).toEqual([]);
  });
});
