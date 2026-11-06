# Servers and online play — 1.4.4

1.3.2 feedback revision: local and online modes share navigation/icons, software settings/About/tools, page transitions and reduced-motion rules. Server creation moves to Instances after the first instance; settings and installed content are detail tabs. The catalog shares filters, project icons and compatible-version controls, with automatic required dependencies. Server tools read server configurations/logs; screenshots remain shared local-game screenshots. EULA alignment is corrected.

The title-bar Local / Online switch changes the workspace only. Client and server instances are separate. Servers, downloads and EasyTier continue while you switch modes. The Online marker reports activity or failures; a running server is not proof of remote connectivity.

Create an instance with a core, Minecraft version and unused port. Vanilla, stable Paper, Quilt and Fabric use official downloads and a per-instance Java selection. Fabric bootstraps additional dependencies on its first run. For Spigot/CraftBukkit, import a trusted JAR built using official BuildTools and select Java. Read and accept the Minecraft EULA before starting.

Use the console to send one command at a time. Save and stop sends `stop`; force termination is a separate action and may lose unsaved world changes. CPU is measured per process (100% = one logical core); working-set memory is not JVM heap size. Missing readings display “—”; TPS/MSPT are not inferred. The UI retains about 48 KB of output and the launcher console log is capped near 8 MB per run. The server core controls its own logs.

Each instance has its own directory under `servers/<id>/` inside the game-data library. Core, Java and content changes require the instance to be stopped. Copies retain worlds, configuration and content while preserving the original. An upgrade copy needs its target core installed and compatible content checked; world downgrades are not guaranteed. Copies on the same drive do not replace off-drive backups.

Visual server.properties settings include explanations, bounds and original values. Only recognized settings present in the file are shown; the initial server run generates further options. Unknown keys and comments are retained, with source editing available. Saving previews changes, backs up the previous file and rejects external-change conflicts. Running servers need a restart for saved settings. In-session drafts survive mode and instance switches; save before exiting the app.

Modrinth content is filtered by game version and loader, with required dependency previews and known client-only exclusions. Metadata is not a compatibility guarantee. Files are downloaded and verified before installation. Other versions of the same tracked project must be handled first. Content removal keeps a recoverable copy and preserves configuration. Known required dependencies are protected; manually imported JAR dependencies need manual review.

LAN players use the address shown in the instance overview. Allow the server through Windows Firewall as needed; the app does not edit firewall rules automatically.

Optional remote rooms download the platform-specific official EasyTier 2.6.4 component on demand (Windows x64: ~33 MB). Archive and executable hashes are checked. Both participants need the component. The host starts a server and shares the invitation; the guest connects Minecraft to the displayed loopback endpoint. No-TUN mode forwards the game TCP port without creating an adapter or changing DNS. It does not disable Minecraft identity authentication.

Invitations contain a shared room secret, expire after 24 hours, and should only be shared with trusted people. Recreate a room to replace its secret. One room connection is maintained per launcher, independently of the number of running servers. Public or self-hosted peers provide discovery and possible relay; no availability or NAT traversal guarantee is offered. Third-party peers see connection addresses and traffic metadata. A running component is not proof of connectivity. EasyTier is Apache-2.0; see [source and license](https://github.com/EasyTier/EasyTier/tree/v2.6.4).

Closing the app offers minimize-and-continue or stop-and-quit when a server or room is active. An unexpected launcher exit can leave a server detached; stop that original process before modifying the instance.

Validation covers isolated synthetic process lifecycle, settings/recovery, themes, real official core/Java downloads and real EasyTier TCP forwarding through a local multi-process relay. It does not constitute live Minecraft gameplay, plugin compatibility or two-computer cross-network acceptance. Direct/relay behavior, reconnects and network changes still need two-computer testing. Version 1.3.2 is released with the documented remote-room testing limitations.

## Quilt and Sakura Frp — 1.4.2

Quilt server creation downloads official loader libraries and uses isolated server storage. Quilt catalogs include Fabric fallback with native Quilt preference and exact dependency pins. Online → Connections switches between EasyTier and Sakura Frp. Sakura needs an existing TCP tunnel targeting the current server’s loopback port and a saved access token. Start the server, then the tunnel, and wait for Connected before sharing the public address. Check connection validates the public API, component and configuration. Config is fetched over verified HTTPS and passed in memory to frpc; no plaintext config is stored. Stop-and-quit also stops the connection.

A real Sakura public tunnel returned a Paper 26.3 Minecraft status response and stopped normally. This validates the tested connection, not every route, mod/plugin or non-Windows runtime.

## 1.4.3: download concurrency and server recycling

In Settings, choose up to 128 simultaneous file downloads. The default remains 8; existing settings are retained. Tasks share one budget, and new tasks receive available slots fairly. Limits decrease after network failures or rate limiting and recover after successful files. This does not split one file into multiple ranges; try a lower value if the connection or provider becomes slower. Server content and dependencies download in parallel before the existing verified installation step.

In Online → Instances, Delete moves an instance into the application recycle bin. Stop the server and its tunnel and finish or cancel associated jobs first. In Recycle bin, restore the instance; if its port is in use or assigned elsewhere, choose another port. Restoration does not start the server. Permanent deletion requires the exact instance name and removes its worlds, configuration and content. Separate backups and shared Java/download caches are retained.

## 1.4.4: server updates, performance and download controls

In Online → Instances → Content → Check updates (also available under Content downloads → Installed content), check compatible Modrinth/CurseForge updates, lock versions and preview selected changes and dependencies. Stop the server before installation or restoration. The configured automatic backup policy applies; verified recovery copies retain previous content. Direct recovery requires unchanged post-update files and does not restore configuration or worlds. Manual files without source records require manual management.

The online launch page shows ten minutes of CPU, working-set memory and supported TPS/MSPT trends. Stop the server to install/update the performance/player component, then restart it. Paper supplies real tick metrics; unsupported cores show unavailable values. Collect a 30-second local report and explicitly export JSON when needed. Reports contain bounded numeric samples and event categories, are not automatically uploaded, and cannot prove which plugin caused lag.

Settings / Task center provides global bandwidth in KiB/s (0 means unlimited), actual active/queued transfer counts and priority. Priority takes the next available slots without interrupting current transfers. The limit applies to file download bodies, not all application network traffic.

## 1.4.5: screenshot viewer and server launch layout

Tools → Screenshot browser opens images in a themed viewer with a fixed header and toolbar. Choose Fit to see the complete image or 100% for original pixels; zoom, pan, use arrow keys to switch images and Esc or Close to exit. Delete is available on screenshot cards and in the viewer. After confirmation, the image goes to the operating system trash; recover it there if needed. Failed deletion leaves the file intact. Deleting the current image selects its neighbour; deleting the last image closes the viewer. Screenshots stay local.

In landscape windows, the online launch page keeps the console on the left, four compact performance cards in a 2×2 grid on the right and core/launch settings below. Only the console scrolls internally. Open performance explanations, reports and maintenance in separate panels. Narrow/portrait windows stack the console before performance and settings, with normal page scrolling.
