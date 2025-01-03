import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as mirror from './mirror';

export interface CanvasMirrorSettings {
	folders: {
		source: string;
		destination: string;
	}
}

const DEFAULT_SETTINGS: CanvasMirrorSettings = {
	folders: {
		source: "",
		destination: "",
	}
}

export default class CanvasMirrorPlugin extends Plugin {
	settings: CanvasMirrorSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('scan-text', 'Generate Mirror Files', () => this.generateMirrors());

		this.addCommand({
			id: 'generate-mirrors',
			name: 'Generate Mirror Files',
			callback: () => this.generateMirrors()
		});

		this.addRibbonIcon('folder', 'Toggle Mirror Files', () => this.toggleMirrors());

		this.addCommand({
			id: 'toggle-mirrors',
			name: 'Toggle Mirror File Exclusion',
			callback: () => this.toggleMirrors()
		});

		this.addCommand({
			id: 'clear-mirrors',
			name: 'Clear Mirror Files',
			callback: () => this.clearMirrors()
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

	async generateMirrors() {
		new Notice('generating mirrors…');
		try {
			await mirror.generateMirrors(this.app.vault, this.settings);
		} catch(e) {
			new Notice(e);
		}
	}

	async toggleMirrors() {
		try {
			const enabled = await mirror.toggleMirrors(this.app.vault, this.settings);
			const status = enabled ? "enabled" : "disabled"
			new Notice(`mirrors ${status}`)
		} catch(e) {
			new Notice(e);
		}
	}

	async clearMirrors() {
		new Notice('clearing mirrors…');
		try {
			await mirror.clearMirrors(this.app.vault, this.settings);
		} catch(e) {
			new Notice(e);
		}
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: CanvasMirrorPlugin;

	constructor(app: App, plugin: CanvasMirrorPlugin) {
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
			.setDesc('the destination folder for your generated markdown mirror files')
			.addText(folder => folder
				.setPlaceholder('Destination Folder')
				.setValue(this.plugin.settings.folders.destination)
				.onChange(async (value) => {
					this.plugin.settings.folders.destination = value;
					await this.plugin.saveSettings();
				}));
	}
}
