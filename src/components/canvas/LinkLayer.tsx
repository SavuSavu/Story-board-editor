import { StoryLink, StoryNode } from '../../types';

const linkColors: Record<StoryLink['type'], string> = {
  reference: '#60a5fa',
  blocks: '#f87171',
  'depends-on': '#34d399',
};

interface LinkLayerProps {
  nodes: StoryNode[];
  links: StoryLink[];
  scale: number;
  onContextMenu: (event: React.MouseEvent, linkId: string) => void;
}

export function LinkLayer({ nodes, links, scale, onContextMenu }: LinkLayerProps) {
  const lookup = new Map(nodes.map((node) => [node.id, node] as const));

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      {links.map((link) => {
        const source = lookup.get(link.from);
        const target = lookup.get(link.to);
        if (!source || !target) return null;
        const startX = source.x + source.width / 2;
        const startY = source.y + source.height / 2;
        const endX = target.x + target.width / 2;
        const endY = target.y + target.height / 2;
        const dx = Math.abs(endX - startX) * 0.5;
        const control1X = startX + dx;
        const control2X = endX - dx;
        const path = `M ${startX} ${startY} C ${control1X} ${startY}, ${control2X} ${endY}, ${endX} ${endY}`;
        return (
          <g key={link.id} className="pointer-events-auto" onContextMenu={(event) => onContextMenu(event, link.id)}>
            <path d={path} fill="none" stroke={linkColors[link.type]} strokeWidth={2 / scale} markerEnd="url(#arrowhead)" />
            <g transform={`translate(${(startX + endX) / 2}, ${(startY + endY) / 2}) scale(${1 / scale})`}>
              <text className="text-[10px] font-semibold" textAnchor="middle" fill="#cbd5f5" dy={-6}>
                {link.type}
              </text>
            </g>
          </g>
        );
      })}
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
          <polygon points="0 0, 6 3, 0 6" fill="#cbd5f5" />
        </marker>
      </defs>
    </svg>
  );
}
