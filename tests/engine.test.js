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
} from "../src/engine.js";
function game() {
  let p = profile("mario");
  start(p);
  p.run.enemies = [];
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
  p.run.gold = 30;
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
