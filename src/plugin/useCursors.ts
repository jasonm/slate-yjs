import { useCallback, useEffect, useState } from 'react';
import { NodeEntry, Path, Range, Text } from 'slate';
import { Cursor } from '../model';
import { relativePositionToAbsolutePosition } from '../cursor/utils';
import { CursorEditor } from './cursorEditor';

export const useCursors = (
  editor: CursorEditor
): {
  decorate: (entry: NodeEntry) => Range[];
  cursors: Cursor[];
} => {
  const [cursors, setCursorData] = useState<Cursor[]>([]);

  const onUpdate = useCallback(() => {
    const { awarenessPath } = editor;
    //console.log('awareness update');
    const otherAwarenessesInPath = Array.from(
      editor.awareness.getStates()
    ).filter(
      ([clientId, awareness]) =>
        clientId !== editor.sharedType.doc?.clientID && awareness[awarenessPath]
    );

    const newCursorData = otherAwarenessesInPath
      .map(([, awareness]) => {
        let anchor = null;
        let focus = null;

        if (awareness[awarenessPath].anchor) {
          anchor = relativePositionToAbsolutePosition(
            editor.sharedType,
            awareness[awarenessPath].anchor
          );
        }

        if (awareness[awarenessPath].focus) {
          focus = relativePositionToAbsolutePosition(
            editor.sharedType,
            awareness[awarenessPath].focus
          );
        }

        return { anchor, focus, data: awareness[awarenessPath] };
      })
      .filter((cursor) => cursor.anchor && cursor.focus);

    setCursorData(newCursorData as unknown as Cursor[]);
  }, [editor]);

  useEffect(() => {
    // TODO: Not sure if this is needed or not, but possibly,
    // to draw other cursors who are already present in the
    // editor when this editor first renders.
    onUpdate();
    editor.awareness.on('update', onUpdate);
    return () => editor.awareness.off('update', onUpdate);
  }, [editor, onUpdate]);

  const decorate = useCallback(
    ([node, path]: NodeEntry) => {
      const ranges: Range[] = [];

      if (Text.isText(node) && cursors?.length) {
        cursors.forEach((cursor) => {
          if (Range.includes(cursor, path)) {
            const { focus, anchor, data } = cursor;

            const isFocusNode = Path.equals(focus.path, path);
            const isAnchorNode = Path.equals(anchor.path, path);
            const isForward = Range.isForward({ anchor, focus });

            ranges.push({
              data,
              isForward,
              isCaret: isFocusNode,
              anchor: {
                path,
                // eslint-disable-next-line no-nested-ternary
                offset: isAnchorNode
                  ? anchor.offset
                  : isForward
                  ? 0
                  : node.text.length,
              },
              focus: {
                path,
                // eslint-disable-next-line no-nested-ternary
                offset: isFocusNode
                  ? focus.offset
                  : isForward
                  ? node.text.length
                  : 0,
              },
            });
          }
        });
      }

      return ranges;
    },
    [cursors]
  );

  return { decorate, cursors };
};

export default useCursors;
