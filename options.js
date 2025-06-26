// Handle saving and loading extension settings
const DEFAULTS = {
  apiKey: '',
  model: 'gpt-4o',
  temperature: 1,
  prompt: 'You are a Pokémon Showdown battle assistant. Return only the best move name.',
  enabled: true
};

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(DEFAULTS, data => {
    document.getElementById('apiKey').value = data.apiKey;
    document.getElementById('model').value = data.model;
    document.getElementById('temperature').value = data.temperature;
    document.getElementById('prompt').value = data.prompt;
    document.getElementById('enabled').checked = data.enabled;
  });

  document.getElementById('save').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('model').value.trim() || 'gpt-4o';
    let temperature = parseFloat(document.getElementById('temperature').value);
    if (isNaN(temperature)) temperature = 1;
    const enabled = document.getElementById('enabled').checked;
    const prompt = document.getElementById('prompt').value.trim();
    chrome.storage.sync.set({ apiKey, model, temperature, prompt, enabled }, () => {
      alert('Settings saved');
    });
  });
});
