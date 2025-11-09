import { useMemo, useState } from 'react';
import { useStoryStore, selectCurrentStory } from '../../store/storyStore';
import { NodeKind } from '../../types';

const kindOptions: { value: NodeKind; label: string }[] = [
  { value: 'script', label: 'Script' },
  { value: 'storyboard', label: 'Storyboard' },
  { value: 'task', label: 'Task' },
  { value: 'image', label: 'Image' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
];

export function InspectorPanel() {
  const { story, selectedNodeIds, updateNode, setNodeTags } = useStoryStore((state) => ({
    story: selectCurrentStory(state),
    selectedNodeIds: state.selectedNodeIds,
    updateNode: state.updateNode,
    setNodeTags: state.setNodeTags,
  }));
  const [assetUrl, setAssetUrl] = useState('');

  const node = useMemo(() => {
    if (!story) return null;
    return story.nodes.find((item) => item.id === selectedNodeIds[0]) ?? null;
  }, [selectedNodeIds, story]);

  if (!story) {
    return (
      <section className="flex flex-col gap-2 p-4 text-sm text-slate-300">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Inspector</h2>
        <p>Select a story first.</p>
      </section>
    );
  }

  if (!node) {
    return (
      <section className="flex flex-col gap-2 p-4 text-sm text-slate-300">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Inspector</h2>
        <p>Select a node to edit its details.</p>
      </section>
    );
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    const dataUrl = await fileToDataUrl(file);
    updateNode(node.id, { asset: dataUrl, assetType: 'file' });
  };

  const handleTagsChange = (value: string) => {
    const tags = value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    setNodeTags(node.id, tags);
  };

  return (
    <section className="flex flex-col gap-3 p-4 text-sm text-slate-200">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Inspector</h2>
        <span className="text-xs text-slate-500">Quick edit</span>
      </div>
      <label className="flex flex-col gap-1 text-xs">
        <span className="uppercase tracking-wide text-slate-400">Title</span>
        <input
          value={node.title}
          onChange={(event) => updateNode(node.id, { title: event.target.value })}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="uppercase tracking-wide text-slate-400">Type</span>
        <select
          value={node.kind}
          onChange={(event) => updateNode(node.id, { kind: event.target.value as NodeKind })}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
        >
          {kindOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="uppercase tracking-wide text-slate-400">Description</span>
        <textarea
          value={node.description ?? ''}
          onChange={(event) => updateNode(node.id, { description: event.target.value })}
          rows={4}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="uppercase tracking-wide text-slate-400">Tags (comma separated)</span>
        <input
          value={node.tags.join(', ')}
          onChange={(event) => handleTagsChange(event.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
        />
      </label>
      <div className="flex flex-col gap-2 text-xs">
        <span className="uppercase tracking-wide text-slate-400">Media asset</span>
        <input
          value={assetUrl}
          onChange={(event) => setAssetUrl(event.target.value)}
          placeholder="Paste media URL"
          className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (assetUrl) {
                updateNode(node.id, { asset: assetUrl, assetType: 'url' });
                setAssetUrl('');
              }
            }}
            className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-indigo-500"
          >
            Attach URL
          </button>
          <label className="flex cursor-pointer items-center justify-center rounded border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-indigo-500">
            Upload File
            <input type="file" className="hidden" onChange={(event) => handleFileUpload(event.target.files)} />
          </label>
        </div>
      </div>
      <div className="rounded border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-400">
        <p className="font-semibold text-slate-200">Keyboard shortcuts</p>
        <ul className="mt-2 space-y-1">
          <li>⌘/Ctrl + A: Select all nodes</li>
          <li>⌘/Ctrl + D: Duplicate selection</li>
          <li>⌘/Ctrl + Z / ⇧⌘/Ctrl + Z: Undo/Redo</li>
          <li>Delete: Remove selected nodes</li>
          <li>Space + Drag: Pan canvas</li>
          <li>Scroll + Ctrl/Cmd: Zoom canvas</li>
        </ul>
      </div>
    </section>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
