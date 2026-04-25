import { useEffect, useRef, useState } from 'react'
import Prism from 'prismjs'
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

export type CodeTheme = 'tomorrow' | 'okaidia' | 'twilight' | 'coy' | 'solarized' | 'funky' | 'dark'

interface CodeEditorProps {
  code: string
  language: string
  readOnly?: boolean
  className?: string
  onChange?: (code: string) => void
  showLineNumbers?: boolean
  theme?: CodeTheme
}

export function CodeEditor({ code, language, readOnly = true, className = '', onChange, showLineNumbers = true, theme = 'tomorrow' }: CodeEditorProps) {
  const codeRef = useRef<HTMLElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [localCode, setLocalCode] = useState(code)
  const lineCount = localCode.split('\n').length

  useEffect(() => {
    setLocalCode(code)
  }, [code])

  useEffect(() => {
    const loadTheme = async () => {
      const existingTheme = document.querySelector('link[data-prism-theme]')
      if (existingTheme) {
        existingTheme.remove()
      }

      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.setAttribute('data-prism-theme', theme)
      
      try {
        const themeMap: Record<CodeTheme, string> = {
          tomorrow: 'prism-tomorrow.css',
          okaidia: 'prism-okaidia.css',
          twilight: 'prism-twilight.css',
          coy: 'prism-coy.css',
          solarized: 'prism-solarizedlight.css',
          funky: 'prism-funky.css',
          dark: 'prism-dark.css'
        }
        
        const themeFile = themeMap[theme] || themeMap.tomorrow
        const themeModule = await import(`prismjs/themes/${themeFile}`)
        link.href = new URL(`prismjs/themes/${themeFile}`, import.meta.url).href
        document.head.appendChild(link)
      } catch (error) {
        console.warn('Failed to load theme:', theme)
      }
    }

    loadTheme()
  }, [theme])

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

  const getThemeColors = (theme: CodeTheme) => {
    const themeColors: Record<CodeTheme, { bg: string; lineNumbers: string; border: string; text: string }> = {
      tomorrow: { bg: '#2d2d2d', lineNumbers: '#858585', border: '#404040', text: '#ccc' },
      okaidia: { bg: '#272822', lineNumbers: '#8F908A', border: '#49483E', text: '#f8f8f2' },
      twilight: { bg: '#141414', lineNumbers: '#777', border: '#333', text: '#f8f8f8' },
      coy: { bg: '#fdfdfd', lineNumbers: '#999', border: '#e1e1e1', text: '#5e6687' },
      solarized: { bg: '#fdf6e3', lineNumbers: '#93a1a1', border: '#eee8d5', text: '#657b83' },
      funky: { bg: '#000000', lineNumbers: '#888', border: '#333', text: '#ffffff' },
      dark: { bg: '#1e1e1e', lineNumbers: '#858585', border: '#404040', text: '#d4d4d4' }
    }
    return themeColors[theme] || themeColors.tomorrow
  }

  const themeColors = getThemeColors(theme)

  if (readOnly) {
    return (
      <ScrollArea className={`relative ${className}`}>
        <div className="flex">
          {showLineNumbers && (
            <div 
              className="text-right p-4 pr-3 font-mono text-[13px] leading-[1.6] select-none border-r"
              style={{
                backgroundColor: themeColors.bg,
                color: themeColors.lineNumbers,
                borderColor: themeColors.border
              }}
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i + 1}>{i + 1}</div>
              ))}
            </div>
          )}
          <pre 
            className={`!m-0 !border-0 !rounded-none overflow-visible p-4 flex-1 ${showLineNumbers ? 'line-numbers' : ''}`}
            style={{ backgroundColor: themeColors.bg }}
          >
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
          <div 
            className="text-right p-4 pr-3 font-mono text-[13px] leading-[1.6] select-none border-r z-10"
            style={{
              backgroundColor: themeColors.bg,
              color: themeColors.lineNumbers,
              borderColor: themeColors.border
            }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1}>{i + 1}</div>
            ))}
          </div>
        )}
        <div className="relative flex-1">
          <ScrollArea className="absolute inset-0 pointer-events-none">
            <pre 
              className="!m-0 !bg-transparent !border-0 !rounded-none overflow-visible p-4"
            >
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
            className="absolute inset-0 w-full h-full p-4 font-mono text-[13px] leading-[1.6] text-transparent caret-white resize-none outline-none border-0"
            style={{ 
              tabSize: 2,
              caretColor: 'white',
              backgroundColor: themeColors.bg
            }}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  )
}
