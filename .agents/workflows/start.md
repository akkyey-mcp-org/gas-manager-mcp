---
description: セッション開始の統合処理（Sync, Load State, Context Restore, Memory Recall）
---

# `start` ワークフロー

このワークフローは、前回の作業内容を完璧に思い出し、即座に開発を再開するための「開店準備」コマンドです。

## 実行ステップ

// turbo-all

### 0. 対象の特定と宣言
引数 `{{project_name}}` を確認（不明な場合は質問）し、宣言します。
> 🤖 **対象プロジェクト「{{project_name}}」のセッションを開始します。**

### 1. 職責の自己監査 (Initial Audit)
```bash
# 🤖 【スキル発動】 design_validator
# 🛡️ 常に safe-shell-server (execute_safe) を経由してコマンドを実行してください。
# 前回のコンテキストや ADR が現在の状況と一致しているかを自己監査。
```

### 2. 環境の最新同期 (Sync Environment)
```bash
# 🤖 ワークフローの呼び出し
# 🌐 Git 操作は git-task-server (git_pull, git_fetch等) を使用してください。
/sync-gemini
```

### 3. 作業状態の復元 (Session Restoration)
```bash
# 💾 セッション状態の読み込み (MCP: context-server/load_session_state)
# 📄 全体コンテキストの読み込み ({{project_name}}_full_context.md)
```

### 3.5 物理的な実態確認 (Physical Artifact Verification)
```bash
# 🔍 読み込んだドキュメントや ADR の記述が、現在のディレクトリやファイルの状態と一致するかを物理的に確認。
# 例: データベースファイルの存在、サイズ、テーブル件数の確認 (ls -l, sqlite3)
# 例: インデックス（etags）の存在確認と、重要ファイルの鮮度チェック
# 例: インポート済みデータの確認、主要ファイルの配置確認
# ⚠️ 記憶やドキュメントに頼らず、必ず物理コマンドで「事実」を裏取りすること。
# 📏 Layer 1 (Git 管理) はインデックスを信頼し、Layer 2 (一時ファイル) はその都度実測する。
```

### 4. ドキュメントと記憶の想起 (Knowledge Recall)
```bash
# 📝 意思決定記録 (ADR) と最新設計の確認
# 🧠 関連知見の検索 (MCP: memory-server/search_memories)
```

### 5. 実施内容の要約と開始合意 (Final Checklist & Agreement)
全ステップ完了後、エージェントは以下の報告を行い、ユーザーの合意を得る。
1. **実施した準備内容の一覧化**: （例：ADRの確認完了、XXファイルのロード完了等）
2. **次に着手するタスクの提示**: （例：Step 1 の実装を開始します等）
3. **合意の取得**: 「以上の準備が整いました。作業を開始してもよろしいでしょうか？」と問いかける。

## 完了の定義
- [ ] 冒頭に対象プロジェクトの宣言が行われていること
- [ ] `design_validator` による監査が完了していること
- [ ] 前回保存されたファイル構成がエージェントの作業領域にロードされていること
- [ ] **実施内容が一覧化され、ユーザーから作業開始の合意を得ていること**
