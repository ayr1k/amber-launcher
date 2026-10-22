// SPDX-License-Identifier: MPL-2.0
import {readFile,mkdir,writeFile,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
export const backgroundPattern=/^[a-f0-9]{64}\.png$/;
export function validateBackground(value='forest'){
 if(!['none','forest'].includes(value)&&!backgroundPattern.test(value))throw Error('请选择预设背景或通过文件选择器导入图片。');return value;
}
export async function importBackground(root,path,decode){
 const info=await lstat(path);if(!info.isFile()||info.size>20*1024*1024)throw Error('请选择 20 MB 以内的 PNG、JPEG 或 WebP 图片。');
 const image=decode(await readFile(path));if(image.isEmpty())throw Error('无法读取这张图片，请换用 PNG、JPEG 或 WebP。');
 const size=image.getSize();if(size.width*size.height>40_000_000)throw Error('图片分辨率过大，请缩小到 4000 万像素以内。');
 const png=image.resize({width:Math.min(size.width,2560)}).toPNG();
 const name=createHash('sha256').update(png).digest('hex')+'.png',dir=join(root,'backgrounds');await mkdir(dir,{recursive:true});await writeFile(join(dir,name),png);return name;
}
