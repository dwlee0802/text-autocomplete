import { PluginSettingTab, App, Setting, Notice } from "obsidian";
import type TAPlugin from './main'

// TODO Add LaTex support

export interface TASettings {
    enabled: boolean; // Autocomplete enabling
    language: string; // Language support
    maxSuggestions: number; // Max number of proposed suggestions at a time
    customDict: string[];
    // initialBoot: boolean; // Initial install bootup flag
    // latex: boolean; // LaTeX support
}

export const DEFAULT_SETTINGS : TASettings = {
    enabled: true,
    language: 'English',
    maxSuggestions: 3,
    customDict: [],
    // initialBoot: false,
    // latex: false,
}

export class TASettingsTab extends PluginSettingTab {
    plugin: TAPlugin;

    constructor(app: App, plugin: TAPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const containerEl = this.containerEl;
        containerEl.empty();

        // Autocomplete setting
        new Setting(containerEl)
            .setName('Autocomplete')
            .setDesc('Enable/disable autocomplete feature.')
            .addToggle(toggle =>
                toggle.setValue(this.plugin.settings.enabled)
                    .onChange(async val => {
                        this.plugin.settings.enabled = val;
                        await this.plugin.saveSettings();
                    }));

        // Language setting
        new Setting(containerEl)
            .setName('Language')
            .setDesc('Specify text language support.')
            .addDropdown(dropdown =>
                dropdown.addOption('English', 'English')
                    .setValue(this.plugin.settings.language)
                    .onChange(async val => {
                        this.plugin.settings.language = val;
                        await this.plugin.saveSettings();
                    }));

        // Max suggestions setting
        new Setting(containerEl)
            .setName('Max Suggestions')
            .setDesc('Max number of suggestions shown at once (3-10).')
            .addSlider(slider =>
                slider.setLimits(3, 10, 1)
                    .setValue(this.plugin.settings.maxSuggestions)
                    .setDynamicTooltip()
                    .onChange(async (val: number) => {
                        this.plugin.settings.maxSuggestions = val;
                        await this.plugin.saveSettings();
                    }));

        // Custom dictionary setting
        new Setting(containerEl)
            .setName('Custom Dictionary')
            .setDesc('Add words to a your own custom dictionary.')
            .addText(text => {
                text.setPlaceholder('e.g. tiktok');
                text.inputEl.addEventListener('keydown', async (e) => {
                    if (e.key === 'Enter') {
                        const word = text.getValue().trim().toLowerCase();
                        if (word && !this.plugin.settings.customDict.includes(word)) {
                            this.plugin.settings.customDict.push(word);
                            this.plugin.wordTrie.insert(word);
                            await this.plugin.saveSettings();
                            // new Notice(`Added "${word}" to your custom dictionary.`);
                            this.display();
                        }
                    }
                });
            });

        // Manage custom dictionary subsetting
        if (this.plugin.settings.customDict.length > 0) {
            containerEl.createEl('h3', { text: 'Custom Dictionary Contents' });
        }

        // Clear custom dictionary setting
        new Setting(containerEl)
            .setName('Clear Custom Dictionary')
            .setDesc('Remove all words from your custom dictionary.')
            .addButton(b =>
                b.setButtonText('Reset')
                    .setCta()
                    .onClick(async () => {
                        this.plugin.settings.customDict.forEach(word => this.plugin.wordTrie.remove(word));
                        this.plugin.settings.customDict = [];
                        await this.plugin.saveSettings();
                        // new Notice('Custom dictionary cleared.')
                        this.display();
                    }));

        // LaTex setting
        // new Setting(containerEl)
        //     .setName('LaTeX Support')
        //     .setDesc('Enable/disable LaTex code autocomplete.')
        //     .addToggle(toggle =>
        //         toggle.setValue(this.plugin.settings.latex)
        //             .onChange(async val => {
        //                 this.plugin.settings.latex = val;
        //                 await this.plugin.saveSettings();
        //             }));
    }
}