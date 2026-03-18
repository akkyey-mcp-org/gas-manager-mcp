# SKILL: full_context

プロジェクトの全ソースコードと設計ドキュメントを1つのマークダウンファイルに統合し、
他のAIエージェントへの引き継ぎやセッション間の情報保持を実現するスキル。

## 概要
このスキルは「最後の砦」としてのフルコンテキストを生成・保守します。
**静的スクリプトではなく、AIがプロジェクト構成を毎回判断して生成します。**

## 使い方
ワークフロー `/full-context` を実行してください。

```
/full-context
```

詳細な手順と安全ルールはワークフロー内に記載されています。

## 安全ルール（要約）
- `.env`, `*.pem`, `*.key` 等の機密ファイルは**絶対に含めない**
- ソース内のハードコードされた秘密情報は `<SECRET_REMOVED>` 等に自動マスキング
- 250KB以上の巨大ファイルはスキップ
- テストファイルは除外
- 判断に迷ったらユーザーに質問

## 出力先
- `full_context/YYYY-MM-DD_project_full_context.md`
- 旧版は `full_context/archive/` に自動退避

## 参考
- ワークフロー: `.agents/workflows/full-context.md`
- 旧スクリプト (非推奨): `scripts/prepare_context_script.py`
