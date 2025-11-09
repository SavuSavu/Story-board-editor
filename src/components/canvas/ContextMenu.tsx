interface ContextMenuItem {
  label: string;
  onSelect: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  return (
    <div
      style={{ left: x, top: y }}
      className="fixed z-50 min-w-[160px] rounded-md border border-slate-700 bg-slate-900/95 text-sm text-slate-100 shadow-lg"
      onMouseLeave={onClose}
    >
      <ul className="divide-y divide-slate-800">
        {items.map((item) => (
          <li key={item.label}>
            <button
              className="w-full px-3 py-2 text-left hover:bg-slate-800"
              onClick={() => {
                item.onSelect();
                onClose();
              }}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
