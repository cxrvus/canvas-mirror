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
	text: string,
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

	// todo: include tags

	const sidecars: Sidecar[] = canvases.map(({ name, nodes }) => {
		const cardNodes = nodes.filter(node => node.type == 'text');
		const cardTexts = cardNodes.map(node => node.text);

		const linkPattern = /\[\[.*?\]\]|\(.*?\)\[.*?\]/g;
		const cardLinks = cardTexts
			.map(text => text.match(linkPattern) || '')
			.filter(matches => matches)
			.flat()
		;

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

		const textContent = cardTexts.join('\n\n\n');

		return {
			name,
			links: outgoingLinks,
			text: textContent,
		};
	});

	await clearSidecars(vault, settings);

	sidecars.forEach(sidecar => {
		const name = sidecar.name.replace('.canvas', '');
		const path = `${destination}/${name}.md`
		const content = fmtSidecar(sidecar);

		vault.create(path, content);
	})
}

export const clearSidecars = async (vault: Vault, settings: CanvasInfoSettings) => {
	// idea: prefix with timestamp and move to archive instead of deleting
	const destDir = vault.getFolderByPath(settings.folders.destination);
	const oldFiles = destDir?.children?.filter(file => file.name.endsWith('.md')) ?? [];
	oldFiles.forEach(async file => await vault.delete(file));
}

const fmtSidecar = (self: Sidecar) => [
		'---',
		`canvas: "[[${self.name}]]"`,
		`timestamp: "${new Date().toISOString()}"`,
		'---',
		'## References',
		self.links.map(link => '- ' + link).join('\n'),
		'## Text',
		'```',
		self.text,
		'```',
	].join('\n\n') + '\n'
;
