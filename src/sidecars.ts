import * as fs from 'fs';
import { CanvasInfoSettings } from './main';

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

export const generateSidecars = (settings: CanvasInfoSettings, vaultPath: string) => {
	const { source, destination } = settings;

	const sourcePath = `${vaultPath}/${source}`;
	const destPath = `${vaultPath}/${destination}`;

	const sourceFileNames = fs.readdirSync(sourcePath);

	const canvases  = sourceFileNames
		.filter(name => name.endsWith('.canvas'))
		.map(name => {
			const canvas = JSON.parse(fs.readFileSync(`${sourcePath}/${name}`) as unknown as string);
			return {
				name,
				nodes: canvas.nodes as Node[]
			}
		}
		)
	;

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

	// purge previous sidecars
	fs.readdirSync(destPath).forEach(file => fs.rmSync(`${destPath}/${file}`));

	// create new sidecars
	sidecars.forEach(sidecar => {
		const name = sidecar.name.replace('.canvas', '');
		const path = `${destPath}/${name}.md`
		const content = fmtSidecar(sidecar);

		fs.writeFileSync(path, content);
	})
}
