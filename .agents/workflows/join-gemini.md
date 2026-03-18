---
description: "Gemini"
---

#  (Join Gemini)

Gemini(`gemini-core`)

## 
*   
*    `$GEMINI_ROOT` (: `/home/irom/dev`) 

## 

### 1.  (Target Project)



```bash
# 
mkdir -p <TARGET_PATH>
cd <TARGET_PATH>

# Git
if [ ! -d ".git" ]; then git init; fi

# Gemini
# : ../gemini-core 
if [ ! -L ".gemini" ]; then
    ln -s ../gemini-core .gemini
    echo " ./gemini -> ../gemini-core "
fi

# .gitignore  .gemini 
if ! grep -q "^\.gemini$" .gitignore 2>/dev/null; then
    echo -e "\n# gemini-core \n.gemini" >> .gitignore
    echo " .gitignore  .gemini "
fi

# 
mkdir -p .agent/workflows

# 
CORE_ROOT=$(git rev-parse --show-toplevel)
# :  .gemini/ 
cp ".gemini/.agent/workflows/sync-gemini.md" .agent/workflows/
cp ".gemini/.agent/workflows/check-all-status.md" .agent/workflows/
```

### 2. 



```bash
# gemini-docs 
# gemini-core  gemini-docs 
DOCS_ROOT=$(cd "../gemini-docs" && pwd)

# 
mkdir -p "${DOCS_ROOT}/projects/<PROJECT_NAME>"
touch "${DOCS_ROOT}/projects/<PROJECT_NAME>/README.md"

#  (SCOPE_RULES.md )
echo "| \`projects/<PROJECT_NAME>/\` | \`\$GEMINI_ROOT/<PROJECT_NAME>\`  |" >> "${DOCS_ROOT}/SCOPE_RULES.md"
```

### 3.  (Core Registration)

`gemini-core` 

**A. **
: `gemini-core/projects.json`
*   

**B. **
*   `gemini-core/.agent/workflows/sync-gemini.md` 
*   `gemini-core/.agent/workflows/check-all-status.md` 

**C. **
: `gemini-core/../gemini.code-workspace`
*   `folders` 

### 4. 

```bash
# gemini-core 
cd ../gemini-core
git add .
git commit -m "chore: add <PROJECT_NAME> to gemini ecosystem"
git push origin main
```

### 5. 

```bash
cd <TARGET_PATH>
git add .
git commit -m "chore: initial commit with gemini-core symlink"
```

## 
Gemini
`/sync-gemini`  `/check-all-status` 
