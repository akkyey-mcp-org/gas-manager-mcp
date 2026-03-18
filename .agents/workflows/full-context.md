---
description: "プロジェクトのフルコンテキスト（統合ドキュメント）を生成する"
---

# フルコンテキスト生成ワークフロー

他のAIエージェントへの引き継ぎや、セッション間の情報保持のために、
プロジェクトの重要なソースコードとドキュメントを1つのMarkdownファイルに統合する。

**重要: このワークフローでは静的スクリプトを使わず、AIが毎回プロジェクト構成を判断して生成する。**

---

## Step 1: プロジェクト構成の把握

// turbo
```bash
find . -maxdepth 2 -type d -not -path "*/.git/*" -not -path "*/node_modules/*" -not -path "*/venv/*" -not -path "*/__pycache__/*" | head -n 50
```

上記の結果を見て、以下を判断する：
- **ソースコード**: `src/`, `lib/`, `app/` 等のメインのコードディレクトリはどれか
- **設定ファイル**: `config/`, ルートの `.yaml`, `.toml`, `.json` 等
- **ドキュメント**: `docs/`, ルートの `README.md`, `SPECIFICATION.md` 等
- **除外すべき**: テストデータ、ログ、キャッシュ、ビルド成果物、旧版コード等

### 判断に迷った場合
ディレクトリの役割が不明な場合は、**ユーザーに質問して確認する**こと。
例：「`data/` ディレクトリにはタスクJSONが1000件以上ありますが、コンテキストに含めますか？」

---

## Step 2: 生成スクリプトの動的作成

Step 1 の判断結果に基づき、`full_context/generate_full_context.py` を**その場で書き出す**。

### スクリプトに含めるべき機能（必須）

1. **ファイル収集**: Step 1 で決定したディレクトリのみを `os.walk` で走査
2. **拡張子フィルタ**: `.py`, `.js`, `.ts`, `.go`, `.gs`, `.sh`, `.md`, `.json`, `.yaml`, `.yml`, `.toml` 等のテキストファイルのみ
3. **サイズ上限**: 250KB 以上のファイルはスキップ（ログやデータダンプ防止）
4. **機密情報マスキング** (`_scrub_sensitive_info` 関数):
   - メールアドレス → `<EMAIL_REMOVED>`
   - APIキー・パスワード・トークン等のハードコード → `<SECRET_REMOVED>`
   - Bearer トークン → `Bearer <TOKEN_REMOVED>`
   - URL内のBasic認証 → `<USER>:<PASS>@`
5. **機密ファイル除外**: `.env`, `*.pem`, `*.key`, `*.cert`, `*.p12`, `id_rsa` は絶対に含めない
6. **自己参照防止**: `*_full_context.md` は含めない
7. **テストファイル除外**: `test_*.py`, `*_test.py`, `/tests/` 配下は除外
8. **日付管理**: 出力ファイル名を `YYYY-MM-DD_project_full_context.md` とする
9. **アーカイブ**: 既存のコンテキストファイルを `full_context/archive/` に移動

### 除外すべきディレクトリ（普遍ルール）
`.git`, `venv`, `__pycache__`, `node_modules`, `.mypy_cache`, `.pytest_cache`,
`htmlcov`, `dist`, `build`, `archive`, `.gemini`, `.agent`, `brain`

### os.walk での探索パターン
```python
# glob.glob("**/*") は絶対に使わないこと（巨大フォルダでハングする）
for root, dirs, files in os.walk(base_dir):
    dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".")]
    for f in files:
        # フィルタ処理
```

---

## Step 3: 生成と検証

// turbo
```bash
python3 -u full_context/generate_full_context.py
```

生成後、以下を確認：
// turbo
```bash
ls -lh full_context/*_full_context.md
```

### 検証基準
- **サイズ**: 1MB 以下が望ましい。**1.5MB を超えた場合は必ずユーザーに警告**し、含めるディレクトリを再検討すること
- **ファイル数**: 適切な数のソースファイルのみが含まれていること
- **機密情報**: `grep -i "password\|api_key\|secret" full_context/*_full_context.md` で漏れがないか確認

---

## サイズが大きすぎる場合の対処

1. `grep "^### \[" full_context/*_full_context.md | awk -F'/' '{print $1}' | sort | uniq -c | sort -rn` でディレクトリ別のファイル数を確認
2. データダンプや旧版コードが混入していないか確認
3. 必要に応じてユーザーに「このディレクトリは含めますか？」と質問
4. 生成スクリプトの対象ディレクトリを修正して再生成
