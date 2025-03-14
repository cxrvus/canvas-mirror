import { TAbstractFile, Vault } from 'obsidian';
import { getMatches } from './util';

export interface CanvasNode {
	type: 'text' | 'file'
	text: string,
	file: string,
}

export interface Canvas {
	name: string,
	nodes: CanvasNode[],
}

export type Props = { [key: string]: string};

export const getCanvases = async (vault: Vault, sourceFiles: TAbstractFile[], ignored: string[]): Promise<Canvas[]> => { 
	return await Promise.all(sourceFiles
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
}

const PROP_PTN = /(\[|\()([a-z-_]+?)::(.+)(\)|\])/g;
export const getProps = (nodeTexts: string[]) => {
	const propStrings = getMatches(nodeTexts, PROP_PTN);
	
	const props: Props = {};

	propStrings
		.map(kvp => kvp.split('::'))
		.forEach(([k, v]) => {
			v = v.trim();
			props[k.substring(1)] = v.substring(0, v.length - 1);
		})
	;

	return props;
}

// todo: make this private
export const LINK_PTN = /\[\[.*?\]\]|\[.*?\]\(.*?\)/g;

export const getOutlinks = (nodes: CanvasNode[], nodeTexts: string[]) => {
	// idea: safer link parsing, considering full paths
	const cardLinks = getMatches(nodeTexts, LINK_PTN);

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

	return outgoingLinks;
}
