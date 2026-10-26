# Windows startup and database recovery

For a double-click launch that also opens the app and explanation document, use `START_PROJECT.bat`. Use `OPEN_PROJECT_GUIDE.bat` for the offline browser guide alone, or open `PROJECT_GUIDE.html` directly in a browser. The guide includes architecture, demo steps, viva answers and optional Hinglish speaking notes. `START_PROJECT.bat -Mode check` checks running services without starting new ones; `-Mode app` opens only the application.

Run `START_PROJECT.bat` from any directory. The launcher reuses a healthy backend on port 8000 and Vite on port 5173, waits for backend health before starting the frontend, and returns a failure exit code for occupied ports or failed readiness. Child servers run hidden; output goes to `.logs/backend.out.log`, `.logs/backend.err.log`, `.logs/frontend.out.log`, and `.logs/frontend.err.log`. Launchers never stop an existing process. `run_backend.bat` starts only the backend; `run_frontend.bat` also checks/starts its backend prerequisite.

Install Python 3.11 with the Windows Python launcher and Node.js/npm first. Prepare dependencies independently with:

```powershell
.\scripts\start.ps1 -Target setup
```

This creates `backend/.venv` using `py -3.11`, installs the pinned `backend/requirements.lock.txt` when its hash changes (falling back to `requirements.txt` if the lockfile is absent), and imports backend dependencies plus the application before startup. The virtual environment is used explicitly; shell activation and the system default Python version do not matter. If import preflight fails, fix the displayed configuration/dependency error and rerun. Configure the backend environment as described in the main README before setup. The convenience launchers use a process-scoped PowerShell execution setting; they do not change machine policy. Institution-enforced policy may still require an approved or signed script.

## SQLite backup

Backups use SQLite's online backup API, so committed WAL changes are included while the application is running. They are checked with `PRAGMA integrity_check` before publishing. Choose a new destination filename in an existing directory; existing backups are never overwritten. Explicitly select the actual configured database file (the default is `backend/qp_system.db`). Copying only a live `.db` file with Explorer is unsafe when WAL is enabled.

```powershell
New-Item -ItemType Directory -Force backups
backend\.venv\Scripts\python.exe scripts\database_backup.py backup backend\qp_system.db backups\qp-2026-10-26.db
backend\.venv\Scripts\python.exe scripts\database_backup.py check backups\qp-2026-10-26.db
```

Backups contain examination and account data. Keep them in access-controlled storage on another device, retain dated copies, and periodically rehearse restoration into a temporary database path.

## Offline restore

Stop every application/worker that can write the destination database before restoring, and verify no process will restart it. The `--confirm-offline` flag is the operator's explicit assertion of this condition; the tool cannot prove that another process will not reconnect. Restore rejects SQLite WAL/SHM/journal sidecars rather than deleting them. A clean shutdown should remove them; investigate any leftovers before proceeding.

```powershell
backend\.venv\Scripts\python.exe scripts\database_backup.py restore backups\qp-2026-10-26.db backend\qp_system.db --confirm-offline
```

Restore validates the source, stages a verified copy in the destination directory, makes a dated `.before-restore-<UTC timestamp>.bak` of an existing destination, and replaces the database atomically. Source and destination must differ. Recheck integrity and restart with `START_PROJECT.bat`. Restore tests use temporary real SQLite databases and never touch the application's database.
