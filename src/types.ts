export type NodeKind = 'script' | 'storyboard' | 'task' | 'image' | 'audio' | 'video';

export type LinkType = 'reference' | 'blocks' | 'depends-on';

export interface StoryNode {
  id: string;
  kind: NodeKind;
  title: string;
  description?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tags: string[];
  asset?: string;
  assetType?: 'file' | 'url';
  color?: string;
}

export interface StoryLink {
  id: string;
  from: string;
  to: string;
  type: LinkType;
}

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface StoryTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  linkedNodeIds: string[];
  tags: string[];
}

export interface Story {
  id: string;
  title: string;
  nodes: StoryNode[];
  links: StoryLink[];
  tasks: StoryTask[];
  createdAt: number;
  updatedAt: number;
}

export interface ViewportState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface StorySnapshot {
  story: Story;
  viewport: ViewportState;
  selectedNodeIds: string[];
}
