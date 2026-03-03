/**
 * RichEditor.tsx
 * Notionライクなインライン編集エディタ（HTML保存方式）
 *
 * 【設計方針】
 * - TiptapのHTMLをそのまま保存・読み込みする
 * - Markdown↔HTML変換は一切行わない
 * - value/onChangeはHTML文字列をやり取りする
 * - トグルはdetails/summaryタグで保存され、公開ページでもネイティブに開閉可能
 */

import React, { useCallback, useRef } from "react";
import {
  useEditor,
  EditorContent,
  Extension,
  Node,
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer,
  mergeAttributes,
  InputRule,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
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
} from "lucide-react";

// ===== トグルノードのReactコンポーネント（エディタ内表示用） =====

function ToggleNodeView({ node, updateAttributes, editor, getPos }: {
  node: any;
  updateAttributes: (attrs: Record<string, any>) => void;
  editor: any;
  getPos: () => number | undefined;
}) {
  const isOpen = node.attrs.open as boolean;
  const title = node.attrs.title as string;

  const toggleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateAttributes({ open: !isOpen });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAttributes({ title: e.target.value });
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!isOpen) {
        updateAttributes({ open: true });
      }
      const pos = getPos();
      if (pos !== undefined) {
        editor.chain().focus().setTextSelection(pos + 2).run();
      }
    }
  };

  return (
    <NodeViewWrapper className="toggle-block my-2">
      <div className="toggle-title flex items-center gap-1.5 group">
        <button
          type="button"
          onClick={toggleOpen}
          className="toggle-arrow flex-shrink-0 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-all"
          style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
          contentEditable={false}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
          placeholder="トグルのタイトル"
          className="toggle-title-input flex-1 bg-transparent border-none outline-none font-medium text-foreground placeholder:text-muted-foreground/50 cursor-text"
          contentEditable={false}
        />
      </div>
      {isOpen && (
        <div className="toggle-content pl-6 mt-1 border-l-2 border-border/50">
          <NodeViewContent className="toggle-content-inner outline-none" />
        </div>
      )}
    </NodeViewWrapper>
  );
}

// ===== トグルノード定義 =====
// エディタ内ではReact NodeViewで表示
// renderHTMLでは<details><summary>タグを出力（公開ページ用）

const ToggleNode = Node.create({
  name: "toggleBlock",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el) => {
          // <details>タグからの読み込み
          if (el.tagName === "DETAILS") {
            return el.hasAttribute("open");
          }
          return el.getAttribute("data-open") === "true";
        },
        renderHTML: (attrs) => ({}), // renderHTMLで直接制御するので空
      },
      title: {
        default: "",
        parseHTML: (el) => {
          // <details>タグの<summary>からタイトルを取得
          if (el.tagName === "DETAILS") {
            const summary = el.querySelector("summary");
            return summary?.textContent || "";
          }
          return el.getAttribute("data-title") || "";
        },
        renderHTML: (attrs) => ({}), // renderHTMLで直接制御するので空
      },
    };
  },

  parseHTML() {
    return [
      { tag: "details" },
      { tag: "div[data-type='toggle-block']" },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    // <details><summary>タイトル</summary>コンテンツ</details> として出力
    const title = node.attrs.title || "";
    const isOpen = node.attrs.open;
    return [
      "details",
      mergeAttributes(HTMLAttributes, {
        class: "toggle-details",
        ...(isOpen ? { open: "true" } : {}),
      }),
      ["summary", { class: "toggle-summary" }, title],
      ["div", { class: "toggle-content-inner" }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleNodeView);
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor.view;
        const { $from } = state.selection;
        for (let d = $from.depth; d >= 0; d--) {
          if ($from.node(d).type.name === "toggleBlock") {
            return false;
          }
        }
        return false;
      },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^> $/,
        handler: ({ state, range, chain }) => {
          chain()
            .deleteRange(range)
            .insertContent({
              type: "toggleBlock",
              attrs: { open: true, title: "" },
              content: [{ type: "paragraph" }],
            })
            .run();
        },
      }),
    ];
  },
});

// ===== インデント拡張 =====

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

// ===== ツールバーボタン =====

function ToolbarButton({
  onClick, active, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
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
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichEditor({ value, onChange, placeholder }: RichEditorProps) {
  // onChangeをrefに保持してTiptap onUpdate内で最新のonChangeを呼べるようにする
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        bulletList: {},
        orderedList: {},
        blockquote: false,
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
      ToggleNode,
      IndentExtension,
    ],
    content: value || "<p></p>",
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChangeRef.current(html);
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[400px] leading-relaxed",
      },
    },
  });

  // 外部からvalueが大きく変わった場合（記事ロード完了時）のみエディタを更新
  const prevValueRef = useRef(value);
  const isInternalUpdate = useRef(false);

  React.useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      editor.commands.setContent(value || "<p></p>");
    }
  }, [editor, value]);

  // onUpdateでisInternalUpdateフラグを立てる
  React.useEffect(() => {
    if (!editor) return;
    const originalOnUpdate = editor.options.onUpdate;
    editor.on("update", () => {
      isInternalUpdate.current = true;
    });
  }, [editor]);

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
    editor.chain().focus().insertContent({
      type: "toggleBlock",
      attrs: { open: true, title: "トグルのタイトル" },
      content: [{ type: "paragraph" }],
    }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-border bg-secondary/20 sticky top-14 z-10">
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
      </div>

      {/* Editor */}
      <div className="px-6 md:px-10 py-6 rich-editor-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
