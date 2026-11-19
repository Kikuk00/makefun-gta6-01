[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![make.fun · rank](https://make.fun/badge/gta6-01/Kikuk00/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![make.fun · reward](https://make.fun/badge/gta6-01/Kikuk00/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solmar Bay — An Open-World Crime Story

Mara Voss came back to Solmar Bay broke. The rent is due, the cops are everywhere, and
Lena Marlowe has work that pays — if you can drive, steal, fight and outrun the whole
city. Twelve missions, taxi fares, a sunset street race, a harbor heist by speedboat,
stunt ramps and 24 hidden packages. One king to dethrone, and one last score to settle.

Explore a sun-soaked coastal city on foot, by car and by boat: Downtown towers, Old Town
houses, Marina hotels, Harbor warehouses and Coral Hills villas, plus a beach, a pier and
a ferris wheel. Traffic fills the streets, pedestrians stroll the sidewalks, and the
Solmar Bay PD responds to every crime with a wanted level from one to five stars — at
three stars the police helicopter circles overhead and cruisers block the road ahead, at
four stars fast interceptors join the chase, and at five stars a spike strip goes down
across the road. Steal cars and boats, ram rivals, jump the stunt ramps, fight armed
guards, lose the cops — and save your progress between jobs.

## Features

- **Open world** — a full street-grid city with five districts, a beach, a harbor, a pier and a ferris wheel, built in three.js
- **On foot, by car and by boat** — walk, run and jump, steal any car on the street and drive it with arcade handling, handbrake turns included, or take a speedboat out on the harbor water
- **Wanted level** — police cruisers chase you by road and foot cops run you down; at three stars a helicopter circles with a searchlight and cruisers set up roadblocks, at four stars interceptors join in, at five stars spike strips shred your tires; lose them to cool off, or get busted
- **Twelve-mission story** — from a first fare at the Marina pier to taking down Dario Kessler, the King of the Bay, then a taxi-driver chain, the Sunset Grand Prix, a harbor heist by speedboat, a stunt run over the city's ramps, a getaway job and the last score against Vex's armored convoy — with briefings, radio chatter from the crew, objectives and cash rewards
- **Side activities** — 24 hidden packages worth $50 each (a $500 bonus for the whole set), taxi fares: pick up a waving passenger and beat the clock to the green marker, and stunt jumps: hit a ramp at speed for $25 a jump
- **Garage shop** — spend mission cash at Wrench's garage: body armor, a pistol with a full magazine, and a Comet GT of your own, parked at the garage whenever you want it
- **Combat** — fists up close, a pistol with a 12-round magazine (R to reload) once Lena hands you one, drive-by shooting from the driver's seat, muzzle flashes, tracers and armed harbor guards with health bars who shoot back — at your car too
- **HUD with minimap** — cash, health, armor, sprint stamina, wanted stars, mission tracker with step count, race/fare timer, ammo, the car or boat you are driving with its condition, speedometer, and a live top-down minimap with police, helicopter, boats, ramps, package and objective blips
- **Sound** — fully synthesized WebAudio: engine hum, sirens, gunshots, crashes, explosions, splashes and a looping bass groove; no audio files
- **Save** — progress (cash, completed missions, hidden packages, fares run, best race time, best jump, armor and your Comet) persists in localStorage; pause menu to save, restart a mission, shop or quit to title

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network — every
file the game loads lives under `game/`.

### Controls

| Key | Action |
| --- | --- |
| W A S D | Move / drive / steer the boat |
| Mouse drag | Look around |
| Wheel | Zoom camera |
| Shift | Run |
| E | Enter / exit car or boat |
| Space | Jump / handbrake |
| Left click | Shoot (with pistol, on foot or drive-by) |
| F | Punch |
| R | Reload pistol |
| T | Start a taxi fare |
| B | Shop (armor, pistol, Comet GT) |
| M | Missions |
| Esc | Pause |

## Screenshots

The cover shows a police chase at five wanted stars with the helicopter in frame, a
roadblock across the road ahead, an interceptor on her tail, traffic to weave past, the
minimap and a mission objective on the HUD; the others show a taxi fare on foot by Cafe
Azul, the Harbor Heist speedboat escape on the Marina water, and a firefight at the
Harbor warehouse. All four are real renders of the game, staged deterministically with
`?shot=chase|play|boat|mission&seed=11`.

## About this entry

Built for the [make.fun](https://make.fun/?ref=wmk9f4s6) **gta6-01** competition —
an original open-world crime game, with its own city, characters, vehicles, names,
story, art, sounds and music. Nothing from any commercial game.
