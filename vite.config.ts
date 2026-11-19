import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // Fechas y semanas se calculan en hora de Buenos Aires, igual que para los clientes
    env: { TZ: 'America/Argentina/Buenos_Aires' },
  },
})
