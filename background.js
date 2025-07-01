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
        if (sender.tab) {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'error',
            text: 'Set your OpenAI API key in the extension options.'
          });
        }
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
        temperature,
        max_tokens: 50,
        top_p: 1,
        presence_penalty: 0,
        frequency_penalty: 0
      };

      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`Request failed: ${res.status}`);
          }
          return res.json();
        })
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
        .catch(err => {
          console.error('LLM request failed', err);
          if (sender.tab) {
            chrome.tabs.sendMessage(sender.tab.id, {
              type: 'error',
              text: 'LLM request failed. Check your API key.'
            });
          }
        });
    });
  }
});
