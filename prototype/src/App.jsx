// SPDX-License-Identifier: MPL-2.0
import { App as Prototype } from './Amber';
import { DesktopApp } from './DesktopApp';
export function App(){return window.amberDesktop?<DesktopApp/>:<Prototype/>;}
