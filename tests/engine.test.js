import test from "node:test";
import assert from "node:assert/strict";
import {
  profile,
  start,
  act,
  generate,
  choose,
  gain,
  buy,
  purchase,
  migrate,
  targetsFor,
} from "../src/engine.js";
function game() {
  let p = profile("mario");
  start(p);
  p.run.enemies = [];
  p.run.map = Array.from({ length: 15 }, (_, y) =>
    Array.from({ length: 15 }, (_, x) =>
      !x || !y || x === 14 || y === 14 ? 1 : 0,
    ),
  );
  return p;
}
test("parede não gasta turno; passo válido permite um ataque inimigo", () => {
  let p = game(),
    r = p.run;
  r.enemies = [{ x: 3, y: 1, hp: 20, atk: 5, type: "slime" }];
  assert.equal(act(p, "move", -1, 0), false);
  assert.equal(r.turn, 0);
  act(p, "move", 1, 0);
  assert.equal(r.turn, 1);
  assert.equal(r.hp, 32);
});
test("ataque mata, recompensa e não permite retaliação do morto", () => {
  let p = game(),
    r = p.run;
  r.enemies = [{ x: 2, y: 1, hp: 1, atk: 99, type: "slime" }];
  act(p, "move", 1, 0);
  assert.equal(r.hp, 36);
  assert.equal(r.kills, 1);
  assert.ok(r.gold > 0 && r.xp > 0 && r.shards > 0);
});
test("morte transfere fragmentos uma vez e mantém melhorias", () => {
  let p = game(),
    r = p.run;
  r.shards = 20;
  r.hp = 1;
  r.enemies = [{ x: 2, y: 1, hp: 20, atk: 99, type: "slime" }];
  act(p, "wait");
  assert.equal(p.run, null);
  assert.equal(p.bank, 20);
  act(p, "wait");
  assert.equal(p.bank, 20);
  assert.equal(buy(p, "vigor"), true);
  start(p);
  assert.equal(p.run.maxHp, 42);
  assert.equal(p.run.gold, 0);
});
test("nível exige escolha e bloqueia ações até escolher", () => {
  let p = game();
  gain(p.run, 20);
  assert.equal(p.run.level, 2);
  assert.equal(act(p, "wait"), false);
  assert.equal(choose(p.run, "force"), true);
  assert.equal(act(p, "wait"), true);
});
test("guardião bloqueia saída e andar aumenta dificuldade", () => {
  let p = game(),
    r = p.run;
  r.x = r.y = 13;
  r.enemies = [{ type: "boss", x: 10, y: 10, hp: 10 }];
  assert.equal(act(p, "descend"), false);
  r.enemies = [];
  assert.equal(act(p, "descend"), true);
  assert.equal(r.floor, 2);
  assert.equal(p.best, 2);
});
test("escada e todos os pisos são alcançáveis em cem mapas", () => {
  let p = game();
  for (let n = 1; n <= 100; n++) {
    p.run.floor = n;
    generate(p.run);
    let seen = new Set(["1,1"]),
      q = [[1, 1]];
    for (let i = 0; i < q.length; i++) {
      let [x, y] = q[i];
      for (let [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        let a = x + dx,
          b = y + dy,
          k = `${a},${b}`;
        if (p.run.map[b]?.[a] === 0 && !seen.has(k)) {
          seen.add(k);
          q.push([a, b]);
        }
      }
    }
    assert.ok(seen.has("13,13"));
    assert.equal(seen.size, p.run.map.flat().filter((x) => x === 0).length);
  }
});
test("compras e poções respeitam recursos; nova exige nível 4", () => {
  let p = game();
  assert.equal(purchase(p.run, "potion"), false);
  assert.equal(act(p, "potion"), false);
  assert.equal(act(p, "nova"), false);
  p.run.gold = 40;
  assert.equal(purchase(p.run, "training"), true);
  assert.equal(p.run.gold, 0);
});
test("atalho nunca excede melhoria ou recorde", () => {
  let p = profile("mario");
  p.best = 20;
  p.upgrades.gate = 1;
  start(p, 99);
  assert.equal(p.run.floor, 6);
});

test("diagonais movem e atacam, sem atravessar quinas", () => {
  const p = game(),
    r = p.run;
  r.x = r.y = 3;
  assert.equal(act(p, "move", 1, 1), true);
  assert.deepEqual([r.x, r.y], [4, 4]);
  r.map[4][5] = 1;
  const turn = r.turn;
  assert.equal(act(p, "move", 1, 1), false);
  assert.equal(r.turn, turn);
  r.map[4][5] = 0;
  r.enemies = [{ x: 5, y: 5, hp: 1, atk: 3, type: "slime" }];
  act(p, "move", 1, 1);
  assert.equal(r.kills, 1);
  assert.equal(r.x, 4);
});
test("tiro respeita paredes e mana, gera efeitos e pode ser repetido com recurso", () => {
  const p = game(),
    r = p.run;
  r.enemies = [{ x: 5, y: 1, hp: 40, maxHp: 40, atk: 1, type: "slime" }];
  r.map[1][3] = 1;
  assert.equal(act(p, "bolt"), false);
  assert.equal(r.turn, 0);
  r.map[1][3] = 0;
  const effects = [];
  assert.equal(act(p, "bolt", 0, 0, effects), true);
  assert.equal(effects[0].targets[0].x, 5);
  assert.equal(r.enemies[0].hp, 32);
  assert.equal(r.mana, 22);
  assert.equal(act(p, "bolt"), true);
  r.enemies[0].x = 2;
  assert.equal(act(p, "burst"), true);
  assert.equal(r.mana, 9);
});
test("congelamento impede duas ações e depois libera o inimigo", () => {
  const p = game(),
    r = p.run;
  r.level = 2;
  r.enemies = [{ x: 2, y: 1, hp: 100, maxHp: 100, atk: 5, type: "slime" }];
  act(p, "frost");
  assert.equal(r.hp, 36);
  act(p, "wait");
  assert.equal(r.hp, 36);
  act(p, "wait");
  assert.equal(r.hp, 32);
});
test("arco acerta três alvos e não atravessa paredes nos saltos", () => {
  const p = game(),
    r = p.run;
  r.level = 3;
  r.enemies = [2, 4, 6, 8].map((x) => ({
    x,
    y: 1,
    hp: 100,
    maxHp: 100,
    atk: 1,
    type: "slime",
  }));
  assert.equal(targetsFor(r, "chain").length, 3);
  r.map[1][3] = 1;
  assert.equal(targetsFor(r, "chain").length, 1);
  r.map[1][3] = 0;
  const effects = [];
  act(p, "chain", 0, 0, effects);
  assert.equal(effects[0].targets.length, 3);
  assert.equal(r.enemies.filter((e) => e.hp < 100).length, 3);
});
test("melhorias de habilidade persistem e aumentam dano na próxima run", () => {
  const p = profile("mario");
  p.bank = 100;
  assert.equal(buy(p, "skill_bolt"), true);
  start(p);
  p.run.map = game().run.map;
  p.run.enemies = [{ x: 3, y: 1, hp: 100, maxHp: 100, atk: 1, type: "slime" }];
  act(p, "bolt");
  assert.equal(p.run.enemies[0].hp, 90);
  assert.equal(p.upgrades.skill_bolt, 1);
});
test("migração preserva run antiga e adiciona habilidades sem NaN", () => {
  const p = game();
  delete p.upgrades.skill_bolt;
  delete p.run.cooldowns;
  delete p.run.skillRanks;
  p.run.cd = 3;
  migrate(p);
  assert.equal(p.upgrades.skill_bolt, 0);
  assert.equal(p.run.cooldowns, undefined);
  assert.equal(p.run.mana, 28);
  assert.equal(p.run.skillRanks.bolt, 0);
  assert.equal(p.run.cd, undefined);
});
test("geração produz formatos distintos e posições válidas sem sobreposição", () => {
  const p = game(),
    layouts = new Set();
  let seed = 123;
  const rng = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 30; i++) {
    generate(p.run, rng);
    layouts.add(JSON.stringify(p.run.map));
    const entities = [...p.run.enemies, ...p.run.items];
    assert.equal(
      new Set(entities.map((e) => `${e.x},${e.y}`)).size,
      entities.length,
    );
    assert.ok(entities.every((e) => p.run.map[e.y][e.x] === 0));
    assert.ok(
      p.run.map
        .slice(1, -1)
        .flatMap((row) => row.slice(1, -1))
        .filter((v) => v === 1).length > 10,
    );
  }
  assert.equal(layouts.size, 30);
});
