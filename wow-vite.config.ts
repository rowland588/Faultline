import { mergeConfig } from 'vite';
import base from './vite.config';
export default mergeConfig(base as never, { cacheDir: 'node_modules/.vite-wow', server: { fs: { allow: ['/home/user'] } } });
