// SPDX-License-Identifier: MPL-2.0
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.ConsoleCommandSender;
import org.bukkit.entity.Player;
import java.util.Base64;
import java.nio.charset.StandardCharsets;
public final class AmberPlayers141 extends JavaPlugin {
 @Override public boolean onCommand(CommandSender sender, Command cmd, String label, String[] args) {
  if (!(sender instanceof ConsoleCommandSender)) return true;
  if (label.equalsIgnoreCase("ambermetrics144")) {
   Object server=getServer();double tps=-1,mspt=-1;
   try {double[] values=(double[])server.getClass().getMethod("getTPS").invoke(server);if(values.length>0)tps=Math.min(20,values[0]);}catch(Exception ignored){}
   try {mspt=((Number)server.getClass().getMethod("getAverageTickTime").invoke(server)).doubleValue();}catch(Exception ignored){}
   sender.sendMessage("AMBER_METRICS144 {\"tps\":"+(Double.isFinite(tps)&&tps>=0?Double.toString(tps):"null")+",\"mspt\":"+(Double.isFinite(mspt)&&mspt>=0?Double.toString(mspt):"null")+"}");return true;
  }
  StringBuilder out=new StringBuilder("["); boolean first=true;
  for(Player p:getServer().getOnlinePlayers()) {
   if(!p.getName().matches("[A-Za-z0-9_]{1,16}"))continue;
   int ping=-1;try {ping=((Number)p.getClass().getMethod("getPing").invoke(p)).intValue();}catch(Exception ignored){}
   if(!first)out.append(',');first=false;
   out.append("{\"name\":\"").append(p.getName()).append("\",\"uuid\":\"").append(p.getUniqueId()).append("\",\"ping\":").append(ping).append('}');
  }
  out.append(']');sender.sendMessage("AMBER_PLAYERS141 "+Base64.getEncoder().encodeToString(out.toString().getBytes(StandardCharsets.UTF_8)));return true;
 }
}
