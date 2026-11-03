# 1.3.2 verification

1.3.2 feedback revision: local and online modes now share navigation icons, software settings/About/tools, page transitions and reduced-motion rules. Servers have a separate searchable instance list; creation moves there after the first instance. Server settings and installed content are instance-detail tabs. The Modrinth catalog shares filters, icon rows and version controls with local mode, with automatic required-dependency preview. Server tools use server logs/configuration; screenshots remain shared local-game screenshots. EULA checkbox/text/link alignment is corrected.

374 automated tests passed, including per-instance queues and cancellation, shared transfer limits, SHA512 download verification, properties conflicts/backups, isolated world copies and invitation validation. Both editions passed isolated native desktop checks: synthetic Java process console/commands/save-and-stop, continued operation across mode switches, retained settings drafts, five themes (Classic, Alloy, Nocturne, Harvest, Verdant), 1280×840 and 2560×1440 windows, and English UI. The title-bar switch stays in its title row.

Actual official Vanilla, Paper and Fabric core/Java downloads passed. A Modrinth server plugin passed download/hash verification and removal/recovery. Actual EasyTier 2.6.4 host/guest TCP forwarding passed through a local relay; access to an unrelated host TCP port was blocked. Minecraft itself was not started during this automated verification: process tests used an explicitly identified synthetic fixture. Plugin gameplay compatibility and two-computer cross-network/NAT/reconnect behavior remain user acceptance items. Five themes at two window sizes do not cover every Windows DPI configuration.

The user accepted both installers and authorized stable publication. Start with a new disposable server, review the EULA, inspect generated visual settings, send a console command and save/stop; then test your intended mods/plugins. With two computers, check LAN first, then an EasyTier invitation on different networks, reconnects and mode switching. Preserve existing worlds before testing upgrades. Spigot/CraftBukkit require importing a trusted BuildTools-generated JAR; they are not automatically redistributed.

The release preserves the accepted installer bytes and informational local-build label; update checks remain enabled. AmberX and existing theme packages are unchanged. Installation keeps the existing product identities and data locations. See the server guide for lifecycle, configuration, recovery and network limitations.

# 1.3.1 verification

365 automated tests passed. Both products passed isolated desktop checks with Classic, Alloy, Nocturne, Harvest and Verdant; 1280×840 and 2560×1440 windows; 100%, 125% and 150% page zoom; selection styles, output formats, undo/redo, saved works, checkbox/backup alignment and English UI. Both packaged programs passed startup/IPC and checksum checks. The user accepted the installers.

Page zoom does not cover every Windows system-DPI configuration. Actual game/plugin font rendering was not verified. Plugin output needs compatible plugins; JSON is a text component, not a command. The accepted installers retain their informational local build label; update checks remain enabled. Publication preserves the accepted installer bytes.
