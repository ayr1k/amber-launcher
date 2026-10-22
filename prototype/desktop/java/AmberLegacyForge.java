// SPDX-License-Identifier: MPL-2.0
// Reflection bridge to the official pre-1.12 installer API; no Forge code bundled.
import java.io.File;
import java.net.URL;
import java.net.URLClassLoader;
public final class AmberLegacyForge {
 public static void main(String[] args) throws Exception {
  if (args.length != 3) throw new IllegalArgumentException("Expected installer, isolated directory, Minecraft version");
  File jar = new File(args[0]).getCanonicalFile();
  File directory = new File(args[1]).getCanonicalFile();
  try (URLClassLoader loader = new URLClassLoader(new URL[]{jar.toURI().toURL()}, AmberLegacyForge.class.getClassLoader())) {
   Thread.currentThread().setContextClassLoader(loader);
   Class.forName("net.minecraftforge.installer.ServerInstall", true, loader).getField("headless").setBoolean(null, true);
   Class<?> info = Class.forName("net.minecraftforge.installer.VersionInfo", true, loader);
   if (!args[2].equals(info.getMethod("getMinecraftVersion").invoke(null))) throw new IllegalArgumentException("Minecraft version mismatch");
   Object predicate = Class.forName("com.google.common.base.Predicates", true, loader).getMethod("alwaysTrue").invoke(null);
   Class<?> action = Class.forName("net.minecraftforge.installer.InstallerAction", true, loader);
   Object client = action.getField("CLIENT").get(null);
   Object result = action.getMethod("run", File.class, Class.forName("com.google.common.base.Predicate", true, loader)).invoke(client, directory, predicate);
   if (!Boolean.TRUE.equals(result)) throw new IllegalStateException("Official client installation failed");
   System.out.println("AMBER_LEGACY_FORGE_INSTALL_OK");
  }
 }
}
