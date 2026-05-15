import React, { useRef, useEffect, useState } from "react";
import "quill/dist/quill.snow.css";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  ListOrdered,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link,
  Image as ImageIcon,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
} from "lucide-react";

/**
 * Converts a raw description_generated string (which may start with plain text
 * before HTML tags) into valid HTML for Quill. Plain-text lines before the first
 * HTML tag are wrapped in <p> elements so Quill renders them correctly.
 */
function normalizeToHTML(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const firstTag = trimmed.indexOf("<");
  if (firstTag === -1) {
    // Pure plain text — wrap each line in <p>
    return trimmed
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => `<p>${l}</p>`)
      .join("");
  }
  if (firstTag === 0) return trimmed; // Already starts with HTML
  // Mixed: plain text prefix + HTML body
  const plainPart = trimmed.slice(0, firstTag).trim();
  const htmlPart = trimmed.slice(firstTag);
  const wrappedPlain = plainPart
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<p>${l}</p>`)
    .join("");
  return wrappedPlain + htmlPart;
}

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const QuillEditor: React.FC<QuillEditorProps> = ({
  value,
  onChange,
  placeholder = "",
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const Quill = (await import("quill")).default;

      if (!mounted || !editorRef.current || !toolbarRef.current) return;

      const modules = {
        toolbar: toolbarRef.current,
      };

      quillRef.current = new Quill(editorRef.current, {
        theme: "snow",
        modules,
        placeholder,
      });

      // editorRef.current IS the .ql-container after Quill init
      editorRef.current.style.height = "300px";
      editorRef.current.style.overflow = "hidden";
      editorRef.current.style.boxSizing = "border-box";

      const editorEl = editorRef.current.querySelector(
        ".ql-editor",
      ) as HTMLElement | null;
      if (editorEl) {
        editorEl.style.height = "100%";
        editorEl.style.maxHeight = "100%";
        editorEl.style.overflowY = "scroll";
        editorEl.style.overscrollBehavior = "contain";
        editorEl.style.boxSizing = "border-box";
      }

      if (value) {
        quillRef.current.clipboard.dangerouslyPasteHTML(normalizeToHTML(value));
      }

      quillRef.current.on("text-change", () => {
        const html = quillRef.current.root.innerHTML;
        onChange(html);
      });

      setLoaded(true);
    })();

    return () => {
      mounted = false;
      if (quillRef.current) {
        quillRef.current.off("text-change");
        quillRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const q = quillRef.current;
    if (!q) return;

    const current = q.root.innerHTML;
    const normalized = normalizeToHTML(value || "");
    // Only update if content genuinely differs to avoid cursor jumps
    if (normalized && normalized !== current) {
      q.clipboard.dangerouslyPasteHTML(normalized);
    } else if (!normalized && current !== "<p><br></p>") {
      q.clipboard.dangerouslyPasteHTML("");
    }
  }, [value]);

  return (
    <div className="relative border border-gray-200 rounded-lg bg-card shadow-xs! flex flex-col min-h-0">
      {/* --- STYLED TOOLBAR --- */}
      <div
        ref={toolbarRef}
        className="flex flex-wrap gap-2 p-3 border-b border-border bg-muted/40 rounded-t-lg"
      >
        {/* HEADER */}
        <div className="flex items-center gap-1">
          <button className="ql-header" value="1">
            <Heading1 size={18} />
          </button>
          <button className="ql-header" value="2">
            <Heading2 size={18} />
          </button>
          <button className="ql-header" value="3">
            <Heading3 size={18} />
          </button>
          <button className="ql-header" value="">
            <p className="text-sm font-semibold">P</p>
          </button>
        </div>

        {/* FORMATTING */}
        <div className="flex items-center gap-1">
          <button className="ql-bold">
            <Bold size={18} />
          </button>
          <button className="ql-italic">
            <Italic size={18} />
          </button>
          <button className="ql-underline">
            <Underline size={18} />
          </button>
          <button className="ql-strike">
            <Strikethrough size={18} />
          </button>
        </div>

        {/* LISTS */}
        <div className="flex items-center gap-1">
          <button className="ql-list" value="ordered">
            <ListOrdered size={18} />
          </button>
          <button className="ql-list" value="bullet">
            <List size={18} />
          </button>
        </div>

        {/* ALIGNMENT */}
        <div className="flex items-center gap-1">
          <button className="ql-align" value="">
            <AlignLeft size={18} />
          </button>
          <button className="ql-align" value="center">
            <AlignCenter size={18} />
          </button>
          <button className="ql-align" value="right">
            <AlignRight size={18} />
          </button>
          <button className="ql-align" value="justify">
            <AlignJustify size={18} />
          </button>
        </div>

        {/* LINKS & IMAGES */}
        <div className="flex items-center gap-1">
          <button className="ql-link">
            <Link size={18} />
          </button>
          <button className="ql-image">
            <ImageIcon size={18} />
          </button>
        </div>

        {/* CLEAN FORMAT */}
        <div className="flex items-center gap-1">
          <button className="ql-clean">
            <Eraser size={18} />
          </button>
        </div>
      </div>

      {/* --- EDITOR --- */}
      <div
        ref={editorRef}
        className="cursor-text"
        onClick={() => quillRef.current?.focus()}
      />

      {!loaded && (
        <div className="absolute inset-0 bg-card/60 flex items-center justify-center pointer-events-none rounded-lg">
          <div className="text-muted-foreground">Chargement…</div>
        </div>
      )}
    </div>
  );
};
