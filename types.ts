
export type LayoutDirection = 'horizontal' | 'vertical';

export interface NodeStyle {
  backgroundColor?: string;
  textColor?: string;
  shape?: 'rect' | 'rounded' | 'pill';
  fontSize?: 'sm' | 'md' | 'lg';
  borderColor?: string;
}

export interface MindMapNode {
  id: string;
  parentId: string | null;
  label: string;
  x: number;
  y: number;
  description?: string;
  children?: MindMapNode[]; // For recursive structures if needed, though we primarily use flat lists
  style?: NodeStyle;
}

export interface SecondaryLink {
    sourceId: string;
    targetId: string;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  ERROR = 'ERROR',
}

export interface MindMapData {
  version: string;
  nodes: MindMapNode[];
  secondaryLinks?: SecondaryLink[];
}
