import { useMemo, useState } from 'react';
import { useStoryStore, selectCurrentStory } from '../../store/storyStore';
import { TaskStatus } from '../../types';

const STATUS_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

export function TaskBoard() {
  const {
    story,
    addTask,
    updateTask,
    moveTask,
    selectedNodeIds,
    linkTaskToNode,
    unlinkTaskFromNode,
  } = useStoryStore((state) => ({
    story: selectCurrentStory(state),
    addTask: state.addTask,
    updateTask: state.updateTask,
    moveTask: state.moveTask,
    selectedNodeIds: state.selectedNodeIds,
    linkTaskToNode: state.linkTaskToNode,
    unlinkTaskFromNode: state.unlinkTaskFromNode,
  }));
  const [draftTitle, setDraftTitle] = useState('');

  const tasksByStatus = useMemo(() => {
    if (!story) return {} as Record<TaskStatus, typeof story.tasks>;
    return STATUS_COLUMNS.reduce((acc, column) => {
      acc[column.id] = story.tasks.filter((task) => task.status === column.id);
      return acc;
    }, {} as Record<TaskStatus, typeof story.tasks>);
  }, [story]);

  if (!story) {
    return (
      <section className="flex flex-col gap-2 p-4 text-sm text-slate-300">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Tasks</h2>
        <p>Create a story to manage tasks.</p>
      </section>
    );
  }

  const handleCreateTask = () => {
    if (!draftTitle.trim()) return;
    addTask(draftTitle.trim());
    setDraftTitle('');
  };

  return (
    <section className="flex h-[45vh] flex-col border-t border-slate-800 bg-slate-900/30">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Task board</h2>
        <div className="flex gap-2 text-xs">
          <input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            placeholder="Add new task"
            className="w-40 rounded border border-slate-700 bg-slate-800/80 px-2 py-1 text-slate-200 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleCreateTask}
            className="rounded border border-slate-700 px-3 py-1 text-slate-200 hover:border-indigo-500"
          >
            Add
          </button>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-3 overflow-y-auto p-4">
        {STATUS_COLUMNS.map((column) => (
          <div key={column.id} className="flex flex-col gap-3 rounded border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-300">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-sm font-semibold text-slate-100">{column.label}</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px]">{tasksByStatus[column.id]?.length ?? 0}</span>
            </div>
            <div className="flex flex-col gap-3">
              {(tasksByStatus[column.id] ?? []).map((task) => (
                <article key={task.id} className="rounded border border-slate-700 bg-slate-900/60 p-3">
                  <input
                    value={task.title}
                    onChange={(event) => updateTask(task.id, { title: event.target.value })}
                    className="w-full rounded border border-transparent bg-transparent text-sm font-semibold text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                  <textarea
                    value={task.description ?? ''}
                    onChange={(event) => updateTask(task.id, { description: event.target.value })}
                    rows={2}
                    className="mt-2 w-full rounded border border-slate-800 bg-slate-900/80 p-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
                  />
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-slate-400">
                    {task.tags.map((tag) => (
                      <span key={tag} className="rounded bg-slate-800 px-2 py-0.5">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <label className="flex items-center gap-1">
                      Tags:
                      <input
                        defaultValue={task.tags.join(', ')}
                        onBlur={(event) =>
                          updateTask(task.id, {
                            tags: event.target.value
                              .split(',')
                              .map((tag) => tag.trim())
                              .filter(Boolean),
                          })
                        }
                        className="rounded border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
                    <span className="text-slate-400">Links:</span>
                    {task.linkedNodeIds.length === 0 && <span className="text-slate-500">No links</span>}
                    {task.linkedNodeIds.map((nodeId) => {
                      const node = story.nodes.find((item) => item.id === nodeId);
                      if (!node) return null;
                      return (
                        <button
                          key={nodeId}
                          onClick={() => unlinkTaskFromNode(task.id, nodeId)}
                          className="rounded border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-[10px] hover:border-rose-500 hover:text-rose-300"
                        >
                          {node.title}
                        </button>
                      );
                    })}
                    {selectedNodeIds.length > 0 && (
                      <button
                        onClick={() => {
                          selectedNodeIds.forEach((nodeId) => linkTaskToNode(task.id, nodeId));
                        }}
                        className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-indigo-200 hover:border-indigo-500"
                      >
                        Link selected nodes ({selectedNodeIds.length})
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-slate-400">
                    {STATUS_COLUMNS.filter((item) => item.id !== task.status).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => moveTask(task.id, item.id)}
                        className="rounded border border-slate-700 px-2 py-0.5 hover:border-indigo-500 hover:text-indigo-300"
                      >
                        Move to {item.label}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
