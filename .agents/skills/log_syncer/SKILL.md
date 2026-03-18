---
name: log_syncer
description: 物理バックアップの詳細（パス、オプション、ログ出力）を隠蔽し、確実なログ同期を実行するためのスキル。
---

# Log Syncer Skill

GEMINI.md 第5章「完了の定義」に基づき、セッションの会話ログおよび生データをバックアップ先に退避させます。
エージェントはこのスキルを使用して、環境依存のパスを意識することなく同期を完遂してください。

## 作業フロー

### 1. 同期スクリプトの特定
現在の環境におけるバックアップスクリプトを特定します。
- デフォルト: `/home/irom/dev/antigravity-log-manager/scripts/core/sync_antigravity.sh`

### 2. 同期の実行
スクリプトを `bash` で実行します。
```bash
bash /home/irom/dev/antigravity-log-manager/scripts/core/sync_antigravity.sh
```

### 3. 完了の確認
スクリプトの終了コード（Exit Code 0）を確認します。
失敗した場合は、エラー内容を取得しユーザーに報告（trouble_reporter スキルへ移行）してください。

## 完了の定義
- [ ] ログ同期スクリプトが正常終了していること。
- [ ] バックアップ結果がログに出力されていること。
