import "./style.css";
import {
  SIZE,
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
import { Save, normalize } from "./save.js";
const app = document.querySelector("#app");
let p = null,
  screen = "game",
  status = "Seu próximo capítulo começa aqui",
  busy = false;
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
  app.innerHTML = `<header><a class="brand" href="./"><span class="brand-icon">✦</span><span>RAIZ PROFUNDA<small>UM PASSO. UM DESTINO.</small></span></a><span class="tag">ROGUELITE POR TURNOS</span><span class="online"><i></i> ${p ? escape(p.name) : "PRONTO PARA EXPLORAR"}</span></header>${content}<footer><span>RAIZ PROFUNDA <b> / </b> PROTÓTIPO 01</span><span id="sync">${status}</span></footer>`;
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
      p = (await saver.open(name)) || profile(name);
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
    `<main><div class="heading"><div><div class="eyebrow">EXPEDIÇÃO ${String(p.runs + 1).padStart(2, "0")} / ${r.floor % 5 === 0 ? "CÂMARA DO GUARDIÃO" : "BOSQUE ESQUECIDO"}</div><h1>O caminho é para baixo<span>.</span></h1></div><button data-do="camp">☷ ${screen === "shop" ? "Voltar ao mapa" : "Mercador"}</button></div><div class="game-layout"><aside><section class="panel hero-panel"><div class="eyebrow">SEU EXPLORADOR</div><div class="portrait">🧙</div><h2>${escape(p.name)}</h2><span class="pill">NÍVEL ${r.level} · ERRANTE</span><div class="meter-label"><span>♥ Vitalidade</span><b>${r.hp} / ${r.maxHp}</b></div><div class="meter"><i style="width:${(100 * r.hp) / r.maxHp}%"></i></div><div class="meter-label"><span>✧ Experiência</span><b>${r.xp} / ${need(r)}</b></div><div class="meter xp"><i style="width:${(100 * r.xp) / need(r)}%"></i></div><div class="stats"><div>⚔<b>${r.atk}</b><small>ATAQUE</small></div><div>◇<b>${r.def}</b><small>DEFESA</small></div><div>◉<b>${r.gold}</b><small>MOEDAS</small></div></div></section><section class="panel mission"><div class="eyebrow">SUA PRÓXIMA ETAPA</div><h3>Encontre a passagem</h3><p>${r.floor % 5 === 0 ? "Derrote o guardião e alcance" : "Alcance"} a escada dourada para descer. Cada andar traz desafios maiores.</p><div class="record">♜ Recorde <b>Andar ${p.best}</b></div></section></aside><section class="board-panel"><div class="board-head"><div><span class="floor-symbol">▱</span><b>ANDAR ${String(r.floor).padStart(2, "0")}</b><span class="biome"> / Ruínas das raízes</span></div><span class="turn">TURNO ${r.turn}</span></div>${screen === "shop" ? shop(r) : '<canvas id="board" width="720" height="720" aria-label="Masmorra em grade. Use WASD ou os botões para mover seu explorador."></canvas>'}<div class="board-foot"><span><i class="dot"></i> SEU TURNO <small>· Pense. Explore. Sobreviva.</small></span><button data-action="descend" ${r.x === 13 && r.y === 13 ? "" : "disabled"}>Descer ↓</button></div></section><aside><section class="panel"><div class="eyebrow">SEU ARSENAL</div><h3>Cada ação importa.</h3><div class="actions">${ability("attack", "⚔", "Ataque", "Inimigo adjacente", "Espaço")}${ability("burst", "✦", "Golpe rúnico", r.cd ? `Recarga: ${r.cd} turnos` : "2× dano · adjacentes", "1", r.cd > 0)}${ability("nova", "❋", "Nova ancestral", r.level < 4 ? "Desbloqueia no nível 4" : r.cd ? `Recarga: ${r.cd} turnos` : "Área de 3 casas · 1,6× dano", "2", r.level < 4 || r.cd > 0)}${ability("potion", "⚗", "Poção vital", `${r.potions} disponíveis · +25 vida`, "3", !r.potions || r.hp === r.maxHp)}${ability("wait", "◷", "Esperar", "Passa um turno", ".")} </div></section><section class="panel journal"><div class="eyebrow">DIÁRIO DA EXPEDIÇÃO</div>${r.log.map((l, i) => `<p class="${i === 0 ? "latest" : ""}">${escape(l)}</p>`).join("")}</section><div class="shards">✧ <strong>${r.shards}</strong><span>fragmentos nesta run<small>Guardados quando você cair.</small></span></div></aside></div><div class="controls"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou setas para mover · Encoste no inimigo para atacar</span><div class="dpad"><button data-move="0,-1" aria-label="Mover para cima">↑</button><button data-move="-1,0" aria-label="Mover para esquerda">←</button><button data-move="0,1" aria-label="Mover para baixo">↓</button><button data-move="1,0" aria-label="Mover para direita">→</button></div></div></main>${
      r.choices
        ? `<div class="overlay"><section class="panel choice"><div class="eyebrow">NÍVEL ${r.level} · ${r.choices} ESCOLHA(S)</div><h2>As raízes te fortalecem.</h2><p>Escolha uma bênção para esta expedição.</p><div>${[
            ["vigor", "♥ Vitalidade", "+8 de vida máxima"],
            ["force", "⚔ Ferocidade", "+2 de ataque"],
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
  if (screen !== "shop") draw(r);
  bind();
}
function ability(a, icon, title, desc, key, disabled = false) {
  return `<button class="ability" data-action="${a}" ${disabled ? "disabled" : ""}><span class="ability-icon">${icon}</span><span><b>${title}</b><small>${desc}</small></span><kbd>${key}</kbd></button>`;
}
function shop(r) {
  return `<div class="shop-view"><span class="shop-art">⚖</span><div class="eyebrow">O MERCADOR ERRANTE</div><h2>Provisões para a descida.</h2><p>Moedas valem apenas nesta run. Comprar não gasta turno.</p>${[
    ["potion", "Poção vital", "Cura 25 de vida ao usar", 20],
    ["training", "Conhecimento antigo", "Receba 15 XP", 30],
    ["armor", "Reforço do manto", "+1 de defesa nesta run", 45],
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
          `<section class="panel"><span class="upgrade-icon">${{ vigor: "♥", force: "⚔", armor: "◇", flask: "⚗", gate: "▱" }[k]}</span><small>NÍVEL ${p.upgrades[k]} / ${u.max}</small><h3>${u.name}</h3><p>${u.description}</p><button data-buy="${k}" ${p.bank < cost(p, k) || p.upgrades[k] >= u.max ? "disabled" : ""}>${p.upgrades[k] >= u.max ? "Máximo alcançado" : `Melhorar · ✧ ${cost(p, k)}`}</button></section>`,
      )
      .join(
        "",
      )}</div><p class="hint">Controles: WASD ou setas · Espaço ataca · 1 e 2 usam poderes · 3 usa poção · E desce · ponto espera.</p></main>`,
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
        if (!saver.conflict && choose(p.run, b.dataset.choice)) saveRender();
      }),
  );
  document.querySelectorAll("[data-buy]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!saver.conflict && buy(p, b.dataset.buy)) saveRender();
      }),
  );
  document.querySelectorAll("[data-purchase]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!saver.conflict && purchase(p.run, b.dataset.purchase))
          saveRender();
      }),
  );
  document.querySelector('[data-do="start"]')?.addEventListener("click", () => {
    if (saver.conflict) return;
    start(p, Number(document.querySelector("select").value));
    screen = "game";
    saveRender();
  });
  document.querySelector('[data-do="camp"]')?.addEventListener("click", () => {
    screen = screen === "shop" ? "game" : "shop";
    render();
  });
}
function saveRender() {
  saver.save(p);
  render();
}
function action(a, x, y) {
  if (saver.conflict) return;
  if (act(p, a, x, y)) saveRender();
  else render();
}
document.addEventListener("keydown", (e) => {
  if (
    !p?.run ||
    e.target.matches("input,select,button") ||
    e.repeat ||
    screen === "shop"
  )
    return;
  let moves = {
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
      e: "descend",
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
        e: "descend",
      }[key],
    );
  }
});
function draw(r) {
  let c = document.querySelector("canvas").getContext("2d"),
    t = 48;
  c.fillStyle = "#152520";
  c.fillRect(0, 0, 720, 720);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      let wall = r.map[y][x],
        px = x * t,
        py = y * t;
      c.fillStyle = wall ? "#263c32" : (x + y) % 2 ? "#1c3029" : "#1e332b";
      c.fillRect(px + 1, py + 1, t - 2, t - 2);
      if (wall) {
        c.fillStyle = "#354f3d";
        c.fillRect(px + 3, py + 3, t - 6, 9);
        c.fillStyle = "#1b2b24";
        c.fillRect(px + 5, py + 17, t - 10, 25);
        c.fillStyle = "#66834a";
        if ((x * 3 + y) % 4 === 0) {
          c.fillRect(px + 6, py + 7, 12, 4);
          c.fillRect(px + 8, py + 11, 4, 6);
        }
      } else if ((x * 7 + y * 13) % 9 === 0) {
        c.fillStyle = "#38503a";
        c.fillRect(px + 10, py + 32, 3, 7);
        c.fillRect(px + 15, py + 29, 3, 10);
      }
    }
  let tx = 13 * t,
    ty = 13 * t;
  c.fillStyle = "#615838";
  c.fillRect(tx + 5, ty + 5, 38, 38);
  for (let i = 0; i < 4; i++) {
    c.fillStyle = "#d0b66d";
    c.fillRect(tx + 10, ty + 9 + i * 8, 28 - i * 5, 4);
  }
  for (let item of r.items) {
    c.font = "25px serif";
    c.textAlign = "center";
    c.fillText(
      item.type === "gold" ? "🪙" : "🧪",
      item.x * t + 24,
      item.y * t + 33,
    );
  }
  function sprite(x, y, type) {
    let px = x * t,
      py = y * t;
    c.fillStyle = "#0c1715aa";
    c.beginPath();
    c.ellipse(px + 24, py + 38, 16, 6, 0, 0, 7);
    c.fill();
    if (type === "hero") {
      c.fillStyle = "#bdad79";
      c.fillRect(px + 14, py + 22, 20, 15);
      c.fillStyle = "#79b5a0";
      c.fillRect(px + 11, py + 13, 26, 15);
      c.fillRect(px + 17, py + 6, 15, 10);
      c.fillStyle = "#efd3a3";
      c.fillRect(px + 18, py + 22, 13, 9);
      c.fillStyle = "#263630";
      c.fillRect(px + 25, py + 24, 3, 3);
      c.fillStyle = "#e2c67b";
      c.fillRect(px + 36, py + 16, 3, 25);
      c.fillStyle = "#9bd7c0";
      c.fillRect(px + 33, py + 12, 9, 7);
    } else {
      let color =
        type === "boss" ? "#cc8461" : type === "bat" ? "#a490bb" : "#91af65";
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
      c.fillStyle = "#17251f";
      c.fillRect(px + 17, py + 23, 4, 4);
      c.fillRect(px + 28, py + 23, 4, 4);
    }
  }
  for (let e of r.enemies) {
    sprite(e.x, e.y, e.type);
    c.fillStyle = "#14231b";
    c.fillRect(e.x * t + 8, e.y * t + 42, 32, 3);
    c.fillStyle = "#cc8b73";
    c.fillRect(e.x * t + 8, e.y * t + 42, (32 * e.hp) / e.maxHp, 3);
  }
  c.strokeStyle = "#d6c587";
  c.lineWidth = 2;
  c.strokeRect(r.x * t + 3, r.y * t + 3, 42, 42);
  sprite(r.x, r.y, "hero");
}
login();
