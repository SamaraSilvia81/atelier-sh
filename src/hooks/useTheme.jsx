import { useState, useEffect, useContext, createContext } from 'react'

export const THEMES = [
  { id: 'dark',         label: 'Crimson Dark',   desc: 'escuro & vermelho',         preview: ['#080606', '#C0211C', '#F0EDE8'], group: 'crimson' },
  { id: 'light',        label: 'Crimson Light',  desc: 'creme & vermelho',          preview: ['#F2EDE6', '#8B1410', '#1a0f0f'], group: 'crimson' },
  { id: 'forest',       label: 'Forest Dark',    desc: 'escuro & verde terminal',   preview: ['#060808', '#1CB84A', '#EAF0E8'], group: 'forest'  },
  { id: 'forest-light', label: 'Forest Light',   desc: 'claro & verde',             preview: ['#EEF4EC', '#108B30', '#0f1a0f'], group: 'forest'  },
  { id: 'violet',       label: 'Violet Dark',    desc: 'escuro & indigo/purple',    preview: ['#0A0814', '#7C4DFF', '#EAE6FF'], group: 'violet'  },
  { id: 'violet-light', label: 'Violet Light',   desc: 'lavanda & purple',          preview: ['#F0EDFF', '#6535E8', '#0A0814'], group: 'violet'  },
  { id: 'pink',         label: 'Pink Dark',      desc: 'escuro & rose/pink',        preview: ['#140810', '#E8408A', '#FFE8F5'], group: 'pink'    },
  { id: 'pink-light',   label: 'Pink Light',     desc: 'claro & pink',              preview: ['#FFF0F7', '#C82870', '#140810'], group: 'pink'    },
  { id: 'aurora',       label: 'Aurora Dark',    desc: 'escuro & violeta & pink',   preview: ['#0D0A1A', '#935CFB', '#BE21A9'], group: 'aurora'  },
  { id: 'aurora-light', label: 'Aurora Light',   desc: 'lavanda & violeta & pink',  preview: ['#F5F2FF', '#7C3BE6', '#BE21A9'], group: 'aurora'  },
]

// Pares de toggle dentro de cada grupo
const TOGGLE_PAIRS = {
  'dark':         'light',
  'light':        'dark',
  'forest':       'forest-light',
  'forest-light': 'forest',
  'violet':       'violet-light',
  'violet-light': 'violet',
  'pink':         'pink-light',
  'pink-light':   'pink',
  'aurora':       'aurora-light',
  'aurora-light': 'aurora',
}

// Context global — um único estado de tema para toda a app
const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem('atelier_theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('atelier_theme', theme)
  }, [theme])

  function setTheme(t) { setThemeState(t) }

  function toggleTheme() {
    setThemeState(t => TOGGLE_PAIRS[t] || 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Hook que qualquer componente usa — agora todos compartilham o mesmo estado
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
