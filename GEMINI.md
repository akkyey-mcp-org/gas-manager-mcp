#  (Agent Behavior Protocol)

## 1.  (Principles & Agent Skills)

** (Agent Skills)**
****

****
>  ** `skill_name`**

###  (Continuous Improvement)

****


###  (Mandatory Skills)


 `.agent/skills/<skill_name>/SKILL.md` 

1.  ** (`feat_implementer`):**
    *   **:** 
    *   **:** (Plan)(History)

2.  ** (`quality_guard`):**
    *   **:** Lint
    *   **:** `vitest` / `jest` (Coverage), `eslint`, `prettier`, `tsc`

3.  ** (`trouble_reporter`):**
    *   **:** 
    *   **:** (`trouble/`)

4.  ** (Approval Before Implementation):**
    *   **:** Implementation Plan
    *   **:** 
    *   **:** Typo

5.  ** (`context_syncer`):**
    *   **:** 
    *   **:** `full_context` `task.md` / `backlog.md` 

6.  **Git (`git_committer`):**
    *   **:** 
    *   **:** 

7.  ** (`quality_gatekeeper`):**
    *   **:** 
    *   **:** Radon(CC)(MI)

### 1.1  (Prohibited Actions & Anti-Patterns)

****

1.  **Git (No Direct Git Commit):**
    *   `run_command`  `git commit -m ...`  `git_committer` 
2.  ** (No Skipping Diagnostics):**
    *    `npm test`  `npm run build` 
3.  **:**
    *    `GEMINI.md` 


---

## 2.  (Communication & Language)

1.  **:**
    *   ****
2.  **:**
    *   HTML

---

## 3.  (Environment & Tools)

1.  **:**
    *    `node_modules`  `npm`  `npx` 
2.  **:**
    *    `tsc` `npx tsc` 
3.  **Salesforce CLI (npm isolation):**
    *   `sf` / `sfdx`  ** (`npm install`)** 
    *    `npx sf ...` 

## 4.  (Definition of Done)

 (`notify_user`) ****

1.  **Git (Clean Status):**
    *   `git status` Modified / Untracked
    *    (`stock-analyzer4/` ) 
2.  ** (Remote Sync):**
    *    `git push` 
    *   Colab
3.  ** (Final Verification):**
    *    `npm test` 

****

---

## 5.  (Infinite Loop Prevention)


**2******  **** 

---

## 6.  (Documentation & Blog)

1.  **:**
    -    **`blog/`**  `mcp-servers/blog/`
    -   `docs/` 

2.  ** (Continuous Blog Idea Capture):**
    *   ** `blog/ideas/YYYY-MM-DD_ideas.md` **
    *   
    *    (`notify_user`) 

---

## 7.  (Memory Management)

MCP (`memory-server`) 

### 7.1 
*   **:** 
*   **:** `user_preference` (), `project_insight` (), `task_history` (), `code_pattern` () 
*   **:** `importance` (1-5) 

### 7.2  (Memory Operations)

**A.  (Recall)**
 `search_memories` 
*   : 

**B.  (Storage)**
 `create_memory` 
*   **:** 

*   **:** FTS5
*   ** (Failure Recording):**  `trouble_reporter` **** `tag: ["failure", "anti_pattern"]` 

**C.  (Promotion)**
*   **:**  `docs/`  (Git)
*   **:**  `memory-server` 

**D. **
*   **:**  `export_memories` JSONGit (`docs/memory_backup.json` ) 
*   **:**  `delete_memory`  `VACUUM` (SQLite) 



---

## 8.  (Configuration & File Structure)

 **XDG Base Directory** 

### 8.1  (`GEMINI.md`)
*   **:** `.config/google-antigravity/GEMINI.md`
*   **:**
    *   Single Source of Truth
    *   ****
    *   
        ```bash
        ln -sf /path/to/.config/google-antigravity/GEMINI.md ./GEMINI.md
        ```

### 8.2 Google Drive  ()
*    Google Drive (`~/Google Drive/Config/GEMINI.md`) `.config/google-antigravity/` OSMac/Windows
