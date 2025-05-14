import { TAbstractFile, Vault } from 'obsidian';
import { getMatches } from './util';

export interface CanvasNode {
	type: 'text' | 'file'
	text: string,
	file: string,
}

export type Canvas = {
	name: string,
	nodes: CanvasNode[],
	stat: CanvasStat,
}

export type CanvasStat = {
	ctime: number;
	mtime: number;
};

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
			const { ctime, mtime } = file.stat;

			return { name, nodes, stat: { ctime, mtime } }
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

	return [...cardLinks, ...refLinks];
}
