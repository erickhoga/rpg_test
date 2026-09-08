import test from "node:test";
import assert from "node:assert/strict";
import {
  profile,
  start,
  generate,
  act,
  purchase,
  migrate,
} from "../src/engine.js";
import { encounterKey, encounters } from "../src/encounters.js";
function game(floor = 1) {
  const p = profile("test");
  start(p);
  p.run.floor = floor;
  generate(p.run, () => 0.3);
  return p;
}
test("mana gasta, regenera só com ação válida, poção limita ao máximo e compra exige moedas", () => {
  const p = game(),
    r = p.run;
  r.enemies = [];
  r.mana = 0;
  assert.equal(act(p, "bolt"), false);
  assert.equal(r.mana, 0);
  assert.equal(act(p, "move", -1, 0), false);
  assert.equal(r.mana, 0);
  act(p, "wait");
  assert.equal(r.mana, 1);
  act(p, "mana");
  assert.equal(r.mana, 16);
  assert.equal(r.manaPotions, 0);
  assert.equal(purchase(r, "mana"), false);
  r.gold = 24;
  assert.equal(purchase(r, "mana"), true);
  assert.equal(r.gold, 0);
  r.mana = 27;
  act(p, "mana");
  assert.equal(r.mana, 28);
  const turn = r.turn;
  assert.equal(act(p, "mana"), false);
  assert.equal(r.turn, turn);
});
test("três minibosses e três chefes, arenas abertas e saída bloqueada", () => {
  const expected = {
    5: "sentinel",
    10: "prism",
    15: "venom",
    20: "zero",
    25: "crusher",
    30: "nexus",
    40: "prism",
  };
  for (const [floor, key] of Object.entries(expected)) {
    const p = game(Number(floor)),
      r = p.run;
    assert.equal(encounterKey(Number(floor)), key);
    assert.equal(r.arena, key);
    assert.equal(r.enemies[0].variant, key);
    assert.ok(r.map.flat().filter((c) => !c).length > 150);
    r.x = r.y = 13;
    assert.equal(act(p, "descend"), false);
    r.enemies = [];
    assert.equal(act(p, "descend"), true);
    assert.equal(r.floor, Number(floor) + 1);
  }
});
test("cada variante avisa antes de causar dano e permite esquiva", () => {
  for (const floor of [5, 10, 15, 20, 25, 30]) {
    let p = game(floor),
      r = p.run;
    r.x = 4;
    r.y = 3;
    r.hp = r.maxHp = 1000;
    act(p, "wait");
    const boss = r.enemies[0];
    assert.ok(boss.intent);
    assert.equal(r.hp, 1000);
    const count = boss.intent.remaining;
    for (let i = 0; i < count; i++) act(p, "move", 1, -1);
    assert.equal(r.hp, 1000, `esquiva ${floor}`);
    p = game(floor);
    r = p.run;
    r.x = 4;
    r.y = 3;
    r.hp = r.maxHp = 1000;
    act(p, "wait");
    const n = r.enemies[0].intent.remaining;
    for (let i = 0; i < n; i++) act(p, "wait");
    assert.ok(r.hp < 1000, `impacto ${floor}`);
  }
});
test("ZERO drena mana; NEXUS invoca drones com limite e sem recompensa infinita", () => {
  const p = game(20),
    r = p.run;
  r.hp = r.maxHp = 1000;
  r.mana = r.maxMana;
  r.x = 3;
  r.y = 3;
  act(p, "wait");
  act(p, "wait");
  act(p, "wait");
  assert.equal(r.mana, 20);
  const q = game(30),
    s = q.run;
  s.hp = s.maxHp = 10000;
  for (let i = 0; i < 20; i++) act(q, "wait");
  assert.ok(s.enemies.some((e) => e.summoned));
  assert.ok(s.enemies.filter((e) => e.summoned).length <= 4);
  const drone = s.enemies.find((e) => e.summoned);
  s.enemies = [drone];
  s.x = 1;
  s.y = 1;
  drone.x = 2;
  drone.y = 1;
  drone.hp = 1;
  s.map[1][2] = 0;
  const gold = s.gold,
    xp = s.xp,
    shards = s.shards;
  act(q, "attack");
  assert.deepEqual([s.gold, s.xp, s.shards], [gold, xp, shards]);
});
test("matar chefe cancela ataque marcado e concede recompensa uma vez", () => {
  const p = game(5),
    r = p.run,
    boss = r.enemies[0];
  r.hp = r.maxHp = 1000;
  act(p, "wait");
  assert.ok(boss.intent);
  r.x = 6;
  r.y = 7;
  boss.hp = 1;
  act(p, "attack");
  assert.equal(r.enemies.length, 0);
  assert.ok(r.shards >= 15);
  const shards = r.shards;
  act(p, "wait");
  assert.equal(r.shards, shards);
});
test("migração de save mantém mana gasta e adapta guardião legado", () => {
  const p = game(5),
    r = p.run;
  r.mana = 3;
  r.manaPotions = 0;
  delete r.enemies[0].variant;
  const hp = r.enemies[0].hp;
  migrate(p);
  assert.equal(r.mana, 3);
  assert.equal(r.manaPotions, 0);
  assert.equal(r.enemies[0].hp, hp);
  assert.equal(r.enemies[0].variant, "sentinel");
});
test("novos inimigos são mais fortes que a versão anterior e escalam por andar", () => {
  const r = game().run;
  assert.ok(r.enemies.length >= 6);
  assert.ok(r.enemies.every((e) => e.hp > 14 && e.atk > 4));
  r.floor = 9;
  generate(r);
  assert.ok(r.enemies.every((e) => e.hp > 46 && e.atk > 14));
});
