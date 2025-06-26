// Content script to parse battle state information from the Pokémon Showdown UI
// and forward it to the background service worker.

console.log('PokemonGPT content script loaded');

let enabled = true;
let sidebar;
let logContainer;
let observer;

function createSidebar() {
  sidebar = document.createElement('div');
  sidebar.id = 'pokemon-gpt-sidebar';
  sidebar.style.cssText =
    'position:fixed;top:0;right:0;width:300px;height:100%;background:white;z-index:10000;border-left:1px solid #ccc;padding:4px;overflow-y:auto;font-family:sans-serif;font-size:12px;';
  const header = document.createElement('div');
  header.textContent = 'PokemonGPT';
  header.style.fontWeight = 'bold';
  sidebar.appendChild(header);
  logContainer = document.createElement('div');
  sidebar.appendChild(logContainer);
  document.body.appendChild(sidebar);
}

function showSidebar() {
  if (!sidebar) createSidebar();
  sidebar.style.display = 'block';
}

function hideSidebar() {
  if (sidebar) sidebar.style.display = 'none';
}

function logMessage(sender, text) {
  if (!logContainer) return;
  const div = document.createElement('div');
  div.textContent = `${sender}: ${text}`;
  logContainer.appendChild(div);
  logContainer.scrollTop = logContainer.scrollHeight;
}

chrome.storage.sync.get({ enabled: true }, data => {
  enabled = data.enabled;
  if (enabled) showSidebar();
  setupObserver();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.enabled) {
    enabled = changes.enabled.newValue;
    if (enabled) {
      showSidebar();
      reportBattleState();
    } else {
      hideSidebar();
    }
  }
});

// Track team roster and state across turns
let currentState = {
  roster: null,
  hp: {},
  status: {}
};

/**
 * Parse the list of Pokémon on each side at battle start.
 */
function getTeamRoster() {
  const teams = { player: [], opponent: [] };
  const trainers = document.querySelectorAll('.trainer');
  trainers.forEach((trainer, idx) => {
    const side = idx === 0 ? 'player' : 'opponent';
    const icons = Array.from(trainer.querySelectorAll('.teamicons span'));
    icons.forEach(icon => {
      const species =
        icon.getAttribute('aria-label') ||
        icon.getAttribute('title') ||
        icon.className.replace(/.*picon-/, '');
      teams[side].push({ species, hp: 100, status: null });
    });
  });
  return teams;
}

/**
 * Extract the name of the active Pokémon from the battle interface.
 */
function getActivePokemon() {
  const active = document.querySelector('.active .pokename');
  return active ? active.textContent.trim() : null;
}

/**
 * Collect the list of available moves for the active Pokémon.
 */
function getAvailableMoves() {
  const buttons = Array.from(
    document.querySelectorAll('button[name="chooseMove"]')
  );
  return buttons.map(btn => btn.textContent.trim().split('\n')[0]);
}

/**
 * Read HP percentage and status text from an active Pokémon element.
 */
function parseHPAndStatus(activeEl) {
  const hpText = activeEl.querySelector('.hpbar .hptext');
  let hp = null;
  if (hpText) {
    const match = hpText.textContent.match(/(\d+)%/);
    if (match) hp = parseInt(match[1], 10);
  }
  const statusEl = activeEl.querySelector('.status');
  const status = statusEl ? statusEl.textContent.trim() : null;
  return { hp, status };
}

/**
 * Update global HP and status information for all active Pokémon.
 */
function updateActiveState() {
  const activeMons = document.querySelectorAll('.active');
  activeMons.forEach(el => {
    const nameEl = el.querySelector('.pokename');
    if (!nameEl) return;
    const name = nameEl.textContent.trim();
    const info = parseHPAndStatus(el);
    currentState.hp[name] = info.hp;
    currentState.status[name] = info.status;
  });
}

/**
 * Click the move button matching the provided move name.
 */
function selectMove(moveName) {
  const buttons = Array.from(
    document.querySelectorAll('button[name="chooseMove"]')
  );
  const button = buttons.find(
    btn => btn.textContent.trim().split('\n')[0] === moveName
  );
  if (button) {
    button.click();
    console.log('PokemonGPT selected move', moveName);
  }
}

/**
 * Parse relevant battle state data from the page.
 */
function parseBattleState() {
  // Ensure roster is captured once the team icons are available
  if (!currentState.roster) {
    const roster = getTeamRoster();
    if (roster.player.length || roster.opponent.length) {
      currentState.roster = roster;
    }
  }

  const activePokemon = getActivePokemon();
  const moves = getAvailableMoves();

  updateActiveState();

  if (!activePokemon && moves.length === 0) {
    return null;
  }

  return {
    activePokemon,
    moves,
    roster: currentState.roster,
    hp: currentState.hp,
    status: currentState.status
  };
}

/**
 * Send the current battle state to the background script.
 */
function reportBattleState() {
  if (!enabled) return;
  const state = parseBattleState();
  if (state) {
    chrome.runtime.sendMessage({ type: 'battle_state', state });
    console.log('PokemonGPT battle state', state);
    logMessage('You', 'Sent battle state');
  }
}

// Listen for move recommendations from the background script
chrome.runtime.onMessage.addListener(message => {
  if (message.type === 'recommended_move') {
    selectMove(message.move);
    logMessage('AI', message.move);
  }
});

// Observe changes within the battle container so we can update the state when
// the UI changes (e.g., after selecting a move or when a new Pokémon switches in).
function setupObserver() {
  const battleContainer = document.getElementById('battle');
  if (battleContainer) {
    observer = new MutationObserver(() => reportBattleState());
    observer.observe(battleContainer, { childList: true, subtree: true });
    if (enabled) reportBattleState();
  }
}
