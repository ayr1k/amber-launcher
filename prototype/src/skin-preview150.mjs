// SPDX-License-Identifier: MPL-2.0
// skinview3d.dispose stops its loop; Three scene geometry and composer targets
// also need explicit disposal when an account detail is unmounted.
export function disposeSkinPreview150(viewer){
 viewer.renderPaused=true;
 const resources=new Set();
 viewer.scene.traverse(object=>{
  if(object.geometry)resources.add(object.geometry);
  for(const material of Array.isArray(object.material)?object.material:[object.material])if(material)resources.add(material);
 });
 for(const resource of resources)resource.dispose();
 viewer.composer.dispose();
 viewer.dispose();
 viewer.renderer.forceContextLoss();
}
