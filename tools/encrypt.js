// 平文のギャラリーJSON -> data.enc.json (AES-256-GCM / PBKDF2-SHA256 / gzip)
// 使い方: node tools/encrypt.js <平文JSONのパス> [パスフレーズ]
//   パスフレーズ省略時は GALLERY_PASSPHRASE 環境変数、次に .passphrase ファイルを見る。
//
// 出力フォーマットは index.html の復号ロジックと1対1で対応している。片方だけ変えないこと。

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const ITERATIONS = 310000; // OWASP 2023 の PBKDF2-SHA256 推奨値

function readPassphrase(argv) {
  if (argv) return argv;
  if (process.env.GALLERY_PASSPHRASE) return process.env.GALLERY_PASSPHRASE;
  const f = path.join(ROOT, '.passphrase');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  throw new Error('パスフレーズが無い。引数か GALLERY_PASSPHRASE か .passphrase ファイルで渡す');
}

function encrypt(data, passphrase) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(passphrase, salt, ITERATIONS, 32, 'sha256');
  const gz = zlib.gzipSync(Buffer.from(JSON.stringify(data), 'utf8'), { level: 9 });
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(gz), cipher.final(), cipher.getAuthTag()]);

  let items = 0;
  for (const arr of Object.values(data)) if (Array.isArray(arr)) items += arr.length;

  return {
    v: 1,
    alg: 'AES-GCM',
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: salt.toString('base64') },
    iv: iv.toString('base64'),
    gzip: true,
    updatedAt: new Date().toISOString(),
    meta: { folders: Object.keys(data).length, items },
    ct: ct.toString('base64'),
  };
}

if (require.main === module) {
  const src = process.argv[2];
  if (!src) {
    console.error('使い方: node tools/encrypt.js <平文JSONのパス> [パスフレーズ]');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(src, 'utf8'));
  const out = encrypt(data, readPassphrase(process.argv[3]));
  const dest = path.join(ROOT, 'data.enc.json');
  fs.writeFileSync(dest, JSON.stringify(out));
  const kb = (fs.statSync(dest).size / 1024).toFixed(0);
  console.log(`data.enc.json を書き出し: ${out.meta.folders}フォルダ / ${out.meta.items}件 / ${kb}KB`);
}

module.exports = { encrypt, readPassphrase };
