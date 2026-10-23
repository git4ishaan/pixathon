'use strict';
/* =====================================================================
   game.js: starter skeleton
   Sections: LOGIC (pure, testable) | RENDER | UI + INPUT | BOOT
   The placeholder rule is "walk to the goal". Replace the LOGIC section
   with the real mechanic. Keep RENDER and LOGIC separate so a solver can
   import the logic without touching the DOM.
   ===================================================================== */

/* ---------- LOGIC (no DOM access in here) ---------- */
const Logic = {
  DIRS: { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] },

  // Build a fresh state from a level definition.
  load(level) {
    const tiles = [];
    let player = { x: 0, y: 0 };
    level.grid.forEach((row, y) => {
      tiles.push(row.split('').map((ch, x) => {
        if (ch === 'P') { player = { x, y }; return '.'; }
        return ch;
      }));
    });
    return { tiles, player, moves: 0 };
  },

  // Returns a NEW state, or null if the move is blocked.
  move(state, dir) {
    const [dx, dy] = Logic.DIRS[dir];
    const nx = state.player.x + dx;
    const ny = state.player.y + dy;
    const row = state.tiles[ny];
    if (!row || row[nx] === undefined || row[nx] === '#') return null;
    return { tiles: state.tiles, player: { x: nx, y: ny }, moves: state.moves + 1 };
  },

  isWon(state) {
    return state.tiles[state.player.y][state.player.x] === 'G';
  },

  // Stars based on moves vs par.
  stars(moves, par) {
    if (moves <= par) return 3;
    if (moves <= par * 1.5) return 2;
    return 1;
  }
};

/* ---------- STORAGE (always try/catch) ---------- */
const Store = {
  key: 'puzzle-starter-v1',
  read() {
    try { return JSON.parse(localStorage.getItem(this.key)) || { stars: {} }; }
    catch (e) { return { stars: {} }; }
  },
  write(data) {
    try { localStorage.setItem(this.key, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }
};

/* ---------- APP STATE ---------- */
const App = {
  levels: [],
  index: 0,
  state: null,
  history: [],
  won: false,
  progress: Store.read()
};

const $ = (id) => document.getElementById(id);

/* ---------- RENDER ---------- */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $('screen-' + name).classList.add('active');
}

function renderBoard() {
  const board = $('board');
  const { tiles, player } = App.state;
  board.style.gridTemplateColumns = `repeat(${tiles[0].length}, var(--cell))`;
  board.innerHTML = '';
  tiles.forEach((row, y) => {
    row.forEach((ch, x) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (ch === '#') cell.classList.add('wall');
      if (ch === 'G') cell.classList.add('goal');
      if (player.x === x && player.y === y) cell.classList.add('player');
      board.appendChild(cell);
    });
  });
  $('hud-moves').textContent = App.state.moves;
  $('hud-level').textContent = 'Level ' + App.levels[App.index].id;
  $('btn-undo').disabled = App.history.length === 0;
}

function renderLevelGrid() {
  const grid = $('level-grid');
  grid.innerHTML = '';
  App.levels.forEach((lvl, i) => {
    const unlocked = i === 0 || App.progress.stars[App.levels[i - 1].id];
    const earned = App.progress.stars[lvl.id] || 0;
    const btn = document.createElement('button');
    btn.className = 'level-tile' + (unlocked ? '' : ' locked');
    btn.disabled = !unlocked;
    btn.innerHTML = `${lvl.id}<small>${unlocked ? '★'.repeat(earned) + '☆'.repeat(3 - earned) : 'Locked'}</small>`;
    btn.addEventListener('click', () => startLevel(i));
    grid.appendChild(btn);
  });
}

function bumpPlayer() {
  const el = document.querySelector('.cell.player');
  if (!el) return;
  el.classList.remove('bump');
  void el.offsetWidth; // restart the animation
  el.classList.add('bump');
}

/* ---------- UI + INPUT ---------- */
function startLevel(i) {
  App.index = i;
  App.state = Logic.load(App.levels[i]);
  App.history = [];
  App.won = false;
  $('win-overlay').classList.add('hidden');
  $('hint-text').textContent = i === 0 ? 'Reach the gold tile.' : '';
  showScreen('game');
  renderBoard();
}

function tryMove(dir) {
  if (App.won) return;
  const next = Logic.move(App.state, dir);
  if (!next) { Sfx.blocked(); bumpPlayer(); return; }
  App.history.push(App.state);
  App.state = next;
  Sfx.move();
  renderBoard();
  if (Logic.isWon(App.state)) onWin();
}

function undo() {
  if (App.won || App.history.length === 0) return;
  App.state = App.history.pop();
  Sfx.undo();
  renderBoard();
}

function onWin() {
  App.won = true;
  const lvl = App.levels[App.index];
  const stars = Logic.stars(App.state.moves, lvl.par);
  App.progress.stars[lvl.id] = Math.max(App.progress.stars[lvl.id] || 0, stars);
  Store.write(App.progress);
  Sfx.win();
  $('win-stats').textContent = `${App.state.moves} moves (par ${lvl.par}) ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`;
  $('btn-next').disabled = App.index >= App.levels.length - 1;
  $('win-overlay').classList.remove('hidden');
}

const KEYMAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right'
};

function bindEvents() {
  $('btn-play').addEventListener('click', () => {
    const first = App.levels.findIndex((l, i) => !(App.progress.stars[l.id]) && (i === 0 || App.progress.stars[App.levels[i - 1].id]));
    startLevel(first === -1 ? 0 : first);
  });
  $('btn-levels').addEventListener('click', () => { renderLevelGrid(); showScreen('levels'); });
  $('btn-how').addEventListener('click', () => showScreen('how'));
  $('btn-how-back').addEventListener('click', () => showScreen('title'));
  $('btn-levels-back').addEventListener('click', () => showScreen('title'));
  $('btn-menu').addEventListener('click', () => showScreen('title'));
  $('btn-undo').addEventListener('click', undo);
  $('btn-restart').addEventListener('click', () => startLevel(App.index));
  $('btn-replay').addEventListener('click', () => startLevel(App.index));
  $('btn-next').addEventListener('click', () => startLevel(App.index + 1));
  $('btn-mute').addEventListener('click', () => {
    const muted = Sfx.toggleMute();
    $('btn-mute').textContent = 'Sound: ' + (muted ? 'off' : 'on');
    $('btn-mute').setAttribute('aria-pressed', String(muted));
  });
  document.querySelectorAll('.dpad button').forEach((b) =>
    b.addEventListener('click', () => tryMove(b.dataset.dir)));

  document.addEventListener('keydown', (e) => {
    if (!$('screen-game').classList.contains('active')) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (KEYMAP[key]) { e.preventDefault(); tryMove(KEYMAP[key]); }
    else if (key === 'z') undo();
    else if (key === 'r') startLevel(App.index);
  });
}

/* ---------- BOOT ---------- */
async function boot() {
  bindEvents();
  try {
    const res = await fetch('levels.json');
    const data = await res.json();
    App.levels = data.levels;
    $('game-title').textContent = data.title || 'Puzzle Starter';
  } catch (err) {
    // fetch() is blocked on file:// in most browsers. Run a local server instead.
    $('screen-title').insertAdjacentHTML('beforeend',
      '<p class="hint-text">Could not load levels.json. Run <code>python -m http.server</code> in this folder and open http://localhost:8000</p>');
    $('btn-play').disabled = true;
    $('btn-levels').disabled = true;
  }
}
boot();
