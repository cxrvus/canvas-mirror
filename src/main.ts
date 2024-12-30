import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as sidecars from './sidecars';

export interface CanvasInfoSettings {
	folders: {
		source: string;
		destination: string;
	}
}

const DEFAULT_SETTINGS: CanvasInfoSettings = {
	folders: {
		source: "",
		destination: "",
	}
}

export default class CanvasInfoPlugin extends Plugin {
	settings: CanvasInfoSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('car', 'Generate Sidecars', () => this.generateSidecars());

		this.addCommand({
			id: 'generate-sidecars',
			name: 'Generate Sidecars',
			callback: () => this.generateSidecars()
		});

		this.addRibbonIcon('folder', 'Toggle Sidecars', () => this.toggleSidecars());

		this.addCommand({
			id: 'toggle-sidecars',
			name: 'Toggle Sidecar Exclusion',
			callback: () => this.toggleSidecars()
		});

		this.addCommand({
			id: 'clear-sidecars',
			name: 'Clear Sidecars',
			callback: () => this.clearSidecars()
		});

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

	async generateSidecars() {
		new Notice('generating sidecars…');
		try {
			await sidecars.generateSidecars(this.app.vault, this.settings);
		} catch(e) {
			new Notice(e);
		}
	}

	async toggleSidecars() {
		try {
			const enabled = await sidecars.toggleSidecars(this.app.vault, this.settings);
			const status = enabled ? "enabled" : "disabled"
			new Notice(`sidecars ${status}`)
		} catch(e) {
			new Notice(e);
		}
	}

	async clearSidecars() {
		new Notice('clearing sidecars…');
		try {
			await sidecars.clearSidecars(this.app.vault, this.settings);
		} catch(e) {
			new Notice(e);
		}
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
				.setValue(this.plugin.settings.folders.source)
				.onChange(async (value) => {
					this.plugin.settings.folders.source = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Destination')
			.setDesc('the destination folder for your generated sidecar markdown files')
			.addText(folder => folder
				.setPlaceholder('Destination Folder')
				.setValue(this.plugin.settings.folders.destination)
				.onChange(async (value) => {
					this.plugin.settings.folders.destination = value;
					await this.plugin.saveSettings();
				}));
	}
}
