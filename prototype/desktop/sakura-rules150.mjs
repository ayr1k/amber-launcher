// SPDX-License-Identifier: MPL-2.0
export function nodeRestriction150(node,protocol,publicGame,level){
 if(!node||!Number.isInteger(node.flag)||!Number.isInteger(node.vip))return '无法确认节点能力。';
 if(node.flag&512)return '节点离线。';
 if(!(node.flag&4))return '节点暂不接受新隧道。';
 if(node.vip>level)return '账号等级不满足节点要求。';
 if(protocol==='udp'&&!(node.flag&32))return '节点不支持 UDP。';
 if(publicGame&&!(node.flag&2048)&&!String(node.name).includes('多线'))return '公开游戏服务器需要服务商允许的专用节点。';
 if(node.flag&256)return '此节点强制访问认证，当前创建面板不支持此能力。';
 return '';
}
