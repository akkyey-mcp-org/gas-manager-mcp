# gas-manager-mcp

Universal Google Apps Script (GAS) Management MCP Server.

## Features
- Deployment of GAS code from local environment using `clasp`.
- Synchronization of code between local and remote GAS projects.
- Shared infrastructure for multiple projects (Stock Analysis, Qiita, etc.).

## Setup
## Roadmap / Backlog
- [ ] **エミュレータ用モックの共通化（テンプレート化）**
    - `SpreadsheetAppMock` の最小構成をスタンドアロンな形式で抽出し、`/examples/mocks` 等へ提供する。
- [ ] **CI/CDパイプラインへの統合ガイド作成**
    - `gas_emulate` を利用した「検証後デプロイ」の自動化フロー（GitHub Actions等）の実装例を整備する。
- [ ] **AI向け構造化ログ（Observability）の導入**
    - エミュレータの実行差分をAIが理解しやすい形式（Semantic Logging）で出力し、自己修正能力を向上させる。
- [ ] **AI専用のOAuthゲートウェイと権限制御**
    - 最小権限に基づいたアクセス制御と、権限不足時の「Human-in-the-loop」承認フローを実装する。
- [ ] **自律開発フレームワークとしての統合**
    - 設計・検証・デプロイをシームレスに繋ぐ「自律開発パイプライン」の完成形（Antigravity）を定義する。
