export const encounters = {
  sentinel: {
    name: "Sentinela de choque",
    kind: "mini",
    color: "#ffb84d",
    skill: "Cruz de choque",
    tip: "Clique numa casa SEGURA antes do cronômetro zerar.",
    pattern: "cross",
  },
  venom: {
    name: "Alquimista tóxico",
    kind: "mini",
    color: "#8dff62",
    skill: "Poça corrosiva",
    tip: "A área marcada causa dano e drena 4 de mana.",
    pattern: "pool",
  },
  crusher: {
    name: "Demolidor neon",
    kind: "mini",
    color: "#ff708f",
    skill: "Impacto sísmico",
    tip: "Impacto na arena: clique numa casa SEGURA.",
    pattern: "slam",
  },
  prism: {
    name: "PRISMA · O executor",
    kind: "boss",
    color: "#ff51d6",
    skill: "Laser orbital",
    tip: "Laser orbital: só a casa SEGURA protege você.",
    pattern: "laser",
  },
  zero: {
    name: "ZERO · A mente glacial",
    kind: "boss",
    color: "#7acbff",
    skill: "Ruptura criogênica",
    tip: "A área congelada causa dano e drena 8 de mana.",
    pattern: "ice",
  },
  nexus: {
    name: "NEXUS · A colmeia",
    kind: "boss",
    color: "#c089ff",
    skill: "Fenda de invocação",
    tip: "Fendas explodem e invocam até quatro drones ativos. Elimine o núcleo.",
    pattern: "summon",
  },
};
export function encounterKey(floor) {
  if (floor % 5 !== 0) return null;
  return floor % 10 === 0
    ? ["prism", "zero", "nexus"][(floor / 10 - 1) % 3]
    : ["sentinel", "venom", "crusher"][Math.floor(floor / 10) % 3];
}
export function makeGuardian(floor, x = 7, y = 7) {
  const variant = encounterKey(floor) || "sentinel",
    def = encounters[variant],
    major = def.kind === "boss";
  const hp = Math.round((26 + floor * 7) * (major ? 3.3 : 2.1));
  return {
    x,
    y,
    type: "boss",
    variant,
    name: def.name,
    hp,
    maxHp: hp,
    atk: 7 + Math.floor(floor * 1.4),
    frozen: 0,
    phase: 0,
    intent: null,
  };
}
export function arena(r) {
  r.map = Array.from({ length: 15 }, (_, y) =>
    Array.from({ length: 15 }, (_, x) =>
      !x || !y || x === 14 || y === 14 ? 1 : 0,
    ),
  );
  const variant = encounterKey(r.floor);
  const pillars =
    variant === "zero"
      ? [
          [4, 4],
          [10, 4],
          [4, 10],
          [10, 10],
        ]
      : variant === "nexus"
        ? [
            [3, 7],
            [11, 7],
            [7, 3],
            [7, 11],
          ]
        : [
            [4, 5],
            [10, 5],
            [4, 9],
            [10, 9],
          ];
  for (const [x, y] of pillars) r.map[y][x] = 1;
  r.enemies = [makeGuardian(r.floor)];
  r.items = [
    { x: 2, y: 11, type: "potion" },
    { x: 12, y: 2, type: "mana" },
  ];
  r.arena = variant;
}
export function mark(r, e, now = Date.now(), rng = Math.random) {
  const def = encounters[e.variant];
  // Casas de fuga alcançáveis por um dash de até quatro passos, sem cruzar paredes.
  const queue = [{ x: r.x, y: r.y, steps: 0 }],
    seen = new Set([`${r.x},${r.y}`]),
    free = [];
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    if (cell.steps >= 2) free.push({ x: cell.x, y: cell.y });
    if (cell.steps === 4) continue;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = cell.x + dx,
        y = cell.y + dy,
        key = `${x},${y}`;
      if (
        r.map[y]?.[x] !== 0 ||
        seen.has(key) ||
        r.enemies.some((v) => v.x === x && v.y === y)
      )
        continue;
      seen.add(key);
      queue.push({ x, y, steps: cell.steps + 1 });
    }
  }
  // Corredores legados muito apertados ainda recebem ao menos uma saída válida.
  if (!free.length) free.push(...queue.slice(1).map(({ x, y }) => ({ x, y })));
  if (!free.length) return null;
  const safe = [];
  const count = def.kind === "mini" ? 2 : 1;
  while (safe.length < count && free.length)
    safe.push(free.splice(Math.floor(rng() * free.length), 1)[0]);
  const cells = [];
  for (let y = 1; y < 14; y++)
    for (let x = 1; x < 14; x++)
      if (!r.map[y][x] && !safe.some((c) => c.x === x && c.y === y))
        cells.push({ x, y });
  const durationMs =
    def.kind === "mini" ? 4500 : e.hp < e.maxHp / 2 ? 2800 : 3500;
  return {
    cells,
    safe,
    skill: def.skill,
    pattern: def.pattern,
    durationMs,
    deadline: now + durationMs,
  };
}
export function pendingReaction(r) {
  return r?.enemies.find((e) => e.intent?.deadline);
}
export function resolveGuardian(r, e, target, now, log, effects) {
  const def = encounters[e.variant],
    intent = e.intent;
  if (!intent) return false;
  const success =
    now < intent.deadline &&
    target &&
    intent.safe.some((c) => c.x === target.x && c.y === target.y);
  if (success) {
    r.x = target.x;
    r.y = target.y;
  }
  e.intent = null;
  effects.push({
    type: "enemy",
    color: def.color,
    from: { x: e.x, y: e.y },
    targets: intent.cells,
  });
  if (!success) {
    const damage = Math.max(
      2,
      Math.round(
        e.atk *
          (def.kind === "boss" ? 1.5 : 1.2) *
          (e.hp < e.maxHp / 2 ? 1.2 : 1),
      ) - Math.floor(r.def * 0.6),
    );
    r.hp -= damage;
    const drain =
      intent.pattern === "ice" ? 8 : intent.pattern === "pool" ? 4 : 0;
    r.mana = Math.max(0, r.mana - drain);
    log(
      r,
      `${target && now < intent.deadline ? "Casa errada" : "Tempo esgotado"}! ${def.skill}: ${damage} dano${drain ? ` e -${drain} mana` : ""}.`,
    );
  } else log(r, `Esquiva perfeita! Você escapou de ${def.skill}.`);
  if (intent.pattern === "summon") {
    let count = r.enemies.filter((v) => v.summoned).length;
    // Drones nas proximidades do jogador, em vez de preencher a arena inteira.
    for (const c of intent.cells.filter(
      (c) => Math.max(Math.abs(c.x - r.x), Math.abs(c.y - r.y)) <= 3,
    )) {
      if (count >= 4) break;
      if (
        (c.x === r.x && c.y === r.y) ||
        r.enemies.some((v) => v.x === c.x && v.y === c.y)
      )
        continue;
      r.enemies.push({
        ...c,
        type: "bat",
        summoned: true,
        hp: 12 + r.floor * 2,
        maxHp: 12 + r.floor * 2,
        atk: 4 + Math.floor(r.floor * 0.8),
        frozen: 0,
      });
      count++;
    }
  }
  e.phase++;
  return true;
}
// Durante o desafio, somente clique de esquiva ou prazo esgotado resolve o ataque.
export function guardianTurn(r, e, log, effects) {
  if (!e.variant) return false;
  const def = encounters[e.variant];
  if (e.intent) return true;
  const frequency = e.hp < e.maxHp / 2 && def.kind === "boss" ? 2 : 3;
  if (e.phase % frequency === 0) {
    e.intent = mark(r, e);
    if (!e.intent) {
      e.phase++;
      return false;
    }
    log(r, `${e.name}: clique numa casa SEGURA antes do tempo acabar!`);
    e.phase++;
    return true;
  }
  e.phase++;
  return false;
}
