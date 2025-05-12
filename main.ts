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

	// Load respective settings
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async loadWordTrie() {
		this.wordTrie = DEFAULT_TRIE;
		this.settings.customDict.forEach(word => this.wordTrie.insert(word));
	}

	// Save respective settings
	async saveSettings() {
		await this.saveData(this.settings);
	}
	
	// // Save word trie
	// async saveWordTrie() {
	// 	await this.saveData(this.wordTrie);
	// }

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

		const match = beforeCursor.match(/(\b\w+)$/); // Match contains word at the end of string
		// No matches (word at the end of the string) 
		if (!match) {
			destroyTAUI();
			return;
		}

		const word: string = match[1].toLowerCase();
		const suggestions: string[] = this.wordTrie.findWordsWithPrefix(word, this.settings.maxSuggestions)
			.filter((w: string) => w !== word);
		// const suggestions = WORDS.filter(w => w.startsWith(word) && w !== word).slice(0, this.settings.maxSuggestions);

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

// import { App, DropdownComponent, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// // Remember to rename these classes and interfaces!

// interface PluginSettings {
// 	mySetting: string;
// }

// const DEFAULT_SETTINGS: PluginSettings = {
// 	mySetting: 'default'
// }

// export default class TAPlugin extends Plugin {
// 	settings: PluginSettings;

// 	async onload() {
// 		await this.loadSettings();

// 		// This creates an icon in the left ribbon.
// 		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
// 			// Called when the user clicks the icon.
// 			new Notice('This is a notice!');
// 		});
// 		// Perform additional things with the ribbon
// 		ribbonIconEl.addClass('my-plugin-ribbon-class');

// 		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
// 		const statusBarItemEl = this.addStatusBarItem();
// 		statusBarItemEl.setText('Status Bar Text');

// 		// This adds a simple command that can be triggered anywher
// 		this.addCommand({
// 			id: 'open-sample-modal-simple',
// 			name: 'Open sample modal (simple)',
// 			callback: () => {
// 				new SampleModal(this.app).open();
// 			}
// 		});
// 		// This adds an editor command that can perform some operation on the current editor instance
// 		this.addCommand({
// 			id: 'sample-editor-command',
// 			name: 'Sample editor command',
// 			editorCallback: (editor: Editor, view: MarkdownView) => {
// 				console.log(editor.getSelection());
// 				editor.replaceSelection('Sample Editor Command');
// 			}
// 		});
// 		// This adds a complex command that can check whether the current state of the app allows execution of the command
// 		this.addCommand({
// 			id: 'open-sample-modal-complex',
// 			name: 'Open sample modal (complex)',
// 			checkCallback: (checking: boolean) => {
// 				// Conditions to check
// 				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
// 				if (markdownView) {
// 					// If checking is true, we're simply "checking" if the command can be run.
// 					// If checking is false, then we want to actually perform the operation.
// 					if (!checking) {
// 						new SampleModal(this.app).open();
// 					}

// 					// This command will only show up in Command Palette when the check function returns true
// 					return true;
// 				}
// 			}
// 		});

// 		// This adds a settings tab so the user can configure various aspects of the plugin
// 		this.addSettingTab(new SampleSettingTab(this.app, this));

// 		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
// 		// Using this function will automatically remove the event listener when this plugin is disabled.
// 		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
// 			console.log('click', evt);
// 		});

// 		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
// 		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
// 	}

// 	onunload() {

// 	}

// 	async loadSettings() {
// 		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
// 	}

// 	async saveSettings() {
// 		await this.saveData(this.settings);
// 	}
// }

// class SuggestedWordDropdown extends DropdownComponent {
	
// }

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const {contentEl} = this;
// 		contentEl.setText('Woah!');
// 	}

// 	onClose() {
// 		const {contentEl} = this;
// 		contentEl.empty();
// 	}
// }

// class SampleSettingTab extends PluginSettingTab {
// 	plugin: TAPlugin;

// 	constructor(app: App, plugin: TAPlugin) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}

// 	display(): void {
// 		const {containerEl} = this;

// 		containerEl.empty();

// 		new Setting(containerEl)
// 			.setName('Setting #1')
// 			.setDesc('It\'s a secret')
// 			.addText(text => text
// 				.setPlaceholder('Enter your secret')
// 				.setValue(this.plugin.settings.mySetting)
// 				.onChange(async (value) => {
// 					this.plugin.settings.mySetting = value;
// 					await this.plugin.saveSettings();
// 				}));
// 	}
// }
