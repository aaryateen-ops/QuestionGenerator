import argparse
from contextlib import closing
from datetime import datetime, timezone
import os
from pathlib import Path
import sqlite3
import tempfile


def checked_source(path):
    path = Path(path).resolve(strict=True)
    if not path.is_file():
        raise ValueError('Source must be a database file')
    return path


def check_integrity(path):
    with closing(sqlite3.connect(Path(path).as_uri() + '?mode=ro', uri=True)) as connection:
        result = connection.execute('PRAGMA integrity_check').fetchall()
        if result != [('ok',)]:
            raise ValueError(f'Database integrity check failed: {result}')


def backup_database(source, destination):
    source = checked_source(source)
    destination = Path(destination).resolve()
    if source == destination:
        raise ValueError('Source and destination must differ')
    if destination.exists():
        raise FileExistsError(destination)
    if not destination.parent.is_dir():
        raise ValueError('Destination parent directory must exist')
    descriptor, temporary = tempfile.mkstemp(prefix='.sqlite-backup-', dir=destination.parent)
    os.close(descriptor)
    temporary = Path(temporary)
    try:
        with closing(sqlite3.connect(source.as_uri() + '?mode=ro', uri=True)) as original:
            with closing(sqlite3.connect(temporary)) as copy:
                original.backup(copy, pages=256, sleep=0.05)
        check_integrity(temporary)
        # Hard-link creation refuses an existing destination, including concurrent writers.
        os.link(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)
    return destination


def restore_database(source, destination, confirmed_offline=False):
    if not confirmed_offline:
        raise ValueError('Restore requires explicit offline confirmation; stop every database writer first')
    source = checked_source(source)
    destination = Path(destination).resolve()
    if source == destination:
        raise ValueError('Source and destination must differ')
    if not destination.parent.is_dir():
        raise ValueError('Destination parent directory must exist')
    if any(Path(str(destination) + suffix).exists() for suffix in ('-wal', '-shm', '-journal')):
        raise ValueError('Database sidecar files exist; verify clean shutdown before restoring')
    check_integrity(source)
    descriptor, staged = tempfile.mkstemp(prefix='.sqlite-restore-', dir=destination.parent)
    os.close(descriptor)
    staged = Path(staged)
    staged.unlink()
    preserved = None
    try:
        backup_database(source, staged)
        if destination.exists():
            stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
            preserved = destination.with_name(destination.name + f'.before-restore-{stamp}.bak')
            backup_database(destination, preserved)
        os.replace(staged, destination)
    finally:
        staged.unlink(missing_ok=True)
    return preserved


def main():
    parser = argparse.ArgumentParser(description='Verified SQLite online backup and offline restore')
    parser.add_argument('action', choices=('backup', 'restore', 'check'))
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path, nargs='?')
    parser.add_argument('--confirm-offline', action='store_true', help='All database writers have been stopped')
    args = parser.parse_args()
    try:
        if args.action == 'check':
            check_integrity(checked_source(args.source))
            print('Integrity check: ok')
        elif args.destination is None:
            parser.error('backup and restore require a destination')
        elif args.action == 'backup':
            print(f'Backup verified: {backup_database(args.source, args.destination)}')
        else:
            preserved = restore_database(args.source, args.destination, args.confirm_offline)
            print(f'Restore verified. Previous database: {preserved or "none"}')
    except (OSError, ValueError, sqlite3.Error) as error:
        parser.exit(1, f'Error: {error}\n')


if __name__ == '__main__':
    main()

