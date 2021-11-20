import { Editor } from 'slate';
import invariant from 'tiny-invariant';
import { Awareness } from 'y-protocols/awareness';
import { absolutePositionToRelativePosition } from '../cursor/utils';
import { YjsEditor } from './yjsEditor';

const AWARENESS: WeakMap<Editor, Awareness> = new WeakMap();
const AWARENESS_PATHS: WeakMap<Editor, string> = new WeakMap();

export interface CursorEditor extends YjsEditor {
  awareness: Awareness;
  awarenessPath: string;
}

export const CursorEditor = {
  awareness(editor: CursorEditor): Awareness {
    const awareness = AWARENESS.get(editor);
    invariant(awareness, 'CursorEditor without attached awareness');
    return awareness;
  },

  awarenessPath(editor: CursorEditor): string {
    const awarenessPath = AWARENESS_PATHS.get(editor);
    invariant(awarenessPath, 'CursorEditor without attached awarenessPath');
    return awarenessPath;
  },

  updateCursor: (editor: CursorEditor): void => {
    const sharedType = YjsEditor.sharedType(editor);
    const { selection } = editor;

    const anchor =
      selection &&
      absolutePositionToRelativePosition(sharedType, selection.anchor);

    const focus =
      selection &&
      absolutePositionToRelativePosition(sharedType, selection.focus);

    const awareness = CursorEditor.awareness(editor);
    const awarenessPath = CursorEditor.awarenessPath(editor);
    awareness.setLocalStateField(awarenessPath, { anchor, focus });
  },
};

export function withCursor<T extends YjsEditor>(
  editor: T,
  awareness: Awareness,
  awarenessPath: string
): T & CursorEditor {
  const e = editor as T & CursorEditor;

  AWARENESS.set(e, awareness);
  e.awareness = awareness;
  AWARENESS_PATHS.set(e, awarenessPath);
  e.awarenessPath = awarenessPath;

  const { onChange } = editor;

  e.onChange = () => {
    setTimeout(() => CursorEditor.updateCursor(e), 0);

    if (onChange) {
      onChange();
    }
  };

  return e;
}
