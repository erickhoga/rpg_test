import test from "node:test";
import assert from "node:assert/strict";
import { Save, normalize } from "../src/save.js";
const memory = new Map();
globalThis.localStorage = {
  getItem: (k) => memory.get(k) || null,
  setItem: (k, v) => memory.set(k, v),
};
test("normaliza nomes", () => assert.equal(normalize(" Mario "), "mario"));
test("sem nuvem restaura e salva localmente", async () => {
  globalThis.fetch = async () => {
    throw Error("offline");
  };
  let save = new Save(() => {});
  assert.equal(await save.open("offline"), null);
  await save.save({ name: "offline", bank: 10 });
  assert.deepEqual(await save.open("offline"), { name: "offline", bank: 10 });
});
test("serializa gravações usando revisões consecutivas", async () => {
  let revisions = [];
  globalThis.fetch = async (url, opts) => {
    if (!opts.method)
      return new Response(
        JSON.stringify([{ state: { name: "cloud" }, revision: 5 }]),
      );
    let b = JSON.parse(opts.body);
    revisions.push(b.p_revision);
    return new Response(JSON.stringify(b.p_revision + 1));
  };
  let save = new Save(() => {});
  await save.open("cloud");
  await Promise.all([
    save.save({ name: "cloud", bank: 1 }),
    save.save({ name: "cloud", bank: 2 }),
  ]);
  assert.deepEqual(revisions, [5, 6]);
});
test("conflito interrompe gravações enfileiradas", async () => {
  let count = 0;
  globalThis.fetch = async (url, opts) => {
    if (!opts.method) return new Response("[]");
    count++;
    return new Response("{}", { status: 409 });
  };
  let save = new Save(() => {});
  await save.open("conflict");
  await Promise.all([
    save.save({ name: "conflict" }),
    save.save({ name: "conflict" }),
  ]);
  assert.equal(save.conflict, true);
  assert.equal(count, 1);
});
