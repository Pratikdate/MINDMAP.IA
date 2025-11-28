
import { hierarchy, tree } from 'd3-hierarchy';
import { MindMapNode } from '../types';

// Convert flat list to hierarchy for D3 calculation
const buildHierarchy = (flatNodes: MindMapNode[]): any => {
  const nodeMap = new Map<string, any>();
  let roots: any[] = [];

  // Initialize map
  flatNodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // Build tree
  nodeMap.forEach(node => {
    if (node.parentId === null || !nodeMap.has(node.parentId)) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(node);
      }
    }
  });

  // If multiple roots, create a fake root to hold them all for layout
  if (roots.length > 1) {
      return {
          id: 'virtual-root',
          children: roots
      };
  }
  return roots[0];
};

/**
 * Calculates positions for nodes based on a tree structure.
 * Returns a new array of nodes with x/y coordinates assigned.
 * This is used for initial generation or "Auto Layout" requests.
 */
export const applyAutoLayout = (
  nodes: MindMapNode[], 
  direction: 'horizontal' | 'vertical' = 'horizontal'
): MindMapNode[] => {
  if (nodes.length === 0) return [];

  const rootData = buildHierarchy(nodes);
  if (!rootData) return nodes;

  const root = hierarchy(rootData);
  
  // D3 Tree Layout Configuration
  // Horizontal: depth controls x, breadth controls y
  const nodeHeight = 80;
  const nodeWidth = 250; 
  
  const treeLayout = tree<any>();

  if (direction === 'horizontal') {
      treeLayout.nodeSize([nodeHeight, nodeWidth]); 
  } else {
      treeLayout.nodeSize([nodeWidth, nodeHeight + 40]);
  }
  
  treeLayout(root);

  const updatedNodes: MindMapNode[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  root.descendants().forEach((d) => {
    // If it's our virtual root, skip it
    if (d.data.id === 'virtual-root') return;

    const originalNode = nodeMap.get(d.data.id);
    if (originalNode) {
        let x = d.x;
        let y = d.y;

        if (direction === 'horizontal') {
            // Swap for horizontal layout
            // D3 standard: x = breadth, y = depth
            x = d.y; 
            y = d.x;
        } 

        updatedNodes.push({
            ...originalNode,
            x: x,
            y: y,
        });
    }
  });

  return updatedNodes;
};
