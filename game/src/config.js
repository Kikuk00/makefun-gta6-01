// Solmar Bay: tuning, palette and world constants. One place for every number the
// other modules share, so a tweak here retunes the whole game.
export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar-bay.save.v1';

// The city is a grid: 10 streets each way, pitch 58 m (46 m block + 12 m road).
export const CITY = {
  pitch: 58,
  streets: 10,
  half: 261, // outermost street centre
  bound: 320, // invisible wall around the drivable city
  beachZ: 292, // sand starts here (south edge)
  waterZ: 330, // water starts here
  harborX: -292, // docks / water start here (west edge)
};

export const PLAYER = {
  walkSpeed: 6.5,
  runSpeed: 10.5,
  accel: 40,
  radius: 0.55,
  health: 100,
  punchDamage: 25,
  punchRange: 2.4,
  pistolDamage: 34,
  fireInterval: 0.32,
};

export const CAR = {
  accel: 16,
  brake: 30,
  reverseAccel: 10,
  maxSpeed: 34,
  maxReverse: 10,
  steer: 1.9,
  grip: 8,
  radius: 1.7,
};

export const TRAFFIC_COUNT = 22;
export const PED_COUNT = 28;

export const WANTED = {
  stealCar: 25,
  hitPed: 30,
  killPed: 45,
  shoot: 12,
  ramCop: 20,
  decayPerSec: 2.5,
  maxHeat: 100,
};

export const PALETTE = {
  skyTop: 0x2f6fb8,
  skyHorizon: 0xffb36b,
  sun: 0xffd9a0,
  asphalt: 0x4a4d55,
  sidewalk: 0x9a938a,
  sand: 0xe8cf9e,
  water: 0x1f7fa8,
  grass: 0x5f8f4e,
  building: [0xe8b48a, 0xd98a7a, 0x8fb8c9, 0xc9c2a8, 0xb8a8c9, 0x9fb89a, 0xe0d0b0, 0x7fa8b8],
  car: [0xd23c2e, 0x2e6fd2, 0xe8c832, 0x2ed2a0, 0xe8e8e8, 0x222222, 0xd27a2e, 0x7a4fd2],
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// District names by quadrant, for the HUD location line.
export function districtAt(x, z) {
  if (z > 150) return 'Marina Beach';
  if (x < -120 && z < 0) return 'Old Town';
  if (x > 120) return 'Harbor Docks';
  if (z < -150) return 'Coral Hills';
  if (Math.abs(x) < 120 && z > -180 && z < 60) return 'Downtown';
  return 'Solmar Bay';
}
