---
description: セッション終了の統合処理（Design Check, Commit, Push, Context Sync, Memory, Log Backup）
---

# `wq` ワークフロー

このワークフローは、開発セッションを完璧に締めくくり、次回への情報を「プロトコル準拠の状態」で引き継ぐための統合コマンドです。

## 実行ステップ

// turbo-all

### 0. 対象の特定と宣言
引数 `{{project_name}}` を確認し、宣言します。
> 🤖 **対象プロジェクト「{{project_name}}」のセッションを終了（保存）します。**

### 1. 最終監査 (Final Audit)
```bash
# 🤖 【スキル発動】 design_validator
# 設計メモの有無、ADR 追記状況、スキル発動宣言の徹底状況を自己監査。
```

### 2. 情報の引き継ぎ準備 (Session Handover)
```bash
# 📄 全体コンテキストの生成 (generate_context)
# 🧠 重要知見の記録 (memory-server)
# 💾 セッション状態の保存 (save_session_state)
# 🔖 インデックス（etags）の更新 (次回セッションの高速化のため)
bash .agent/scripts/update_etags.sh
```

### 3. 安全なコミットとプッシュ
```bash
# 🤖 【スキル発動】 git_committer
# プロトコルに基づき、全成果を記録してリモートへ同期。
```

### 4. ログの物理バックアップ
```bash
# 🤖 【スキル発動】 log_syncer
# 生データをバックアップ先へ退避。
```

## 完了の定義
- [ ] `design_validator` での指摘事項が解消されていること
- [ ] `git push` が成功し、リモートと同期されていること
- [ ] `log_syncer` によりバックアップが正常終了していること
