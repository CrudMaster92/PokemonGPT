# PokemonGPT

PokemonGPT is a Chrome extension that acts as an AI battle assistant for [Pokémon Showdown](https://pokemonshowdown.com). It automatically selects moves using recommendations from the OpenAI API (defaulting to **gpt-4o**).

## Getting Started

1. Clone this repository and open the `chrome://extensions` page in Chrome.
2. Enable **Developer mode** and load the extension directory as an unpacked extension.
3. Open a Pokémon Showdown battle and the assistant will suggest and select moves automatically.
4. Use the extension's options page to set your API key, choose a model (gpt-3.5, gpt-4, gpt-4o, openai-o3, etc.), adjust temperature, and customize the system prompt.
5. Send extra instructions using the chat box that appears in the sidebar during battles.

## Development Guide

### Project Structure

```
PokemonGPT/
  README.md       - You are here
  manifest.json   - Chrome extension manifest
  content.js      - Content script to interact with Pokémon Showdown
  background.js   - Background script to manage LLM communication
  options.html    - Options page UI
  options.js      - Logic to save and load settings
```

### Local Setup

No npm steps are currently required. Simply reload the extension in Chrome after you edit files.

### Battle State Reporting

The extension records the entire team roster at the start of a battle and tracks
HP values and status conditions for the active Pokémon each turn. This richer
state information is forwarded to the language model so it can make more
informed decisions.

## Task List

The following tasks outline the work needed to complete the extension:

1. **Create basic Chrome extension skeleton.** *(completed)*
   - Added a `manifest.json` with permissions for Pokémon Showdown and scripts.
   - Created placeholder `content.js` and `background.js`.

2. **Implement battle state parsing.** *(completed)*
   - Read the active Pokémon, available moves, and game state from the Showdown UI.

3. **Integrate the language model for move selection.** *(completed)*
   - Battle state is sent to the OpenAI API and the recommended move is received.

4. **Automate UI interaction.** *(completed)*
   - The extension now programmatically clicks the recommended move in the Showdown interface.

5. **Add configuration and settings.** *(completed)*
   - Added an options page to provide an OpenAI API key, model name and temperature.
   - Users can enable/disable and tweak assistant parameters.

6. **Add custom system prompt field.** *(completed)*
   - Users can edit the prompt sent to the language model.

7. **Testing and refinement.**
   - Test the assistant in various battle scenarios.
   - Iterate on the LLM prompt and logic for better decision making.
   - Fix options page to handle a temperature value of 0.

8. **Expand battle state reporting.** *(completed)*
   - Parse the full team roster at battle start.
   - Track HP percentages and status for active Pokémon each turn.
   - Send this richer state information to the language model.

9. **Open settings from extension icon.** *(completed)*
   - Clicking the PokemonGPT icon now opens the options page for quick access.

10. **Add sidebar chat log and enable/disable option.** *(completed)*
    - A sidebar shows the conversation with the AI and opens automatically.
    - Settings now include a checkbox to toggle the extension on or off.

11. **Improve sidebar UI and API key errors.** *(completed)*
    - Sidebar messages are styled like a simple chat UI.
    - Users see a message when the OpenAI API key is missing or invalid.

12. **Add model dropdown for updated OpenAI models.** *(completed)*
    - Options page now provides a select list of model names instead of a text field.

13. **Refresh model list and API request.** *(completed)*
    - Updated the model selector with new OpenAI models (gpt-4o-mini, openai-o3, gpt-4-32k, etc.).
    - API requests now include fields like `max_tokens` and `top_p`.

14. **Add sidebar chat input for user commands.** *(completed)*
    - Users can send custom instructions using the new text box in the sidebar.

Contributions should update this task list as work progresses.
