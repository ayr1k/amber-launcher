# Rolling back from 1.1.0

Before changing versions, export your current appearance from Settings → Appearance & themes and keep the `.ambtheme` file separately. Restore classic with Ctrl+Shift+F12. The 1.0.0 release does not understand the 1.1.0 theme system.

Back up important instances and worlds, then close the launcher and Minecraft. Download the matching product's [1.0.0 installer and checksums](https://github.com/ayr1k/amber-launcher/releases/tag/v1.0.0), verify its SHA-256 and install into the original program directory. Keep user data. Do not mix AMBER and AmberE installation or data directories. Themes are portable between these editions; account stores and game-data directories are not interchangeable.

Program rollback does not undo mod, configuration or world changes. Restore an instance backup to a separate instance if needed. Theme files remain local, but older versions may normalize settings they do not recognize: keep an exported theme if you plan to return to 1.1.0. Do not rely on an older version retaining theme preferences.

Installer preflight retains the previous program when applicable; `%LOCALAPPDATA%/AMBER/previous-program.txt` records its location. This is not a world backup. Account encryption requires the original Windows user.

For an earlier rollback from 1.0.0, [Beta 1.14](https://github.com/ayr1k/amber-launcher/releases/tag/v1.0.0-beta.15) remains available. Apply the same backup and product-separation precautions.
