# HTML → PPTX 変換ツール 仕様書（初期案）

## 1. 目的

インターネット接続が制限された完全ローカル・イントラネット環境において、生成AI等で作成した **16:9のPowerPoint風HTMLスライド** を、可能な限り **編集可能なPowerPoint（.pptx）** に変換するローカルツールを作成する。

最初は個人利用を前提とした **Windows単一EXE** とし、将来的には組織内ユーザーがブラウザから利用できる **Webシステム化** を想定する。

---

## 2. 背景

インターネット接続が制限されたローカル（イントラネット）環境では、外部CDNを利用するJavaScriptライブラリや外部Webサービスを利用できない。

生成AIではHTML/CSSによるスライド生成は可能であるが、そのHTMLをそのまま編集可能なPPTXへ変換する手段が不足している。

そのため、以下を実現するローカル変換ツールを作成する。

```text
生成AI
  ↓
16:9 HTMLスライド
  ↓
HTML → PPTX変換ツール
  ↓
編集可能なPowerPoint
```

---

## 3. 開発方針

### 3.1 初期段階

まずは自分自身が利用するローカルツールとして開発する。

- Windows向け
- 単一EXEで配布可能
- インストーラー不要を目標
- CDN禁止
- インターネット接続不要
- Node.js / Python等のランタイムを利用者側へ別途インストールさせない
- EdgeまたはChromeを利用したローカルWeb UIを想定

### 3.2 将来段階

初期版で作成した変換ロジックを活用し、社内Webシステムへ展開する。

```text
初期版
Go EXE
  ↓
localhost
  ↓
ブラウザUI
  ↓
HTML → PPTX

将来版
社内Webサーバ
  ↓
ブラウザUI
  ↓
HTML → PPTX
```

変換ロジックをフロントエンドJavaScript側へ寄せ、Go側と疎結合にすることでWeb化時の作り直しを抑える。

---

# 4. 想定技術構成

## 4.1 基本構成

```text
Html2Pptx.exe
│
├─ Go
│   ├─ ローカルHTTPサーバ
│   ├─ ファイル選択／受け渡し
│   ├─ 出力先管理
│   ├─ ログ
│   └─ ブラウザ起動
│
└─ go:embed
    ├─ index.html
    ├─ app.js
    ├─ style.css
    ├─ PPTX変換用JavaScript
    └─ その他必要ライブラリ

          ↓

http://127.0.0.1:<port>

          ↓

Edge / Chrome

          ↓

HTMLをブラウザで描画

          ↓

DOM / Computed Styleを取得

          ↓

PowerPointオブジェクトへ変換

          ↓

output.pptx
```

---

## 4.2 Goの役割

Goは主にアプリケーションの「器」として利用する。

担当範囲：

- 単一EXE化
- ローカルHTTPサーバ
- HTML/CSS/JS等の埋め込み
- ブラウザ起動
- ファイル受け渡し
- 入力HTML管理
- 出力PPTX管理
- エラー処理
- ログ
- 設定管理

Go側でHTML→PPTX変換エンジンそのものを独自実装しない。

---

## 4.3 JavaScriptの役割

HTML→PPTX変換処理はJavaScript側を中心に実装する。

担当範囲：

- HTMLのDOM解析
- DOMの座標取得
- `getBoundingClientRect()` による位置／サイズ取得
- `getComputedStyle()` によるCSS情報取得
- PowerPointオブジェクトへの変換
- PPTX生成

既存のPPTX生成ライブラリ等を利用する場合は、CDNではなくローカルファイルとして同梱する。

---

# 5. 入力HTML仕様

## 5.1 基本

16:9のスライドHTMLを対象とする。

推奨基準サイズ：

```css
.slide {
    width: 1600px;
    height: 900px;
}
```

または同じ16:9比率。

---

## 5.2 複数スライド

1つのHTMLファイル内に複数スライドを記述できる構造を想定する。

例：

```html
<section class="slide">
    <!-- Slide 1 -->
</section>

<section class="slide">
    <!-- Slide 2 -->
</section>

<section class="slide">
    <!-- Slide 3 -->
</section>
```

`.slide` 単位でPowerPointの1スライドへ変換する。

---

# 6. PPTX出力仕様

## 6.1 PowerPointサイズ

基本は16:9ワイド画面とする。

```text
13.333 inch × 7.5 inch
```

HTML座標からPowerPoint座標へ比例変換する。

例：

```text
PPT_X = HTML_X / HTML_WIDTH × 13.333
PPT_Y = HTML_Y / HTML_HEIGHT × 7.5

PPT_W = HTML_W / HTML_WIDTH × 13.333
PPT_H = HTML_H / HTML_HEIGHT × 7.5
```

---

# 7. 編集可能範囲

最終目標は可能な限りフル編集可能なPPTXとする。

ただし、最初から完全対応を目指さず、段階的に実装する。

---

## Phase 1：ハイブリッド変換

最初の実用版。

### 編集可能

- テキスト
- タイトル
- 本文
- 画像

### 編集不可または画像化

- 複雑な装飾
- 複雑な背景
- 特殊CSS
- 複雑な図形

イメージ：

```text
背景・装飾
    ↓
PNG / SVG

文字
    ↓
PowerPointテキストボックス

画像
    ↓
PowerPoint画像
```

PowerPoint上で最も修正頻度の高い文字を編集可能にすることを優先する。

---

## Phase 2：基本図形対応

以下をPowerPointネイティブオブジェクトへ変換する。

- テキスト
- 画像
- 四角形
- 角丸四角形
- 背景色
- 枠線
- 線
- 塗りつぶし
- 基本的な透明度

---

## Phase 3：フル編集対応拡張

可能な範囲で対応する。

- SVG
- グループ
- アイコン
- シャドウ
- 表
- 複雑な図形
- その他PowerPointネイティブ要素

---

# 8. 初期対応CSS

初期版では以下を優先する。

```text
font-family
font-size
font-weight
color

background-color

border
border-radius

width
height

top
left

text-align
line-height

opacity
```

---

# 9. 初期非対応候補

以下は初期版では対応しない、または画像化する。

```text
CSS animation
transition

backdrop-filter
filter

mix-blend-mode

complex gradient

clip-path

CSS 3D transform

perspective

canvas

複雑な疑似要素
::before
::after
```

必要に応じて後から拡張する。

---

# 10. HTML専用属性の検討

HTMLからPPTXへ変換する際の制御を容易にするため、専用属性を利用できる構造も検討する。

例：

```html
<h1 data-ppt="text">
    タイトル
</h1>
```

```html
<div
    data-ppt="shape"
    data-ppt-type="roundRect">
</div>
```

```html
<img
    data-ppt="image"
    src="image.png">
```

変換対象外：

```html
<div data-ppt-ignore>
```

グループ：

```html
<div data-ppt-group="header">
```

ただし、一般的なHTMLも可能な限り自動判定できる仕様とする。

---

# 11. ローカルファイルの取り扱い

ローカル・イントラネット環境で外部アクセスを発生させない。

初期版では以下を推奨する。

### CSS

HTML内の `<style>` またはローカルCSS。

### JavaScript

ローカルファイルのみ。

### 画像

以下のいずれか。

1. HTMLと同じディレクトリ
2. 相対パス
3. Base64埋め込み

外部URL画像は原則非対応。

---

# 12. CDN禁止

以下は禁止する。

```html
<script src="https://cdn..."></script>
<link href="https://cdn...">
```

利用するJavaScript/CSSライブラリはすべてローカルへ保持し、Goの `embed` 等でEXE内へ格納する。

---

# 13. 単一EXE化

Goの `embed` を利用してWeb UI一式をEXE内部へ格納する。

例：

```go
//go:embed web/*
var webFiles embed.FS
```

最終配布イメージ：

```text
Html2Pptx.exe
```

利用者側に次の導入を要求しないことを目標とする。

```text
Node.js
npm
Python
pip
Java
外部Webサービス
CDN
```

---

# 14. 初期UI案

```text
HTML → PowerPoint Converter

┌─────────────────────────────────┐
│                                 │
│    HTMLファイルをドロップ       │
│                                 │
│            または               │
│                                 │
│       [ HTMLを選択 ]            │
│                                 │
└─────────────────────────────────┘

変換方式

○ ハイブリッド
○ 編集可能
○ 高再現性

出力先
[________________________] [参照]

           [ PPTXへ変換 ]

-----------------------------------

状態：
変換完了

出力：
C:\xxxxx\slide.pptx
```

初期版では機能を増やしすぎず、変換成功を優先する。

---

# 15. CLI対応（将来候補）

GUIだけでなくCLI利用も検討する。

例：

```powershell
Html2Pptx.exe slide.html
```

または：

```powershell
Html2Pptx.exe `
  --input presentation.html `
  --output presentation.pptx `
  --mode editable
```

---

# 16. ブラウザ

Windows環境で標準的に利用可能なブラウザエンジンを利用する。

第一候補：

```text
Microsoft Edge
```

第二候補：

```text
Google Chrome
```

Chromium本体をEXEへ同梱する方式は、容量・保守・セキュリティ更新の負担が大きいため、初期段階では避ける。

---

# 17. セキュリティ方針

完全ローカル動作を基本とする。

- インターネット通信しない
- 外部APIを利用しない
- CDNを利用しない
- localhostのみ利用
- 可能なら `127.0.0.1` のみにListen
- 入力HTMLを外部へ送信しない
- PPTX生成もローカルで完結

将来Web化する際は別途、

- ファイルサイズ制限
- HTMLサニタイズ
- JavaScript実行制御
- 一時ファイル削除
- 同時実行制御
- 利用者認証

等を検討する。

---

# 18. 開発優先順位

## Step 1

最小PoC。

```text
HTML 1枚
↓
文字取得
↓
PPTXテキストボックス生成
↓
PPTX保存
```

---

## Step 2

複数スライド対応。

```text
<section class="slide">
```

を列挙して複数ページ化する。

---

## Step 3

画像対応。

```html
<img>
```

をPowerPoint画像として配置。

---

## Step 4

基本図形対応。

```text
背景色
四角
角丸
線
枠線
```

---

## Step 5

ハイブリッド変換。

複雑な装飾のみ画像化する。

---

## Step 6

ローカルWeb UI化。

GoでHTTPサーバを起動しEdge等で操作する。

---

## Step 7

単一EXE化。

HTML/CSS/JS/ライブラリをGo EXEへ埋め込む。

---

## Step 8

変換精度向上。

特に以下を調整する。

- フォント
- 改行位置
- 行間
- テキストボックス内余白
- 座標誤差
- PowerPointとブラウザのレンダリング差

---

# 19. 最大の技術課題

最も注意が必要なのはテキストレンダリング。

ブラウザとPowerPointでは以下が異なる。

```text
フォントレンダリング
字間
行間
ベースライン
自動改行
テキストボックス内余白
```

そのため、HTMLとPowerPointで完全一致しない可能性がある。

対策として、

- PowerPoint側のテキストボックスを若干広めにする
- 自動縮小を利用する
- 行間補正値を持つ
- フォント別補正を検討する

等を段階的に実装する。

---

# 20. 将来のWebシステム化

最終的には社内Webサーバへ配置し、組織内ユーザーが利用可能にする。

イメージ：

```text
ユーザーPC
   ↓
社内Webブラウザ
   ↓
HTMLアップロード
   ↓
変換
   ↓
PPTXダウンロード
```

初期EXE版とWeb版で変換処理を共通化する。

そのため、

```text
変換ロジック
    ↓
JavaScript中心

アプリケーション制御
    ↓
Go
```

という責務分離を維持する。

---

# 21. 最終ゴール

生成AIがHTML/CSSを得意とする特性を利用し、

```text
生成AI
   ↓
HTMLスライド生成
   ↓
ブラウザで確認・修正
   ↓
HTML → PPTX変換
   ↓
編集可能PowerPoint
```

というワークフローを完全ローカル環境内で実現する。

最終的には、

**「AIにPowerPointを直接作らせる」のではなく、「AIにはHTMLを作らせ、ローカルツールでPowerPointへ変換する」**

方式を確立する。

---

# 22. コーディングエージェントへの初回依頼範囲

初回実装では、完成版を一気に作らない。

以下のPoCを作成すること。

1. GoでローカルHTTPサーバを起動する。
2. Web UIをGo EXEへ埋め込む。
3. EdgeまたはChromeでUIを開く。
4. 16:9 HTMLファイルを読み込める。
5. `.slide` 要素を検出できる。
6. DOMの座標とCSSを取得できる。
7. テキストをPowerPointテキストボックスへ変換できる。
8. 画像をPowerPoint画像へ変換できる。
9. PPTXファイルとして保存できる。
10. CDN・インターネット接続なしで動作する。

まずこの範囲で技術的成立性を確認し、その後、図形・装飾・変換精度を順次拡張する。
