import { mergeConfig } from 'vite';
import base from './vite.config';
export default mergeConfig(base, { server: { fs: { allow: ['/home/user'] } }, cacheDir: 'node_modules/.vite-tg' });
