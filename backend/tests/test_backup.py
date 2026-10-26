import importlib.util
from contextlib import closing
import sqlite3
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[2] / 'scripts' / 'database_backup.py'


def tooling():
    assert SCRIPT.exists(), 'SQLite backup tooling is not implemented'
    spec = importlib.util.spec_from_file_location('database_backup', SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def database(path, value):
    with closing(sqlite3.connect(path)) as connection:
        connection.execute('create table records (value text)')
        connection.execute('insert into records values (?)', (value,))
        connection.commit()


def read(path):
    with closing(sqlite3.connect(path)) as connection:
        return connection.execute('select value from records').fetchone()[0]


def test_online_backup_includes_committed_wal_data(tmp_path):
    tool = tooling()
    source, target = tmp_path / 'live.db', tmp_path / 'backup.db'
    database(source, 'original')
    with closing(sqlite3.connect(source)) as connection:
        connection.execute('pragma journal_mode=WAL')
        connection.execute("update records set value='committed'")
        connection.commit()
        tool.backup_database(source, target)
    assert read(target) == 'committed'
    with pytest.raises(FileExistsError):
        tool.backup_database(source, target)
    with pytest.raises(ValueError):
        tool.backup_database(source, source)


def test_restore_requires_offline_confirmation_and_preserves_existing(tmp_path):
    tool = tooling()
    source, target = tmp_path / 'backup.db', tmp_path / 'live.db'
    database(source, 'restored')
    database(target, 'current')
    with pytest.raises(ValueError, match='offline'):
        tool.restore_database(source, target)
    assert read(target) == 'current'
    preserved = tool.restore_database(source, target, confirmed_offline=True)
    assert read(target) == 'restored'
    assert read(preserved) == 'current'
    assert read(source) == 'restored'


def test_invalid_backup_and_live_sidecars_never_replace_database(tmp_path):
    tool = tooling()
    source, target = tmp_path / 'bad.db', tmp_path / 'live.db'
    source.write_bytes(b'not a database')
    database(target, 'safe')
    with pytest.raises((ValueError, sqlite3.DatabaseError)):
        tool.restore_database(source, target, confirmed_offline=True)
    assert read(target) == 'safe'
    source.unlink()
    database(source, 'restore')
    Path(str(target) + '-wal').touch()
    with pytest.raises(ValueError, match='sidecar'):
        tool.restore_database(source, target, confirmed_offline=True)
    assert read(target) == 'safe'

