// SPDX-License-Identifier: MPL-2.0
// Managed instances retain their existing on-disk format. External content uses
// a separate state directory keyed by its confirmed, ordinary game directory.
export const contentState170=async(core,dir)=>core.contentStateDirectory?core.contentStateDirectory(dir):dir;
export const instanceState170=async(core,id)=>core.statePath?core.statePath(id):core.instancePath(id);
