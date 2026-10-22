// SPDX-License-Identifier: MPL-2.0
// Local demonstration catalogue. This is deliberately NOT a compatibility database.
export const demoCatalog = [
  { id: 'sodium', name: 'Sodium', summary: '让方块世界更流畅', version: '0.6.13', source: 'Modrinth', category: '模组', dependencies: [], games: ['1.20.1', '1.21.1'], loaders: ['Fabric'], icon: 'sodium' },
  { id: 'lithium', name: 'Lithium', summary: '优化游戏逻辑与实体运算', version: '0.14.8', source: 'Modrinth', category: '模组', dependencies: [], games: ['1.20.1', '1.21.1'], loaders: ['Fabric'], icon: 'lithium' },
  { id: 'iris', name: 'Iris', summary: '为你的世界添加光影', version: '1.8.8', source: 'Modrinth', category: '模组', dependencies: ['sodium'], games: ['1.21.1'], loaders: ['Fabric'], icon: 'iris' },
  { id: 'fabric-api', name: 'Fabric API', summary: 'Fabric 模组的基础 API', version: '0.115.1', source: 'Modrinth', category: '模组', dependencies: [], games: ['1.20.1', '1.21.1'], loaders: ['Fabric'], icon: 'fabric-api' },
  { id: 'modmenu', name: 'Mod Menu', summary: '在游戏内查看和配置模组', version: '11.0.3', source: 'Modrinth', category: '模组', dependencies: ['fabric-api'], games: ['1.21.1'], loaders: ['Fabric'], icon: 'modmenu' },
  { id: 'demo-shader', name: '林间柔光', summary: '暖色日光与柔和水面 · 示例资源', version: '1.0', source: 'Modrinth', category: '光影', dependencies: ['iris'], games: ['1.21.1'], loaders: ['Fabric'], icon: null },
  { id: 'demo-texture', name: '原味方块', summary: '保留原版质感的材质 · 示例资源', version: '1.0', source: 'CurseForge', category: '材质包', dependencies: [], games: ['1.20.1', '1.21.1'], loaders: ['Fabric', 'Forge', '原版'], icon: null },
  { id: 'demo-pack', name: '森林漫游整合包', summary: '性能与探索的轻量组合 · 示例资源', version: '1.0', source: 'Modrinth', category: '整合包', dependencies: ['sodium', 'lithium', 'fabric-api'], games: ['1.21.1'], loaders: ['Fabric'], icon: null },
  { id: 'demo-world', name: '河畔营地', summary: '一个新的冒险起点 · 示例地图', version: '1.0', source: 'CurseForge', category: '地图', dependencies: [], games: ['1.21.1'], loaders: ['Fabric', '原版'], icon: null },
];

export const initialInstances = [
  { id: 'forest', name: '森林漫游', game: '1.21.1', loader: 'Fabric', memory: 4, mods: demoCatalog.slice(0, 5).map(m => ({ ...m, enabled: m.id !== 'modmenu' })), resources: [] },
  { id: 'vanilla', name: '原版生存', game: '1.21.1', loader: '原版', memory: 2, mods: [], resources: [] },
  { id: 'factory', name: '机械工坊', game: '1.20.1', loader: 'Forge', memory: 6, mods: [{ id: 'local-factory', name: '本地机械模组', version: '1.0', source: '本地文件', category: '模组', enabled: true, dependencies: [], icon: null }], resources: [] },
];

export const exampleLoaders = { '1.21.1': ['原版', 'Fabric', 'NeoForge'], '1.20.1': ['原版', 'Fabric', 'Forge'], '1.12.2': ['原版', 'Forge', 'LiteLoader'] };
export function compatible(m, game, loader) { return m.games?.includes(game) && m.loaders?.includes(loader); }

export function resolveInstall(ids, instance, catalog = demoCatalog) {
  const result = new Map(), visiting = new Set(), errors = [];
  function visit(id) {
    if (result.has(id)) return;
    if (visiting.has(id)) throw new Error('检测到循环依赖：' + id);
    const mod = catalog.find(m => m.id === id);
    if (!mod || !compatible(mod, instance.game, instance.loader)) throw new Error('缺少兼容版本：' + (mod?.name || id));
    visiting.add(id);
    for (const dep of mod.dependencies || []) visit(dep);
    visiting.delete(id);
    result.set(id, { ...mod, enabled: true });
  }
  for (const id of ids) { try { visit(id); } catch (e) { errors.push(e.message); } }
  const existing = [...instance.mods, ...instance.resources];
  return { items: [...result.values()].filter(m => !existing.some(x => x.id === m.id && x.enabled !== false)), errors: [...new Set(errors)] };
}

export function planMigration(mods, target, catalog = demoCatalog) {
  return mods.map(m => {
    const project = catalog.find(p => p.id === m.id && p.source === m.source);
    if (!project) return { original: m, status: 'skipped', reason: '未找到对应项目（不按同名推测）' };
    if (!compatible(project, target.game, target.loader)) return { original: m, status: 'skipped', reason: '目标版本或加载器无兼容版本' };
    const resolution = resolveInstall([m.id], { ...target, mods: [], resources: [] }, catalog);
    if (resolution.errors.length) return { original: m, status: 'skipped', reason: resolution.errors.join('；') };
    return { original: m, status: 'matched', item: { ...project, enabled: m.enabled !== false }, dependencies: resolution.items.filter(x => x.id !== m.id), reason: '已匹配示例目录中的兼容版本' };
  });
}

export function migrationItems(plan) {
  const items = new Map();
  for (const row of plan.filter(p => p.status === 'matched')) {
    items.set(row.item.id, row.item);
    // Disabled mods do not force dependencies to be enabled until the mod is enabled.
    if (row.item.enabled) for (const dep of row.dependencies) items.set(dep.id, { ...dep, enabled: true });
  }
  // Dependencies required by enabled mods take priority over a disabled source entry.
  for (const row of plan.filter(p => p.status === 'matched' && p.item.enabled)) {
    for (const dep of row.dependencies) items.set(dep.id, { ...dep, enabled: true });
  }
  return [...items.values()];
}

export function makeManifest(instance) {
  return { schema: 'amber.mod-manifest', schemaVersion: 1, instance: { name: instance.name, game: instance.game, loader: instance.loader }, mods: instance.mods.map(({ id, name, source, version, enabled }) => ({ id, name, source, version, enabled })) };
}

export function parseManifest(text) {
  const value = JSON.parse(text);
  if (value.schema !== 'amber.mod-manifest' || value.schemaVersion !== 1 || !Array.isArray(value.mods) || value.mods.length > 2000) throw new Error('清单格式不受支持，请导入 Amber v1 模组清单。');
  const seen = new Set();
  const mods = value.mods.map(m => {
    if (!m || ['id','name','source','version'].some(k => typeof m[k] !== 'string' || m[k].length > 300) || typeof m.enabled !== 'boolean') throw new Error('清单存在无效条目。');
    const key = m.source + ':' + m.id;
    if (seen.has(key)) throw new Error('清单存在重复项目。');
    seen.add(key); return { id:m.id, name:m.name, source:m.source, version:m.version, enabled:m.enabled };
  });
  return { mods, name: typeof value.instance?.name === 'string' ? value.instance.name.slice(0, 80) : '导入的清单' };
}

export function downloadJson(value, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
