import { Vault } from 'obsidian';
import { CanvasInfoSettings } from './main';

interface Canvas {
	name: string,
	nodes: Node[],
}

interface Node {
	type: 'text' | 'file'
	text: string,
	file: string,
}

type Sidecar = {
	name: string,
	links: string[],
	tags: string[],
	text: string,
}

const getMatches = (strings: string[], pattern: RegExp): string[] => {
	return strings
		.map(str => str.match(pattern) || '')
		.filter(matches => matches)
		.flat()
	;
}

export const generateSidecars = async (vault: Vault, settings: CanvasInfoSettings) => {
	const { folders } = settings;

	if (Object.values(folders).some(x => !x)) throw new Error('please set all folders in you settings');

	const { source, destination } = folders;

	const sourceFiles = vault.getFolderByPath(source)?.children ?? [];
	const canvases: Canvas[] = await Promise.all(sourceFiles
		.filter(abstractFile => abstractFile.name.endsWith('.canvas'))
		.map(async abstractFile => {
			const file = vault.getFileByPath(abstractFile.path);
			if (!file) throw new Error();

			const content = await vault.cachedRead(file);
			return {
				name: file.name,
				nodes: JSON.parse(content).nodes
			}
		}
		)
	);

	const sidecars: Sidecar[] = canvases.map(({ name, nodes }) => {
		const cardNodes = nodes.filter(node => node.type == 'text');
		const cardTexts = cardNodes.map(node => node.text.trim());

		const tagPattern = /#[a-z_\/]+/g;
		const linkPattern = /\[\[.*?\]\]|\[.*?\]\(.*?\)/g;

		const sanitizedTexts = cardTexts.map(x => x.replace(linkPattern, ''));
		const tags = getMatches(sanitizedTexts, tagPattern);

		const cardLinks = getMatches(cardTexts, linkPattern);

		const refNodes = nodes.filter(node => node.type == 'file');
		const refPaths = refNodes.map(node => node.file);

		const refLinks = refPaths
			.map(path => path.replace(/^.*\//, ''))
			.map(name => `[[${name}]]`)
			.map(link => link.replace('.md', ''))
		;

		const rawOutgoingLinks = [...cardLinks, ...refLinks];

		// for referenced canvas files, link to sidecar files instead
		const outgoingLinks = rawOutgoingLinks.map(links => links.replace('.canvas', ''));

		// todo: instead of inserting content into a code block, properly display text by generating headers that can be referenced by other files
		const textContent = cardTexts.join('\n\n');

		return {
			name,
			tags,
			links: outgoingLinks,
			text: textContent,
		};
	});

	await clearSidecars(vault, settings);

	sidecars.forEach(sidecar => {
		const name = sidecar.name.replace('.canvas', '');
		const path = `${destination}/${name}.md`
		const content = fmtSidecar(sidecar);

		// todo: fix Obsidian's indexing error
		vault.create(path, content);
	})
}

export const clearSidecars = async (vault: Vault, settings: CanvasInfoSettings) => {
	const destDir = vault.getFolderByPath(settings.folders.destination);
	const oldFiles = destDir?.children?.filter(file => file.name.endsWith('.md')) ?? [];
	oldFiles.forEach(async file => await vault.delete(file));
}

interface AppSettings {
	userIgnoreFilters: string[]
}

export const toggleSidecars = async (vault: Vault, pluginSettings: CanvasInfoSettings): Promise<boolean> => {
	const { destination } = pluginSettings.folders;

	const settingsPath = `${vault.configDir}/app.json`;
	const appSettings = JSON.parse(await vault.adapter.read(settingsPath)) as AppSettings;

	if (!appSettings.userIgnoreFilters) appSettings.userIgnoreFilters = [];

	let enabled = false;

	if (appSettings.userIgnoreFilters.includes(destination)) {
		appSettings.userIgnoreFilters.remove(destination)
		enabled = true;
	} else {
		appSettings.userIgnoreFilters.push(destination)
	}

	await vault.adapter.write(settingsPath, JSON.stringify(appSettings));

	return enabled;
}

const fmtSidecar = (self: Sidecar) => {
	return `\
---
canvas: "[[${self.name}]]"
---
${self.text.replace(/\.canvas/g, '')}
`;
}
