import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { App, Editor, View } from 'obsidian';

let dropdownEl: HTMLUListElement | null = null;

export function createTAUI(plugin: any) {
    return [];
}

export function destroyTAUI() {
    dropdownEl?.remove();
    dropdownEl = null;
}

export function updateSuggestions(suggestions: string[], editor: Editor, baseWord: string) {
    destroyTAUI();

    const cm = (editor as any).cm;
    const pos = cm.state.selection.main.head;
    const coords = cm.coordsAtPos(pos);
    if (!coords) return;

    dropdownEl = document.createElement('ul');
    dropdownEl.className = 'autocomplete-dropdown';

    suggestions.forEach(suggestion => {
        const li = document.createElement('li');
        li.textContent = suggestion;
        li.onclick = () => {
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line);
            const beforeCursor = line.substring(0, cursor.ch);
            const match = beforeCursor.match(/(\b\w+)$/);
            if (match) {
                editor.replaceRange(
                    suggestion, 
                    { line: cursor.line, ch: cursor.ch - match[1].length }, // start position (line, position in line)
                    cursor // end position (line, position in line)
                );
            }
            destroyTAUI();
        };
        dropdownEl?.appendChild(li);
    });

    (dropdownEl.firstChild as HTMLLIElement)?.classList.add('active'); // First suggestion will by default be tagged as active

    Object.assign(dropdownEl.style, {
        position: 'absolute',
        top: `${coords.bottom + window.scrollY}px`,
        left: `${coords.left + window.scrollX}px`,
        zIndex: 1000,
        backgroundColor: 'var(--background-primary)',
		border: '1px solid var(--divider-color)',
		borderRadius: '4px',
		padding: '4px 0',
		listStyle: 'none',
		margin: 0,
		width: '200px',
    });

    document.body.appendChild(dropdownEl);
}