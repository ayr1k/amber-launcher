# Rolling back from 1.2.1

Export the current appearance and back up instances, worlds and settings first. Switch to classic or a 1.2.0 theme, close the game and launcher, then install the matching product's [1.2.0](https://github.com/ayr1k/amber-launcher/releases/tag/v1.2.0). Do not import new themes such as Nocturne declaring `section-panels-v1` into older clients. Downgrading the app does not undo world or mod changes; do not delete the game library. Keep the two products' data separate.

# Rolling back from 1.2.0

Export your theme and back up important instances, worlds and settings first. Restore classic or 1.1.2 Alloy, close the game and launcher, then install the matching product's [1.1.2 installer](https://github.com/ayr1k/amber-launcher/releases/tag/v1.1.2). Do not import Alloy 1.2.0 with new home modules into an older client. Keep the two products' data directories separate.

Downgrading the program does not undo world or mod changes; restore instance backups to separate instances when necessary. Play history, news caches and storage summaries remain separate local data that older versions do not use. Do not delete the game library to downgrade.

# Rolling back from 1.1.1

Export your current theme and restore classic before returning to 1.1.0. Keep the export separately: 1.1.0 does not understand composition-v1 or section styles. Re-import it after upgrading again. Game-data rollback still requires its own backups.

# Rolling back from 1.1.0

Before changing versions, export your current appearance from Settings → Appearance & themes and keep the `.ambtheme` file separately. Restore classic with Ctrl+Shift+F12. The 1.0.0 release does not understand the 1.1.0 theme system.

Back up important instances and worlds, then close the launcher and Minecraft. Download the matching product's [1.0.0 installer and checksums](https://github.com/ayr1k/amber-launcher/releases/tag/v1.0.0), verify its SHA-256 and install into the original program directory. Keep user data. Do not mix AMBER and AmberE installation or data directories. Themes are portable between these editions; account stores and game-data directories are not interchangeable.

Program rollback does not undo mod, configuration or world changes. Restore an instance backup to a separate instance if needed. Theme files remain local, but older versions may normalize settings they do not recognize: keep an exported theme if you plan to return to 1.1.0. Do not rely on an older version retaining theme preferences.

Installer preflight retains the previous program when applicable; `%LOCALAPPDATA%/AMBER/previous-program.txt` records its location. This is not a world backup. Account encryption requires the original Windows user.

For an earlier rollback from 1.0.0, [Beta 1.14](https://github.com/ayr1k/amber-launcher/releases/tag/v1.0.0-beta.15) remains available. Apply the same backup and product-separation precautions.
