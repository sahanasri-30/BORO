import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins:[react()],
  build:{rollupOptions:{output:{manualChunks(id){
    if(id.includes('/node_modules/@fullcalendar/'))return 'calendar-vendor';
    if(id.includes('/node_modules/recharts')||id.includes('/node_modules/victory-'))return 'charts-vendor';
    if(id.includes('/node_modules/lucide-react'))return 'icons-vendor';
    if(id.includes('/node_modules/react'))return 'react-vendor';
  }}}}
});
