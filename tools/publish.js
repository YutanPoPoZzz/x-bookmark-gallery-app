// 平文ギャラリーJSON -> 暗号化 -> commit -> push (GitHub Pages が自動で反映)
// 使い方: node tools/publish.js <平文JSONのパス>
// 毎朝のルーチン(x-bookmark-runner)からも、手動でもこれを叩く。

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { encrypt, readPassphrase } = require('./encrypt');

const ROOT = path.join(__dirname, '..');

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

const src = process.argv[2];
if (!src) {
  console.error('使い方: node tools/publish.js <平文JSONのパス>');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(src, 'utf8'));
const out = encrypt(data, readPassphrase(process.argv[3]));
fs.writeFileSync(path.join(ROOT, 'data.enc.json'), JSON.stringify(out));
console.log(`暗号化: ${out.meta.folders}フォルダ / ${out.meta.items}件`);

git('add', 'data.enc.json');
// 中身が同じでも salt/iv/updatedAt が毎回変わるので、実質常に差分は出る
if (!git('status', '--porcelain', 'data.enc.json')) {
  console.log('差分なし。pushをスキップ');
  process.exit(0);
}
git('commit', '-m', `data: ${out.meta.items}件 / ${out.meta.folders}フォルダ`);
git('push', 'origin', 'HEAD');
console.log(`push完了 (${out.meta.items}件)`);
