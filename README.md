# Raiz Profunda

Protótipo jogável de RPG roguelite por turnos em JavaScript e Canvas, com arte original desenhada em código e interface em português para desktop e celular.

## Rodar

```sh
npm ci
npm run dev
```

Abra http://localhost:5173. `npm test` executa os testes; `npm run build` gera `dist/`.

## Jogo

- Mapa procedural conectado de 15 × 15. Cada passo válido, ataque, espera ou poder permite uma ação de cada inimigo. Ações indisponíveis não gastam turno.
- XP aumenta nível, vida e ataque e permite escolher bônus de vida, ataque ou defesa. Golpe rúnico inicial; Nova ancestral no nível 4. Cada poder tem sua própria recarga.
- Dificuldade, XP e moedas crescem por andar. Chefes a cada cinco andares bloqueiam a saída até morrerem. Descer recupera 8 de vida.
- Mercador vende poção, XP e defesa com moedas da run. Comprar e escolher bônus não gasta turno.
- Morte transfere fragmentos para a carteira permanente. A loja do santuário melhora vida, ataque, manto, poções e atalhos. Atalhos respeitam seu recorde. Moedas, nível e poderes temporários recomeçam.
- WASD/setas movem; encostar no inimigo ataca. Espaço ataca, 1/2 poderes, 3 poção, Enter desce e ponto espera. Há botões para todas as ações.

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

## Neon Update 02

- Tema neon ciano, magenta e violeta no mapa e interface.
- WASD/setas e Q/E/Z/C para diagonais. Diagonais não atravessam quinas de paredes. Inimigos seguem a mesma regra. Enter desce na escada (E agora move para cima e direita).
- Labirintos procedurais: busca em profundidade aleatória, salas e passagens extras. Todos os pisos e a escada permanecem conectados. Runs antigas preservam seu mapa até descer.
- Pulso neon (1): 2× dano nos adjacentes, recarga 3. Nova de plasma (2, nível 4): 1,6× em área visível de 3 casas, recarga 5.
- Disparo iônico (4): 1,4× dano, alcance 6, recarga 2. Lança criogênica (5, nível 2): 1× dano, alcance 5, congela por duas ações inimigas, recarga 4. Arco elétrico (6, nível 3): 1,2× dano, alcance inicial 5, salta até três alvos com no máximo três casas entre eles, recarga 4.
- Distância em casas considera diagonais. Projéteis miram o inimigo visível mais próximo. Paredes bloqueiam tiros, saltos e poderes em área. Atalhos de teclado e botões são bloqueados durante a animação; preferência de movimento reduzido desativa os efeitos.
- Cada poder pode receber até cinco melhorias permanentes de +20% de dano base por nível, compradas com fragmentos no santuário. Recargas indicam quantas outras ações são necessárias até poder reutilizar.
- Saves antigos recebem os campos novos automaticamente, sem reiniciar o personagem.

## PNGs e sprites

Coloque os arquivos em `public/sprites/` e edite `src/sprites.js`. Configure cada tipo (`hero`, `slime`, `bat`, `boss`) como `{ src: 'sprites/hero.png' }` para PNG estático. Para spritesheet horizontal, adicione `frameWidth`, `frameHeight`, `frames`, `fps`, `row` e `scale`. Exemplo no próprio arquivo. PNGs preservam transparência e proporção; sem arquivo válido, usa a arte provisória. A animação do sprite é apenas visual e não avança turnos.

## Verificação

19 testes de combate, progressão, labirinto, migração e persistência. Teste Chromium com diagonais QEZC, Enter na escada, projétil e bloqueio de ações durante animação, compra de melhoria e layout mobile sem overflow. Screenshots inspecionadas em desktop e celular. Integração de banco real continua pendente do SQL.

Para repetir o teste de navegador, execute o servidor na porta 5173 e, em outro terminal, `node scripts/check-browser.mjs`. Requer Chromium e dependências (`npx playwright install --with-deps chromium`). O teste intercepta Supabase e usa um personagem local, sem gravar no banco.
