# gas_emulate エミュレータ強化 v2.0 — 開発経緯と変更内容

## 発端: 本番での「サイレント破壊」

### 問題の発生
2026-03-11、`project-stock2` の GAS スクリプト (`gas_engine.gs`) で `Fundamentals_Master` シートへのデータ書き込みが反映されない障害が発生。

### 原因調査
調査の結果、以下の致命的バグを発見した：

```javascript
// gas_engine.gs 26行目（1つ目の定義）
function getMasterSs() {
  return SpreadsheetApp.openById(MASTER_SS_ID);
}

// gas_engine.gs 901行目（2つ目の定義）
function getMasterSs() {
  try {
    return SpreadsheetApp.openById(CORRECT_ID);
  } catch (e) {
    // ⚠️ 失敗時に別のスプレッドシートへ無言で退避
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}
```

**GAS はファイル末尾の定義を優先する**ため、901行目のフォールバック版が使用されていた。
`openById` が権限エラー等で失敗すると、`getActiveSpreadsheet()` が返す無関係のスプレッドシートに無言で書き込みが行われ、正規のマスタースプレッドシートには何も反映されなかった。

### 検証の壁
- `clasp run` (`mcp_gas_run`) は**存在しない関数名でも "Successfully executed" を返す**ことが判明
- スプレッドシートへの物理的な反映確認には数分〜数時間のタイムラグがある
- 全銘柄のデータ埋めには 2〜3 日かかる運用設計のため、即時検証が不可能

## 戦略転換: 「ツーリングへの投資」

ユーザーとの議論の結果、**GAS コードの修正より先にエミュレータの品質を高める**ことを決定。

> エミュレータの機能を可能な限り高めるのが品質確保への近道

この判断に基づき、以下の 4 機能を `gas_emulate` に実装した。

## 実装内容

### Step 1: 重複関数の静的検出 (`detectDuplicateFunctions`)
- **ファイル**: `src/emulator.ts`
- **概要**: エミュレート実行前に、読み込んだコードを行単位で走査し、`function funcName(` パターンの重複を検出
- **出力例**:
  ```
  ⚠️ DUPLICATE FUNCTION: 'getMasterSs' is defined 2 times:
    - Line 27 (gas_engine.gs)
    - Line 902 (gas_engine.gs)
    → GAS will use the LAST definition (Line 902, gas_engine.gs)
  ```
- **設計判断**: 正規表現ベースの軽量な解析を採用。AST パーサーは過剰であり、GAS の `function` 宣言は単純なパターンで十分に検出可能。

### Step 2: 複数ファイル結合ロード
- **ファイル**: `src/index.ts`
- **概要**: `gasFilePath` にディレクトリを指定すると、配下の全 `.gs` / `.js` ファイルをアルファベット順に結合してから VM 実行
- **追加パラメータ**: `gasFilePaths`（配列）で明示的に複数ファイルを指定することも可能
- **ファイルマップ**: 結合後もどのファイルの何行目かを追跡する `fileMap` を生成し、重複検出の位置特定に使用
- **後方互換性**: 単一ファイル指定は従来通り動作

### Step 3: openById のキャッシュ化
- **ファイル**: `src/emulator.ts`
- **概要**: `SpreadsheetAppEmulator.openById()` が毎回新しい `Spreadsheet` インスタンスを生成していた問題を修正
- **改善後**: 同一 ID に対して同一インスタンスを返す（`_openedById` キャッシュ）
- **リセット機能**: `_reset()` メソッドでテスト間のクリーンアップが可能

### Step 4: ScriptApp モック
- **ファイル**: `src/emulator.ts`
- **概要**: `ScriptAppEmulator` を新規追加
- **サポートメソッド**:
  - `getProjectTriggers()` → 空配列
  - `getScriptId()` → `"mock_script_id_emulated"`
  - `newTrigger()` → チェーン可能なモックオブジェクト
  - `deleteTrigger()` → no-op

### その他の改善
- `UrlFetchApp.fetch()` に `getResponseCode()` を追加（Discord 通知テスト用）
- VM コンテキストに `parseInt`, `parseFloat`, `isNaN`, `RegExp`, `Map`, `Set`, `Promise` を追加
- 関数未発見時に「利用可能な関数一覧」を表示するエラーメッセージ改善
- 実行結果に `warnings`（重複検出結果）と `filesLoaded`（読み込んだファイル一覧）を追加

## 影響範囲
- **後方互換性**: 既存の単一ファイル指定は完全互換
- **新機能**: ディレクトリ指定と `gasFilePaths` は新規パラメータ
- **プロジェクト非依存**: 全機能が `gas-manager-mcp` ツール自体の汎用的な改善

## 教訓
1. **GAS の関数重複は静かに上書きされる** — 他の言語のように「再定義エラー」にはならない
2. **リモート実行の信頼性に依存しない** — `clasp run` の結果を盲信せず、ローカル検証を優先すべき
3. **ツーリングへの投資は複利で効く** — 今回の強化は stock-analyzer だけでなく、今後のすべての GAS プロジェクトに恩恵がある
