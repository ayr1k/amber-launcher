// SPDX-License-Identifier: MPL-2.0
/** Scene renderers consume stable action IDs; the default UI never depends on a renderer. */
export const SCENE_ACTIONS = Object.freeze(['launch', 'install', 'manage', 'migrate']);
export function createSceneBridge(dispatch) {
  return { invoke(action) { if (!SCENE_ACTIONS.includes(action)) throw new Error('Unknown scene action'); dispatch(action); } };
}
// Future scene pack: { schemaVersion, modelUrl, overviewCamera, points: [{action, camera, label}] }.
// No 3D engine, scene execution, or third-party extension code is loaded in this prototype.
