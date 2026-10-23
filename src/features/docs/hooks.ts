import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { docsApi } from '@/api/docsApi';
import type { PageInput, SectionInput } from '@/types/docs';

const KEYS = {
  tree: ['docs', 'tree'] as const,
  page: (id: string) => ['docs', 'page', id] as const,
};

export function useDocsTree() {
  return useQuery({ queryKey: KEYS.tree, queryFn: docsApi.tree, retry: false });
}

export function useDocPage(id: string | null) {
  return useQuery({ queryKey: KEYS.page(id ?? ''), queryFn: () => docsApi.page(id!), enabled: Boolean(id), retry: false });
}

/** Every change refreshes the tree, and the page that was open when it was a page that changed. */
export function useDocsMutations() {
  const queryClient = useQueryClient();
  const refresh = (pageId?: string) => {
    void queryClient.invalidateQueries({ queryKey: KEYS.tree });
    if (pageId) void queryClient.invalidateQueries({ queryKey: KEYS.page(pageId) });
  };

  return {
    createSection: useMutation({ mutationFn: (input: SectionInput & { title: string }) => docsApi.createSection(input), onSuccess: () => refresh() }),
    updateSection: useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<SectionInput> }) => docsApi.updateSection(id, input), onSuccess: () => refresh() }),
    deleteSection: useMutation({ mutationFn: (id: string) => docsApi.deleteSection(id), onSuccess: () => refresh() }),
    createPage: useMutation({ mutationFn: (input: PageInput & { sectionId: string; title: string }) => docsApi.createPage(input), onSuccess: (page) => refresh(page.id) }),
    updatePage: useMutation({ mutationFn: ({ id, input }: { id: string; input: PageInput }) => docsApi.updatePage(id, input), onSuccess: (page) => refresh(page.id) }),
    deletePage: useMutation({ mutationFn: (id: string) => docsApi.deletePage(id), onSuccess: () => refresh() }),
    reorder: useMutation({ mutationFn: ({ kind, parentId, ids }: { kind: 'section' | 'page'; parentId: string | null; ids: string[] }) => docsApi.reorder(kind, parentId, ids), onSuccess: () => refresh() }),
  };
}
