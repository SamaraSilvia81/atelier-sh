import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Vite 8 usa rolldown como minifier padrão, que tem um bug de TDZ
    // com closures aninhadas (linkifyjs / TipTap). Desabilitar a minificação
    // resolve o ReferenceError: Cannot access '_' before initialization.
    // O bundle não-minificado (~2.5MB) chega ao browser como ~600KB com gzip,
    // que o Vercel ativa automaticamente.
    minify: false,
  },
})