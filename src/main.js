import "./style.css";
import {
  SIZE,
  migrate,
  spells,
  profile,
  start,
  act,
  choose,
  need,
  buy,
  cost,
  upgrades,
  purchase,
} from "./engine.js";
import { encounters } from "./encounters.js";
import { drawSprite } from "./sprites.js";
import { Save, normalize } from "./save.js";
const app = document.querySelector("#app");
let p = null,
  screen = "game",
  status = "Seu próximo capítulo começa aqui",
  busy = false;
let animating = false;
let animationFrame = 0;
const saver = new Save((s) => {
  status = s;
  let el = document.querySelector("#sync");
  if (el) el.textContent = s;
});
const escape = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function frame(content) {
  cancelAnimationFrame(animationFrame);
  app.innerHTML = `<header><a class="brand" href="./"><span class="brand-icon">✦</span><span>RAIZ PROFUNDA<small>UM PASSO. UM DESTINO.</small></span></a><span class="tag">ROGUELITE POR TURNOS</span><span class="online"><i></i> ${p ? escape(p.name) : "PRONTO PARA EXPLORAR"}</span></header>${content}<footer><span>RAIZ PROFUNDA <b> / </b> MANA & BOSSES 03</span><span id="sync">${status}</span></footer>`;
}
function login() {
  frame(
    `<main class="welcome"><div class="eyebrow">↓ A AVENTURA ESTÁ SOB SEUS PÉS</div><h1>Quanto mais fundo,<br>mais forte você volta.</h1><p>Explore ruínas vivas, domine poderes e transforme cada derrota em um novo começo. A masmorra só se move quando você se move.</p><form id="login"><label for="name">NOME DO PERSONAGEM</label><div class="input-row"><input id="name" placeholder="ex: mario" pattern="[a-zA-Z0-9_-]{3,20}" minlength="3" maxlength="20" required autocomplete="off"><button class="primary">Entrar na masmorra ↗</button></div><small>3–20 letras, números, _ ou -. Sem senha: qualquer pessoa com esse nome compartilha o personagem e seu progresso.</small><p id="error" role="alert"></p></form><div class="features"><span>▦ <b>Um movimento, um turno</b></span><span>✧ <b>Poderes e especializações</b></span><span>♜ <b>Melhorias permanentes</b></span></div></main>`,
  );
  document.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    busy = true;
    let name = normalize(document.querySelector("input").value);
    if (!/^[a-z0-9_-]{3,20}$/.test(name)) {
      busy = false;
      return;
    }
    document.querySelector("button").textContent = "Buscando personagem…";
    try {
      p = migrate((await saver.open(name)) || profile(name));
      render();
    } catch {
      document.querySelector("#error").textContent =
        "Não foi possível abrir o personagem.";
    }
    busy = false;
  };
}
function render() {
  if (!p) return login();
  if (!p.run) return camp();
  let r = p.run;
  frame(
    `<main><div class="heading"><div><div class="eyebrow">EXPEDIÇÃO ${String(p.runs + 1).padStart(2, "0")} / ${r.floor % 5 === 0 ? "CÂMARA DO GUARDIÃO" : "LABIRINTO NEON"}</div><h1>O caminho é para baixo<span>.</span></h1></div><button data-do="camp">☷ ${screen === "shop" ? "Voltar ao mapa" : "Mercador"}</button></div><div class="game-layout"><aside><section class="panel hero-panel"><div class="eyebrow">SEU EXPLORADOR</div><div class="portrait"><span class="avatar-core"></span></div><h2>${escape(p.name)}</h2><span class="pill">NÍVEL ${r.level} · ERRANTE</span><div class="meter-label"><span>♥ Vitalidade</span><b>${r.hp} / ${r.maxHp}</b></div><div class="meter"><i style="width:${(100 * r.hp) / r.maxHp}%"></i></div><div class="meter-label"><span>◈ Mana · +1/turno</span><b id="mana-value">${r.mana} / ${r.maxMana}</b></div><div class="meter mana"><i style="width:${(100 * r.mana) / r.maxMana}%"></i></div><div class="meter-label"><span>✧ Experiência</span><b>${r.xp} / ${need(r)}</b></div><div class="meter xp"><i style="width:${(100 * r.xp) / need(r)}%"></i></div><div class="stats"><div>⚔<b>${r.atk}</b><small>ATAQUE</small></div><div>◇<b>${r.def}</b><small>DEFESA</small></div><div>◉<b>${r.gold}</b><small>MOEDAS</small></div></div></section><section class="panel mission"><div class="eyebrow">SUA PRÓXIMA ETAPA</div><h3>Encontre a passagem</h3><p>${r.floor % 5 === 0 ? "Derrote o guardião e alcance" : "Alcance"} a escada neon para descer. Cada andar traz desafios maiores.</p><div class="record">♜ Recorde <b>Andar ${p.best}</b></div></section></aside><section class="board-panel"><div class="board-head"><div><span class="floor-symbol">▱</span><b>ANDAR ${String(r.floor).padStart(2, "0")}</b><span class="biome"> / Circuitos instáveis</span></div><span class="turn">TURNO ${r.turn}</span></div>${bossPanel(r)}${screen === "shop" ? shop(r) : '<canvas id="board" width="720" height="720" aria-label="Masmorra em grade. Use WASD e QEZC ou os botões para mover seu explorador."></canvas>'}<div class="board-foot"><span><i class="dot"></i> SEU TURNO <small>· Pense. Explore. Sobreviva.</small></span><button data-action="descend" ${r.x === 13 && r.y === 13 && !r.enemies.some((e) => e.type === "boss") ? "" : "disabled"}>Descer ↵</button></div><div class="controls"><span><kbd>W A S D</kbd> / setas · <kbd>Q E Z C</kbd> diagonais · <kbd>Enter</kbd> desce<br>Poderes à distância miram o inimigo visível mais próximo.</span><div class="dpad">${[
      [-1, -1, "↖", "Q"],
      [0, -1, "↑", "W"],
      [1, -1, "↗", "E"],
      [-1, 0, "←", "A"],
      [0, 0, "·", "."],
      [1, 0, "→", "D"],
      [-1, 1, "↙", "Z"],
      [0, 1, "↓", "S"],
      [1, 1, "↘", "C"],
    ]
      .map(
        ([x, y, arrow, key]) =>
          `<button ${x || y ? `data-move="${x},${y}"` : 'data-action="wait"'} aria-label="${x || y ? "Mover" : "Esperar"} ${arrow} (${key})">${arrow}<small>${key}</small></button>`,
      )
      .join(
        "",
      )}</div></div></section><aside><section class="panel"><div class="eyebrow">SEU ARSENAL</div><h3>Cada ação importa.</h3><div class="actions">${ability("attack", "⚔", "Ataque", "Inimigo adjacente", "Espaço")}${Object.entries(
      spells,
    )
      .map(([key, spell]) =>
        ability(
          key,
          spell.icon,
          spell.name,
          r.level < spell.level
            ? `Libera no nível ${spell.level}`
            : `${spell.mana} mana · ${spell.detail} · bônus +${20 * (r.skillRanks[key] || 0)}%`,
          spell.key,
          r.level < spell.level || r.mana < spell.mana,
        ),
      )
      .join(
        "",
      )}${ability("potion", "⚗", "Poção vital", `${r.potions} disponíveis · +25 vida`, "3", !r.potions || r.hp === r.maxHp)}${ability("mana", "◈", "Poção de mana", `${r.manaPotions} disponíveis · +14 mana`, "7", !r.manaPotions || r.mana === r.maxMana)}${ability("wait", "◷", "Esperar", "Passa um turno", ".")} </div></section><section class="panel journal"><div class="eyebrow">DIÁRIO DA EXPEDIÇÃO</div>${r.log.map((l, i) => `<p class="${i === 0 ? "latest" : ""}">${escape(l)}</p>`).join("")}</section><div class="shards">✧ <strong>${r.shards}</strong><span>fragmentos nesta run<small>Guardados quando você cair.</small></span></div></aside></div></main>${
      r.choices
        ? `<div class="overlay"><section class="panel choice"><div class="eyebrow">NÍVEL ${r.level} · ${r.choices} ESCOLHA(S)</div><h2>As raízes te fortalecem.</h2><p>Escolha uma bênção para esta expedição.</p><div>${[
            ["vigor", "♥ Vitalidade", "+6 de vida máxima"],
            ["force", "⚔ Ferocidade", "+1 de ataque"],
            ["armor", "◇ Proteção", "+1 de defesa"],
          ]
            .map(
              ([k, n, d]) =>
                `<button data-choice="${k}"><b>${n}</b><small>${d}</small></button>`,
            )
            .join("")}</div></section></div>`
        : ""
    }`,
  );
  if (screen !== "shop") startDrawing(r);
  bind();
}
function bossPanel(r) {
  const boss = r.enemies.find((e) => e.type === "boss" && e.variant);
  if (!boss) return "";
  const def = encounters[boss.variant];
  return `<section class="boss-panel" style="--boss-color:${def.color}"><div><b>${def.kind === "boss" ? "CHEFE" : "MINIBOSS"} · ${def.name}</b><span>${boss.hp} / ${boss.maxHp} HP</span></div><div class="meter"><i style="width:${(100 * boss.hp) / boss.maxHp}%"></i></div><p>${boss.intent ? `⚠ ${boss.intent.skill}: impacto em ${boss.intent.remaining || 1} ação(ões)! Saia das casas marcadas.` : def.tip} ${boss.hp < boss.maxHp / 2 && def.kind === "boss" ? "FÚRIA ATIVA." : ""}</p><small>Saída bloqueada até derrotá-lo.</small></section>`;
}
function ability(a, icon, title, desc, key, disabled = false) {
  return `<button class="ability" data-action="${a}" ${disabled ? "disabled" : ""}><span class="ability-icon">${icon}</span><span><b>${title}</b><small>${desc}</small></span><kbd>${key}</kbd></button>`;
}
function shop(r) {
  return `<div class="shop-view"><span class="shop-art">⚖</span><div class="eyebrow">O MERCADOR ERRANTE</div><h2>Provisões para a descida.</h2><p>Moedas valem apenas nesta run. Comprar não gasta turno.</p>${[
    ["potion", "Poção vital", "Cura 25 de vida ao usar", 28],
    ["mana", "Poção de mana", "Restaura 14 mana ao usar (tecla 7)", 24],
    ["training", "Conhecimento antigo", "Receba 15 XP", 40],
    ["armor", "Reforço do manto", "+1 de defesa nesta run", 60],
  ]
    .map(
      ([k, n, d, c]) =>
        `<button data-purchase="${k}" ${r.gold < c ? "disabled" : ""}><span><b>${n}</b><small>${d}</small></span><strong>◉ ${c}</strong></button>`,
    )
    .join("")}</div>`;
}
function camp() {
  frame(
    `<main class="camp"><div class="eyebrow">SANTUÁRIO DAS RAÍZES</div><h1>${p.last ? "Toda queda cria raízes." : "Uma nova história começa."}</h1><p>${p.last ? `Sua última expedição chegou ao andar ${p.last.floor}: ${p.last.kills} criaturas vencidas e ${p.last.shards} fragmentos conquistados.` : "Prepare seu explorador. Sobreviva, encontre a escada e descubra o que vive nas profundezas."}</p><div class="camp-banner"><div><small>FRAGMENTOS PERMANENTES</small><h2>✧ ${p.bank}</h2></div><div><small>SEU RECORDE</small><h2>Andar ${p.best}</h2></div><div><label for="floor">ANDAR INICIAL</label><select id="floor">${Array.from({ length: Math.min(p.upgrades.gate * 5 + 1, p.best) }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}</select></div><button class="primary" data-do="start">Iniciar expedição ↘</button></div><h2>O que fica com você</h2><p>Melhorias permanentes. Vida, nível, moedas e poderes da run recomeçam.</p><div class="upgrade-grid">${Object.entries(
      upgrades,
    )
      .map(
        ([k, u]) =>
          `<section class="panel"><span class="upgrade-icon">${u.icon || { vigor: "♥", force: "⚔", armor: "◇", flask: "⚗", gate: "▱" }[k]}</span><small>NÍVEL ${p.upgrades[k]} / ${u.max}</small><h3>${u.name}</h3><p>${u.description}</p><button data-buy="${k}" ${p.bank < cost(p, k) || p.upgrades[k] >= u.max ? "disabled" : ""}>${p.upgrades[k] >= u.max ? "Máximo alcançado" : `Melhorar · ✧ ${cost(p, k)}`}</button></section>`,
      )
      .join(
        "",
      )}</div><p class="hint">Controles: WASD / setas · QEZC diagonais · Enter desce · Espaço ataca · 1, 2, 4, 5, 6 poderes · 3 poção vital · 7 poção de mana · ponto espera.</p></main>`,
  );
  bind();
}
function bind() {
  document
    .querySelectorAll("[data-action]")
    .forEach((b) => (b.onclick = () => action(b.dataset.action)));
  document
    .querySelectorAll("[data-move]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          action("move", ...b.dataset.move.split(",").map(Number))),
    );
  document.querySelectorAll("[data-choice]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!animating && !saver.conflict && choose(p.run, b.dataset.choice))
          saveRender();
      }),
  );
  document.querySelectorAll("[data-buy]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!animating && !saver.conflict && buy(p, b.dataset.buy))
          saveRender();
      }),
  );
  document.querySelectorAll("[data-purchase]").forEach(
    (b) =>
      (b.onclick = () => {
        if (
          !animating &&
          !saver.conflict &&
          purchase(p.run, b.dataset.purchase)
        )
          saveRender();
      }),
  );
  document.querySelector('[data-do="start"]')?.addEventListener("click", () => {
    if (saver.conflict || animating) return;
    start(p, Number(document.querySelector("select").value));
    screen = "game";
    saveRender();
  });
  document.querySelector('[data-do="camp"]')?.addEventListener("click", () => {
    if (animating) return;
    screen = screen === "shop" ? "game" : "shop";
    render();
  });
}
function saveRender() {
  saver.save(p);
  render();
}
function action(a, x, y) {
  if (saver.conflict || animating) return;
  const effects = [],
    before = p.run ? structuredClone(p.run) : null;
  if (!act(p, a, x, y, effects)) {
    render();
    return;
  }
  saver.save(p);
  if (
    effects.length &&
    screen === "game" &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    animating = true;
    cancelAnimationFrame(animationFrame);
    const begin = performance.now(),
      duration = 650;
    const tick = (now) => {
      const progress = Math.min(1, (now - begin) / duration);
      if (document.querySelector("#board")) {
        draw(before);
        drawEffects(effects, progress);
      }
      if (progress < 1) animationFrame = requestAnimationFrame(tick);
      else {
        animating = false;
        render();
      }
    };
    animationFrame = requestAnimationFrame(tick);
  } else render();
}
function startDrawing(r) {
  cancelAnimationFrame(animationFrame);
  const loop = () => {
    if (
      animating ||
      !document.querySelector("#board") ||
      p.run !== r ||
      screen !== "game"
    )
      return;
    draw(r);
    animationFrame = requestAnimationFrame(loop);
  };
  loop();
}
function drawEffects(effects, progress) {
  const c = document.querySelector("#board").getContext("2d"),
    t = 48;
  for (const effect of effects) {
    c.save();
    c.strokeStyle = c.fillStyle = c.shadowColor = effect.color;
    c.shadowBlur = 22;
    c.lineWidth = 4;
    if (effect.type === "enemy") {
      c.globalAlpha = 1 - progress;
      for (const cell of effect.targets) {
        c.fillRect(cell.x * t + 3, cell.y * t + 3, t - 6, t - 6);
      }
      c.restore();
      continue;
    }
    const center = (v) => ({ x: v.x * t + 24, y: v.y * t + 24 });
    if (effect.type === "burst" || effect.type === "nova") {
      const from = center(effect.from);
      c.globalAlpha = 1 - progress * 0.8;
      c.beginPath();
      c.arc(
        from.x,
        from.y,
        12 + progress * t * (effect.type === "nova" ? 3 : 1),
        0,
        Math.PI * 2,
      );
      c.stroke();
    }
    effect.targets.forEach((target, index) => {
      const from = center(
          effect.type === "chain" && index
            ? effect.targets[index - 1]
            : effect.from,
        ),
        to = center(target);
      const phase =
        effect.type === "chain"
          ? Math.max(0, Math.min(1, progress * effect.targets.length - index))
          : Math.min(1, progress * 1.4);
      if (phase <= 0) return;
      const x = from.x + (to.x - from.x) * phase,
        y = from.y + (to.y - from.y) * phase;
      if (effect.type === "chain") {
        c.beginPath();
        c.moveTo(from.x, from.y);
        for (let n = 1; n <= 8; n++) {
          let u = n / 8;
          c.lineTo(
            from.x +
              (x - from.x) * u +
              (n === 8 ? 0 : Math.sin(n * 8 + progress * 25) * 7),
            from.y + (y - from.y) * u,
          );
        }
        c.stroke();
      } else if (effect.type === "bolt" || effect.type === "frost") {
        c.globalAlpha = 0.55;
        c.beginPath();
        c.moveTo(from.x, from.y);
        c.lineTo(x, y);
        c.stroke();
        c.globalAlpha = 1;
        c.beginPath();
        c.arc(x, y, effect.type === "frost" ? 8 : 6, 0, Math.PI * 2);
        c.fill();
      }
      if (phase > 0.85) {
        c.globalAlpha = (1 - progress) * 3;
        c.beginPath();
        c.arc(to.x, to.y, 10 + progress * 15, 0, Math.PI * 2);
        c.stroke();
      }
    });
    c.restore();
  }
}
document.addEventListener("keydown", (e) => {
  if (
    !p?.run ||
    e.target.matches("input,select,textarea") ||
    p.run.choices > 0 ||
    e.repeat ||
    screen === "shop"
  )
    return;
  let moves = {
    q: [-1, -1],
    e: [1, -1],
    z: [-1, 1],
    c: [1, 1],
    w: [0, -1],
    ArrowUp: [0, -1],
    s: [0, 1],
    ArrowDown: [0, 1],
    a: [-1, 0],
    ArrowLeft: [-1, 0],
    d: [1, 0],
    ArrowRight: [1, 0],
  };
  let key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (moves[key]) {
    e.preventDefault();
    action("move", ...moves[key]);
  } else if (
    {
      " ": "attack",
      1: "burst",
      2: "nova",
      3: "potion",
      ".": "wait",
      Enter: "descend",
      4: "bolt",
      5: "frost",
      6: "chain",
      7: "mana",
    }[key]
  ) {
    e.preventDefault();
    action(
      {
        " ": "attack",
        1: "burst",
        2: "nova",
        3: "potion",
        ".": "wait",
        Enter: "descend",
        4: "bolt",
        5: "frost",
        6: "chain",
        7: "mana",
      }[key],
    );
  }
});
function draw(r) {
  let c = document.querySelector("canvas").getContext("2d"),
    t = 48;
  c.fillStyle = "#080c20";
  c.fillRect(0, 0, 720, 720);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      let wall = r.map[y][x],
        px = x * t,
        py = y * t;
      c.fillStyle = wall ? "#1d1640" : (x + y) % 2 ? "#0d1529" : "#101a30";
      c.fillRect(px + 1, py + 1, t - 2, t - 2);
      if (wall) {
        c.fillStyle = "#673eb0";
        c.fillRect(px + 3, py + 3, t - 6, 9);
        c.fillStyle = "#181330";
        c.fillRect(px + 5, py + 17, t - 10, 25);
        c.fillStyle = "#38edff";
        if ((x * 3 + y) % 4 === 0) {
          c.fillRect(px + 6, py + 7, 12, 4);
          c.fillRect(px + 8, py + 11, 4, 6);
        }
      } else if ((x * 7 + y * 13) % 9 === 0) {
        c.fillStyle = "#203b61";
        c.fillRect(px + 10, py + 32, 3, 7);
        c.fillRect(px + 15, py + 29, 3, 10);
      }
    }
  let tx = 13 * t,
    ty = 13 * t;
  c.fillStyle = "#164854";
  c.fillRect(tx + 5, ty + 5, 38, 38);
  for (let i = 0; i < 4; i++) {
    c.fillStyle = "#38edff";
    c.fillRect(tx + 10, ty + 9 + i * 8, 28 - i * 5, 4);
  }
  for (const enemy of r.enemies) {
    if (!enemy.intent) continue;
    c.save();
    c.fillStyle = encounters[enemy.variant]?.color || "#ff4f8d";
    c.strokeStyle = c.fillStyle;
    for (const cell of enemy.intent.cells) {
      c.globalAlpha = 0.25;
      c.fillRect(cell.x * t + 2, cell.y * t + 2, t - 4, t - 4);
      c.globalAlpha = 0.9;
      c.lineWidth = 2;
      c.strokeRect(cell.x * t + 4, cell.y * t + 4, t - 8, t - 8);
      c.beginPath();
      c.moveTo(cell.x * t + 17, cell.y * t + 17);
      c.lineTo(cell.x * t + 31, cell.y * t + 31);
      c.moveTo(cell.x * t + 31, cell.y * t + 17);
      c.lineTo(cell.x * t + 17, cell.y * t + 31);
      c.stroke();
    }
    c.restore();
  }
  for (let item of r.items) {
    const x = item.x * t + 24,
      y = item.y * t + 24;
    c.save();
    c.fillStyle =
      c.strokeStyle =
      c.shadowColor =
        item.type === "gold"
          ? "#efff65"
          : item.type === "mana"
            ? "#599aff"
            : "#ff51d6";
    c.shadowBlur = 10;
    if (item.type === "gold") {
      c.beginPath();
      c.arc(x, y, 8, 0, Math.PI * 2);
      c.stroke();
      c.fillRect(x - 1, y - 5, 2, 10);
    } else {
      c.fillRect(x - 3, y - 11, 6, 5);
      c.strokeRect(x - 6, y - 5, 12, 15);
      c.fillRect(x - 4, y + 1, 8, 7);
    }
    c.restore();
  }
  function sprite(x, y, type, variant) {
    let px = x * t,
      py = y * t;
    if (drawSprite(c, type, px, py, t)) return;
    c.fillStyle = "#0c1715aa";
    c.beginPath();
    c.ellipse(px + 24, py + 38, 16, 6, 0, 0, 7);
    c.fill();
    if (type === "hero") {
      c.fillStyle = "#b96aff";
      c.fillRect(px + 14, py + 22, 20, 15);
      c.fillStyle = "#37e4fa";
      c.fillRect(px + 11, py + 13, 26, 15);
      c.fillRect(px + 17, py + 6, 15, 10);
      c.fillStyle = "#dceaff";
      c.fillRect(px + 18, py + 22, 13, 9);
      c.fillStyle = "#10132c";
      c.fillRect(px + 25, py + 24, 3, 3);
      c.fillStyle = "#fc58d4";
      c.fillRect(px + 36, py + 16, 3, 25);
      c.fillStyle = "#fc58d4";
      c.fillRect(px + 33, py + 12, 9, 7);
    } else {
      let color =
        type === "boss"
          ? encounters[variant]?.color || "#ff4f8d"
          : type === "bat"
            ? "#b77bff"
            : "#3deab9";
      c.fillStyle = color;
      c.fillRect(px + 10, py + 20, 28, 15);
      c.fillRect(px + 16, py + 13, 17, 8);
      if (type === "bat") {
        c.fillRect(px + 3, py + 13, 8, 14);
        c.fillRect(px + 37, py + 13, 8, 14);
      }
      if (type === "boss") {
        c.fillRect(px + 9, py + 7, 6, 18);
        c.fillRect(px + 34, py + 7, 6, 18);
      }
      c.fillStyle = "#0a0b24";
      c.fillRect(px + 17, py + 23, 4, 4);
      c.fillRect(px + 28, py + 23, 4, 4);
    }
  }
  for (let e of r.enemies) {
    sprite(e.x, e.y, e.type, e.variant);
    if (e.frozen) {
      c.strokeStyle = "#8bbcff";
      c.lineWidth = 2;
      c.strokeRect(e.x * t + 6, e.y * t + 6, 36, 36);
    }
    c.fillStyle = "#191027";
    c.fillRect(e.x * t + 8, e.y * t + 42, 32, 3);
    c.fillStyle = "#ff51a0";
    c.fillRect(e.x * t + 8, e.y * t + 42, (32 * e.hp) / e.maxHp, 3);
  }
  c.strokeStyle = "#38edff";
  c.lineWidth = 2;
  c.strokeRect(r.x * t + 3, r.y * t + 3, 42, 42);
  sprite(r.x, r.y, "hero");
}
login();
