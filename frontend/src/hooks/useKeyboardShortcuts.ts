import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';

const INPUT_TAG_NAMES = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isInputFocused(): boolean {
  const { activeElement } = document;
  if (!activeElement) return false;
  if (INPUT_TAG_NAMES.has(activeElement.tagName)) return true;
  if ((activeElement as HTMLElement).isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(): void {
  const navigate = useNavigate();
  const toggleGlobalSearch = useUIStore((state) => state.toggleGlobalSearch);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const modifier = event.metaKey || event.ctrlKey;

      // Cmd/Ctrl+K → toggle global search
      if (modifier && event.key === 'k') {
        event.preventDefault();
        toggleGlobalSearch();
        return;
      }

      // Escape → close modals/search
      if (event.key === 'Escape') {
        const { globalSearchOpen } = useUIStore.getState();
        if (globalSearchOpen) {
          toggleGlobalSearch();
        }
        return;
      }

      // Remaining shortcuts only apply when not focused on an input
      if (isInputFocused()) return;

      // 'n' → navigate to new student form
      if (event.key === 'n') {
        navigate('/students/new');
        return;
      }

      // 'j'/'k' → list navigation via custom events
      if (event.key === 'j') {
        window.dispatchEvent(new CustomEvent('list:navigate', { detail: { direction: 'down' } }));
        return;
      }

      if (event.key === 'k') {
        window.dispatchEvent(new CustomEvent('list:navigate', { detail: { direction: 'up' } }));
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, toggleGlobalSearch]);
}
