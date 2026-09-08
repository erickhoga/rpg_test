export const encounters = {
  sentinel: {
    name: "Sentinela de choque",
    kind: "mini",
    color: "#ffb84d",
    skill: "Cruz de choque",
    tip: "A cruz marcada explode na próxima ação. Saia da linha.",
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
    tip: "O impacto marca uma área de 3 × 3. Afaste-se.",
    pattern: "slam",
  },
  prism: {
    name: "PRISMA · O executor",
    kind: "boss",
    color: "#ff51d6",
    skill: "Laser orbital",
    tip: "Toda a linha e coluna marcadas serão atingidas. Mude as duas coordenadas.",
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
function mark(r, e) {
  const def = encounters[e.variant],
    cells = [];
  for (let y = 1; y < 14; y++)
    for (let x = 1; x < 14; x++) {
      if (r.map[y][x]) continue;
      const dx = Math.abs(x - r.x),
        dy = Math.abs(y - r.y);
      const selected =
        def.pattern === "laser"
          ? dx === 0 || dy === 0
          : def.pattern === "cross"
            ? (dx === 0 && dy <= 2) || (dy === 0 && dx <= 2)
            : def.pattern === "ice"
              ? Math.max(dx, dy) <= 2 && dx + dy <= 2
              : Math.max(dx, dy) <= 1;
      if (selected) cells.push({ x, y });
    }
  return {
    cells,
    skill: def.skill,
    pattern: def.pattern,
    remaining: ["cross", "laser"].includes(def.pattern) ? 1 : 2,
  };
}
// Linhas dão uma ação de esquiva; áreas maiores dão duas antes do impacto.
export function guardianTurn(r, e, log, effects) {
  if (!e.variant) return false;
  const def = encounters[e.variant];
  if (e.intent) {
    if (e.intent.remaining > 1) {
      e.intent.remaining--;
      log(
        r,
        `${e.intent.skill}: falta ${e.intent.remaining} ação para o impacto.`,
      );
      return true;
    }
    const intent = e.intent;
    e.intent = null;
    effects.push({
      type: "enemy",
      color: def.color,
      from: { x: e.x, y: e.y },
      targets: intent.cells,
    });
    if (intent.cells.some((c) => c.x === r.x && c.y === r.y)) {
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
        `${def.skill}: ${damage} de dano${drain ? ` e -${drain} mana` : ""}.`,
      );
    } else log(r, `Você evitou ${def.skill}.`);
    if (intent.pattern === "summon") {
      let count = r.enemies.filter((v) => v.summoned).length;
      for (const c of intent.cells) {
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
  const frequency = e.hp < e.maxHp / 2 && def.kind === "boss" ? 2 : 3;
  if (e.phase % frequency === 0) {
    e.intent = mark(r, e);
    log(r, `${e.name} prepara ${def.skill}. Saia das casas marcadas!`);
    e.phase++;
    return true;
  }
  e.phase++;
  return false;
}
