import CanvasMirror from './main';

export const getMatches = (strings: string[], pattern: RegExp): string[] => {
	return strings
		.map(str => str.match(pattern) || '')
		.filter(matches => matches)
		.flat()
	;
}


export interface AppSettings {
	userIgnoreFilters: string[]
}

export const getAppSettings = async (self: CanvasMirror) => {
	const { vault } = self.app;
	const settingsPath = `${vault.configDir}/app.json`;
	return JSON.parse(await vault.adapter.read(settingsPath)) as AppSettings;
}

export const setAppSettings = async (self: CanvasMirror, appSettings: AppSettings) => {
	const settingsPath = `${self.app.vault.configDir}/app.json`;
	await self.app.vault.adapter.write(settingsPath, JSON.stringify(appSettings));
}

export const bullet = (strings: string[]) => {
	return strings.length ? `- ${strings.join('\n- ')}` : '*none*';
}

