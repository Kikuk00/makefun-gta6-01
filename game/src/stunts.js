// Round 3 stunts: the ramps in the city are not scenery. Hit one at speed and the
// car launches — airtime is timed, a jump over 0.6 s pays $25 in free roam, and the
// Stunt Run mission counts the jumps you land while it is live. All deterministic:
// the launch is a speed and heading check against the ramp, never a dice roll.
import { JUMP_MIN_AIR, JUMP_REWARD } from './config.js';
import { angleDiff } from './random.js';

export function createStunts(G) {
  let airTime = 0;
  let wasAirborne = false;
  let totalJumps = 0;
  let launched = false;

  function launchIfOnRamp(car) {
    if (!car || car.dead || car.y > 0 || car.vy !== 0) return;
    for (const ramp of G.city.ramps) {
      const dx = car.pos.x - ramp.x;
      const dz = car.pos.z - ramp.z;
      if (Math.hypot(dx, dz) > 5) continue;
      // The ramp only works if you hit it facing its slope, and fast.
      if (Math.abs(angleDiff(ramp.heading, car.heading)) > 0.7) continue;
      if (Math.abs(car.speed) < 12) continue;
      car.vy = Math.abs(car.speed) * 0.34;
      car.y = 0.05;
      launched = true;
      G.audio.jump();
      break;
    }
  }

  function update(dt) {
    const p = G.player.state;
    const car = p.inCar;
    if (car && !car.isBoat) launchIfOnRamp(car);
    const airborne = !!car && car.y > 0.5;
    if (airborne) airTime += dt;
    else if (wasAirborne) {
      // Landed: a real jump pays, and the best one is remembered.
      if (airTime >= JUMP_MIN_AIR) {
        totalJumps += 1;
        G.cash += JUMP_REWARD;
        G.bestCash = Math.max(G.bestCash, G.cash);
        const ms = Math.round(airTime * 1000);
        if (!G.bestJumpMs || ms > G.bestJumpMs) {
          G.bestJumpMs = ms;
          G.hud.banner(`Stunt jump! ${(airTime).toFixed(1)}s in the air — +$${JUMP_REWARD}. New best!`);
        } else {
          G.hud.banner(`Stunt jump! ${(airTime).toFixed(1)}s in the air — +$${JUMP_REWARD}`);
        }
        G.audio.sting();
        G.save();
      }
      airTime = 0;
    }
    wasAirborne = airborne;
    void launched;
  }

  return {
    update,
    get totalJumps() { return totalJumps; },
    get airTime() { return airTime; },
  };
}
