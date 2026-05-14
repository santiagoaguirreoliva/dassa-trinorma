import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
        target.isContentEditable || target.tagName === 'SELECT'
      );

      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        const search = document.querySelector<HTMLInputElement>('input[data-global-search]');
        if (search) {
          search.focus();
          return;
        }
      }
      if (e.key === 'Escape') {
        const active = document.activeElement as HTMLElement | null;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          active.blur();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !isTyping) {
        e.preventDefault();
        const search = document.querySelector<HTMLInputElement>('input[data-global-search]');
        if (search) search.focus();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h' && !isTyping) {
        e.preventDefault();
        navigate('/');
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);
}
