import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { fetchRemoteContent, installAdminFetch } from './utils/remote.ts';
import './index.css';

installAdminFetch();

// Ambil konten dari server (Cloudflare KV) dulu agar artikel buatan admin tampil untuk semua pengunjung.
// Selama menunggu, HTML hasil render server (untuk SEO) tetap terlihat di #root.
fetchRemoteContent().then((remote) => {
  createRoot(document.getElementById('root')!).render(<App remote={remote} />);
});
