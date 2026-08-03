# Xブックマーク画像ギャラリー（静的サイト / 合言葉で復号）

Xブックマークの画像グリッド。**GitHub Pages で配信する完全な静的サイト**で、サーバーは無い。

リポジトリは公開だが、データ（`data.enc.json`）は合言葉から導いた鍵で暗号化してあるので、
合言葉を知らない人にはただのバイナリに見える。復号はブラウザ内（WebCrypto）で行う。

- 画像は pbs.twimg.com を直リンクしているだけ（このサイトは画像を保持しない）
- Xにも Google にもログインしない。ブックマークを読むのはローカルの整理ルーチン側

## 構成

| ファイル | 役割 |
|---|---|
| `index.html` | ギャラリー本体。合言葉ゲート＋復号＋マソンリー表示 |
| `data.enc.json` | 暗号化データ（毎朝ルーチンが更新して push） |
| `tools/encrypt.js` | 平文JSON → `data.enc.json` |
| `tools/publish.js` | 暗号化 → commit → push（Pagesが自動反映） |
| `.passphrase` | 合言葉（**gitignore 済み。絶対にコミットしない**） |

## 暗号方式

- 鍵導出: PBKDF2-SHA256 / 310,000回 / 16byteランダムsalt
- 暗号: AES-256-GCM（12byte IV、認証タグ付き）
- 平文は gzip 圧縮してから暗号化（ブラウザ側は `DecompressionStream('gzip')` で展開）
- `index.html` の復号ロジックと `tools/encrypt.js` は1対1対応。片方だけ変えると開けなくなる

平文に含まれるのはツイートID・ハンドル・画像URL・画像枚数のみ。

## 更新（毎日）

ローカルの整理ルーチンが仕分け後に呼ぶ:

```
node tools/publish.js <平文JSONのパス>
```

手動でやる場合も同じ。push すると GitHub Pages が1分前後で反映する。

## 合言葉を変える

```
# .passphrase を書き換えてから、直近の平文JSONで暗号化し直して push
node tools/publish.js <平文JSONのパス>
```

変更後は各端末で一度入れ直す（ブラウザの localStorage に覚えさせている）。

## ローカル確認

`file://` だと WebCrypto が使えないので、簡易サーバー経由で開く:

```
npx serve .
```
