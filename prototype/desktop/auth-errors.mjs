// SPDX-License-Identifier: MPL-2.0
export function authStage(url){
 const u=new URL(url);
 if(u.hostname==='login.microsoftonline.com')return u.pathname.endsWith('/devicecode')?'微软设备授权':'微软令牌交换';
 if(u.hostname==='user.auth.xboxlive.com')return 'Xbox 账号认证';
 if(u.hostname==='xsts.auth.xboxlive.com')return 'Xbox XSTS 授权';
 if(u.hostname==='api.minecraftservices.com')return u.pathname.includes('entitlements')?'Minecraft 所有权检查':u.pathname.includes('/profile')?'Minecraft 角色读取':'Minecraft 服务登录';
 return '第三方皮肤站认证';
}
export function authFailure(url,status,data={}){
 const stage=authStage(url);
 const codes=['authorization_pending','slow_down','access_denied','expired_token','invalid_grant','invalid_client','unauthorized_client','invalid_scope'];
 const code=codes.includes(data.error)?data.error:undefined;
 const xbox={2148916233:'此微软账号尚未创建 Xbox 个人资料，请先在 Xbox 官网完成注册。',2148916235:'Xbox Live 在此账号所在地区不可用。',2148916236:'此账号需要完成 Xbox 年龄验证。',2148916237:'此账号需要完成 Xbox 年龄验证。',2148916238:'此儿童账号需要加入微软家庭，并由监护人检查 Xbox 权限。'};
 let hint=code==='invalid_grant'?'授权已过期或被撤销，请重新登录。':code==='access_denied'?'用户拒绝了授权，请重新登录并同意授权。':code==='expired_token'?'登录代码已过期，请获取新代码。':['invalid_client','unauthorized_client','invalid_scope'].includes(code)?'请检查应用 Client ID、公共客户端设置和授权范围。':stage==='Xbox XSTS 授权'&&xbox[data.XErr]?xbox[data.XErr]:status===429?'请求过于频繁，请稍后重试。':status>=500?'服务暂时不可用，请稍后重试。':stage==='Minecraft 服务登录'&&status===403?'Minecraft 服务拒绝访问。请检查账号权限并稍后重试；403 本身不能证明未购买游戏。':stage==='Minecraft 角色读取'&&status===404?'未找到 Java 版角色，请在 Minecraft 官网检查游戏所有权并创建角色。':status===401?'凭据无效或过期，请重新登录。':'请检查账号权限及服务状态。';
 const xerr=stage==='Xbox XSTS 授权'&&Object.hasOwn(xbox,data.XErr)?` · XErr ${data.XErr}`:'';
 const e=Error(`${stage}失败（HTTP ${status}${code?' · '+code:''}${xerr}）。${hint}`);e.code=code;e.status=status;return e;
}
