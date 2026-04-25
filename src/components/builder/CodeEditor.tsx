import { useEffect, useRef, useState } from 'react'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-json'
import 'prismjs/plugins/line-numbers/prism-line-numbers'
import 'prismjs/plugins/line-numbers/prism-line-numbers.css'
import { ScrollArea } from '@/components/ui/scroll-area'

interface CodeEditorProps {
  code: string
  language: string
  readOnly?: boolean
  className?: string
  onChange?: (code: string) => void
  showLineNumbers?: boolean
}

export function CodeEditor({ code, language, readOnly = true, className = '', onChange, showLineNumbers = true }: CodeEditorProps) {
  const codeRef = useRef<HTMLElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [localCode, setLocalCode] = useState(code)
  const lineCount = localCode.split('\n').length

  useEffect(() => {
    setLocalCode(code)
  }, [code])

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current)
    }
  }, [localCode, language])

  const getLanguageClass = (lang: string) => {
    const languageMap: Record<string, string> = {
      'javascript': 'language-javascript',
      'typescript': 'language-typescript',
      'jsx': 'language-jsx',
      'tsx': 'language-tsx',
      'css': 'language-css',
      'html': 'language-markup',
      'vue': 'language-markup',
      'svelte': 'language-markup',
      'json': 'language-json'
    }
    return languageMap[lang] || 'language-javascript'
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value
    setLocalCode(newCode)
    onChange?.(newCode)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = localCode.substring(0, start) + '  ' + localCode.substring(end)
      
      setLocalCode(newValue)
      onChange?.(newValue)
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      }, 0)
    }
  }

  if (readOnly) {
    return (
      <ScrollArea className={`relative ${className}`}>
        <div className="flex">
          {showLineNumbers && (
            <div className="bg-[#1e1e1e] text-[#858585] text-right p-4 pr-3 font-mono text-[13px] leading-[1.6] select-none border-r border-[#404040]">
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i + 1}>{i + 1}</div>
              ))}
            </div>
          )}
          <pre className={`!m-0 !bg-[#2d2d2d] !border-0 !rounded-none overflow-visible p-4 flex-1 ${showLineNumbers ? 'line-numbers' : ''}`}>
            <code 
              ref={codeRef}
              className={getLanguageClass(language)}
              style={{ 
                fontSize: '13px',
                lineHeight: '1.6',
                tabSize: 2
              }}
            >
              {localCode}
            </code>
          </pre>
        </div>
      </ScrollArea>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative w-full h-full flex">
        {showLineNumbers && (
          <div className="bg-[#1e1e1e] text-[#858585] text-right p-4 pr-3 font-mono text-[13px] leading-[1.6] select-none border-r border-[#404040] z-10">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1}>{i + 1}</div>
            ))}
          </div>
        )}
        <div className="relative flex-1">
          <ScrollArea className="absolute inset-0 pointer-events-none">
            <pre className="!m-0 !bg-transparent !border-0 !rounded-none overflow-visible p-4">
              <code 
                ref={codeRef}
                className={getLanguageClass(language)}
                style={{ 
                  fontSize: '13px',
                  lineHeight: '1.6',
                  tabSize: 2
                }}
              >
                {localCode}
              </code>
            </pre>
          </ScrollArea>
          <textarea
            ref={textareaRef}
            value={localCode}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="absolute inset-0 w-full h-full p-4 font-mono text-[13px] leading-[1.6] bg-[#2d2d2d] text-transparent caret-white resize-none outline-none border-0"
            style={{ 
              tabSize: 2,
              caretColor: 'white'
            }}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  )
}
