import { create } from 'zustand';
import {
  LinkType,
  Story,
  StoryLink,
  StoryNode,
  StorySnapshot,
  StoryTask,
  TaskStatus,
  ViewportState,
} from '../types';
import { createId } from '../utils/id';

const GRID_SIZE = 24;
const MAX_HISTORY = 50;

type StoryStoreState = {
  stories: Record<string, Story>;
  storyOrder: string[];
  currentStoryId: string | null;
  viewport: ViewportState;
  selectedNodeIds: string[];
  linkingFrom: string | null;
  history: StorySnapshot[];
  future: StorySnapshot[];
  isHydrated: boolean;
  isLinking: boolean;
  hydrate: (stories: Story[], order: string[]) => void;
  createStory: (title: string) => string;
  selectStory: (id: string) => void;
  setStoryTitle: (id: string, title: string) => void;
  setViewport: (viewport: Partial<ViewportState>) => void;
  addNode: (kind: StoryNode['kind'], position?: Partial<Pick<StoryNode, 'x' | 'y'>>) => string | null;
  updateNode: (id: string, updates: Partial<Omit<StoryNode, 'id'>>) => void;
  moveNodes: (ids: string[], dx: number, dy: number, snap?: boolean) => void;
  resizeNode: (id: string, width: number, height: number) => void;
  removeNodes: (ids: string[]) => void;
  duplicateNodes: (ids: string[]) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  toggleNodeSelection: (id: string, multi?: boolean) => void;
  addLink: (from: string, to: string, type: LinkType) => void;
  updateLinkType: (id: string, type: LinkType) => void;
  removeLink: (id: string) => void;
  startLinking: (id: string) => void;
  finishLinking: (targetId: string, type: LinkType) => void;
  cancelLinking: () => void;
  addTask: (title: string) => void;
  updateTask: (id: string, updates: Partial<Omit<StoryTask, 'id'>>) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  linkTaskToNode: (taskId: string, nodeId: string) => void;
  unlinkTaskFromNode: (taskId: string, nodeId: string) => void;
  setNodeTags: (id: string, tags: string[]) => void;
  setTaskTags: (id: string, tags: string[]) => void;
  importStories: (stories: Story[], order: string[]) => void;
  clearSelection: () => void;
  undo: () => void;
  redo: () => void;
};

const defaultViewport: ViewportState = { scale: 1, offsetX: 0, offsetY: 0 };

function cloneStory(story: Story): Story {
  return {
    ...story,
    nodes: story.nodes.map((node) => ({ ...node, tags: [...node.tags] })),
    links: story.links.map((link) => ({ ...link })),
    tasks: story.tasks.map((task) => ({
      ...task,
      linkedNodeIds: [...task.linkedNodeIds],
      tags: [...task.tags],
    })),
  };
}

function pushHistory(state: StoryStoreState): StorySnapshot[] {
  if (!state.currentStoryId) return state.history;
  const story = state.stories[state.currentStoryId];
  if (!story) return state.history;
  const snapshot: StorySnapshot = {
    story: cloneStory(story),
    viewport: { ...state.viewport },
    selectedNodeIds: [...state.selectedNodeIds],
  };
  const history = [...state.history, snapshot];
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
  return history;
}

function updateStory(story: Story, updater: (draft: Story) => void): Story {
  const draft: Story = {
    ...story,
    nodes: story.nodes.map((node) => ({ ...node, tags: [...node.tags] })),
    links: story.links.map((link) => ({ ...link })),
    tasks: story.tasks.map((task) => ({ ...task, linkedNodeIds: [...task.linkedNodeIds], tags: [...task.tags] })),
  };
  updater(draft);
  draft.updatedAt = Date.now();
  return draft;
}

export const useStoryStore = create<StoryStoreState>()((set, get) => ({
  stories: {},
  storyOrder: [],
  currentStoryId: null,
  viewport: defaultViewport,
  selectedNodeIds: [],
  linkingFrom: null,
  history: [],
  future: [],
  isHydrated: false,
  isLinking: false,
  hydrate: (stories, order) => {
    set(() => {
      const nextStories = stories.reduce<Record<string, Story>>((acc, story) => {
        acc[story.id] = story;
        return acc;
      }, {});
      return {
        stories: nextStories,
        storyOrder: order.length ? order : stories.map((story) => story.id),
        currentStoryId: order[0] ?? stories[0]?.id ?? null,
        viewport: defaultViewport,
        selectedNodeIds: [],
        history: [],
        future: [],
        isHydrated: true,
      };
    });
  },
  createStory: (title) => {
    const id = createId();
    const now = Date.now();
    const story: Story = {
      id,
      title,
      nodes: [],
      links: [],
      tasks: [],
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      stories: { ...state.stories, [id]: story },
      storyOrder: [...state.storyOrder, id],
      currentStoryId: id,
      viewport: defaultViewport,
      selectedNodeIds: [],
      history: [],
      future: [],
    }));
    return id;
  },
  selectStory: (id) => {
    set((state) => ({
      currentStoryId: id,
      viewport: defaultViewport,
      selectedNodeIds: [],
      linkingFrom: null,
    }));
  },
  setStoryTitle: (id, title) => {
    set((state) => {
      const story = state.stories[id];
      if (!story) return state;
      const history = id === state.currentStoryId ? pushHistory(state) : state.history;
      const updated = updateStory(story, (draft) => {
        draft.title = title;
      });
      return {
        ...state,
        stories: { ...state.stories, [id]: updated },
        history,
        future: [],
      };
    });
  },
  setViewport: (viewport) => {
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    }));
  },
  addNode: (kind, position) => {
    const storyId = get().currentStoryId;
    if (!storyId) return null;
    const id = createId();
    set((state) => {
      const story = state.stories[storyId];
      if (!story) return state;
      const history = pushHistory(state);
      const now = Date.now();
      const newNode: StoryNode = {
        id,
        kind,
        title: `${kind.charAt(0).toUpperCase()}${kind.slice(1)} ${story.nodes.length + 1}`,
        description: '',
        x: position?.x ?? 100,
        y: position?.y ?? 100,
        width: 220,
        height: 140,
        tags: [],
      };
      const updated = updateStory(story, (draft) => {
        draft.nodes.push(newNode);
        draft.updatedAt = now;
      });
      return {
        ...state,
        stories: { ...state.stories, [storyId]: updated },
        selectedNodeIds: [id],
        history,
        future: [],
      };
    });
    return id;
  },
  updateNode: (id, updates) => {
    const storyId = get().currentStoryId;
    if (!storyId) return;
    set((state) => {
      const story = state.stories[storyId];
      if (!story) return state;
      const nodeIndex = story.nodes.findIndex((node) => node.id === id);
      if (nodeIndex === -1) return state;
      const history = pushHistory(state);
      const updated = updateStory(story, (draft) => {
        draft.nodes[nodeIndex] = { ...draft.nodes[nodeIndex], ...updates };
      });
      return {
        ...state,
        stories: { ...state.stories, [storyId]: updated },
        history,
        future: [],
      };
    });
  },
  moveNodes: (ids, dx, dy, snap = true) => {
    const storyId = get().currentStoryId;
    if (!storyId) return;
    if (!dx && !dy) return;
    set((state) => {
      const story = state.stories[storyId];
      if (!story) return state;
      const history = pushHistory(state);
      const updated = updateStory(story, (draft) => {
        draft.nodes = draft.nodes.map((node) => {
          if (!ids.includes(node.id)) return node;
          const nextX = node.x + dx;
          const nextY = node.y + dy;
          return {
            ...node,
            x: snap ? Math.round(nextX / GRID_SIZE) * GRID_SIZE : nextX,
            y: snap ? Math.round(nextY / GRID_SIZE) * GRID_SIZE : nextY,
          };
        });
      });
      return {
        ...state,
        stories: { ...state.stories, [storyId]: updated },
        history,
        future: [],
      };
    });
  },
  resizeNode: (id, width, height) => {
    const storyId = get().currentStoryId;
    if (!storyId) return;
    set((state) => {
      const story = state.stories[storyId];
      if (!story) return state;
      const index = story.nodes.findIndex((node) => node.id === id);
      if (index === -1) return state;
      const history = pushHistory(state);
      const updated = updateStory(story, (draft) => {
        draft.nodes[index] = {
          ...draft.nodes[index],
          width: Math.max(120, width),
          height: Math.max(80, height),
        };
      });
      return {
        ...state,
        stories: { ...state.stories, [storyId]: updated },
        history,
        future: [],
      };
    });
  },
  removeNodes: (ids) => {
    const storyId = get().currentStoryId;
    if (!storyId) return;
    set((state) => {
      const story = state.stories[storyId];
      if (!story) return state;
      if (!ids.length) return state;
      const history = pushHistory(state);
      const updated = updateStory(story, (draft) => {
        draft.nodes = draft.nodes.filter((node) => !ids.includes(node.id));
        draft.links = draft.links.filter((link) => !ids.includes(link.from) && !ids.includes(link.to));
        draft.tasks = draft.tasks.map((task) => ({
          ...task,
          linkedNodeIds: task.linkedNodeIds.filter((nodeId) => !ids.includes(nodeId)),
        }));
      });
      return {
        ...state,
        stories: { ...state.stories, [storyId]: updated },
        selectedNodeIds: [],
        history,
        future: [],
      };
    });
  },
  duplicateNodes: (ids) => {
    const storyId = get().currentStoryId;
    if (!storyId) return;
    set((state) => {
      const story = state.stories[storyId];
      if (!story) return state;
      const selected = story.nodes.filter((node) => ids.includes(node.id));
      if (!selected.length) return state;
      const history = pushHistory(state);
      const clones: StoryNode[] = selected.map((node) => ({
        ...node,
        id: createId(),
        x: node.x + GRID_SIZE,
        y: node.y + GRID_SIZE,
        title: `${node.title} Copy`,
      }));
      const updated = updateStory(story, (draft) => {
        draft.nodes.push(...clones);
      });
      return {
        ...state,
        stories: { ...state.stories, [storyId]: updated },
        selectedNodeIds: clones.map((node) => node.id),
        history,
        future: [],
      };
    });
  },
  setSelectedNodeIds: (ids) => {
    set({ selectedNodeIds: ids });
  },
  toggleNodeSelection: (id, multi = false) => {
    set((state) => {
      const exists = state.selectedNodeIds.includes(id);
      if (multi) {
        return {
          selectedNodeIds: exists
            ? state.selectedNodeIds.filter((nodeId) => nodeId !== id)
            : [...state.selectedNodeIds, id],
        };
      }
      return { selectedNodeIds: exists ? [] : [id] };
    });
  },
  addLink: (from, to, type) => {
    if (from === to) return;
    const storyId = get().currentStoryId;
    if (!storyId) return;
    set((state) => {
      const story = state.stories[storyId];
      if (!story) return state;
      const exists = story.links.find((link) => link.from === from && link.to === to);
      if (exists) return state;
      const history = pushHistory(state);
      const newLink: StoryLink = { id: createId(), from, to, type };
      const updated = updateStory(story, (draft) => {
        draft.links.push(newLink);
      });
      return {
        ...state,
        stories: { ...state.stories, [storyId]: updated },
        history,
        future: [],
      };
    });
  },
  updateLinkType: (id, type) => {
    const storyId = get().currentStoryId;
    if (!storyId) return;
    set((state) => {
      const story = state.stories[storyId];
      if (!story) return state;
      const linkIndex = story.links.findIndex((link) => link.id === id);
      if (linkIndex === -1) return state;
      const history = pushHistory(state);
      const updated = updateStory(story, (draft) => {
        draft.links[linkIndex] = { ...draft.links[linkIndex], type };
      });
      return {
        ...state,
        stories: { ...state.stories, [storyId]: updated },
        history,
        future: [],
      };
    });
  },
  removeLink: (id) => {
    const storyId = get().currentStoryId;
    if (!storyId) return;
    set((state) => {
      const story = state.stories[storyId];
      if (!story) return state;
      const history = pushHistory(state);
      const updated = updateStory(story, (draft) => {
        draft.links = draft.links.filter((link) => link.id !== id);
      });
      return {
        ...state,
        stories: { ...state.stories, [storyId]: updated },
        history,
        future: [],
      };
    });
  },
  startLinking: (id) => {
    set({ linkingFrom: id, isLinking: true });
  },
  finishLinking: (targetId, type) => {
    const { linkingFrom } = get();
    if (!linkingFrom) return;
    get().addLink(linkingFrom, targetId, type);
    set({ linkingFrom: null, isLinking: false });
  },
  cancelLinking: () => {
    set({ linkingFrom: null, isLinking: false });
  },
  addTask: (title) => {
    const storyId = get().currentStoryId;
    if (!storyId) return;
    set((state) => {
      const story = state.stories[storyId];
      if (!story) return state;
      const history = pushHistory(state);
      const task: StoryTask = {
        id: createId(),
        title,
        description: '',
        status: 'todo',
        linkedNodeIds: [],
        tags: [],
      };
      const updated = updateStory(story, (draft) => {
        draft.tasks.push(task);
      });
      return {
        ...state,
        stories: { ...state.stories, [storyId]: updated },
        history,
        future: [],
      };
    });
  },
  updateTask: (id, updates) => {
    const storyId = get().currentStoryId;
    if (!storyId) return;
    set((state) => {
      const story = state.stories[storyId];
      if (!story) return state;
      const taskIndex = story.tasks.findIndex((task) => task.id === id);
      if (taskIndex === -1) return state;
      const history = pushHistory(state);
      const updated = updateStory(story, (draft) => {
        draft.tasks[taskIndex] = {
          ...draft.tasks[taskIndex],
          ...updates,
        };
      });
      return {
        ...state,
        stories: { ...state.stories, [storyId]: updated },
        history,
        future: [],
      };
    });
  },
  moveTask: (id, status) => {
    get().updateTask(id, { status });
  },
  linkTaskToNode: (taskId, nodeId) => {
    const storyId = get().currentStoryId;
    if (!storyId) return;
    set((state) => {
      const story = state.stories[storyId];
      if (!story) return state;
      const taskIndex = story.tasks.findIndex((task) => task.id === taskId);
      if (taskIndex === -1) return state;
      if (story.tasks[taskIndex].linkedNodeIds.includes(nodeId)) return state;
      const history = pushHistory(state);
      const updated = updateStory(story, (draft) => {
        draft.tasks[taskIndex] = {
          ...draft.tasks[taskIndex],
          linkedNodeIds: [...draft.tasks[taskIndex].linkedNodeIds, nodeId],
        };
      });
      return {
        ...state,
        stories: { ...state.stories, [storyId]: updated },
        history,
        future: [],
      };
    });
  },
  unlinkTaskFromNode: (taskId, nodeId) => {
    const storyId = get().currentStoryId;
    if (!storyId) return;
    set((state) => {
      const story = state.stories[storyId];
      if (!story) return state;
      const taskIndex = story.tasks.findIndex((task) => task.id === taskId);
      if (taskIndex === -1) return state;
      const history = pushHistory(state);
      const updated = updateStory(story, (draft) => {
        draft.tasks[taskIndex] = {
          ...draft.tasks[taskIndex],
          linkedNodeIds: draft.tasks[taskIndex].linkedNodeIds.filter((id) => id !== nodeId),
        };
      });
      return {
        ...state,
        stories: { ...state.stories, [storyId]: updated },
        history,
        future: [],
      };
    });
  },
  setNodeTags: (id, tags) => {
    get().updateNode(id, { tags });
  },
  setTaskTags: (id, tags) => {
    get().updateTask(id, { tags });
  },
  importStories: (stories, order) => {
    set(() => {
      const nextStories = stories.reduce<Record<string, Story>>((acc, story) => {
        acc[story.id] = story;
        return acc;
      }, {});
      const resolvedOrder = order.length ? order : stories.map((story) => story.id);
      return {
        stories: nextStories,
        storyOrder: resolvedOrder,
        currentStoryId: resolvedOrder[0] ?? stories[0]?.id ?? null,
        viewport: defaultViewport,
        selectedNodeIds: [],
        history: [],
        future: [],
      };
    });
  },
  clearSelection: () => set({ selectedNodeIds: [] }),
  undo: () => {
    set((state) => {
      if (!state.currentStoryId) return state;
      if (!state.history.length) return state;
      const snapshot = state.history[state.history.length - 1];
      const currentStory = state.stories[state.currentStoryId];
      if (!currentStory) return state;
      const futureSnapshot: StorySnapshot = {
        story: cloneStory(currentStory),
        viewport: { ...state.viewport },
        selectedNodeIds: [...state.selectedNodeIds],
      };
      return {
        ...state,
        stories: { ...state.stories, [snapshot.story.id]: cloneStory(snapshot.story) },
        history: state.history.slice(0, -1),
        future: [...state.future, futureSnapshot],
        viewport: snapshot.viewport,
        selectedNodeIds: snapshot.selectedNodeIds,
      };
    });
  },
  redo: () => {
    set((state) => {
      if (!state.currentStoryId) return state;
      if (!state.future.length) return state;
      const snapshot = state.future[state.future.length - 1];
      const currentStory = state.stories[state.currentStoryId];
      if (!currentStory) return state;
      const historySnapshot: StorySnapshot = {
        story: cloneStory(currentStory),
        viewport: { ...state.viewport },
        selectedNodeIds: [...state.selectedNodeIds],
      };
      return {
        ...state,
        stories: { ...state.stories, [snapshot.story.id]: cloneStory(snapshot.story) },
        history: [...state.history, historySnapshot],
        future: state.future.slice(0, -1),
        viewport: snapshot.viewport,
        selectedNodeIds: snapshot.selectedNodeIds,
      };
    });
  },
}));

export const selectCurrentStory = (state: StoryStoreState): Story | null => {
  if (!state.currentStoryId) return null;
  return state.stories[state.currentStoryId] ?? null;
};
