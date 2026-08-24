import React from 'react';

/**
 * Markdown renderer — faithful port of Angular's
 * assembly/src/app/components/markdown-renderer/markdown-renderer.component.ts.
 * Same regex pipeline and Tailwind classes so both apps render identical output.
 */

function escapeHtml(text: string): string {
 return text
 .replace(/&/g, '&amp;')
 .replace(/</g, '&lt;')
 .replace(/>/g, '&gt;')
 .replace(/"/g, '&quot;')
 .replace(/'/g, '&#039;');
}

export function renderMarkdown(content: string): string {
 if (!content) return '';

 let html = escapeHtml(content);

 // Code blocks
 html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
 return `<pre class="bg-gray-900 text-gray-100 rounded p-3 overflow-x-auto text-sm my-2"><code>${code.trim()}</code></pre>`;
 });

 // Protect <pre> blocks from the line-oriented transforms below (headers,
 // bold/italic, links, bullets, task lists) so fenced code renders verbatim.
 // Restored just before paragraph splitting.
 const preBlocks: string[] = [];
 html = html.replace(/<pre[^>]*>[\s\S]*?<\/pre>/g, (m) => {
 const idx = preBlocks.length;
 preBlocks.push(m);
 return `\u0000PRE${idx}\u0000`;
 });

 // Inline code
 html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-primary-700 px-1 py-0.5 rounded text-sm font-mono">$1</code>');

 // Headers
 html = html.replace(/^### (.*$)/gim, '<h3 class="text-sm font-semibold text-gray-900 mt-3 mb-1">$1</h3>');
 html = html.replace(/^## (.*$)/gim, '<h2 class="text-sm font-semibold text-gray-900 mt-4 mb-1">$1</h2>');
 html = html.replace(/^# (.*$)/gim, '<h1 class="text-base font-semibold text-gray-900 mt-4 mb-1">$1</h1>');

 // Bold and italic
 html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
 html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-700">$1</em>');

 // Links
 html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-700 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

 // Bare-URL autolink — real links for pasted URLs that aren't in [text](url)
 // form (e.g. PR lists, log excerpts). Runs AFTER the markdown-link pass so
 // URLs already wrapped in href="…" are skipped via the (?<!") lookbehind;
 // (?<!\() keeps markdown-target parens from double-matching if this pass
 // ever moves. Trailing punctuation and closing parens stay outside the link.
 html = html.replace(/(?<!["'=\w])(https?:\/\/[^\s<>"]+?)([.,;:!?)\]]*)(?=[\s<]|$)/g,
   (_m, url: string, punct: string) =>
     `<a href="${url}" class="text-primary-700 hover:underline break-all" target="_blank" rel="noopener noreferrer">${url}</a>${punct}`);

 // Task lists (- [ ] / - [x]) — must run before the unordered-list regex below.
 // Rendered as static (disabled) checkboxes so existing content shows correctly;
 // interactive selection with submit-as-reply is provided by <InteractiveMarkdown>.
 html = html.replace(/^(\s*)[-*]\s+\[([ xX])\][ \t]*(.*)$/gim, (_, indent, mark, text) => {
 const checked = mark.toLowerCase() === 'x';
 return (
 `${indent}<label class="task-row flex items-start gap-2 my-0.5 cursor-default">` +
 `<input type="checkbox" class="mt-0.5 h-3.5 w-3.5 accent-primary-600"${checked ? ' checked' : ''} disabled />` +
 `<span class="text-sm ${checked ? 'text-gray-400 line-through' : 'text-gray-800 '}">${text}</span>` +
 `</label>`
 );
 });

 // Unordered lists
 html = html.replace(/^(\s*)[-*] (.*$)/gim, '$1• $2');

 // Blockquotes
 html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-2 border-primary-300 pl-3 italic text-gray-600 my-2">$1</blockquote>');

 // Restore protected code blocks (after all line-oriented transforms).
 if (preBlocks.length) {
 html = html.replace(/\u0000PRE(\d+)\u0000/g, (_, i) => preBlocks[Number(i)]);
 }

 // Paragraphs - split on blank lines and wrap
 const blocks = html.split(/\n\n+/).map((block) => {
 const trimmed = block.trim();
 if (!trimmed) return '';
 if (trimmed.startsWith('<') && (trimmed.startsWith('<pre') || trimmed.startsWith('<h') || trimmed.startsWith('<blockquote'))) {
 return trimmed;
 }
 if (trimmed.startsWith('<label class="task-row')) {
 // Task-list block: keep as-is (no <p> wrapper) unless it mixes non-task content.
 const taskOnly = trimmed.split('\n').every((l) => !l.trim() || l.trim().startsWith('<label class="task-row'));
 if (taskOnly) return trimmed;
 }
 return `<p class="text-sm text-gray-700 leading-relaxed mb-2">${trimmed.replace(/\n/g, '<br>')}</p>`;
 });

 return blocks.join('\n');
}

/**
 * Inline-only markdown transforms (code, bold/italic, links) used to render
 * individual task-list item text without paragraph or list wrappers.
 */
export function renderInlineMarkdown(text: string): string {
 let html = escapeHtml(text);
 html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-primary-700 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
 html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
 html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-700">$1</em>');
 html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-700 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');
 return html;
}

interface MarkdownRendererProps {
 content: string;
 className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
 return <div className={`markdown-content ${className}`.trim()} dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />;
};

export default MarkdownRenderer;
