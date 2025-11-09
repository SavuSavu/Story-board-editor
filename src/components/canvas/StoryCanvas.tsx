import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { NodeCard } from './NodeCard';
import { LinkLayer } from './LinkLayer';
import { ContextMenu } from './ContextMenu';
import { useStoryStore, selectCurrentStory } from '../../store/storyStore';
import { LinkType, StoryNode } from '../../types';

interface ContextMenuState {
  x: number;
  y: number;
  nodeId?: string;
  linkId?: string;
}

interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const LINK_TYPES: LinkType[] = ['reference', 'blocks', 'depends-on'];

export function StoryCanvas() {
  const {
    story,
    viewport,
    setViewport,
    selectedNodeIds,
    setSelectedNodeIds,
    removeNodes,
    duplicateNodes,
    linkingFrom,
    finishLinking,
    cancelLinking,
    updateLinkType,
    removeLink,
  } = useStoryStore((state) => ({
    story: selectCurrentStory(state),
    viewport: state.viewport,
    setViewport: state.setViewport,
    selectedNodeIds: state.selectedNodeIds,
    setSelectedNodeIds: state.setSelectedNodeIds,
    removeNodes: state.removeNodes,
    duplicateNodes: state.duplicateNodes,
    linkingFrom: state.linkingFrom,
    finishLinking: state.finishLinking,
    cancelLinking: state.cancelLinking,
    updateLinkType: state.updateLinkType,
    removeLink: state.removeLink,
  }));

  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [pendingLinkTarget, setPendingLinkTarget] = useState<{ node: StoryNode; x: number; y: number } | null>(null);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePressed(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        if (story) {
          setSelectedNodeIds(story.nodes.map((node) => node.id));
        }
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedNodeIds.length) {
          removeNodes(selectedNodeIds);
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        if (selectedNodeIds.length) {
          duplicateNodes(selectedNodeIds);
        }
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [duplicateNodes, removeNodes, selectedNodeIds, setSelectedNodeIds, story]);

  const scaledStyle = useMemo(
    () => ({
      transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.scale})`,
      transformOrigin: '0 0',
    }),
    [viewport.offsetX, viewport.offsetY, viewport.scale],
  );

  const closeContextMenu = () => setContextMenu(null);

  const handleBackgroundPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    if (event.button === 2) return;
    const rect = containerRef.current.getBoundingClientRect();
    const canvasX = (event.clientX - rect.left - viewport.offsetX) / viewport.scale;
    const canvasY = (event.clientY - rect.top - viewport.offsetY) / viewport.scale;

    const shouldPan = spacePressed || event.button === 1;
    if (shouldPan) {
      setPanning({ startX: event.clientX, startY: event.clientY, originX: viewport.offsetX, originY: viewport.offsetY });
      return;
    }

    setSelectionBox({ startX: canvasX, startY: canvasY, currentX: canvasX, currentY: canvasY });
    setSelectedNodeIds([]);

    const handleMove = (moveEvent: PointerEvent) => {
      const x = (moveEvent.clientX - rect.left - viewport.offsetX) / viewport.scale;
      const y = (moveEvent.clientY - rect.top - viewport.offsetY) / viewport.scale;
      setSelectionBox((box) => (box ? { ...box, currentX: x, currentY: y } : box));
    };

    const handleUp = () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      setSelectionBox((box) => {
        if (!box || !story) return null;
        const minX = Math.min(box.startX, box.currentX);
        const maxX = Math.max(box.startX, box.currentX);
        const minY = Math.min(box.startY, box.currentY);
        const maxY = Math.max(box.startY, box.currentY);
        const ids = story.nodes
          .filter((node) => node.x >= minX && node.x + node.width <= maxX && node.y >= minY && node.y + node.height <= maxY)
          .map((node) => node.id);
        setSelectedNodeIds(ids);
        return null;
      });
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp, { once: true });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panning) {
      const dx = event.clientX - panning.startX;
      const dy = event.clientY - panning.startY;
      setViewport({ offsetX: panning.originX + dx, offsetY: panning.originY + dy });
    }
  };

  const handlePointerUp = () => {
    setPanning(null);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -0.1 : 0.1;
      const rect = containerRef.current.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;
      const scale = Math.min(3, Math.max(0.2, viewport.scale + direction));
      const offsetX = cursorX - ((cursorX - viewport.offsetX) * scale) / viewport.scale;
      const offsetY = cursorY - ((cursorY - viewport.offsetY) * scale) / viewport.scale;
      setViewport({ scale, offsetX, offsetY });
    } else {
      setViewport({ offsetX: viewport.offsetX - event.deltaX, offsetY: viewport.offsetY - event.deltaY });
    }
  };

  const renderContextMenu = () => {
    if (!contextMenu) return null;
    if (contextMenu.nodeId) {
      const items = [
        {
          label: 'Duplicate',
          onSelect: () => duplicateNodes([contextMenu.nodeId!]),
        },
        {
          label: 'Delete',
          onSelect: () => removeNodes([contextMenu.nodeId!]),
        },
      ];
      if (linkingFrom) {
        items.push({ label: 'Cancel Linking', onSelect: () => cancelLinking() });
      }
      return <ContextMenu x={contextMenu.x} y={contextMenu.y} items={items} onClose={closeContextMenu} />;
    }
    if (contextMenu.linkId) {
      return (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            ...LINK_TYPES.map((type) => ({
              label: `Set ${type}`,
              onSelect: () => updateLinkType(contextMenu.linkId!, type),
            })),
            {
              label: 'Delete Link',
              onSelect: () => removeLink(contextMenu.linkId!),
            },
          ]}
          onClose={closeContextMenu}
        />
      );
    }
    return null;
  };

  const renderSelectionBox = () => {
    if (!selectionBox) return null;
    const x = Math.min(selectionBox.startX, selectionBox.currentX);
    const y = Math.min(selectionBox.startY, selectionBox.currentY);
    const width = Math.abs(selectionBox.startX - selectionBox.currentX);
    const height = Math.abs(selectionBox.startY - selectionBox.currentY);
    return (
      <div
        style={{
          transform: `translate(${x}px, ${y}px)`,
          width,
          height,
        }}
        className="pointer-events-none absolute rounded border border-indigo-400/70 bg-indigo-500/10"
      />
    );
  };

  const handleLinkTarget = (node: StoryNode, event: PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPendingLinkTarget({ node, x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  const handleSelectLinkType = (type: LinkType) => {
    if (!pendingLinkTarget) return;
    finishLinking(pendingLinkTarget.node.id, type);
    setPendingLinkTarget(null);
  };

  useEffect(() => {
    if (!linkingFrom) {
      setPendingLinkTarget(null);
    }
  }, [linkingFrom]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-canvas"
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onContextMenu={(event) => event.preventDefault()}
    >
      {story ? (
        <div className="absolute inset-0" style={scaledStyle}>
          <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(148,163,184,0.08)_1px,_transparent_1px)] bg-[length:24px_24px]" />
          <LinkLayer
            nodes={story.nodes}
            links={story.links}
            scale={viewport.scale}
            onContextMenu={(event, linkId) => {
              event.preventDefault();
              setContextMenu({ x: event.clientX, y: event.clientY, linkId });
            }}
          />
          {story.nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              scale={viewport.scale}
              selected={selectedNodeIds.includes(node.id)}
              onContextMenu={(event) => setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id })}
              onLinkTarget={handleLinkTarget}
            />
          ))}
          {renderSelectionBox()}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-slate-400">Create a story to begin</div>
      )}
      {contextMenu && renderContextMenu()}
      {pendingLinkTarget && (
        <ContextMenu
          x={pendingLinkTarget.x}
          y={pendingLinkTarget.y}
          items={LINK_TYPES.map((type) => ({ label: type, onSelect: () => handleSelectLinkType(type) }))}
          onClose={() => {
            cancelLinking();
            setPendingLinkTarget(null);
          }}
        />
      )}
    </div>
  );
}
