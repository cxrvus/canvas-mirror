import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as mirror from './mirror';
import { SampleSettingTab } from './settings';

export interface CanvasMirrorSettings {
	destination: string;
}

const DEFAULT_SETTINGS: CanvasMirrorSettings = {
	destination: "",
}

export default class CanvasMirror extends Plugin {
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
			await mirror.generateMirrors(this);
		} catch(e) {
			new Notice(e);
		}
	}

	async toggleMirrors() {
		try {
			const enabled = await mirror.toggleMirrors(this);
			const status = enabled ? "enabled" : "disabled"
			new Notice(`mirrors ${status}`)
		} catch(e) {
			new Notice(e);
		}
	}

	async clearMirrors() {
		new Notice('clearing mirrors…');
		try {
			await mirror.clearMirrors(this);
		} catch(e) {
			new Notice(e);
		}
	}
}
