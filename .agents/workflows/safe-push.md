---
description: Safe-Shell V2
---

`GEMINI.md` `safe_commander`  `safe-shell-server` 

## 
- `safe-shell-server` 
- 

## 

### 1. 
// turbo
1. 
   - `macro_id`: `[repo_name]_safe_push`
   - `cmd`: `bash`
   - `args`: `["-c", "git add . && git commit -F /tmp/commit_msg && git push origin [branch]"]`
   - `persist`: `False` ()

### 2. 
// turbo
2.  `background=True` 
   - `execute_macro(macro_id="[repo_name]_safe_push", background=True)`

### 3. 
// turbo
3. `get_process_status` 
   - `DONE` 
   -  PID 

### 4. 
// turbo
4. `read_recent_messages`  `git log` 

## 
- ****:  2  `background=True` 
- ****: `run_command` 
