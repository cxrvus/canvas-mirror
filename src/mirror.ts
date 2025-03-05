import CanvasMirror from './main';

interface Canvas {
	name: string,
	nodes: Node[],
}

interface Node {
	type: 'text' | 'file'
	text: string,
	file: string,
}

type Props = { [key: string]: string};

type Mirror = {
	name: string,
	nodes: Node[],
	text: string,
	links: string[],
	tags: string[],
	props: Props,
}

const getMatches = (strings: string[], pattern: RegExp): string[] => {
	return strings
		.map(str => str.match(pattern) || '')
		.filter(matches => matches)
		.flat()
	;
}

// TODO: refactor
export const generateMirrors = async (self: CanvasMirror) => {
	const vault = self.app.vault;
	const settings = self.settings;

	const { destination } = settings;

	if (!destination) throw new Error('please set all folders in you settings');
	if (!vault.getFolderByPath(destination)) vault.createFolder(destination);

	const ignored = (await getAppSettings(self))?.userIgnoreFilters ?? [];
	console.log(ignored);

	const sourceFiles = vault.getAllLoadedFiles();
	const canvases: Canvas[] = await Promise.all(sourceFiles
		.filter(file => !ignored.some(x => file.path.startsWith(x)))
		.filter(abstractFile => abstractFile.name.endsWith('.canvas'))
		.map(async abstractFile => {
			const file = vault.getFileByPath(abstractFile.path);
			if (!file) throw new Error();

			const content = await vault.cachedRead(file);
			const parsedContent = content ? JSON.parse(content) : {};
			const nodes = parsedContent.nodes ?? [];
			const { name } = file;

			return { name, nodes }
		})
	);

	const mirrors: Mirror[] = canvases.map(({ name, nodes }) => {
		const cardNodes = nodes.filter(node => node.type == 'text');
		const cardTexts = cardNodes.map(node => node.text.trim());

		const tagPattern = /#[a-z_\/]+/g;
		const linkPattern = /\[\[.*?\]\]|\[.*?\]\(.*?\)/g;
		const propPattern = /(\[|\()([a-z-_]+?)::(.+)(\)|\])/g;

		const sanitizedTexts = cardTexts.map(x => x.replace(linkPattern, ''));
		const tags = getMatches(sanitizedTexts, tagPattern);
		const propStrings = getMatches(cardTexts, propPattern);
		
		const props: Props = {};

		propStrings
			.map(kvp => kvp.split('::'))
			.forEach(([k, v]) => {
				v = v.trim();
				props[k.substring(1)] = v.substring(0, v.length - 1);
			})
		;

		// todo: safer link parsing, considering full paths
		const cardLinks = getMatches(cardTexts, linkPattern);

		const refNodes = nodes.filter(node => node.type == 'file');
		const refPaths = refNodes.map(node => node.file);

		const refLinks = refPaths
			.map(path => path.replace(/^.*\//, ''))
			.map(name => `[[${name}]]`)
			.map(link => link.replace('.md', ''))
		;

		const rawOutgoingLinks = [...cardLinks, ...refLinks];

		// for referenced canvas files, link to mirror files instead
		const outgoingLinks = rawOutgoingLinks.map(links => links.replace('.canvas', ''));

		const textContent = cardTexts.join('\n\n');

		// idea: generate color tags

		return {
			name,
			nodes,
			text: textContent,
			links: outgoingLinks,
			tags,
			props,
		};
	});

	await clearMirrors(self);

	mirrors.forEach(mirror => {
		const name = mirror.name.replace('.canvas', '');
		const path = `${destination}/${name}.md`
		const content = fmtMirror(mirror);

		// idea: only create mirror files where necessary (source has been modified)
		// idea: fix Obsidian's indexing error
		vault.create(path, content);
	})
}

export const clearMirrors = async (self: CanvasMirror) => {
	const vault = self.app.vault;
	const settings = self.settings;

	const destDir = vault.getFolderByPath(settings.destination);
	const oldFiles = destDir?.children?.filter(file => file.name.endsWith('.md')) ?? [];
	oldFiles.forEach(async file => await vault.delete(file));
}

interface AppSettings {
	userIgnoreFilters: string[]
}

const getAppSettings = async (self: CanvasMirror) => {
	const { vault } = self.app;
	const settingsPath = `${vault.configDir}/app.json`;
	return JSON.parse(await vault.adapter.read(settingsPath)) as AppSettings;
}

const setAppSettings = async (self: CanvasMirror, appSettings: AppSettings) => {
	const settingsPath = `${self.app.vault.configDir}/app.json`;
	await self.app.vault.adapter.write(settingsPath, JSON.stringify(appSettings));
}

export const toggleMirrors = async (self: CanvasMirror): Promise<boolean> => {
	const { destination } = self.settings;
	const appSettings = await getAppSettings(self);

	if (!appSettings.userIgnoreFilters) appSettings.userIgnoreFilters = [];

	let enabled = false;

	if (appSettings.userIgnoreFilters.includes(destination)) {
		appSettings.userIgnoreFilters.remove(destination)
		enabled = true;
	} else {
		appSettings.userIgnoreFilters.push(destination)
	}

	await(setAppSettings(self, appSettings));

	return enabled;
}

const bullet = (strings: string[]) => {
	return strings.length ? `- ${strings.join('\n- ')}` : '*none*';
}

// todo: new mirror format
// idea: implement two-way conversion

const fmtMirror = (self: Mirror) => {
	self.props.canvas = `[[${self.name}]]`;

	// idea: infer actual value types
	const kvpStrings = Object.entries(self.props).map(([k, v]) => `${k}: "${v}"`);
	const props = `---\n${kvpStrings.join('\n')}\n---\n\n`;

	if (!self.nodes?.length) return props + '*empty*';

	const refs = bullet([self.tags, self.links].flat());
	const text = self.text.replace(/\.canvas/g, '');

	// idea: use custom template (parse template props, interpolate template text)
return `\
${props}
#mirror

# References

${refs}

# Text

${text}
`;

}
