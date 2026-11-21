// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {setLocale} from '../desktop/localization.mjs';
import {hostRecentActivity177} from '../src/room-guide-view177.mjs';

test('host copy distinguishes recent probes from absent or expired observations without claiming a join',()=>{
  for(const [locale,recent,absent] of [
    ['zh-CN','最近检测到朋友','近期未检测到朋友'],
    ['en-US','Friend detected recently','No friend detected recently']
  ]){
    setLocale(locale);
    assert.equal(hostRecentActivity177(true),recent);
    assert.equal(hostRecentActivity177(false),absent);
    assert.equal(hostRecentActivity177(undefined),absent);
    assert.equal(hostRecentActivity177({}),absent);
  }
  setLocale('zh-CN');
});
