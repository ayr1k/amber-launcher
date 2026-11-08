// SPDX-License-Identifier: MPL-2.0
// 8.4.11 verified against Oracle GPG fingerprint BCA43417C3B485DD128EC6D4B7B3B788A8D3785C.
export const MYSQL_VERSIONS160=Object.freeze([
 Object.freeze({version:'8.4.13',url:'https://cdn.mysql.com/Downloads/MySQL-8.4/mysql-8.4.13-winx64.zip',hash:'e9cd98b1d23f122987b1afca26ad942efec5891481103d48ae3cde237fa3ea54',size:281154912}),
 Object.freeze({version:'8.4.11',url:'https://cdn.mysql.com/archives/mysql-8.4/mysql-8.4.11-winx64.zip',hash:'a492371d687d2bab088b0062581144a0044b8964baefdf4faa579292b423d25c',size:281191914})
]);
export function mysqlVersion160(version=MYSQL_VERSIONS160[0].version){const found=MYSQL_VERSIONS160.find(v=>v.version===version);if(!found)throw Error('Unsupported MySQL version; database preserved / 不支持的 MySQL 版本，数据库已保留');return found;}
