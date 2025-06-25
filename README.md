# PokemonGPT

PokemonGPT is a Chrome extension that acts as an AI battle assistant for [Pokémon Showdown](https://pokemonshowdown.com). It automatically selects moves using recommendations from a local language model.

## Getting Started

1. Clone this repository and open the `chrome://extensions` page in Chrome.
2. Enable **Developer mode** and load the extension directory as an unpacked extension.
3. Open a Pokémon Showdown battle and the assistant will suggest and select moves automatically.

## Development Guide

### Project Structure

```
PokemonGPT/
  README.md       - You are here
  manifest.json   - Chrome extension manifest
  content.js      - Content script to interact with Pokémon Showdown
  background.js   - Background script to manage LLM communication
```

### Local Setup

1. Install dependencies with `npm install` (once the project uses npm).
2. Run `npm run build` to bundle scripts if a build step is required.
3. Reload the extension in Chrome after changes.

## Task List

The following tasks outline the work needed to complete the extension:

1. **Create basic Chrome extension skeleton.** *(completed)*
   - Added a `manifest.json` with permissions for Pokémon Showdown and scripts.
   - Created placeholder `content.js` and `background.js`.

2. **Implement battle state parsing.** *(completed)*
   - Read the active Pokémon, available moves, and game state from the Showdown UI.

3. **Integrate the language model for move selection.**
   - Send game state data to a local LLM API.
   - Receive and apply the recommended move.

4. **Automate UI interaction.**
   - Programmatically click the recommended move in the Showdown interface.

5. **Add configuration and settings.**
   - Allow users to enable/disable the assistant.
   - Provide controls to adjust LLM parameters if needed.

6. **Testing and refinement.**
   - Test the assistant in various battle scenarios.
   - Iterate on the LLM prompt and logic for better decision making.

Contributions should update this task list as work progresses.
