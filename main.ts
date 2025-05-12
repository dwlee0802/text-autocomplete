import { App, Editor, EditorPosition, MarkdownView, Plugin} from 'obsidian';
import { TASettingsTab, DEFAULT_SETTINGS, TASettings } from './settings';
import { createTAUI, destroyTAUI, updateSuggestions } from './ui';
import { DEFAULT_TRIE } from './dictionary';
import { Trie } from './trie';

// Helper functions
function inCodeBlock(editor: Editor, cursor: EditorPosition): boolean {
	const lines = editor.getValue().split('\n');
	let inCodeBlock = false;

	for (let i = 0; i <= cursor.line; i++) {
		const line = lines[i].trim();
		if (line.startsWith('```')) {
			inCodeBlock = !inCodeBlock;
		}
	}

	return inCodeBlock;
}

// Classes
export default class TAPlugin extends Plugin {
	settings: TASettings;
	wordTrie: Trie;

	// Load plugin settings
	async onload() {
		await this.loadSettings();
		await this.loadWordTrie();
		this.addSettingTab(new TASettingsTab(this.app, this));
		
		// Event listeners for autocomplete triggers, keydowns, and extensions
		this.registerEvent(this.app.workspace.on('editor-change', this.handleEditorChange.bind(this)));
		this.registerDomEvent(document, 'keydown', this.handleKeyDown.bind(this), { capture: true });
		this.registerEditorExtension(createTAUI(this));
	}

	// Cleanup
	onunload() {
		destroyTAUI();
	}

	// Load respective plugin data
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async loadWordTrie() {
		this.wordTrie = DEFAULT_TRIE;
		this.settings.customDict.forEach(word => this.wordTrie.insert(word));
	}

	// Save settings
	async saveSettings() {
		await this.saveData(this.settings);
	}

	// Handles event of text being typed in document
	handleEditorChange(editor: Editor) {
		if (!this.settings.enabled) return; // Only continue if autocomplete is enabled
		console.log("Editor changed.")

		const cursor = editor.getCursor(); // Position in current
		const line = editor.getLine(cursor.line); // Current line in doc
		const beforeCursor = line.substring(0, cursor.ch); // Current word up to cursor

		// For now, prevent autocomplete inside code blocks
		// TODO - Add code block support
		if (inCodeBlock(editor, cursor)) {
			destroyTAUI();
			return;
		}

		const match = beforeCursor.match(/(\b[\w']+)$/);; // Match contains word at the end of string
		// No matches (word at the end of the string) 
		if (!match) {
			destroyTAUI();
			return;
		}

		const word: string = match[1];
		const suggestions: string[] = this.wordTrie.findWordsWithPrefix(word, this.settings.maxSuggestions)
			.filter((w: string) => w !== word);

		if (suggestions.length > 0) {
			updateSuggestions(suggestions, editor, match[1]);
		} else {
			destroyTAUI(); // Should never happen but is a safety check
		}
	}

	// Handles keydown events like ENTER\TAB for trigger and arrow up/down for navigation
	handleKeyDown(evt: KeyboardEvent) {
		if (!this.settings.enabled) return;

		const dropdown = document.querySelector('.autocomplete-dropdown');
		if (!dropdown) return; // Dropdown not visible (no suggestions)

		if (['Enter', 'Tab', 'ArrowDown', 'ArrowUp'].includes(evt.key)) {
			evt.preventDefault(); // Keyboard event default response prevented

			const items = Array.from(dropdown.querySelectorAll('li'));
			const active = dropdown.querySelector('li.active'); // The active element in the dropdown
			let index = items.indexOf(active as HTMLLIElement);

			if (evt.key === 'Enter' || evt.key === 'Tab') {
				const selected = active || items[0]; // Defaults to first suggestion
				if (selected) selected.dispatchEvent(new Event('click'));
				destroyTAUI();
				return;
			}
			if (evt.key === 'ArrowDown') index = (index + 1) % items.length; 
			if (evt.key === 'ArrowUp') index = (index - 1 + items.length) % items.length;

			items.forEach((item, i) => item.classList.toggle('active', i === index)); // Updates which suggestion is tagged active
		}
	}
}