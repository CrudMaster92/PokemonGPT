// Content script to parse battle state information from the Pokémon Showdown UI
// and forward it to the background service worker.

console.log('PokemonGPT content script loaded');

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
  const activePokemon = getActivePokemon();
  const moves = getAvailableMoves();

  if (!activePokemon && moves.length === 0) {
    return null;
  }

  return { activePokemon, moves };
}

/**
 * Send the current battle state to the background script.
 */
function reportBattleState() {
  const state = parseBattleState();
  if (state) {
    chrome.runtime.sendMessage({ type: 'battle_state', state });
    console.log('PokemonGPT battle state', state);
  }
}

// Listen for move recommendations from the background script
chrome.runtime.onMessage.addListener(message => {
  if (message.type === 'recommended_move') {
    selectMove(message.move);
  }
});

// Observe changes within the battle container so we can update the state when
// the UI changes (e.g., after selecting a move or when a new Pokémon switches in).
const battleContainer = document.getElementById('battle');
if (battleContainer) {
  const observer = new MutationObserver(() => reportBattleState());
  observer.observe(battleContainer, { childList: true, subtree: true });
  // Initial state report
  reportBattleState();
}
