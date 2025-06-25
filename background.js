// Background service worker to receive battle state information from the content
// script and eventually forward it to the language model.

console.log('PokemonGPT background service worker initialized');

// Local API endpoint for move recommendations
const API_URL = 'http://localhost:5000/move';

// Listen for updates from the content script with parsed battle state data.
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'battle_state') {
    console.log('Received battle state', message.state);

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.state)
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
