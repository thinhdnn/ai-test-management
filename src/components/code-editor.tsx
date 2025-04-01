"use client";

import { javascript } from "@codemirror/lang-javascript";
import CodeMirror from "@uiw/react-codemirror";
import { useState, useEffect } from "react";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

export function CodeEditor({
  value,
  onChange,
  placeholder = "Enter your code here...",
  height = "300px",
}: CodeEditorProps) {
  const [mounted, setMounted] = useState(false);
  
  // Thêm một số dòng mặc định nếu không có nội dung
  const initialValue = value || '\n\n\n\n\n\n\n\n\n\n';

  // Prevent hydration errors by only rendering CodeMirror on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Thêm global styles cho CodeMirror khi component được load
  useEffect(() => {
    // Tạo một style element để thêm CSS rules
    const styleEl = document.createElement('style');
    styleEl.setAttribute('id', 'code-mirror-styles');
    styleEl.innerHTML = `
      .cm-editor {
        height: 100% !important;
        min-height: 300px !important;
        max-height: 100% !important;
        overflow: auto !important;
      }
      .cm-scroller {
        overflow: auto !important;
        min-height: 300px !important;
      }
      .cm-content {
        min-height: 300px !important;
      }
    `;
    
    // Thêm style element vào document head nếu chưa tồn tại
    if (!document.getElementById('code-mirror-styles')) {
      document.head.appendChild(styleEl);
    }
    
    // Cleanup khi component unmount
    return () => {
      const existingStyle = document.getElementById('code-mirror-styles');
      if (existingStyle && existingStyle.parentNode) {
        existingStyle.parentNode.removeChild(existingStyle);
      }
    };
  }, []);

  if (!mounted) {
    return (
      <div
        className="w-full font-mono p-3 border rounded-md"
        style={{ height, minHeight: "300px" }}
      >
        {value || placeholder}
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden" style={{ height, minHeight: "300px" }}>
      <CodeMirror
        value={initialValue}
        height="100%"
        minHeight="300px"
        theme={vscodeDark}
        extensions={[javascript({ jsx: true })]}
        onChange={onChange}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          autocompletion: true,
          tabSize: 2,
          bracketMatching: true,
        }}
        className="w-full overflow-auto min-h-[300px]"
      />
    </div>
  );
} 