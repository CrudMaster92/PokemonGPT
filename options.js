// Handle saving and loading extension settings
const DEFAULTS = { apiKey: '', model: 'gpt-4o', temperature: 1 };

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(DEFAULTS, data => {
    document.getElementById('apiKey').value = data.apiKey;
    document.getElementById('model').value = data.model;
    document.getElementById('temperature').value = data.temperature;
  });

  document.getElementById('save').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('model').value.trim() || 'gpt-4o';
    const temperature = parseFloat(document.getElementById('temperature').value) || 1;
    chrome.storage.sync.set({ apiKey, model, temperature }, () => {
      alert('Settings saved');
    });
  });
});
