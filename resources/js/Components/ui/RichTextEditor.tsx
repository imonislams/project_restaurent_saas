import { useEffect, useRef } from 'react';
import { cn } from './cn';

/**
 * A lightweight "classic" rich-text editor built on contentEditable. Styling is
 * applied with `styleWithCSS` so formatting is emitted as inline styles, which
 * survive in email clients. Used for editing email template content.
 */
export default function RichTextEditor({
    value,
    onChange,
    variables = [],
    className,
}: {
    value: string;
    onChange: (html: string) => void;
    variables?: string[];
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (el && document.activeElement !== el && el.innerHTML !== value) {
            el.innerHTML = value;
        }
    }, [value]);

    const emit = () => {
        if (ref.current) onChange(ref.current.innerHTML);
    };

    const exec = (command: string, arg?: string) => {
        ref.current?.focus();
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand(command, false, arg);
        emit();
    };

    const btn = 'rounded px-2 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-200';

    return (
        <div className={cn('overflow-hidden rounded-lg border border-gray-300 bg-white', className)}>
            <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
                <button type="button" className={btn} title="Bold" onClick={() => exec('bold')}><strong>B</strong></button>
                <button type="button" className={btn} title="Italic" onClick={() => exec('italic')}><em>I</em></button>
                <button type="button" className={btn} title="Underline" onClick={() => exec('underline')}><u>U</u></button>
                <span className="mx-1 h-4 w-px bg-gray-300" />
                <button type="button" className={btn} onClick={() => exec('formatBlock', 'H2')}>H2</button>
                <button type="button" className={btn} onClick={() => exec('formatBlock', 'H3')}>H3</button>
                <button type="button" className={btn} onClick={() => exec('formatBlock', 'P')}>Text</button>
                <span className="mx-1 h-4 w-px bg-gray-300" />
                <button type="button" className={btn} title="Bulleted list" onClick={() => exec('insertUnorderedList')}>• List</button>
                <button type="button" className={btn} title="Numbered list" onClick={() => exec('insertOrderedList')}>1. List</button>
                <button
                    type="button"
                    className={btn}
                    onClick={() => {
                        const url = window.prompt('Link URL', 'https://');
                        if (url) exec('createLink', url);
                    }}
                >
                    Link
                </button>
                <span className="mx-1 h-4 w-px bg-gray-300" />
                <button type="button" className={btn} title="Undo" onClick={() => exec('undo')}>↶</button>
                <button type="button" className={btn} title="Redo" onClick={() => exec('redo')}>↷</button>
                <button type="button" className={btn} title="Clear formatting" onClick={() => exec('removeFormat')}>Clear</button>

                {variables.length > 0 && (
                    <select
                        className="ml-auto rounded-md border-gray-300 py-0.5 text-xs"
                        defaultValue=""
                        onChange={(e) => {
                            if (e.target.value) exec('insertText', `{{ ${e.target.value} }}`);
                            e.target.value = '';
                        }}
                    >
                        <option value="">Insert variable…</option>
                        {variables.map((variable) => (
                            <option key={variable} value={variable}>{`{{ ${variable} }}`}</option>
                        ))}
                    </select>
                )}
            </div>
            <div
                ref={ref}
                contentEditable
                suppressContentEditableWarning
                onInput={emit}
                onBlur={emit}
                className="email-body min-h-[300px] overflow-y-auto px-4 py-3 text-sm text-gray-800 focus:outline-none"
            />
        </div>
    );
}
