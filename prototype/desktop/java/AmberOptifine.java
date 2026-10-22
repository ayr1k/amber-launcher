// SPDX-License-Identifier: MPL-2.0
// Small reflection bridge; contains no OptiFine code. Built for Java 8+.
import java.io.File;
import java.net.URL;
import java.net.URLClassLoader;
public final class AmberOptifine {
 public static void main(String[] args) throws Exception {
  if (args.length != 3) throw new IllegalArgumentException("Expected installer, isolated directory, Minecraft version");
  File jar = new File(args[0]).getCanonicalFile();
  File directory = new File(args[1]).getCanonicalFile();
  try (URLClassLoader loader = new URLClassLoader(new URL[]{jar.toURI().toURL()}, AmberOptifine.class.getClassLoader())) {
   Class<?> installer = Class.forName("optifine.Installer", true, loader);
   String version = (String)installer.getMethod("getOptiFineVersion").invoke(null);
   String game = (String)installer.getMethod("getMinecraftVersionFromOfVersion", String.class).invoke(null, version);
   if (!args[2].equals(game)) throw new IllegalArgumentException("Minecraft version mismatch: expected " + args[2] + ", installer " + game);
   System.out.println("AMBER_OPTIFINE " + version);
   installer.getMethod("doInstall", File.class).invoke(null, directory);
   System.out.println("AMBER_OPTIFINE_INSTALL_OK");
  }
 }
}
