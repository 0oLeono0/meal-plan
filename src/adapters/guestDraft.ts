import { createDraft, isSettingsDraft, type SettingsDraft } from '../domain/settings';

export const DRAFT_KEY = 'mealplan:guest:draft:v1';
export type DraftLoadResult =
  | { status: 'missing'; draft: SettingsDraft }
  | { status: 'loaded'; draft: SettingsDraft; homeEdited?: boolean }
  | { status: 'corrupt' }
  | { status: 'error' };
export type DraftSaveResult = { status: 'saved' } | { status: 'blocked' } | { status: 'error' };
export interface GuestDraftPort {
  load(): Promise<DraftLoadResult>;
  save(draft: SettingsDraft, homeEdited?: boolean): Promise<DraftSaveResult>;
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
        if (typeof envelope !== 'object' || envelope === null || !('schemaVersion' in envelope) || !('draft' in envelope) || !isSettingsDraft(envelope.draft)) return { status: 'corrupt' };
        if (envelope.schemaVersion === 2) {
          if (Object.keys(envelope).length !== 3 || !('homeEdited' in envelope) || typeof envelope.homeEdited !== 'boolean'
            || (!envelope.homeEdited && envelope.draft.home.length > 0)) return { status: 'corrupt' };
          writable = true;
          return { status: 'loaded', draft: envelope.draft, homeEdited: envelope.homeEdited };
        }
        if (envelope.schemaVersion !== 1) return { status: 'corrupt' };
        writable = true;
        return { status: 'loaded', draft: envelope.draft };
      } catch { return { status: 'corrupt' }; }
    },
    async save(draft, homeEdited) {
      if (!writable || !isSettingsDraft(draft) || (homeEdited === false && draft.home.length > 0)) return { status: 'blocked' };
      try {
        const envelope = homeEdited === undefined ? { schemaVersion: 1, draft } : { schemaVersion: 2, draft, homeEdited };
        getStorage().setItem(DRAFT_KEY, JSON.stringify(envelope));
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
