# Raiz Profunda

Protótipo jogável de RPG roguelite por turnos em JavaScript e Canvas, com arte original desenhada em código e interface em português para desktop e celular.

## Rodar

```sh
npm ci
npm run dev
```

Abra http://localhost:5173. `npm test` executa os testes; `npm run build` gera `dist/`.

## Jogo

RPG em grade 15 × 15: uma ação válida do jogador permite uma ação de cada inimigo. WASD/setas movem; QEZC fazem diagonais; Espaço ataca; Enter desce; ponto espera. Poderes nas teclas 1, 2, 4, 5 e 6; poção vital em 3; poção de mana em 7. Há controles de toque. Paredes e quinas bloqueiam movimento e poderes.

XP aumenta nível e atributos e libera poderes. Escolhas de nível e melhorias permanentes personalizam a build. Moedas compram itens, XP e defesa durante a run. Fragmentos são transferidos para a carteira permanente **na morte** e compram melhorias no santuário. Vencer um chefe concede fragmentos da run e abre a escada; não abre a loja permanente.

## Ativar Supabase

A configuração pública do projeto existente está em `src/save.js`. Nenhuma chave administrativa é usada. Execute `supabase-schema.sql` no SQL Editor daquele projeto e confira a mensagem de nuvem no rodapé.

Uma linha por personagem: nome, estado JSON (melhorias e run atual), revisão e data. Não há histórico de sessões/turnos. Nomes são normalizados para minúsculas: Mario e mario são o mesmo personagem.

**Sem senha:** qualquer pessoa que souber o nome pode acessar e alterar o personagem. Modelo casual, sem proteção antitrapaça; não guarde dados pessoais.

Cada ação relevante salva localmente e enfileira uma gravação remota. Revisões impedem sobrescrita silenciosa: um conflito bloqueia alterações e pede recarregamento. Não é multiplayer simultâneo; no outro dispositivo, entre/recarregue pelo mesmo nome para obter o estado confirmado. Antes de trocar de aparelho, espere “Progresso salvo na nuvem”.

Sem nuvem, o rodapé indica salvamento apenas local. Ao abrir com conexão, a nuvem tem prioridade sobre a cópia local, sem fusão de progresso offline. Se ainda não existir registro remoto, a cópia local será enviada na próxima ação.

## GitHub Pages

Repositório: https://github.com/erickhoga/rpg_test

Jogo: https://erickhoga.github.io/rpg_test/

Publicação pela branch `main`, pasta `/docs`. Para publicar mudanças:

```sh
npm test
npm run build:pages
git add src scripts docs package.json package-lock.json README.md
git commit -m "Atualiza jogo"
git push
```

A pasta `docs/` contém o build de produção versionado. O Vite usa caminhos relativos compatíveis com `/rpg_test/`. Em Settings → Pages, a origem é **Deploy from a branch**, branch `main`, pasta `/docs`.

A conexão GitHub atual não possui escopo `workflow`. O modelo opcional de GitHub Actions está em `deployment/pages-workflow.yml`; não é usado nesta publicação.

O Supabase ainda depende da execução de `supabase-schema.sql` no painel do projeto.

Referência: [Publicar a partir de uma branch](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Mana & Bosses 03

### Dificuldade e mana

- Inimigos comuns: vida `17 + andar × 5`, ataque `5 + floor(andar × 1,5)`, maior quantidade e perseguição até 10 casas. Novos atributos aparecem na próxima geração de andar; inimigos já salvos mantêm seus atributos.
- Cura por nível reduzida para 6 e por descida para 4. Bênçãos dão +6 vida, +1 ataque ou +1 defesa. XP por criatura reduzido. Loja: poção vital 28 moedas, mana 24, XP 40 e defesa 60.
- Recargas do jogador removidas. Mana inicial 28; +2 de capacidade por nível, +1 regenerada em cada ação válida, inclusive lançar poder e beber poção. Ações inválidas, compras e escolhas de bônus não regeneram mana.
- Poção azul recupera até 14 mana; começa com uma, pode encontrar no chão ou comprar. Usar a poção gasta turno. A capacidade nunca é ultrapassada.

| Poder            | Tecla | Nível | Mana | Dano base | Efeito                                                   |
| ---------------- | ----- | ----- | ---- | --------- | -------------------------------------------------------- |
| Pulso neon       | 1     | 1     | 8    | 1,7×      | Adjacentes                                               |
| Nova de plasma   | 2     | 4     | 16   | 1,3×      | Área visível de 3 casas                                  |
| Disparo iônico   | 4     | 1     | 7    | 1,15×     | Alvo visível mais próximo, 6 casas                       |
| Lança criogênica | 5     | 2     | 11   | 0,8×      | 5 casas; congela 2 ações (chefes: 1)                     |
| Arco elétrico    | 6     | 3     | 14   | 1×        | Alcance inicial 5, até 3 alvos com saltos de até 3 casas |

Upgrades permanentes de habilidades continuam: cinco níveis de +20% de dano base cada. Projéteis têm animação; ações ficam bloqueadas durante o efeito. Movimento reduzido desativa efeitos.

### Arenas

Andares comuns usam labirintos procedurais conectados, com salas e atalhos. Múltiplos de 5 usam arenas abertas com pilares, poção vital e mana. A escada só abre após matar o guardião. Padrões se repetem com atributos progressivos:

| Andares | Encontro            | Poder                                     |
| ------- | ------------------- | ----------------------------------------- |
| 5, 35…  | Sentinela de choque | Cruz de choque                            |
| 15, 45… | Alquimista tóxico   | Poça corrosiva e dreno de 4 mana          |
| 25, 55… | Demolidor neon      | Impacto sísmico em área                   |
| 10, 40… | PRISMA              | Laser na linha e coluna marcadas          |
| 20, 50… | ZERO                | Ruptura glacial em área e dreno de 8 mana |
| 30, 60… | NEXUS               | Fendas explosivas e invocação de drones   |

Casas marcadas são fixadas antes do impacto: linhas dão uma ação de esquiva e áreas maiores duas. A barra do chefe mostra o contador. Chefes maiores abaixo de metade da vida entram em fúria, com habilidades mais frequentes e fortes. Invocações têm limite de quatro drones ativos e não rendem moedas, fragmentos ou XP, evitando farm infinito. Matar o chefe cancela seu ataque pendente; drones restantes não bloqueiam a escada.

Saves antigos recebem mana automaticamente, mantendo recursos gastos em acessos futuros. Guardiões antigos recebem variante e habilidades sem reiniciar seu mapa; arenas novas aparecem ao descer ou começar outra run.

## PNGs e sprites

Coloque os arquivos em `public/sprites/` e edite `src/sprites.js`. Configure cada tipo (`hero`, `slime`, `bat`, `boss`) como `{ src: 'sprites/hero.png' }` para PNG estático. Para spritesheet horizontal, adicione `frameWidth`, `frameHeight`, `frames`, `fps`, `row` e `scale`. Exemplo no próprio arquivo. PNGs preservam transparência e proporção; sem arquivo válido, usa a arte provisória. A animação do sprite é apenas visual e não avança turnos.

## Verificação

26 testes de combate, mana, encontros, progressão, labirinto, migração e persistência. Teste Chromium com diagonais QEZC, Enter na escada, projétil e bloqueio de ações durante animação, compra de melhoria, poção de mana, loja, aviso do chefe, bloqueio da escada e layout mobile sem overflow. Screenshots inspecionadas em desktop e celular. Integração de banco real continua pendente do SQL.

Para repetir o teste de navegador, execute o servidor na porta 5173 e, em outro terminal, `node scripts/check-browser.mjs`. Requer Chromium e dependências (`npx playwright install --with-deps chromium`). O teste intercepta Supabase e usa um personagem local, sem gravar no banco.
