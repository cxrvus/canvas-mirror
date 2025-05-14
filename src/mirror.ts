import { getCanvases, CanvasNode, getProps, Props, getOutlinks, LINK_PTN, CanvasStat } from './canvas';
import CanvasMirror from './main';
import { getAppSettings, setAppSettings, bullet, getMatches } from './util';

const MIRROR_TAG = "#mirror";

type Mirror = {
	name: string,
	nodes: CanvasNode[],
	stat: CanvasStat,
	links: string[],
	text: string, 		// todo: remove
	tags: string[],		// todo: remove
	props: Props,
}

export const generateMirrors = async (self: CanvasMirror) => {
	const vault = self.app.vault;
	const settings = self.settings;

	const { destination } = settings;

	if (!destination) throw new Error('please set all folders in you settings');
	if (!vault.getFolderByPath(destination)) vault.createFolder(destination);

	const ignored = (await getAppSettings(self))?.userIgnoreFilters ?? [];
	console.log(ignored);

	const sourceFiles = vault.getAllLoadedFiles();

	const canvases = await getCanvases(vault, sourceFiles, ignored);

	const mirrors: Mirror[] = canvases.map(({ name, nodes, stat }) => {
		const nodeTexts = nodes
			.filter(node => node.type == 'text')
			.map(node => node.text.trim())
		;

		// todo: remove
		const tagPattern = /#[a-z_\/]+/g;
		const sanitizedTexts = nodeTexts.map(x => x.replace(LINK_PTN, ''));

		const links = getOutlinks(nodes, nodeTexts);
		const text = nodeTexts.join('\n\n');
		const tags = getMatches(sanitizedTexts, tagPattern);
		const props = getProps(nodeTexts);

		return {
			name,
			nodes,
			stat,
			links,
			text,
			tags,
			props,
		};
	});

	await clearMirrors(self);

	mirrors.forEach(mirror => {
		// plus sign prefix to put mirror files at the top of backlinks lists
		const name = '+ ' + mirror.name.replace('.canvas', '');
		const path = `${destination}/${name}.md`
		const content = fmtMirror(mirror);

		// todo: only create mirror files where necessary (source has been modified)
		vault.create(path, content, mirror.stat);
	})
}

export const clearMirrors = async (self: CanvasMirror) => {
	const vault = self.app.vault;
	const settings = self.settings;

	const destDir = vault.getFolderByPath(settings.destination);
	const oldFiles = destDir?.children?.filter(file => file.name.endsWith('.md')) ?? [];
	oldFiles.forEach(async file => await vault.delete(file));
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

// todo: new mirror format
// todo: implement two-way conversion

const fmtMirror = (self: Mirror) => {
	self.props.canvas = `[[${self.name}]]`;

	// idea: infer actual value types
	const kvpStrings = Object.entries(self.props).map(([k, v]) => `${k}: "${v}"`);
	const props = `---\n${kvpStrings.join('\n')}\n---\n\n`;

	if (!self.nodes?.length) return props + MIRROR_TAG + '\n\n*empty*';

	const refs = bullet([self.tags, self.links].flat());
	const text = self.text.replace(/\.canvas/g, '');
return `\
${props}
${MIRROR_TAG}

# References

${refs}

# Text

${text}
`;

}
