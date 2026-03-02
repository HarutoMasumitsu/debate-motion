/**
 * RichEditor.tsx
 * Notionライクなインライン編集エディタ
 * デザイン: Warm Academic — クリーム色ベース、ティールグリーンアクセント
 *
 * Tiptap を使用してリッチテキスト編集を実現。
 * 内部データは Markdown 文字列として保存・読み込みを行う。
 */

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { useEffect, useCallback } from "react";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Minus,
} from "lucide-react";

// ===== Markdown ↔ HTML 変換ユーティリティ =====

/** シンプルなMarkdown → HTML変換（Tiptapへのインポート用） */
function markdownToHtml(md: string): string {
  if (!md) return "";
  let html = md;

  // コードブロック（インライン）
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // 太字・斜体
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

  // リンク
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  // 見出し（行単位で処理）
  const lines = html.split("\n");
  const processed: string[] = [];
  let i = 0;
  let inList = false;
  let listType = "";

  while (i < lines.length) {
    const line = lines[i];

    // 空行
    if (line.trim() === "") {
      if (inList) {
        processed.push(`</${listType}>`);
        inList = false;
        listType = "";
      }
      i++;
      continue;
    }

    // 見出し
    const h1 = line.match(/^# (.+)$/);
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    const h4 = line.match(/^#### (.+)$/);
    if (h1) { if (inList) { processed.push(`</${listType}>`); inList = false; } processed.push(`<h1>${h1[1]}</h1>`); i++; continue; }
    if (h2) { if (inList) { processed.push(`</${listType}>`); inList = false; } processed.push(`<h2>${h2[1]}</h2>`); i++; continue; }
    if (h3) { if (inList) { processed.push(`</${listType}>`); inList = false; } processed.push(`<h3>${h3[1]}</h3>`); i++; continue; }
    if (h4) { if (inList) { processed.push(`</${listType}>`); inList = false; } processed.push(`<h4>${h4[1]}</h4>`); i++; continue; }

    // 引用
    if (line.trim().startsWith("> ")) {
      if (inList) { processed.push(`</${listType}>`); inList = false; }
      processed.push(`<blockquote><p>${line.trim().replace(/^>\s?/, "")}</p></blockquote>`);
      i++; continue;
    }

    // 番号付きリスト
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        if (inList) processed.push(`</${listType}>`);
        processed.push("<ol>");
        inList = true; listType = "ol";
      }
      processed.push(`<li>${olMatch[2]}</li>`);
      i++; continue;
    }

    // 箇条書きリスト
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        if (inList) processed.push(`</${listType}>`);
        processed.push("<ul>");
        inList = true; listType = "ul";
      }
      processed.push(`<li>${ulMatch[2]}</li>`);
      i++; continue;
    }

    // 水平線
    if (line.match(/^---+$/)) {
      if (inList) { processed.push(`</${listType}>`); inList = false; }
      processed.push("<hr>");
      i++; continue;
    }

    // 通常段落
    if (inList) { processed.push(`</${listType}>`); inList = false; }
    processed.push(`<p>${line}</p>`);
    i++;
  }

  if (inList) processed.push(`</${listType}>`);

  return processed.join("\n");
}

/** Tiptap の JSON → Markdown 変換 */
function htmlToMarkdown(html: string): string {
  if (!html) return "";

  // 一時的なDOMパース
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  function nodeToMd(node: Node, indent = ""): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map((c) => nodeToMd(c, indent)).join("");

    switch (tag) {
      case "h1": return `# ${children}\n\n`;
      case "h2": return `## ${children}\n\n`;
      case "h3": return `### ${children}\n\n`;
      case "h4": return `#### ${children}\n\n`;
      case "h5": return `##### ${children}\n\n`;
      case "h6": return `###### ${children}\n\n`;
      case "p": return `${children}\n\n`;
      case "strong": case "b": return `**${children}**`;
      case "em": case "i": return `*${children}*`;
      case "code": return `\`${children}\``;
      case "blockquote": {
        const inner = children.trim().split("\n").map((l) => `> ${l}`).join("\n");
        return `${inner}\n\n`;
      }
      case "ul": {
        const items = Array.from(el.querySelectorAll(":scope > li")).map((li) => {
          const liContent = Array.from(li.childNodes).map((c) => nodeToMd(c)).join("").trim();
          return `- ${liContent}`;
        });
        return items.join("\n") + "\n\n";
      }
      case "ol": {
        const items = Array.from(el.querySelectorAll(":scope > li")).map((li, idx) => {
          const liContent = Array.from(li.childNodes).map((c) => nodeToMd(c)).join("").trim();
          return `${idx + 1}. ${liContent}`;
        });
        return items.join("\n") + "\n\n";
      }
      case "li": return children;
      case "a": return `[${children}](${el.getAttribute("href") || ""})`;
      case "hr": return `---\n\n`;
      case "br": return "\n";
      case "body": case "div": return children;
      default: return children;
    }
  }

  const result = nodeToMd(doc.body);
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

// ===== ツールバーボタン =====

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ===== メインコンポーネント =====

interface RichEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

export default function RichEditor({ value, onChange, placeholder }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        bulletList: {},
        orderedList: {},
        blockquote: {},
        bold: {},
        italic: {},
        code: {},
        hardBreak: {},
        horizontalRule: {},
      }),
      Placeholder.configure({
        placeholder: placeholder || "本文を入力...\n\n「#」で見出し、「-」で箇条書き、「>」で引用",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline hover:text-primary/80 cursor-pointer" },
      }),
    ],
    content: markdownToHtml(value),
    onUpdate({ editor }) {
      const html = editor.getHTML();
      const md = htmlToMarkdown(html);
      onChange(md);
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[400px] leading-relaxed",
      },
    },
  });

  // 外部からvalueが変わったとき（初期ロード時）に同期
  const isFirstLoad = !editor?.getText();
  useEffect(() => {
    if (!editor || !value) return;
    const currentMd = htmlToMarkdown(editor.getHTML());
    if (currentMd !== value && isFirstLoad) {
      editor.commands.setContent(markdownToHtml(value));
    }
  }, [value, editor, isFirstLoad]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URLを入力してください:", "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-border bg-secondary/20 sticky top-14 z-10">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="見出し2 (##)"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="見出し3 (###)"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="太字 (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="斜体 (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          title="インラインコード"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={setLink}
          active={editor.isActive("link")}
          title="リンク"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="箇条書き"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="番号付きリスト"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="引用"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          active={false}
          title="区切り線"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor content */}
      <div className="px-6 md:px-10 py-6 prose-article">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
