// Round 3 shop: the thing to spend mission cash on. Wrench's garage sells body
// armor, a pistol and a Comet GT of your own — progression you can feel, not just a
// bigger number. Purchases persist in the save slot; the Comet parks at the garage
// and is yours to drive whenever you want it.
import { SHOP } from './config.js';
import { makeCar } from './vehicles.js';

export function createShop(G) {
  function cometCar() {
    const g = G.city.locations.garage;
    const car = makeCar(G, 0xe8c832, 'sport', g.x, g.z + 18, Math.PI / 2);
    car.isComet = true;
    car.owned = true;
    // Owned cars live outside the mission fleet, so starting a mission never
    // clears the car you paid for.
    G.ownedCars.push(car);
    return car;
  }

  function items() {
    const p = G.player.state;
    return [
      {
        id: 'armor',
        label: SHOP.armor.label,
        desc: SHOP.armor.desc,
        price: SHOP.armor.price,
        owned: p.armor >= 50,
      },
      {
        id: p.hasPistol ? 'ammo' : 'pistol',
        label: p.hasPistol ? SHOP.ammo.label : SHOP.pistol.label,
        desc: p.hasPistol ? SHOP.ammo.desc : SHOP.pistol.desc,
        price: p.hasPistol ? SHOP.ammo.price : SHOP.pistol.price,
        owned: false,
      },
      {
        id: 'comet',
        label: SHOP.comet.label,
        desc: SHOP.comet.desc,
        price: SHOP.comet.price,
        owned: G.ownsComet === true,
      },
    ];
  }

  function buy(id) {
    const item = items().find((i) => i.id === id);
    if (!item || item.owned) return false;
    if (G.cash < item.price) {
      G.hud.banner(`Not enough cash — ${item.label} costs $${item.price}.`);
      return false;
    }
    G.cash -= item.price;
    if (id === 'armor') {
      G.player.state.armor = 50;
    } else if (id === 'pistol') {
      G.player.givePistol();
    } else if (id === 'ammo') {
      G.player.state.ammo = G.player.state.ammoMax;
    } else if (id === 'comet') {
      G.ownsComet = true;
      cometCar();
    }
    G.audio.sting();
    G.hud.banner(`${item.label} bought — $${item.price}.`);
    G.save();
    return true;
  }

  // A Comet bought earlier parks itself at the garage when the game boots.
  function restoreOwned() {
    if (G.ownsComet) cometCar();
  }

  return { items, buy, restoreOwned };
}
