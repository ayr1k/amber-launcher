import {useState,useEffect,useRef} from 'react';
import {getLocale} from '../desktop/localization.mjs';
import {ControlButton as B} from './ControlButton.mjs';
import './workspace130.css';
import {Select} from './Select';
export const label=(zh,en)=>getLocale().startsWith('zh')?zh:en;

export {GradientTool} from './Gradient130';
export {FileEditor} from './FileEditor130';
export {ScreenshotGallery} from './ScreenshotGallery145';
