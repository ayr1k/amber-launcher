// SPDX-License-Identifier: MPL-2.0
import {createContext,useContext} from 'react';
export const LibraryContext170=createContext(null);
export const useLibraryApi170=()=>useContext(LibraryContext170)||window.amberDesktop;
