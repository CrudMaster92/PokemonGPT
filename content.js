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
    'position:fixed;top:0;right:0;width:300px;height:100%;' +
    'background:#f7f7f7;z-index:10000;border-left:1px solid #ccc;' +
    'display:flex;flex-direction:column;font-family:sans-serif;font-size:12px;';

  const header = document.createElement('div');
  header.textContent = 'PokemonGPT';
  header.style.cssText = 'font-weight:bold;padding:8px;background:#444;color:white';
  sidebar.appendChild(header);

  logContainer = document.createElement('div');
  logContainer.style.cssText = 'flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:4px;';
  sidebar.appendChild(logContainer);

  const form = document.createElement('form');
  form.style.cssText = 'display:flex;gap:4px;padding:8px;border-top:1px solid #ccc;';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Type a message...';
  input.style.cssText = 'flex:1;padding:4px;';

  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = 'Send';

  form.appendChild(input);
  form.appendChild(button);
  sidebar.appendChild(form);

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    logMessage('You', text);
    chrome.runtime.sendMessage({ type: 'user_chat', text });
    input.value = '';
  });

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
  div.textContent = text;
  div.style.padding = '6px 8px';
  div.style.borderRadius = '4px';
  div.style.maxWidth = '90%';
  if (sender === 'You') {
    div.style.alignSelf = 'flex-end';
    div.style.background = '#dcf8c6';
  } else if (sender === 'AI') {
    div.style.alignSelf = 'flex-start';
    div.style.background = '#fff';
    div.style.border = '1px solid #ddd';
  } else {
    div.style.alignSelf = 'center';
    div.style.background = '#ffecec';
    div.style.border = '1px solid #f5c2c2';
  }
  logContainer.appendChild(div);
  logContainer.scrollTop = logContainer.scrollHeight;
}

chrome.storage.sync.get({ enabled: true, apiKey: '' }, data => {
  enabled = data.enabled;
  if (enabled) {
    showSidebar();
    if (!data.apiKey) {
      logMessage('System', 'Set your OpenAI API key in the extension options.');
    }
  }
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
  } else if (message.type === 'error') {
    logMessage('System', message.text);
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
