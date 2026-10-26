import {clampSwipePosition, settleSwipePosition} from './horizontalDrag';

type Driver = {
  width: () => number;
  last: () => number;
  stop: (read: (position: number) => void) => void;
  set: (position: number) => void;
  animate: (target: number, duration: number, done: (finished: boolean) => void) => void;
  moving: (value: boolean) => void;
  commit: (index: number) => void;
};

/** Coordinates only horizontal motion. A cancelled native callback must never
 * commit an old page, and a new drag starts at the actual on-screen position. */
export function createSectionSnap(driver: Driver) {
  let generation = 0, alive = true, dragging = false, ready = false;
  let origin = 0, dx = 0, release: number | null = null;
  const bound = (value: number) => Math.max(0, Math.min(driver.last(), value));
  const neighbors = (value: number) => Math.max(Math.max(0, Math.round(origin) - 1),
    Math.min(Math.min(driver.last(), Math.round(origin) + 1), value));
  const place = () => driver.set(neighbors(clampSwipePosition(origin, dx, driver.width(), driver.last())));
  const finish = (velocity: number) => {
    dragging = false;
    const target = neighbors(Math.abs(velocity) > 0.65
      ? Math.round(origin) + (velocity < 0 ? 1 : -1)
      : Math.abs(origin - Math.round(origin)) < 0.01
        ? settleSwipePosition(origin, dx, velocity, driver.width(), driver.last())
        : Math.round(clampSwipePosition(origin, dx, driver.width(), driver.last()) - velocity * 0.22));
    const ticket = ++generation;
    driver.animate(target, Math.abs(velocity) > 0.65 ? 170 : 240, finished => {
      if (!alive || ticket !== generation || !finished) return;
      driver.commit(target);
      driver.moving(false);
    });
  };
  return {
    select(index: number) {
      if (!alive) return;
      ++generation; dragging = false; ready = false; release = null;
      driver.stop(() => {});
      driver.set(bound(index));
      driver.moving(false);
    },
    grant() {
      if (!alive) return;
      const ticket = ++generation;
      dragging = true; ready = false; dx = 0; release = null;
      driver.moving(true);
      driver.stop(value => {
        if (!alive || ticket !== generation || !dragging) return;
        origin = bound(value); ready = true;
        if (release !== null) finish(release); else place();
      });
    },
    move(displacement: number) {
      if (!alive || !dragging) return;
      dx = displacement;
      if (ready) place();
    },
    release(displacement: number, velocity: number) {
      if (!alive || !dragging) return;
      dx = displacement; release = velocity;
      if (ready) finish(velocity);
    },
    cancel(index: number) {
      if (!alive) return;
      const ticket = ++generation;
      dragging = false; ready = false; release = null;
      driver.stop(() => {});
      driver.moving(true);
      driver.animate(bound(index), 200, finished => {
        if (alive && ticket === generation && finished) driver.moving(false);
      });
    },
    dispose() {
      alive = false; ++generation; dragging = false;
      driver.stop(() => {});
    },
  };
}
