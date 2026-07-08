# Xブックマーク画像ギャラリー（パスワード付き・非公開ウェブアプリ）

自分だけがパスワードで開ける、Xブックマークの画像グリッド。Railway 等の普通のサーバーで動くので、
Claudeのアーティファクトと違いX（pbs.twimg.com）の画像がちゃんと表示されます。

データは「毎朝の整理ルーチン」が `POST /api/update` に送り込みます。アプリ自体はXやGoogleに
一切ログインしません（Xのブックマークはローカルの整理ルーチンが読み、結果の画像URL一覧だけをここに送る）。

## 仕組み
- `GET /` … ギャラリー画面（Basic認証で保護）
- `GET /data.json` … 画像データ（Basic認証で保護）
- `POST /api/update?token=UPDATE_TOKEN` … データ差し替え（トークンで保護。CORSオープン）

## 環境変数
| 変数 | 用途 | 例 |
|---|---|---|
| `VIEW_USER` | 閲覧用ユーザー名 | `yutan` |
| `VIEW_PASSWORD` | 閲覧用パスワード（必須。未設定だと誰でも見られる） | 長めのランダム文字列 |
| `UPDATE_TOKEN` | データ更新用の秘密トークン（必須） | 長めのランダム文字列 |
| `DATA_DIR` | データ保存先。Railwayのボリューム推奨 | `/data` |
| `PORT` | Railwayが自動で渡す | （設定不要） |

## Railway へのデプロイ手順（あなたの作業）
1. GitHub にこのフォルダをリポジトリとして push（またはRailwayのCLI `railway up` を使用）。
2. [railway.app](https://railway.app) でアカウント作成 → **New Project → Deploy from GitHub repo**（またはCLI）。
3. Railwayが Node を自動検出し `npm install` → `npm start` で起動する。
4. **Variables** タブで上表の環境変数を設定：
   - `VIEW_USER`, `VIEW_PASSWORD`, `UPDATE_TOKEN` を必ず設定（パスワード・トークンは推測されない長い文字列に）。
   - データを永続化するなら **Volumes** でボリュームを作成し、マウントパスを `/data` にして `DATA_DIR=/data` を設定。
     （ボリューム無しでも動くが、再デプロイ/再起動でデータが消え、翌朝の更新まで空になる）
5. 発行された公開URL（例 `https://xxxx.up.railway.app`）を控える。
6. スマホのブラウザでそのURLを開く → ユーザー名/パスワードを入力 → ギャラリーが見られる。

## データの初回投入と毎日更新
- **初回**：Claudeに「URLとトークンを教えるので初回データを送って」と伝える。Claudeがローカルの整理結果をこのアプリに一度送る。
- **毎日**：朝5時の整理ルーチン `daily-bookmark-sort` が、仕分け後に最新データを `POST /api/update` に送る（URLとトークンをルーチンに登録済みの場合）。
  - 単純なHTTPS POSTなので、対話ログインが要らず無人実行でも動く（Drive方式の弱点を回避）。

## ローカル確認（任意）
```
npm install
VIEW_PASSWORD=test UPDATE_TOKEN=t1 npm start
# http://localhost:3000 を開く（ユーザー user / パス test）
```
