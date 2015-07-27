
/**
 * Interface that a content manager should implement
 **/

import notebook_model = require("nbformat")
import INotebookInterface = notebook_model.INotebookInterface;

export interface IContents {
    get(path: String, type: FileType, options: Object): any
    new_untitled(path: String, options: Object): INotebookInterface
    delete(path: String): void
    rename(path: String, new_path: String): Promise<any>
    save(path: String, model: any, options?: any): Promise<any>
    list_contents(path: String, options: any): Promise<any>
    copy(path: String, model: any): Promise<any>
    create_checkpoint(path: String, options: any): any
    restore_checkpoint(path: String, checkpoint_id: CheckpointId, options: any): Promise<any>
    list_checkpoints(path: String, options: any): any
}

export interface CheckpointId extends Object {    }
export enum FileType { FILE=1 , FOLDER=2 }
