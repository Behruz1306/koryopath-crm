import { useEffect } from 'react';

export function useDocumentTitle(page: string): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `KoryoPath CRM | ${page}`;

    return () => {
      document.title = previousTitle;
    };
  }, [page]);
}
