/**
 * RichEditor.tsx
 * Notionライクなインライン編集エディタ
 * デザイン: Warm Academic — クリーム色ベース、ティールグリーンアクセント
 *
 * アーキテクチャ:
 * - Tiptap を使用したWYSIWYGエディタ
 * - トグル: "> " 入力でdetailsタグを挿入（InputRule）
 * - Tab: リスト内ではネスト、それ以外はインデント
 * - リスト記号: 黒丸→白丸→四角（CSS）
 */

import { useEditor, EditorContent, Extension, InputRule } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { useEffect, useCallback, useState } from "react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ChevronRight,
  Code,
  Link as LinkIcon,
  Minus,
  FileCode,
  Eye,
} from "lucide-react";

// ===== インデント拡張（Tab/Shift-Tab） =====

const IndentExtension = Extension.create({
  name: "indent",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el: HTMLElement) => {
              const val = el.style.marginLeft;
              if (!val) return 0;
              return Math.round(parseInt(val) / 32);
            },
            renderHTML: (attrs: Record<string, unknown>) => {
              const level = (attrs.indent as number) || 0;
              if (level === 0) return {};
              return { style: `margin-left: ${level * 32}px` };
            },
          },
        },
      },
    ];
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const { state, dispatch } = this.editor.view;
        const { $from } = state.selection;

        // リストアイテム内ならネストを深くする
        for (let d = $from.depth; d >= 0; d--) {
          if ($from.node(d).type.name === "listItem") {
            return this.editor.commands.sinkListItem("listItem");
          }
        }

        // それ以外はインデントを増やす
        const node = $from.node();
        const attrs = node.attrs;
        const currentIndent = (attrs.indent as number) || 0;
        const tr = state.tr.setNodeMarkup($from.before(), undefined, {
          ...attrs,
          indent: currentIndent + 1,
        });
        dispatch(tr);
        return true;
      },
      "Shift-Tab": () => {
        const { state, dispatch } = this.editor.view;
        const { $from } = state.selection;

        for (let d = $from.depth; d >= 0; d--) {
          if ($from.node(d).type.name === "listItem") {
            return this.editor.commands.liftListItem("listItem");
          }
        }

        const node = $from.node();
        const attrs = node.attrs;
        const currentIndent = (attrs.indent as number) || 0;
        if (currentIndent <= 0) return false;
        const tr = state.tr.setNodeMarkup($from.before(), undefined, {
          ...attrs,
          indent: currentIndent - 1,
        });
        dispatch(tr);
        return true;
      },
    };
  },
});

// ===== Markdown ↔ HTML 変換 =====

function markdownToHtml(md: string): string {
  if (!md) return "";

  const lines = md.split("\n");
  const output: string[] = [];
  let i = 0;
  let listStack: { type: "ul" | "ol"; indent: number }[] = [];

  const closeListsTo = (targetIndent: number) => {
    while (listStack.length > 0 && listStack[listStack.length - 1].indent > targetIndent) {
      const top = listStack.pop()!;
      output.push(`</${top.type}>`);
    }
  };

  const closeAllLists = () => {
    while (listStack.length > 0) {
      const top = listStack.pop()!;
      output.push(`</${top.type}>`);
    }
  };

  const inlineConvert = (text: string): string => {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      closeAllLists();
      i++;
      continue;
    }

    // 見出し
    const h1 = line.match(/^# (.+)$/);
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    const h4 = line.match(/^#### (.+)$/);
    if (h1) { closeAllLists(); output.push(`<h1>${inlineConvert(h1[1])}</h1>`); i++; continue; }
    if (h2) { closeAllLists(); output.push(`<h2>${inlineConvert(h2[1])}</h2>`); i++; continue; }
    if (h3) { closeAllLists(); output.push(`<h3>${inlineConvert(h3[1])}</h3>`); i++; continue; }
    if (h4) { closeAllLists(); output.push(`<h4>${inlineConvert(h4[1])}</h4>`); i++; continue; }

    // 水平線
    if (line.match(/^---+$/)) {
      closeAllLists();
      output.push("<hr>");
      i++; continue;
    }

    // トグル（> タイトル → details）
    const toggleMatch = line.match(/^> (.+)$/);
    if (toggleMatch) {
      closeAllLists();
      const summaryText = toggleMatch[1];
      const contentLines: string[] = [];
      i++;
      while (i < lines.length && (lines[i].startsWith("    ") || lines[i].startsWith("\t"))) {
        contentLines.push(lines[i].replace(/^    /, "").replace(/^\t/, ""));
        i++;
      }
      const innerHtml = contentLines.length > 0
        ? contentLines.map((l) => `<p>${inlineConvert(l)}</p>`).join("")
        : "<p></p>";
      output.push(
        `<details open class="tiptap-details"><summary>${inlineConvert(summaryText)}</summary>${innerHtml}</details>`
      );
      continue;
    }

    // リスト
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const indent = Math.floor(listMatch[1].replace(/\t/g, "    ").length / 4);
      const isOrdered = /^\d+\./.test(listMatch[2]);
      const content = inlineConvert(listMatch[3]);
      const listType = isOrdered ? "ol" : "ul";

      if (listStack.length === 0 || indent > listStack[listStack.length - 1].indent) {
        output.push(`<${listType}>`);
        listStack.push({ type: listType, indent });
      } else if (indent < listStack[listStack.length - 1].indent) {
        closeListsTo(indent);
        if (listStack.length === 0 || listStack[listStack.length - 1].indent !== indent) {
          output.push(`<${listType}>`);
          listStack.push({ type: listType, indent });
        }
      }

      output.push(`<li>${content}</li>`);
      i++; continue;
    }

    // インデント付き段落
    const indentMatch = line.match(/^(\s+)(.+)$/);
    if (indentMatch) {
      closeAllLists();
      const spaces = indentMatch[1].replace(/\t/g, "    ").length;
      const indentLevel = Math.floor(spaces / 4);
      const marginStyle = indentLevel > 0 ? ` style="margin-left:${indentLevel * 32}px"` : "";
      output.push(`<p${marginStyle}>${inlineConvert(indentMatch[2])}</p>`);
      i++; continue;
    }

    // 通常段落
    closeAllLists();
    output.push(`<p>${inlineConvert(line)}</p>`);
    i++;
  }

  closeAllLists();
  return output.join("\n");
}

function htmlToMarkdown(html: string): string {
  if (!html) return "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  function nodeToMd(node: Node, listIndent = 0): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map((c) => nodeToMd(c, listIndent)).join("");

    const marginLeft = el.style?.marginLeft;
    const indentLevel = marginLeft ? Math.round(parseInt(marginLeft) / 32) : 0;
    const indentStr = "    ".repeat(indentLevel);

    switch (tag) {
      case "h1": return `# ${children}\n\n`;
      case "h2": return `## ${children}\n\n`;
      case "h3": return `### ${children}\n\n`;
      case "h4": return `#### ${children}\n\n`;
      case "h5": return `##### ${children}\n\n`;
      case "h6": return `###### ${children}\n\n`;
      case "p": return `${indentStr}${children}\n\n`;
      case "strong": case "b": return `**${children}**`;
      case "em": case "i": return `*${children}*`;
      case "code": return `\`${children}\``;
      case "a": return `[${children}](${el.getAttribute("href") || ""})`;
      case "hr": return `---\n\n`;
      case "br": return "\n";
      case "details": {
        const summary = el.querySelector(":scope > summary");
        const summaryText = summary ? (summary.textContent || "").trim() : "";
        const contentNodes = Array.from(el.childNodes).filter(
          (c) => !(c instanceof Element && c.tagName.toLowerCase() === "summary")
        );
        const contentLines = contentNodes
          .map((c) => {
            if (c instanceof Element) {
              return (c.textContent || "").trim();
            }
            return (c.textContent || "").trim();
          })
          .filter(Boolean);
        const indentedContent = contentLines.map((l) => `    ${l}`).join("\n");
        return `> ${summaryText}\n${indentedContent}\n\n`;
      }
      case "summary": return "";
      case "ul": {
        const prefix = "    ".repeat(listIndent);
        const items = Array.from(el.querySelectorAll(":scope > li")).map((li) => {
          const liEl = li as HTMLElement;
          const subList = liEl.querySelector("ul, ol");
          const subMd = subList ? nodeToMd(subList, listIndent + 1) : "";
          const liText = Array.from(li.childNodes)
            .filter((c) => !(c instanceof Element && (c.tagName === "UL" || c.tagName === "OL")))
            .map((c) => nodeToMd(c, listIndent))
            .join("")
            .trim();
          return `${prefix}- ${liText}\n${subMd}`;
        });
        return items.join("") + "\n";
      }
      case "ol": {
        const prefix = "    ".repeat(listIndent);
        const items = Array.from(el.querySelectorAll(":scope > li")).map((li, idx) => {
          const liEl = li as HTMLElement;
          const subList = liEl.querySelector("ul, ol");
          const subMd = subList ? nodeToMd(subList, listIndent + 1) : "";
          const liText = Array.from(li.childNodes)
            .filter((c) => !(c instanceof Element && (c.tagName === "UL" || c.tagName === "OL")))
            .map((c) => nodeToMd(c, listIndent))
            .join("")
            .trim();
          return `${prefix}${idx + 1}. ${liText}\n${subMd}`;
        });
        return items.join("") + "\n";
      }
      case "li": return children;
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
  const [mode, setMode] = useState<"wysiwyg" | "markdown">("wysiwyg");
  const [initialized, setInitialized] = useState(false);

  const TOGGLE_HTML = `<details open class="tiptap-details"><summary>タイトルを入力</summary><p>内容を入力</p></details>`;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        bulletList: {},
        orderedList: {},
        blockquote: false, // 引用は無効（トグルに置き換え）
        bold: {},
        italic: {},
        code: {},
        hardBreak: {},
        horizontalRule: {},
      }),
      Placeholder.configure({
        placeholder: placeholder || "本文を入力...\n「> 」でトグル、「- 」でリスト、「## 」で見出し",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline hover:text-primary/80 cursor-pointer" },
      }),
      IndentExtension,
    ],
    content: markdownToHtml(value),
    onUpdate({ editor }) {
      // detailsタグのopen/close状態をHTMLから読み取る
      const html = editor.getHTML();
      const md = htmlToMarkdown(html);
      onChange(md);
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[400px] leading-relaxed",
      },
      handleKeyDown(view, event) {
        // ">" + スペースでトグルに変換
        if (event.key === " ") {
          const { state } = view;
          const { $from } = state.selection;
          const nodeText = $from.parent.textContent;
          if (nodeText === ">") {
            event.preventDefault();
            // 現在の段落を削除してトグルを挿入
            const from = $from.start();
            const to = $from.end();
            view.dispatch(state.tr.delete(from, to));
            // insertContent でトグルHTMLを挿入
            setTimeout(() => {
              editor?.chain().focus().insertContent(TOGGLE_HTML).run();
            }, 0);
            return true;
          }
        }
        return false;
      },
    },
  });

  // detailsタグのクリックイベントをエディタDOM上で処理
  useEffect(() => {
    if (!editor) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // summary要素のクリック
      if (target.tagName === "SUMMARY" || target.closest("summary")) {
        const summary = target.tagName === "SUMMARY" ? target : target.closest("summary")!;
        const details = summary.closest("details");
        if (!details) return;

        // summaryのアイコン領域（左24px）のクリックでトグル
        const rect = summary.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        if (clickX < 28) {
          e.preventDefault();
          e.stopPropagation();
          if (details.hasAttribute("open")) {
            details.removeAttribute("open");
          } else {
            details.setAttribute("open", "");
          }
          // Tiptapのコンテンツを同期
          const html = editor.getHTML();
          const md = htmlToMarkdown(html);
          onChange(md);
        }
      }
    };

    const editorEl = editor.view.dom;
    editorEl.addEventListener("click", handleClick);
    return () => editorEl.removeEventListener("click", handleClick);
  }, [editor, onChange]);

  useEffect(() => {
    if (!editor || initialized) return;
    if (value) {
      editor.commands.setContent(markdownToHtml(value));
    }
    setInitialized(true);
  }, [editor, value, initialized]);

  const handleModeSwitch = (newMode: "wysiwyg" | "markdown") => {
    if (newMode === "wysiwyg" && mode === "markdown" && editor) {
      editor.commands.setContent(markdownToHtml(value));
    }
    setMode(newMode);
  };

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

  const insertToggle = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent(TOGGLE_HTML).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-border bg-secondary/20 sticky top-14 z-10">
        {mode === "wysiwyg" ? (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor.isActive("heading", { level: 1 })}
              title="見出し1 (#)"
            >
              <Heading1 className="h-4 w-4" />
            </ToolbarButton>
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
              onClick={insertToggle}
              active={false}
              title="トグル（折りたたみ）— または「> 」と入力"
            >
              <ChevronRight className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              active={false}
              title="区切り線"
            >
              <Minus className="h-4 w-4" />
            </ToolbarButton>
          </>
        ) : (
          <span className="text-xs text-muted-foreground px-1">Markdown編集モード — Tab = 4スペース</span>
        )}

        {/* モード切り替え */}
        <div className="ml-auto flex items-center gap-0.5 bg-secondary rounded-md p-0.5">
          <button
            type="button"
            onClick={() => handleModeSwitch("wysiwyg")}
            title="見たまま編集"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              mode === "wysiwyg" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="h-3 w-3" />
            見たまま
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch("markdown")}
            title="Markdown編集"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              mode === "markdown" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCode className="h-3 w-3" />
            Markdown
          </button>
        </div>
      </div>

      {/* Editor */}
      {mode === "wysiwyg" ? (
        <div className="px-6 md:px-10 py-6 rich-editor-content">
          <EditorContent editor={editor} />
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={"# 見出し1\n## 見出し2\n\n本文を入力...\n\n- リスト項目\n    - ネスト項目（Tab）\n\n> トグルタイトル\n    トグル内容（4スペースインデント）\n\n**太字** *斜体*"}
          className="w-full min-h-[500px] px-6 py-5 text-sm leading-relaxed bg-card font-mono resize-y focus:outline-none placeholder:text-muted-foreground/30"
          style={{ tabSize: 4 }}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              const target = e.currentTarget;
              const start = target.selectionStart;
              const end = target.selectionEnd;
              const newValue = value.substring(0, start) + "    " + value.substring(end);
              onChange(newValue);
              requestAnimationFrame(() => {
                target.selectionStart = start + 4;
                target.selectionEnd = start + 4;
              });
            }
          }}
        />
      )}
    </div>
  );
}
