# Rolling back from 1.0

Back up important instances and worlds, then close the launcher and Minecraft. Download the matching product's [Beta 1.14 installer and checksums](https://github.com/ayr1k/amber-launcher/releases/tag/v1.0.0-beta.15), verify the hash and install into its original program directory. Keep user data. Never mix AMBER and AmberE installation or data directories.

Program rollback does not undo mod, configuration or world changes. Restore an instance backup to a separate instance if needed. No data-schema migration is introduced in 1.0. Installer preflight retains the previous program when applicable; `%LOCALAPPDATA%/AMBER/previous-program.txt` records its location. This is not a world backup. Account encryption requires the original Windows user.
