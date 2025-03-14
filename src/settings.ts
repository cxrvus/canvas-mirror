import { PluginSettingTab, App, Setting } from 'obsidian';
import CanvasMirror from './main';

export class SampleSettingTab extends PluginSettingTab {
	plugin: CanvasMirror;

	constructor(app: App, plugin: CanvasMirror) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Destination')
			.setDesc('the destination folder for your generated markdown mirror files')
			.addText(folder => folder
				.setPlaceholder('Destination Folder')
				.setValue(this.plugin.settings.destination)
				.onChange(async (value) => {
					this.plugin.settings.destination = value;
					await this.plugin.saveSettings();
				}))
		;
	}
}
