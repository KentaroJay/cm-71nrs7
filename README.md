# coverage-map — Sub-RQ2 進捗マップ（実験刺激）

物理クラウドソーシング実験（Sub-RQ2: 収集進捗の開示はカバレッジを上げるか）の
**処置群ワーカーに提示する進捗マップ**。政令指定都市20市の写真収集状況を表示する。

- 静的ページ1枚。ランタイム依存ゼロ・ビルドなし。
- 実験中に触るのは **`data.json` だけ**。
- このページの文言・要素はすべて実験刺激の一部。実験開始後は `data.json` 以外を変更しないこと。

## 実験中の更新手順（写真を検証・承認したら）

1. `data.json` の該当都市の `submissions` を +1 する
2. その都市の初回承認なら `firstFilledAt` に承認日時を入れる
3. 先頭の `updatedAt` を現在時刻に更新する
4. commit → push（GitHub Pages に約1分で反映）

達成/未達成は `submissions > 0` から自動で導出される（`status` フィールドは無い）。

```json
{ "id": "sendai", "name": "仙台市", "pref": "宮城県", "prefCode": 4,
  "submissions": 1, "firstFilledAt": "2026-07-02T10:00:00+09:00" }
```

`submissions` は承認済み提出の**件数**。同一都市への複数提出もここで記録できる。
提出数は都市別テーブルの「提出数」列としてワーカーにも見える
（見せない場合は `index.html` の該当 `<th>` と `<td>` を削る — ただし実験開始前に決めること）。

## 初期セットアップ

### GitHub Pages

1. **推測されにくい名前**のリポジトリを作る（例: `cm-x7k2q9`）。
   無料プランのPagesは公開リポジトリが必要。検索避けは `noindex` メタ + `robots.txt` で対応済み。
   非公開リポジトリでPagesを使うならGitHub Pro。
2. Settings → Pages → Branch: `main`, root。
3. URLはワーカーへの依頼メッセージでのみ共有する（統制群に漏れないこと）。

### GoatCounter（閲覧ログ = 操作チェック用）

処置群が実際にマップを見たことを論文で報告するための、Cookie不使用のアクセスカウンタ。

1. https://www.goatcounter.com/ で無料アカウントを作成（サイトコードを決める）
2. `index.html` 内の `GOATCOUNTER_CODE = ""` にそのコードを入れる
3. ダッシュボード（`https://<code>.goatcounter.com`）で閲覧数・時刻を確認できる
4. **倫理審査**: 個人情報は収集しないが、アクセス記録を取る旨を同意文/募集文に記載すること

空文字のままなら何も読み込まれない（外部リクエストゼロ）。

## 地図の再生成（実験前に一度だけ）

県境SVGは `scripts/generate-map.mjs` が `index.html` の
`<!-- MAP:START -->` 〜 `<!-- MAP:END -->` 区間に注入したもの。通常は再実行不要。
都市の座標・ラベル位置を変えたいときだけ:

```sh
cd scripts && npm install && node generate-map.mjs
```

地形の細かさは `SIMPLIFY_KEEP`（残す点の割合、現在0.08 ≈ SVG 104KB）で調整。
地形データ: [dataofjapan/land](https://github.com/dataofjapan/land)（japan.topojson）。

## 動作確認

```sh
python3 -m http.server 8000
# → http://localhost:8000
```

`data.json` の `submissions` をいくつか書き換えてリロードし、
カウンタ・県の色（無/一部=斜線/全=緑）・ドット・テーブルが一致することを確認する。

## 実験開始前チェックリスト

- [ ] `data.json` を全都市 `submissions: 0` / `firstFilledAt: null` にリセット
- [ ] `GOATCOUNTER_CODE` を設定
- [ ] タスク手順のおさらい文を Lancers/CrowdWorks の募集文と一言一句そろえる（`index.html` 内 TODO）
- [ ] 提出数列を見せるかどうかを最終決定
- [ ] スマホ実機で表示確認
