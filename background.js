// Background service worker to receive battle state information from the content
// script and eventually forward it to the language model.

console.log('PokemonGPT background service worker initialized');

// Local API endpoint for move recommendations
const API_URL = 'http://localhost:5000/move';

// Current user settings
let settings = { enabled: true, temperature: 0.7 };
chrome.storage.local.get(settings, items => {
  settings = items;
});

chrome.storage.onChanged.addListener(changes => {
  if (changes.enabled) settings.enabled = changes.enabled.newValue;
  if (changes.temperature) settings.temperature = changes.temperature.newValue;
});

// Listen for updates from the content script with parsed battle state data.
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'battle_state') {
    console.log('Received battle state', message.state);

    if (!settings.enabled) {
      console.log('PokemonGPT disabled; ignoring battle state');
      return;
    }

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...message.state, temperature: settings.temperature })
    })
      .then(res => res.json())
      .then(data => {
        console.log('LLM recommended move', data.move);
        if (sender.tab && data.move) {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'recommended_move',
            move: data.move
          });
        }
      })
      .catch(err => console.error('LLM request failed', err));
  }
});
