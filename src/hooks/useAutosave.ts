import { useEffect } from 'react';
import { useStoryStore } from '../store/storyStore';
import { saveStories } from '../utils/indexedDB';

const AUTOSAVE_DELAY = 1500;

export function useAutosave() {
  useEffect(() => {
    let timer: number | undefined;
    const unsub = useStoryStore.subscribe(
      (state) => ({ stories: state.stories, order: state.storyOrder }),
      ({ stories, order }) => {
        if (timer) {
          window.clearTimeout(timer);
        }
        timer = window.setTimeout(() => {
          saveStories(Object.values(stories), order).catch((err) => {
            console.error('Autosave failed', err);
          });
        }, AUTOSAVE_DELAY);
      },
      { equalityFn: () => false },
    );
    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
      unsub();
    };
  }, []);
}
