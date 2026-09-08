export const SIZE = 15;
export const upgrades = {
  vigor: {
    name: "Raiz vital",
    description: "+6 de vida inicial",
    base: 15,
    max: 10,
  },
  force: {
    name: "Lâmina ancestral",
    description: "+1 de ataque inicial",
    base: 20,
    max: 8,
  },
  armor: {
    name: "Manto do guardião",
    description: "+1 de defesa inicial",
    base: 25,
    max: 6,
  },
  flask: {
    name: "Bolso de alquimista",
    description: "+1 poção inicial",
    base: 18,
    max: 4,
  },
  gate: {
    name: "Atalho das raízes",
    description: "Libera início +5 andares (até seu recorde)",
    base: 40,
    max: 5,
  },
};
export function profile(name) {
  return {
    name,
    bank: 0,
    best: 1,
    runs: 0,
    upgrades: Object.fromEntries(Object.keys(upgrades).map((k) => [k, 0])),
    run: null,
  };
}
export function cost(p, k) {
  return upgrades[k].base * (p.upgrades[k] + 1);
}
export function buy(p, k) {
  if (
    !upgrades[k] ||
    p.run ||
    p.upgrades[k] >= upgrades[k].max ||
    p.bank < cost(p, k)
  )
    return false;
  p.bank -= cost(p, k);
  p.upgrades[k]++;
  return true;
}
export function start(p, floor = 1) {
  floor = Math.max(1, Math.min(floor, p.best, 1 + p.upgrades.gate * 5));
  p.run = {
    floor,
    turn: 0,
    x: 1,
    y: 1,
    hp: 36 + p.upgrades.vigor * 6,
    maxHp: 36 + p.upgrades.vigor * 6,
    atk: 7 + p.upgrades.force,
    def: 1 + p.upgrades.armor,
    level: 1,
    xp: 0,
    gold: 0,
    shards: 0,
    kills: 0,
    potions: 2 + p.upgrades.flask,
    cd: 0,
    choices: 0,
    log: [],
    map: [],
    enemies: [],
    items: [],
  };
  generate(p.run);
  log(p.run, "A descida começa. Encontre a escada dourada.");
}
export function log(r, s) {
  r.log.unshift(s);
  r.log = r.log.slice(0, 6);
}
export function generate(r, rng = Math.random) {
  r.x = 1;
  r.y = 1;
  r.map = Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, (_, x) =>
      !x || !y || x === 14 || y === 14 ? 1 : 0,
    ),
  );
  for (let y = 2; y < 13; y++)
    for (let x = 2; x < 13; x++)
      if (x % 3 === 0 && y % 3 === 0 && rng() < 0.8) r.map[y][x] = 1;
  r.enemies = [];
  r.items = [];
  let occupied = new Set(["1,1", "13,13"]);
  function spot() {
    let x, y;
    do {
      x = 1 + Math.floor(rng() * 13);
      y = 1 + Math.floor(rng() * 13);
    } while (r.map[y][x] || occupied.has(`${x},${y}`) || x + y < 7);
    occupied.add(`${x},${y}`);
    return { x, y };
  }
  for (let i = 0; i < Math.min(4 + Math.floor(r.floor * 0.8), 19); i++) {
    let boss = r.floor % 5 === 0 && i === 0;
    let hp = Math.round((10 + r.floor * 4) * (boss ? 3 : 1));
    r.enemies.push({
      ...spot(),
      hp,
      maxHp: hp,
      atk: 3 + Math.floor(r.floor * 1.3),
      type: boss ? "boss" : i % 3 === 0 ? "bat" : "slime",
    });
  }
  for (let i = 0; i < 4; i++)
    r.items.push({ ...spot(), type: i === 0 ? "potion" : "gold" });
}
export function need(r) {
  return 12 + r.level * 8;
}
export function gain(r, n) {
  r.xp += n;
  while (r.xp >= need(r)) {
    r.xp -= need(r);
    r.level++;
    r.maxHp += 4;
    r.hp = Math.min(r.maxHp, r.hp + 12);
    r.atk++;
    r.choices++;
    log(r, `Nível ${r.level}! Escolha uma bênção.`);
  }
}
export function choose(r, k) {
  if (!r.choices) return false;
  if (k === "vigor") {
    r.maxHp += 8;
    r.hp += 8;
  } else if (k === "force") r.atk += 2;
  else if (k === "armor") r.def++;
  else return false;
  r.choices--;
  return true;
}
function hit(r, e, m = 1) {
  let damage = Math.round(r.atk * m);
  e.hp -= damage;
  log(
    r,
    `${e.type === "boss" ? "Guardião" : "Criatura"} sofreu ${damage} de dano.`,
  );
  if (e.hp <= 0) {
    r.enemies = r.enemies.filter((v) => v !== e);
    r.kills++;
    r.gold += 5 + r.floor * 2;
    r.shards += e.type === "boss" ? 10 + r.floor : 1 + Math.floor(r.floor / 3);
    gain(r, 5 + r.floor * 3);
  }
}
export function act(p, action, dx = 0, dy = 0) {
  let r = p.run;
  if (!r || r.choices) return false;
  let used = false;
  if (action === "move") {
    if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
    let x = r.x + dx,
      y = r.y + dy;
    if (r.map[y]?.[x] !== 0) return false;
    let e = r.enemies.find((e) => e.x === x && e.y === y);
    if (e) hit(r, e);
    else {
      r.x = x;
      r.y = y;
    }
    used = true;
  }
  if (action === "wait") used = true;
  if (action === "attack") {
    let e = r.enemies.find(
      (e) => Math.abs(e.x - r.x) + Math.abs(e.y - r.y) === 1,
    );
    if (!e) {
      log(r, "Aproxime-se de uma criatura para atacar.");
      return false;
    }
    hit(r, e);
    used = true;
  }
  if (action === "burst" || action === "nova") {
    if (r.cd > 0 || (action === "nova" && r.level < 4)) return false;
    let targets = r.enemies.filter(
      (e) =>
        Math.abs(e.x - r.x) + Math.abs(e.y - r.y) <=
        (action === "nova" ? 3 : 1),
    );
    if (!targets.length) {
      log(r, "Nenhum inimigo ao alcance do poder.");
      return false;
    }
    for (let e of targets) hit(r, e, action === "nova" ? 1.6 : 2);
    r.cd = action === "nova" ? 6 : 4;
    used = true;
  }
  if (action === "potion") {
    if (!r.potions || r.hp === r.maxHp) return false;
    r.potions--;
    r.hp = Math.min(r.maxHp, r.hp + 25);
    log(r, "Poção restaurou até 25 de vida.");
    used = true;
  }
  if (action === "descend") {
    if (r.x !== 13 || r.y !== 13) return false;
    if (r.enemies.some((e) => e.type === "boss")) {
      log(r, "Derrote o guardião para abrir a escada.");
      return false;
    }
    r.floor++;
    p.best = Math.max(p.best, r.floor);
    r.shards += 2;
    r.gold += r.floor * 3;
    r.hp = Math.min(r.maxHp, r.hp + 8);
    generate(r);
    log(r, `Andar ${r.floor}. A escuridão fica mais forte.`);
    used = true;
  }
  if (!used) return false;
  r.turn++;
  if (r.cd) r.cd--;
  let item = r.items.find((i) => i.x === r.x && i.y === r.y);
  if (item) {
    if (item.type === "potion") {
      r.potions++;
      log(r, "Você encontrou uma poção.");
    } else {
      r.gold += 8 + r.floor * 2;
      log(r, "Você recolheu moedas antigas.");
    }
    r.items = r.items.filter((i) => i !== item);
  }
  for (let e of [...r.enemies]) {
    let dist = Math.abs(e.x - r.x) + Math.abs(e.y - r.y);
    if (dist === 1) {
      let damage = Math.max(1, e.atk - r.def);
      r.hp -= damage;
      log(r, `Você recebeu ${damage} de dano.`);
    } else if (dist <= 7 || e.type === "boss") {
      let queue = [{ x: r.x, y: r.y }],
        seen = new Set([`${r.x},${r.y}`]),
        found;
      for (let i = 0; i < queue.length && !found; i++) {
        let c = queue[i];
        for (let [a, b] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          let x = c.x + a,
            y = c.y + b,
            key = `${x},${y}`;
          if (x === e.x && y === e.y) {
            found = c;
            break;
          }
          if (
            r.map[y]?.[x] === 0 &&
            !seen.has(key) &&
            !r.enemies.some((v) => v !== e && v.x === x && v.y === y)
          ) {
            seen.add(key);
            queue.push({ x, y });
          }
        }
      }
      if (found && (found.x !== r.x || found.y !== r.y)) {
        e.x = found.x;
        e.y = found.y;
      }
    }
    if (r.hp <= 0) break;
  }
  if (r.hp <= 0) {
    p.bank += r.shards;
    p.runs++;
    p.best = Math.max(p.best, r.floor);
    p.last = { floor: r.floor, kills: r.kills, shards: r.shards, turn: r.turn };
    p.run = null;
  }
  return true;
}
export function purchase(r, k) {
  let price = k === "potion" ? 20 : k === "training" ? 30 : 45;
  if (
    r.gold < price ||
    !["potion", "training", "armor"].includes(k) ||
    r.choices
  )
    return false;
  r.gold -= price;
  if (k === "potion") r.potions++;
  if (k === "training") gain(r, 15);
  if (k === "armor") r.def++;
  log(r, "Compra concluída no mercador.");
  return true;
}
