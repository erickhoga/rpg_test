import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { profile, start, generate } from "../src/engine.js";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.log("PAGE ERROR", e.message);
});
await page.route("**/*.supabase.co/**", (route) => route.abort());
const p = profile("browser_test");
start(p);
p.run.level = 4;
p.run.x = p.run.y = 4;
p.run.enemies = [];
p.run.map = Array.from({ length: 15 }, (_, y) =>
  Array.from({ length: 15 }, (_, x) =>
    !x || !y || x === 14 || y === 14 ? 1 : 0,
  ),
);
await page.goto("http://localhost:5173");
const install = async (state) => {
  await page.evaluate(
    (state) => localStorage.setItem("rpg:browser_test", JSON.stringify(state)),
    state,
  );
  await page.reload();
  await page.locator("#name").pressSequentially("browser_test");
  await page.locator("form button").click();
  await page
    .locator("canvas")
    .waitFor({ timeout: 5000 })
    .catch(async (e) => {
      console.log("body", await page.locator("#app").innerHTML());
      throw e;
    });
};
await install(p);
for (const key of ["q", "e", "z", "c"]) await page.keyboard.press(key);
assert.equal(await page.locator(".turn").textContent(), "TURNO 4");
let state = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("rpg:browser_test")),
);
assert.deepEqual([state.run.x, state.run.y], [4, 4]);
state.run.enemies = [
  { x: 8, y: 4, type: "slime", hp: 100, maxHp: 100, atk: 1 },
];
await install(state);
await page.keyboard.press("4");
await page.waitForTimeout(200);
await page.screenshot({ path: "/tmp/rpg-neon-projectile.png", fullPage: true });
await page.keyboard.press("s");
await page.waitForTimeout(650);
state = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("rpg:browser_test")),
);
assert.equal(state.run.turn, 5);
assert.equal(state.run.enemies[0].hp, 92);
assert.equal(state.run.mana, 22);
state.run.x = state.run.y = 13;
state.run.enemies = [];
await install(state);
await page.keyboard.press("Enter");
assert.match(await page.locator(".board-head").textContent(), /ANDAR 02/);
await page.screenshot({ path: "/tmp/rpg-neon-desktop.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "/tmp/rpg-neon-mobile.png", fullPage: true });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
assert.equal(await page.locator("[data-move]").count(), 8);
state.run.floor = 10;
generate(state.run);
state.run.hp = state.run.maxHp = 1000;
state.run.mana = 0;
state.run.manaPotions = 1;
state.run.gold = 24;
await install(state);
assert.equal(await page.locator('[data-action="bolt"]').isDisabled(), true);
await page.keyboard.press("7");
assert.equal(await page.locator("#mana-value").textContent(), "15 / 28");
assert.match(
  await page.locator(".boss-panel").textContent(),
  /Laser orbital.*impacto/s,
);
await page.screenshot({ path: "/tmp/rpg-boss-mobile.png", fullPage: true });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await page.setViewportSize({ width: 1440, height: 1100 });
await page.screenshot({ path: "/tmp/rpg-boss-desktop.png", fullPage: true });
await page.locator('[data-do="camp"]').click();
await page.locator('[data-purchase="mana"]').click();
let saved = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("rpg:browser_test")),
);
assert.equal(saved.run.manaPotions, 1);
assert.equal(saved.run.gold, 0);
state.run.x = state.run.y = 13;
state.run.mana = 28;
await install(state);
await page.keyboard.press("Enter");
assert.match(await page.locator(".board-head").textContent(), /ANDAR 10/);
state.run = null;
state.bank = 200;
await installCamp(state);
async function installCamp(state) {
  await page.evaluate(
    (state) => localStorage.setItem("rpg:browser_test", JSON.stringify(state)),
    state,
  );
  await page.reload();
  await page.locator("#name").pressSequentially("browser_test");
  await page.locator("form button").click();
  await page.locator('[data-buy="skill_bolt"]').click();
  assert.match(
    await page.locator('[data-buy="skill_bolt"]').locator("..").textContent(),
    /NÍVEL 1/,
  );
}
assert.deepEqual(errors, []);
console.log(
  "Browser OK: QEZC, Enter, projétil, bloqueio durante animação, mobile sem overflow, upgrade permanente, mana, loja, chefe e saída bloqueada.",
);
await browser.close();
