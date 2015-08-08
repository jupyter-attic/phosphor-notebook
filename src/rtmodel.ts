/**
 * Module that exposethe interfaces, and
 * a default implementation of a real-time model for the notebook
 * This is an evolving interface. For now most of the names and interfaces
 * here will be aliases for the on-disk notebook mode,, but will be usefull for
 * minmial modification of the code and avoid tricky search and replace.
 * later on.
 **/
 
import {IList} from "./nbformat"
import {Output} from "./nbformat";

import nbformat = require("./nbformat")
 
export interface IRTMetadata {
    kernelspec: {
        name: string;
        display_name: string;
    };
    language_info: {
        name: string;
        codemirror_mode?: string | {};
        file_extension?: string;
        mimetype?: string;
        pygments_lexer?: string
    };
    orig_nbformat?: number;
}

export interface IRTList<T> extends IList<T> {};
export type IRTCellList = IRTList<IRTCell>;
export interface IRTCell extends IRTBaseCell {}

export interface INotebookRTModel {
    metadata:IRTMetadata
    nbformat_minor:number
    nbformat: number
    cells: IRTCellList
}


export interface IRTExecuteResult extends nbformat.ExecuteResult {};
export interface IRTDisplayData extends nbformat.DisplayData {};
export interface IRTStream extends nbformat.Stream {};
export interface IRTJupyterError extends nbformat.JupyterError {};
export interface IRTMimeBundle extends nbformat.MimeBundle {};

export
interface IRTBaseCell {
    cell_type: string;
    source: IRTString;
    metadata: {
        name?: string;
        tags?: string[];
    }
}



export type IRTOutput = Output

export
interface IRTCodeCell extends IRTBaseCell {
    metadata: {
        collapsed?: boolean;
        scrolled?: boolean | string;
    }
    outputs: Output[];
    execution_count: number;
}

export interface IRTMarkdownCell extends IRTBaseCell {};

export interface IRTString {
  value:string
  collaborative:boolean
  oninsert(callback:(evt:IRTStringEvent)=>void, onlocal?:boolean):void
  ondelete(callback:(evt:IRTStringEvent)=>void, onlocal?:boolean):void
  insert(index:number, text:string):void
  deleteRange(from:number, to:number):void
  
}

export interface IRTStringEvent {
  index:number
  text:string
}
