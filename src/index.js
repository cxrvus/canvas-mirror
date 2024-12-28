import * as fs from 'fs';

const vaultPath = process.argv[2];
if (!vaultPath) throw new Error('must provide vault path');

const configFile = fs.readFileSync('./config.json', 'utf-8');
const config = JSON.parse(configFile);

const { source, destination, prefix } = config;
const sourcePath = `${vaultPath}/${source}`;
const destPath = `${vaultPath}/${destination}`;

const sourceFileNames = fs.readdirSync(sourcePath);

const canvases  = sourceFileNames
	.filter(name => name.endsWith('.canvas'))
	.map(name => (
		{
			name,
			nodes: JSON.parse(fs.readFileSync(`${sourcePath}/${name}`)).nodes,
		})
	)
;

const sidecars = canvases.map(({ name, nodes }) => {
	const sidecar = [];

	const cardNodes = nodes.filter(node => node.type == 'text');
	const cardTexts = cardNodes.map(node => node.text);

	const refNodes = nodes.filter(node => node.type == 'file');
	const refPaths = refNodes.map(node => node.file);

	const refLinks = refPaths.map(path => `[[${path}]]`);

	const linkPattern = /\[\[.*?\]\]|\(.*?\)\[.*?\]/g;

	const cardLinks = cardTexts
		.map(text => text.match(linkPattern))
		.filter(matches => matches)
		.flat()
	;

	const rawOutgoingLinks = [...cardLinks, ...refLinks];

	// for referenced canvas files, link to sidecar files instead - also remove .md extensions
	const outgoingLinks = rawOutgoingLinks
		.map(link =>
			link.includes('.canvas')
				? link
					.replace(source + '/', '')
					.replace('.canvas', '')
				: link
		)
		.map(link => link.replace('.md', ''))
	;

	const textContent = cardTexts.join('\n\n\n');

	return {
		name,
		links: outgoingLinks,
		text: textContent,
	};
});

const fmtSidecar = self => [
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

sidecars.forEach(sidecar => {
	const name = sidecar.name.replace('.canvas', '');
	const path = `${destPath}/${name}.md`
	const content = fmtSidecar(sidecar);

	fs.writeFileSync(path, content);
})

// todo: timestamp prop
// todo: clear previous sidecars from specified folder
