# Rolling back from Beta 1.12

[简体中文](zh-CN/ROLLBACK.md)

1. Back up valuable instances and worlds. To undo content/configuration changes, preview and restore the applicable record in Beta 1.12 first. Never force an expired record over external changes.
2. Close the launcher and game. Download the matching product's original Beta 1.11 installer and checksums from [Beta 1.11](https://github.com/ayr1k/amber-launcher/releases/tag/v1.0.0-beta.12).
3. Install into the original program location without clearing user data. Do not mix product installation or data directories.
4. Program downgrade does not undo world progress, mod updates or configuration changes. Beta 1.11 ignores the additional `.amber-history` and `trial.json` records; trial copies remain independent instances. It does not support trial promotion. If upgraded again, files changed during downgrade are rechecked.

The published Beta 1.11 tag/source archive is the development rollback baseline. Extract it into a separate directory; do not overwrite an active checkout with uncommitted work. Installation preflight also preserves the previous program when applicable; its location is recorded in `%LOCALAPPDATA%/AMBER/previous-program.txt`. This is not a backup of worlds.
