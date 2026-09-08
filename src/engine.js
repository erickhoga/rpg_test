import {
  arena,
  encounterKey,
  makeGuardian,
  guardianTurn,
  pendingReaction,
  resolveGuardian,
} from "./encounters.js";
export const SIZE = 15;
export const spells = {
  burst: {
    name: "Pulso neon",
    icon: "✦",
    key: "1",
    level: 1,
    range: 1,
    damage: 1.7,
    mana: 8,
    color: "#ff51d6",
    detail: "Todos adjacentes · 1,7× dano",
  },
  nova: {
    name: "Nova de plasma",
    icon: "❋",
    key: "2",
    level: 4,
    range: 3,
    damage: 1.3,
    mana: 16,
    color: "#bd7aff",
    detail: "Área visível de 3 casas · 1,3× dano",
  },
  bolt: {
    name: "Disparo iônico",
    icon: "➶",
    key: "4",
    level: 1,
    range: 6,
    damage: 1.15,
    mana: 7,
    color: "#38edff",
    detail: "Alvo visível mais próximo · 6 casas",
  },
  frost: {
    name: "Lança criogênica",
    icon: "❄",
    key: "5",
    level: 2,
    range: 5,
    damage: 0.8,
    mana: 11,
    color: "#8bbcff",
    detail: "5 casas · congela por 2 ações",
  },
  chain: {
    name: "Arco elétrico",
    icon: "ϟ",
    key: "6",
    level: 3,
    range: 5,
    damage: 1,
    mana: 14,
    color: "#efff65",
    detail: "5 casas · salta até 3 alvos (3 casas)",
  },
};
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
for (const [key, spell] of Object.entries(spells))
  upgrades[`skill_${key}`] = {
    name: spell.name,
    description: "+20% de dano do poder por nível (permanente)",
    base: 20,
    max: 5,
    icon: spell.icon,
  };
// Mantém personagens e runs da versão anterior utilizáveis.
export function migrate(p) {
  p.upgrades = {
    ...Object.fromEntries(Object.keys(upgrades).map((k) => [k, 0])),
    ...p.upgrades,
  };
  if (p.run) {
    p.run.maxMana ??= 28 + (p.run.level - 1) * 2;
    p.run.mana ??= p.run.maxMana;
    p.run.manaPotions ??= 1;
    p.run.arena ??= null;
    delete p.run.cooldowns;
    delete p.run.cd;
    p.run.skillRanks = Object.fromEntries(
      Object.keys(spells).map((k) => [k, p.upgrades[`skill_${k}`]]),
    );
    p.run.enemies.forEach((e) => {
      e.frozen ??= 0;
      if (e.intent && !e.intent.deadline) {
        e.intent = null;
        e.phase = 0;
      }
      if (e.type === "boss" && !e.variant) {
        const guardian = makeGuardian(p.run.floor, e.x, e.y);
        Object.assign(e, {
          variant: guardian.variant,
          name: guardian.name,
          phase: 0,
          intent: null,
        });
      }
    });
  }
  return p;
}
export const distance = (a, b) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export function canStep(map, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  return (
    Number.isInteger(dx) &&
    Number.isInteger(dy) &&
    Math.max(Math.abs(dx), Math.abs(dy)) === 1 &&
    map[b.y]?.[b.x] === 0 &&
    (!dx || !dy || (map[a.y]?.[b.x] === 0 && map[b.y]?.[a.x] === 0))
  );
}
export function visible(map, a, b) {
  // Supercover: bloqueia paredes e disparos pelas quinas fechadas.
  let x = a.x,
    y = a.y,
    dx = b.x - a.x,
    dy = b.y - a.y,
    nx = Math.abs(dx),
    ny = Math.abs(dy),
    sx = Math.sign(dx),
    sy = Math.sign(dy),
    ix = 0,
    iy = 0;
  while (ix < nx || iy < ny) {
    let v = (1 + 2 * ix) * ny - (1 + 2 * iy) * nx,
      next = { x, y };
    if (v === 0) {
      next.x += sx;
      next.y += sy;
      ix++;
      iy++;
    } else if (v < 0) {
      next.x += sx;
      ix++;
    } else {
      next.y += sy;
      iy++;
    }
    if (!canStep(map, { x, y }, next)) return false;
    x = next.x;
    y = next.y;
  }
  return true;
}
export function targetsFor(r, key) {
  let spell = spells[key];
  if (!spell) return [];
  let candidates = r.enemies
    .filter((e) => distance(r, e) <= spell.range && visible(r.map, r, e))
    .sort((a, b) => distance(r, a) - distance(r, b));
  if (key === "burst" || key === "nova") return candidates;
  let result = candidates.slice(0, 1);
  if (key === "chain")
    while (result.length && result.length < 3) {
      let prev = result.at(-1),
        next = r.enemies
          .filter(
            (e) =>
              !result.includes(e) &&
              distance(prev, e) <= 3 &&
              visible(r.map, prev, e),
          )
          .sort((a, b) => distance(prev, a) - distance(prev, b))[0];
      if (!next) break;
      result.push(next);
    }
  return result;
}
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
  migrate(p);
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
    maxMana: 28,
    mana: 28,
    manaPotions: 1,
    skillRanks: Object.fromEntries(
      Object.keys(spells).map((k) => [k, p.upgrades[`skill_${k}`]]),
    ),
    choices: 0,
    log: [],
    map: [],
    enemies: [],
    items: [],
  };
  generate(p.run);
  log(p.run, "A descida começa. Encontre a escada neon.");
}
export function log(r, s) {
  r.log.unshift(s);
  r.log = r.log.slice(0, 6);
}
export function generate(r, rng = Math.random) {
  r.x = 1;
  r.y = 1;
  r.arena = null;
  if (encounterKey(r.floor)) {
    arena(r);
    return;
  }
  r.map = Array.from({ length: SIZE }, () => Array(SIZE).fill(1));
  // DFS aléatorio conecta todas as células; salas e atalhos abrem variações.
  const stack = [{ x: 1, y: 1 }];
  r.map[1][1] = 0;
  while (stack.length) {
    const cell = stack.at(-1),
      options = [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
      ]
        .map(([dx, dy]) => ({ x: cell.x + dx, y: cell.y + dy }))
        .filter(
          (v) =>
            v.x > 0 &&
            v.y > 0 &&
            v.x < SIZE - 1 &&
            v.y < SIZE - 1 &&
            r.map[v.y][v.x] === 1,
        );
    if (!options.length) {
      stack.pop();
      continue;
    }
    const next = options[Math.floor(rng() * options.length)];
    r.map[(cell.y + next.y) / 2][(cell.x + next.x) / 2] = 0;
    r.map[next.y][next.x] = 0;
    stack.push(next);
  }
  for (let room = 0; room < 3; room++) {
    const x = 1 + 2 * Math.floor(rng() * 6),
      y = 1 + 2 * Math.floor(rng() * 6);
    for (let dy = 0; dy < 3; dy++)
      for (let dx = 0; dx < 3; dx++) r.map[y + dy][x + dx] = 0;
  }
  for (let y = 2; y < 13; y++)
    for (let x = 2; x < 13; x++)
      if (
        r.map[y][x] === 1 &&
        rng() < 0.09 &&
        ((!r.map[y - 1][x] && !r.map[y + 1][x]) ||
          (!r.map[y][x - 1] && !r.map[y][x + 1]))
      )
        r.map[y][x] = 0;
  r.enemies = [];
  r.items = [];
  const free = [];
  for (let y = 1; y < 14; y++)
    for (let x = 1; x < 14; x++)
      if (!r.map[y][x] && x + y >= 7 && !(x === 13 && y === 13))
        free.push({ x, y });
  function spot() {
    return free.splice(Math.floor(rng() * free.length), 1)[0];
  }
  for (let i = 0; i < Math.min(5 + Math.floor(r.floor * 1.1), 22); i++) {
    let hp = 17 + r.floor * 5;
    r.enemies.push({
      ...spot(),
      frozen: 0,
      hp,
      maxHp: hp,
      atk: 5 + Math.floor(r.floor * 1.5),
      type: i % 3 === 0 ? "bat" : "slime",
    });
  }
  for (let i = 0; i < 4; i++)
    r.items.push({
      ...spot(),
      type: i === 0 ? "potion" : i === 1 ? "mana" : "gold",
    });
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
    r.hp = Math.min(r.maxHp, r.hp + 6);
    r.atk++;
    r.maxMana += 2;
    r.mana = Math.min(r.maxMana, r.mana + 2);
    r.choices++;
    log(r, `Nível ${r.level}! Escolha uma bênção.`);
  }
}
export function choose(r, k) {
  if (!r.choices) return false;
  if (k === "vigor") {
    r.maxHp += 6;
    r.hp += 6;
  } else if (k === "force") r.atk += 1;
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
    `${e.name || (e.type === "boss" ? "Guardião" : "Criatura")} sofreu ${damage} de dano.`,
  );
  if (e.hp <= 0) {
    r.enemies = r.enemies.filter((v) => v !== e);
    r.kills++;
    if (e.type === "boss")
      log(r, `${e.name || "Guardião"} derrotado! Passagem liberada.`);
    if (e.summoned) return;
    r.gold += 5 + r.floor * 2;
    r.shards += e.type === "boss" ? 10 + r.floor : 1 + Math.floor(r.floor / 3);
    gain(r, 5 + r.floor * 2);
  }
}
function finishDeath(p) {
  const r = p.run;
  if (r.hp <= 0) {
    p.bank += r.shards;
    p.runs++;
    p.best = Math.max(p.best, r.floor);
    p.last = { floor: r.floor, kills: r.kills, shards: r.shards, turn: r.turn };
    p.run = null;
  }
}
export function resolveReaction(
  p,
  target = null,
  now = Date.now(),
  effects = [],
) {
  const r = p.run,
    e = pendingReaction(r);
  if (!e) return false;
  // Um timeout antecipado não pode resolver o ataque.
  if (!target && now < e.intent.deadline) return false;
  resolveGuardian(r, e, target, now, log, effects);
  finishDeath(p);
  return true;
}
export function act(p, action, dx = 0, dy = 0, effects = []) {
  let r = p.run;
  if (!r || pendingReaction(r) || r.choices) return false;
  let used = false;

  if (action === "move") {
    if (!canStep(r.map, r, { x: r.x + dx, y: r.y + dy })) return false;
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
    let e = r.enemies.find((e) => distance(r, e) === 1 && canStep(r.map, r, e));
    if (!e) {
      log(r, "Aproxime-se de uma criatura para atacar.");
      return false;
    }
    hit(r, e);
    used = true;
  }
  if (spells[action]) {
    const spell = spells[action];
    if (r.level < spell.level) return false;
    if (r.mana < spell.mana) {
      log(r, `Mana insuficiente: ${spell.mana} necessária.`);
      return false;
    }
    const targets = targetsFor(r, action);
    if (!targets.length) {
      log(r, "Nenhum alvo visível ao alcance. Paredes bloqueiam poderes.");
      return false;
    }
    effects.push({
      type: action,
      color: spell.color,
      from: { x: r.x, y: r.y },
      targets: targets.map((e) => ({ x: e.x, y: e.y })),
    });
    for (const e of targets) {
      hit(r, e, spell.damage * (1 + 0.2 * (r.skillRanks?.[action] || 0)));
      if (action === "frost" && e.hp > 0) e.frozen = e.type === "boss" ? 1 : 2;
    }
    r.mana -= spell.mana;
    used = true;
  }
  if (action === "potion") {
    if (!r.potions || r.hp === r.maxHp) return false;
    r.potions--;
    r.hp = Math.min(r.maxHp, r.hp + 25);
    log(r, "Poção restaurou até 25 de vida.");
    used = true;
  }
  if (action === "mana") {
    if (!r.manaPotions || r.mana >= r.maxMana) return false;
    r.manaPotions--;
    r.mana = Math.min(r.maxMana, r.mana + 14);
    log(r, "Poção restaurou até 14 de mana.");
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
    r.hp = Math.min(r.maxHp, r.hp + 4);
    generate(r);
    log(r, `Andar ${r.floor}. A escuridão fica mais forte.`);
    used = true;
  }
  if (!used) return false;
  r.turn++;
  r.mana = Math.min(r.maxMana, r.mana + 1);
  let item = r.items.find((i) => i.x === r.x && i.y === r.y);
  if (item) {
    if (item.type === "potion") {
      r.potions++;
      log(r, "Você encontrou uma poção.");
    } else if (item.type === "mana") {
      r.manaPotions++;
      log(r, "Você encontrou uma poção de mana.");
    } else {
      r.gold += 8 + r.floor * 2;
      log(r, "Você recolheu moedas antigas.");
    }
    r.items = r.items.filter((i) => i !== item);
  }
  for (let e of [...r.enemies]) {
    if (e.frozen > 0) {
      e.frozen--;
      continue;
    }
    if (guardianTurn(r, e, log, effects)) {
      if (e.intent) break;
      if (r.hp <= 0) break;
      continue;
    }
    let dist = distance(e, r);
    if (dist === 1 && canStep(r.map, e, r)) {
      let damage = Math.max(1, e.atk - r.def);
      r.hp -= damage;
      log(r, `Você recebeu ${damage} de dano.`);
    } else if (dist <= 10 || e.type === "boss") {
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
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ]) {
          let x = c.x + a,
            y = c.y + b,
            key = `${x},${y}`;
          if (!canStep(r.map, c, { x, y })) continue;
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
  finishDeath(p);
  return true;
}
export function purchase(r, k) {
  let price = { potion: 28, mana: 24, training: 40, armor: 60 }[k];
  if (
    r.gold < price ||
    !["potion", "mana", "training", "armor"].includes(k) ||
    r.choices ||
    pendingReaction(r)
  )
    return false;
  r.gold -= price;
  if (k === "potion") r.potions++;
  if (k === "mana") r.manaPotions++;
  if (k === "training") gain(r, 15);
  if (k === "armor") r.def++;
  log(r, "Compra concluída no mercador.");
  return true;
}
