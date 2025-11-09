import { useEffect, useMemo, useState } from 'react';
import { StoryCanvas } from './components/canvas/StoryCanvas';
import { SidePanel } from './components/panels/SidePanel';
import { InspectorPanel } from './components/panels/InspectorPanel';
import { TaskBoard } from './components/panels/TaskBoard';
import { useStoryStore } from './store/storyStore';
import { useAutosave } from './hooks/useAutosave';
import { loadStories, exportStoriesAsJson, importStoriesFromJson } from './utils/indexedDB';
import { Story } from './types';

export default function App() {
  const {
    storyOrder,
    currentStoryId,
    stories,
    createStory,
    selectStory,
    setStoryTitle,
    hydrate,
    undo,
    redo,
    viewport,
    setViewport,
  } = useStoryStore((state) => ({
    storyOrder: state.storyOrder,
    currentStoryId: state.currentStoryId,
    stories: state.stories,
    createStory: state.createStory,
    selectStory: state.selectStory,
    setStoryTitle: state.setStoryTitle,
    hydrate: state.hydrate,
    undo: state.undo,
    redo: state.redo,
    viewport: state.viewport,
    setViewport: state.setViewport,
  }));
  const [isLoading, setLoading] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);

  useAutosave();

  useEffect(() => {
    let isMounted = true;
    loadStories()
      .then((payload) => {
        if (!isMounted) return;
        if (payload && payload.stories.length) {
          hydrate(payload.stories, payload.order);
        } else {
          const id = createStory('New Story');
          selectStory(id);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [createStory, hydrate, selectStory]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [redo, undo]);

  const currentStory: Story | null = useMemo(() => {
    if (!currentStoryId) return null;
    return stories[currentStoryId] ?? null;
  }, [currentStoryId, stories]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading stories...
      </div>
    );
  }

  const handleExport = () => {
    exportStoriesAsJson(Object.values(stories), storyOrder);
  };

  const handleImport = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    try {
      const payload = await importStoriesFromJson(files[0]);
      hydrate(payload.stories, payload.order);
      setImportError(null);
    } catch (error) {
      setImportError((error as Error).message);
    }
  };

  const handleZoom = (delta: number) => {
    const next = Math.min(2.5, Math.max(0.2, viewport.scale + delta));
    setViewport({ scale: next });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950">
      <header className="flex items-center gap-4 border-b border-slate-800 bg-slate-900/70 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span className="text-lg font-semibold text-slate-100">Story Builder</span>
          <span className="text-xs text-slate-500">Autosave · IndexedDB</span>
        </div>
        <select
          value={currentStoryId ?? ''}
          onChange={(event) => selectStory(event.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100"
        >
          {storyOrder.map((id) => (
            <option key={id} value={id}>
              {stories[id]?.title ?? 'Untitled'}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            const title = prompt('Story title');
            if (title) {
              const newId = createStory(title);
              selectStory(newId);
            }
          }}
          className="rounded bg-indigo-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          New Story
        </button>
        {currentStory && (
          <input
            className="w-60 rounded border border-transparent bg-slate-800 px-3 py-1 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
            value={currentStory.title}
            onChange={(event) => setStoryTitle(currentStory.id, event.target.value)}
          />
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={undo}
            className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Undo
          </button>
          <button
            onClick={redo}
            className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Redo
          </button>
          <div className="flex items-center gap-2 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">
            <span>Zoom</span>
            <button onClick={() => handleZoom(-0.1)} className="rounded bg-slate-800 px-2">-</button>
            <span className="w-12 text-center">{Math.round(viewport.scale * 100)}%</span>
            <button onClick={() => handleZoom(0.1)} className="rounded bg-slate-800 px-2">+</button>
          </div>
          <button
            onClick={handleExport}
            className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Export JSON
          </button>
          <label className="cursor-pointer rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800">
            Import
            <input type="file" accept="application/json" className="hidden" onChange={(event) => handleImport(event.target.files)} />
          </label>
        </div>
      </header>
      {importError && (
        <div className="border-b border-red-500 bg-red-900/40 px-6 py-2 text-sm text-red-200">{importError}</div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <SidePanel />
        <main className="relative flex flex-1 flex-col overflow-hidden">
          <StoryCanvas />
        </main>
        <aside className="flex w-96 flex-shrink-0 flex-col border-l border-slate-800 bg-slate-900/40">
          <InspectorPanel />
          <div className="h-px w-full border-t border-slate-800" />
          <TaskBoard />
        </aside>
      </div>
    </div>
  );
}
