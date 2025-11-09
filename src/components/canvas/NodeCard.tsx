import { useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import clsx from 'clsx';
import { StoryNode } from '../../types';
import { useStoryStore } from '../../store/storyStore';

const nodeColors: Record<StoryNode['kind'], string> = {
  script: 'from-purple-500 to-purple-700',
  storyboard: 'from-sky-500 to-sky-700',
  task: 'from-amber-500 to-amber-700',
  image: 'from-emerald-500 to-emerald-700',
  audio: 'from-rose-500 to-rose-700',
  video: 'from-indigo-500 to-indigo-700',
};

interface NodeCardProps {
  node: StoryNode;
  scale: number;
  selected: boolean;
  onContextMenu: (event: ReactMouseEvent, node: StoryNode) => void;
  onLinkTarget: (node: StoryNode, event: PointerEvent) => void;
}

export function NodeCard({ node, scale, selected, onContextMenu, onLinkTarget }: NodeCardProps) {
  const { updateNode, toggleNodeSelection, setSelectedNodeIds, moveNodes, startLinking, linkingFrom } = useStoryStore(
    (state) => ({
      updateNode: state.updateNode,
      toggleNodeSelection: state.toggleNodeSelection,
      setSelectedNodeIds: state.setSelectedNodeIds,
      moveNodes: state.moveNodes,
      startLinking: state.startLinking,
      linkingFrom: state.linkingFrom,
    }),
  );
  const [isEditing, setIsEditing] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);

  const gradient = useMemo(() => nodeColors[node.kind], [node.kind]);

  const handlePointerDown = (event: React.PointerEvent) => {
    event.stopPropagation();
    if (event.button !== 0) return;
    const multi = event.shiftKey || event.metaKey || event.ctrlKey;
    if (multi) {
      toggleNodeSelection(node.id, true);
    } else if (!selected) {
      setSelectedNodeIds([node.id]);
    }
    const pointerId = event.pointerId;
    let last = { x: event.clientX, y: event.clientY };
    const selectedIds = multi
      ? useStoryStore.getState().selectedNodeIds
      : useStoryStore.getState().selectedNodeIds.includes(node.id)
        ? useStoryStore.getState().selectedNodeIds
        : [node.id];

    const handleMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const dx = (moveEvent.clientX - last.x) / scale;
      const dy = (moveEvent.clientY - last.y) / scale;
      if (dx || dy) {
        moveNodes(selectedIds, dx, dy, true);
        last = { x: moveEvent.clientX, y: moveEvent.clientY };
      }
    };

    const handleUp = (upEvent: PointerEvent) => {
      upEvent.preventDefault();
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      (event.target as HTMLElement).releasePointerCapture(pointerId);
      if (useStoryStore.getState().linkingFrom && useStoryStore.getState().linkingFrom !== node.id) {
        onLinkTarget(node, upEvent);
      }
    };

    (event.target as HTMLElement).setPointerCapture(pointerId);
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onContextMenu(event, node);
  };

  const handleBlur = () => {
    if (!titleRef.current) return;
    const nextTitle = titleRef.current.textContent?.trim() ?? '';
    updateNode(node.id, { title: nextTitle });
    setIsEditing(false);
  };

  const renderMediaPreview = () => {
    if (!node.asset) return null;
    if (node.kind === 'image') {
      return <img src={node.asset} alt={node.title} className="h-24 w-full rounded-md object-cover" draggable={false} />;
    }
    if (node.kind === 'video') {
      return <video src={node.asset} controls className="h-24 w-full rounded-md" />;
    }
    if (node.kind === 'audio') {
      return <audio src={node.asset} controls className="w-full" />;
    }
    return null;
  };

  return (
    <div
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
        width: node.width,
        height: node.height,
      }}
      className={clsx(
        'absolute select-none rounded-lg border border-slate-800 bg-slate-900/80 text-slate-100 shadow-lg transition-shadow',
        selected ? 'ring-2 ring-indigo-400' : 'ring-0',
      )}
      onPointerDown={handlePointerDown}
      onContextMenu={handleContextMenu}
    >
      <div className={clsx('flex items-center justify-between rounded-t-lg bg-gradient-to-r px-3 py-1 text-xs', gradient)}>
        <span className="font-semibold uppercase tracking-wide text-white">{node.kind}</span>
        <button
          onClick={(event) => {
            event.stopPropagation();
            startLinking(node.id);
          }}
          className={clsx(
            'rounded-full border border-white/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white transition',
            linkingFrom === node.id ? 'bg-white/40' : 'bg-black/20 hover:bg-white/30',
          )}
        >
          Link
        </button>
      </div>
      <div className="flex h-full flex-col gap-2 p-3">
        <div
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          onDoubleClick={() => setIsEditing(true)}
          onBlur={handleBlur}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              (event.target as HTMLElement).blur();
            }
          }}
          className={clsx(
            'line-clamp-2 cursor-text rounded border border-transparent bg-transparent px-1 text-sm font-semibold text-slate-100 focus:outline-none',
            isEditing && 'border-slate-500 bg-slate-800/80',
          )}
        >
          {node.title}
        </div>
        <p className="flex-1 overflow-hidden text-xs text-slate-300">{node.description}</p>
        {renderMediaPreview()}
        {node.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 text-[10px] text-slate-300">
            {node.tags.map((tag) => (
              <span key={tag} className="rounded bg-slate-800/80 px-2 py-0.5">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
