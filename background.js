// Background service worker to receive battle state information from the content
// script and eventually forward it to the language model.

console.log('PokemonGPT background service worker initialized');

// Open the settings page when the extension icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

const DEFAULT_SETTINGS = {
  apiKey: '',
  model: 'gpt-4o',
  temperature: 1,
  prompt: 'You are a Pokémon Showdown battle assistant. Return only the best move name.'
};

function getSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, resolve);
  });
}

// Listen for updates from the content script with parsed battle state data.
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'battle_state') {
    console.log('Received battle state', message.state);

    getSettings().then(({ apiKey, model, temperature, prompt }) => {
      if (!apiKey) {
        console.error('No OpenAI API key set');
        return;
      }

      const body = {
        model,
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content:
              `Active Pokemon: ${message.state.activePokemon}\n` +
              `Moves: ${message.state.moves.join(', ')}\n` +
              `HP: ${JSON.stringify(message.state.hp)}\n` +
              `Status: ${JSON.stringify(message.state.status)}\n` +
              `Roster: ${JSON.stringify(message.state.roster)}`
          }
        ],
        temperature
      };

      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      })
        .then(res => res.json())
        .then(data => {
          const move = data.choices && data.choices[0].message.content.trim();
          console.log('LLM recommended move', move);
          if (sender.tab && move) {
            chrome.tabs.sendMessage(sender.tab.id, {
              type: 'recommended_move',
              move
            });
          }
        })
        .catch(err => console.error('LLM request failed', err));
    });
  }
});
