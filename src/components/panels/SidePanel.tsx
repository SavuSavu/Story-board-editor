import { useMemo, useState } from 'react';
import { useStoryStore, selectCurrentStory } from '../../store/storyStore';
import { NodeKind } from '../../types';

const NODE_TYPES: { kind: NodeKind; label: string }[] = [
  { kind: 'script', label: 'Script' },
  { kind: 'storyboard', label: 'Storyboard' },
  { kind: 'task', label: 'Task' },
  { kind: 'image', label: 'Image' },
  { kind: 'audio', label: 'Audio' },
  { kind: 'video', label: 'Video' },
];

export function SidePanel() {
  const { story, addNode, setSelectedNodeIds } = useStoryStore((state) => ({
    story: selectCurrentStory(state),
    addNode: state.addNode,
    setSelectedNodeIds: state.setSelectedNodeIds,
  }));
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<NodeKind | 'all'>('all');

  const filteredNodes = useMemo(() => {
    if (!story) return [];
    return story.nodes.filter((node) => {
      const matchesSearch = node.title.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || node.kind === typeFilter;
      const matchesTag = !tagFilter || node.tags.some((tag) => tag.toLowerCase().includes(tagFilter.toLowerCase()));
      return matchesSearch && matchesType && matchesTag;
    });
  }, [search, story, tagFilter, typeFilter]);

  if (!story) {
    return (
      <aside className="w-72 border-r border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-300">
        <p>Select or create a story.</p>
      </aside>
    );
  }

  return (
    <aside className="flex w-72 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-900/40">
      <div className="flex flex-col gap-3 border-b border-slate-800 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Nodes</h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {NODE_TYPES.map((entry) => (
            <button
              key={entry.kind}
              onClick={() => addNode(entry.kind)}
              className="rounded border border-slate-700 bg-slate-800/80 px-2 py-1 text-slate-200 hover:border-indigo-500 hover:text-indigo-300"
            >
              + {entry.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search nodes"
          className="rounded border border-slate-700 bg-slate-800/80 px-3 py-1 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
        />
        <input
          value={tagFilter}
          onChange={(event) => setTagFilter(event.target.value)}
          placeholder="Filter by tag"
          className="rounded border border-slate-700 bg-slate-800/80 px-3 py-1 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
        />
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as NodeKind | 'all')}
          className="rounded border border-slate-700 bg-slate-800/80 px-3 py-1 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All types</option>
          {NODE_TYPES.map((entry) => (
            <option key={entry.kind} value={entry.kind}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {filteredNodes.map((node) => (
            <li key={node.id}>
              <button
                onClick={() => setSelectedNodeIds([node.id])}
                className="flex w-full flex-col items-start gap-1 rounded border border-slate-800 bg-slate-900/60 px-3 py-2 text-left text-xs text-slate-200 hover:border-indigo-400 hover:bg-slate-900"
              >
                <span className="text-sm font-semibold text-slate-100">{node.title}</span>
                <span className="uppercase tracking-wide text-slate-400">{node.kind}</span>
                {node.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {node.tags.map((tag) => (
                      <span key={tag} className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
