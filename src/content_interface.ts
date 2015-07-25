
/**
 * Interface that a content manager should implement
 **/

import notebook_model = require("nbformat")
import INotebookInterface = notebook_model.INotebookInterface;

export interface IContents {
    get(path:Path, type:FileType, options:Object):any
    new_untitled(path:Path, options:Object):INotebookInterface
    delete(path:Path):void
    rename(path: Path, new_path: Path):Promise<any>
    save(path: Path, model: any, options?:any):Promise<any>
    list_contents(path: Path, options: any):Promise<any>
    copy(path: Path, model: any):Promise<any>
    create_checkpoint(path: Path, options: any):any
    restore_checkpoint(path: Path, checkpoint_id: CheckpointId, options: any):Promise<any>
    list_checkpoints(path: Path, options: any):any
}

export interface CheckpointId extends Object {}
export interface Path extends String {}
export enum FileType {FILE=1, FOLDER=2}
