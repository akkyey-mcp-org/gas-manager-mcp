import datetime
import glob
import os
import shutil
from collections import Counter

# --- Configuration & Exclusions ---
EXCLUDE_DIRS = {".git", "venv", "__pycache__", "node_modules", "htmlcov", "archive", "brain", ".gemini", ".agent", "output", "data", "history", "trouble", "reports", "stock-analyzer4", ".mypy_cache", ".pytest_cache", "htmlcov"}
SOURCE_EXTENSIONS = {".py", ".js", ".ts", ".go", ".rs", ".cpp", ".c", ".h", ".java", ".gs", ".sh"}
DOCS_EXTENSIONS = {".md", ".json", ".yaml", ".yml", ".toml"}
ALLOWED_EXTS = SOURCE_EXTENSIONS | DOCS_EXTENSIONS | {".env.example"}

# --- Script Template ---
TEMPLATE = """import datetime
import glob
import os
import shutil
import subprocess
import re

def is_git_tracked(filepath):
    try:
        current_dir = os.path.dirname(os.path.abspath(filepath))
        git_root = None
        while current_dir != os.path.dirname(current_dir):
            if os.path.isdir(os.path.join(current_dir, ".git")):
                git_root = current_dir
                break
            current_dir = os.path.dirname(current_dir)
        if not git_root: return False
        rel_path = os.path.relpath(filepath, git_root)
        res = subprocess.run(["git", "ls-files", rel_path], capture_output=True, text=True, cwd=git_root)
        return bool(res.stdout.strip())
    except Exception: return False

def _get_file_groups(project_root):
    def get_files(base_dir):
        matched = []
        for r, d, f in os.walk(os.path.join(project_root, base_dir)):
            d[:] = [sub for sub in d if sub not in {excl_dirs} and not sub.startswith(".")]
            for file in f:
                matched.append(os.path.join(r, file))
        return sorted(matched)

    return [
{groups}
    ]

def _is_excluded(fpath, exclude_filenames):
    fname = os.path.basename(fpath)
    if fname in exclude_filenames: return True
    # サイズによる除外 (250KB以上)
    if os.path.exists(fpath) and os.path.getsize(fpath) > 250 * 1024: return True
    # 機密ファイル等の除外
    if fname == ".env" or fname.startswith(".env.") or fname.endswith((".pem", ".key", ".cert", ".p12", "id_rsa")): return True
    if fname.endswith("_full_context.md"): return True
    fpath_norm = fpath.replace(os.sep, "/")
    if fname.startswith("test_") or fname.endswith("_test.py") or "/tests/" in fpath_norm: return True
    if any(ed in fpath_norm.split("/") for ed in {excl_dirs}): return True

    ext = os.path.splitext(fname)[1].lower()
    allowed_exts = {allowed_exts}
    allowed_names = {"Dockerfile", "Makefile", ".gitignore", ".dockerignore"}
    if ext not in allowed_exts and fname not in allowed_names:
        return True

    return False

def _scrub_sensitive_info(content):
    # 1. Email addresses
    content = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+').sub('<EMAIL_REMOVED>', content)
    # 2. Hardcoded secrets (API keys, passwords, tokens)
    content = re.compile(r'''(?i)(api[_-]?key|secret|passwd|password|token)\\s*[:=]\\s*['"].*?['"]''').sub(r'\\g<1> = <SECRET_REMOVED>', content)
    # 3. Bearer tokens
    content = re.compile(r'(?i)Bearer\\s+[A-Za-z0-9\\-\\._~+\\/]+').sub('Bearer <TOKEN_REMOVED>', content)
    # 4. URL Basic Auth
    content = re.compile(r'(?i)://[^/:]+:[^/@]+@').sub('://<USER>:<PASS>@', content)
    return content

def _get_context_body(project_root, file_groups, exclude_filenames):
    body = []
    for group_name, files in file_groups:
        if not files: continue
        body.append(f"## {group_name}\\n\\n")
        files_processed = []
        for fpath in files:
            if not os.path.exists(fpath) or os.path.isdir(fpath): continue
            if _is_excluded(fpath, exclude_filenames): continue
            
            rel_path = os.path.relpath(fpath, project_root)
            if rel_path in files_processed: continue
            files_processed.append(rel_path)
            
            print(f"Processing: {rel_path}")

            body.append(f"### [{os.path.basename(fpath)}]({rel_path})\\n\\n")
            ext = os.path.splitext(fpath)[1].lstrip(".")
            lang = ext if ext else ""
            if lang == "py": lang = "python"
            body.append(f"```{lang}\\n")
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    raw_content = f.read()
                    scrubbed = _scrub_sensitive_info(raw_content)
                    body.append(scrubbed)
            except Exception as e:
                body.append(f"Error reading file: {e}\\n")
            body.append("\\n```\\n\\n")
    return body

def generate_full_context():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    output_filename = f"{today}_project_full_context.md"
    output_path = os.path.join(current_dir, output_filename)

    content_list = []
    content_list.append("# Project Full Context Report\\n\\n")
    content_list.append(f"Generated at: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\\n\\n")

    file_groups = _get_file_groups(project_root)
    exclude_filenames = {"generate_full_context.py", "self_diagnostic.py", "antigravity_runner.py"}
    content_list.extend(_get_context_body(project_root, file_groups, exclude_filenames))

    with open(output_path, "w", encoding="utf-8") as outfile:
        outfile.writelines(content_list)
    print(f"📝 Full Context Updated: {output_path}")

    # Archive old versions
    archive_dir = os.path.join(current_dir, "archive")
    os.makedirs(archive_dir, exist_ok=True)
    for f in glob.glob(os.path.join(current_dir, "*_project_full_context.md")):
        if os.path.basename(f) != output_filename:
            shutil.move(f, os.path.join(archive_dir, os.path.basename(f)))
            print(f"📦 Archived: {os.path.basename(f)}")

if __name__ == "__main__":
    generate_full_context()
"""

def scan_project(root):
    """プロジェクト構造を解析し、役割を推定する。"""
    groups = []
    
    # 1. ルートの重要ドキュメント
    root_docs = []
    for f in os.listdir(root):
        if os.path.isfile(os.path.join(root, f)) and os.path.splitext(f)[1] in {".md", ".yaml", ".yml", ".txt", ".toml"}:
            if f not in {"requirements.txt"}:
                root_docs.append(f)
    if root_docs:
        groups.append(('"Root Documents"', f'{root_docs}'))

    # 2. ディレクトリの役割推定
    for item in os.listdir(root):
        path = os.path.join(root, item)
        if not os.path.isdir(path) or item in EXCLUDE_DIRS or item.startswith("."):
            continue
            
        # 拡張子の統計を取る
        ext_count = Counter()
        file_count = 0
        for r, d, files in os.walk(path):
            if any(ed in r.split(os.sep) for ed in EXCLUDE_DIRS):
                continue
            for f in files:
                ext_count[os.path.splitext(f)[1]] += 1
                file_count += 1
        
        if file_count == 0:
            continue

        # 役割判定
        is_src = any(ext in SOURCE_EXTENSIONS for ext in ext_count)
        is_docs = any(ext in DOCS_EXTENSIONS for ext in ext_count)
        
        if is_src:
            groups.append((f'"{item} (Source)"', f'get_files("{item}")'))
        elif is_docs or "doc" in item.lower():
            groups.append((f'"{item} (Docs)"', f'get_files("{item}")'))
        else:
            # その他、小規模な構成ディレクトリ
            groups.append((f'"{item}"', f'get_files("{item}")'))

    return groups

def prepare():
    project_root = os.getcwd()
    fc_dir = os.path.join(project_root, "full_context")
    os.makedirs(fc_dir, exist_ok=True)
    
    print(f"🔍 Scanning project for structure: {project_root}")
    detected_groups = scan_project(project_root)
    
    formatted_groups = ""
    for name, pattern in detected_groups:
        formatted_groups += f"        ({name}, {pattern}),\n"
    formatted_groups = formatted_groups.rstrip(",\n")

    script_content = TEMPLATE.replace("{groups}", formatted_groups)
    script_content = script_content.replace("{excl_dirs}", str(list(EXCLUDE_DIRS)))
    script_content = script_content.replace("{allowed_exts}", str(list(ALLOWED_EXTS)))
    
    script_path = os.path.join(fc_dir, "generate_full_context.py")
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(script_content)
    print(f"✅ Prepared intelligent context script at: {script_path}")

if __name__ == "__main__":
    prepare()
