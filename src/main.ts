import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

export interface CanvasInfoSettings {
	source: string;
	destination: string;
}

const DEFAULT_SETTINGS: CanvasInfoSettings = {
	source: "",
	destination: "",
}

export default class CanvasInfoPlugin extends Plugin {
	settings: CanvasInfoSettings;

	async onload() {
		await this.loadSettings();

		const ribbonIconEl = this.addRibbonIcon('car', 'Generate Sidecars', this.generateSidecars);

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'generate-sidecars',
			name: 'Generate Sidecars',
			callback: this.generateSidecars
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	generateSidecars() {
		new Notice('generating sidecars…');
		// todo: call the actual function
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: CanvasInfoPlugin;

	constructor(app: App, plugin: CanvasInfoPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Source')
			.setDesc('the source folder where your canvas files are located')
			.addText(folder => folder
				.setPlaceholder('Source Folder')
				.setValue(this.plugin.settings.source)
				.onChange(async (value) => {
					this.plugin.settings.source = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Destination')
			.setDesc('the destination folder for your generated sidecar markdown files')
			.addText(folder => folder
				.setPlaceholder('Destination Folder')
				.setValue(this.plugin.settings.destination)
				.onChange(async (value) => {
					this.plugin.settings.destination = value;
					await this.plugin.saveSettings();
				}));
	}
}
