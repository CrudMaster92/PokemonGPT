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

const conversations = {};

function getConversation(tabId) {
  if (!conversations[tabId]) conversations[tabId] = [];
  return conversations[tabId];
}

function getSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, resolve);
  });
}

function handleLLMRequest(tabId, sender, state) {
  getSettings().then(({ apiKey, model, temperature, prompt }) => {
    if (!apiKey) {
      chrome.tabs.sendMessage(tabId, {
        type: 'error',
        text: 'Set your OpenAI API key in the extension options.'
      });
      return;
    }

    const convo = getConversation(tabId);
    const messages = [{ role: 'system', content: prompt }, ...convo];

    if (state && state.moves) {
      messages.push({
        role: 'user',
        content:
          `Active Pokemon: ${state.activePokemon}\n` +
          `Moves: ${state.moves.join(', ')}\n` +
          `HP: ${JSON.stringify(state.hp)}\n` +
          `Status: ${JSON.stringify(state.status)}\n` +
          `Roster: ${JSON.stringify(state.roster)}`
      });
    }

    const body = {
      model,
      messages,
      temperature,
      max_tokens: 50,
      top_p: 1,
      presence_penalty: 0,
      frequency_penalty: 0
    };

    chrome.tabs.sendMessage(tabId, {
      type: 'status',
      text: 'Contacting OpenAI...'
    });

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
        const reply = data.choices && data.choices[0].message.content.trim();
        if (!reply) return;
        convo.push({ role: 'assistant', content: reply });
        if (state && state.moves) {
          chrome.tabs.sendMessage(tabId, {
            type: 'recommended_move',
            move: reply
          });
          chrome.tabs.sendMessage(tabId, {
            type: 'status',
            text: `Decided on ${reply}`
          });
        } else {
          chrome.tabs.sendMessage(tabId, {
            type: 'chat_reply',
            text: reply
          });
        }
      })
      .catch(err => {
        chrome.tabs.sendMessage(tabId, {
          type: 'error',
          text: 'LLM request failed. Check your API key.'
        });
        chrome.tabs.sendMessage(tabId, {
          type: 'status',
          text: 'LLM request failed'
        });
      });
  });
}

// Listen for updates from the content script with parsed battle state data.
chrome.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab && sender.tab.id;
  if (!tabId) return;

  if (message.type === 'user_chat') {
    const convo = getConversation(tabId);
    convo.push({ role: 'user', content: message.text });
    handleLLMRequest(tabId, sender, {});
    return;
  }

  if (message.type === 'battle_state') {
    console.log('Received battle state', message.state);
    handleLLMRequest(tabId, sender, message.state);
  }
});
