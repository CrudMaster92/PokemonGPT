// Handles saving and loading of PokemonGPT settings.
document.addEventListener('DOMContentLoaded', () => {
  const enabledEl = document.getElementById('enabled');
  const temperatureEl = document.getElementById('temperature');

  chrome.storage.local.get({ enabled: true, temperature: 0.7 }, items => {
    enabledEl.checked = items.enabled;
    temperatureEl.value = items.temperature;
  });

  enabledEl.addEventListener('change', () => {
    chrome.storage.local.set({ enabled: enabledEl.checked });
  });

  temperatureEl.addEventListener('change', () => {
    const value = parseFloat(temperatureEl.value);
    chrome.storage.local.set({ temperature: value });
  });
});
