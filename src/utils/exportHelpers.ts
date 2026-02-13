import { Node } from 'reactflow';
import { NodeType } from '../types/core';

/**
 * Get child nodes for a given parent container node.
 */
export const getChildNodes = (parentId: string, nodes: Node[]): Node[] =>
  nodes.filter(n => n.parentId === parentId);

/**
 * Get all nodes of a specific type.
 */
export const getNodesByType = (nodes: Node[], type: NodeType): Node[] =>
  nodes.filter(n => n.data.type === type);

/**
 * Convert a name string to a URL/file-safe slug.
 * Lowercases, replaces spaces with hyphens, strips non-alphanumeric characters.
 */
export const slugify = (name: string): string =>
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
