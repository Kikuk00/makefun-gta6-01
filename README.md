[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![make.fun · rank](https://make.fun/badge/gta6-01/Kikuk00/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![make.fun · reward](https://make.fun/badge/gta6-01/Kikuk00/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solmar Bay — An Open-World Crime Story

Mara Voss came back to Solmar Bay broke. The rent is due, the cops are everywhere, and
Lena Marlowe has work that pays — if you can drive, steal, fight and outrun the whole
city. Eight missions, taxi fares, a sunset street race and 18 hidden packages.
One king to dethrone.

Explore a sun-soaked coastal city on foot and by car: Downtown towers, Old Town houses,
Marina hotels, Harbor warehouses and Coral Hills villas, plus a beach and a pier. Traffic
fills the streets, pedestrians stroll the sidewalks, and the Solmar Bay PD responds to
every crime with a wanted level from one to five stars — at three stars the police
helicopter circles overhead and cruisers block the road ahead. Steal cars, ram rivals,
fight armed guards, lose the cops — and save your progress between jobs.

## Features

- **Open world** — a full street-grid city with five districts, a beach, a harbor and a pier, built in three.js
- **On foot and by car** — walk, run and jump, or steal any car on the street and drive it with arcade handling, handbrake turns included
- **Wanted level** — police cruisers chase you by road and foot cops run you down; lose them to cool off, or get busted
- **Eight-mission story** — from a first fare at the Marina pier to taking down Dario Kessler, the King of the Bay, then a taxi-driver chain and the Sunset Grand Prix, a timed checkpoint race across the whole city — with briefings, objectives and cash rewards
- **Side activities** — 18 hidden packages worth $50 each, and taxi fares: pick up a waving passenger and beat the clock to the green marker
- **Wanted level, escalated** — police cruisers chase you by road and foot cops run you down; at three stars a helicopter circles with a searchlight and cruisers set up roadblocks; lose them to cool off, or get busted
- **Combat** — fists up close, a pistol with a 12-round magazine (R to reload) once Lena hands you one, muzzle flashes, tracers and armed harbor guards with health bars who shoot back
- **HUD with minimap** — cash, health, sprint stamina, wanted stars, mission tracker with step count, race/fare timer, ammo, the car you are driving with its condition, speedometer, and a live top-down minimap with police, helicopter, package and objective blips
- **Sound** — fully synthesized WebAudio: engine hum, sirens, gunshots, crashes and a looping bass groove; no audio files
- **Save** — progress (cash, completed missions, hidden packages, fares run, best race time) persists in localStorage; pause menu to save, restart a mission or quit to title

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network — every
file the game loads lives under `game/`.

### Controls

| Key | Action |
| --- | --- |
| W A S D | Move / drive |
| Mouse drag | Look around |
| Wheel | Zoom camera |
| Shift | Run |
| E | Enter / exit car |
| Space | Jump / handbrake |
| Left click | Shoot (with pistol) |
| F | Punch |
| R | Reload pistol |
| T | Start a taxi fare |
| M | Missions |
| Esc | Pause |

## Screenshots

The cover shows a police chase at three wanted stars with the helicopter overhead, a
roadblock ahead, traffic to weave past, the minimap and a mission objective on the HUD;
the others show a taxi fare on foot by Cafe Azul, the Sunset Grand Prix race through
Downtown traffic, and a firefight at the Harbor warehouse. All four are real renders
of the game, staged deterministically with `?shot=chase|play|drive|mission&seed=11`.

## About this entry

Built for the [make.fun](https://make.fun/?ref=wmk9f4s6) **gta6-01** competition —
an original open-world crime game, with its own city, characters, vehicles, names,
story, art, sounds and music. Nothing from any commercial game.
