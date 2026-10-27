import { createDraft, isSettingsDraft, type SettingsDraft } from '../domain/settings';

export const DRAFT_KEY = 'mealplan:guest:draft:v1';
export type DraftLoadResult =
  | { status: 'missing'; draft: SettingsDraft }
  | { status: 'loaded'; draft: SettingsDraft }
  | { status: 'corrupt' }
  | { status: 'error' };
export type DraftSaveResult = { status: 'saved' } | { status: 'blocked' } | { status: 'error' };
export interface GuestDraftPort {
  load(): Promise<DraftLoadResult>;
  save(draft: SettingsDraft): Promise<DraftSaveResult>;
  reset(): Promise<DraftSaveResult>;
}
type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Access itself can throw, so localStorage is obtained only inside guarded operations. */
export function createGuestDraftAdapter(getStorage: () => DraftStorage = () => window.localStorage): GuestDraftPort {
  let writable = false;
  return {
    async load() {
      writable = false;
      let raw: string | null;
      try { raw = getStorage().getItem(DRAFT_KEY); } catch { return { status: 'error' }; }
      if (raw === null) { writable = true; return { status: 'missing', draft: createDraft() }; }
      try {
        const envelope: unknown = JSON.parse(raw);
        if (typeof envelope !== 'object' || envelope === null || !('schemaVersion' in envelope) || envelope.schemaVersion !== 1 || !('draft' in envelope) || !isSettingsDraft(envelope.draft)) return { status: 'corrupt' };
        writable = true;
        return { status: 'loaded', draft: envelope.draft };
      } catch { return { status: 'corrupt' }; }
    },
    async save(draft) {
      if (!writable || !isSettingsDraft(draft)) return { status: 'blocked' };
      try {
        getStorage().setItem(DRAFT_KEY, JSON.stringify({ schemaVersion: 1, draft }));
        return { status: 'saved' };
      } catch { return { status: 'error' }; }
    },
    async reset() {
      writable = false;
      try { getStorage().removeItem(DRAFT_KEY); writable = true; return { status: 'saved' }; }
      catch { return { status: 'error' }; }
    },
  };
}
