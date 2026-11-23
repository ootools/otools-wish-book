/**
 * CI 构建入口：安装依赖 → vue-tsc → vite build → dist/。
 * 保持与 otools 插件模板工作流一致的脚本名，便于复用 release-plugin.yml。
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error || result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run('npm', ['install']);
run('npm', ['run', 'build']);
console.log('前端构建完成：dist/index.html 就绪');
