// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import utils = require('./utils');
import Token = phosphor.di.Token;

/**
 * The url for the contents service.
 */
var SERVICE_CONTENTS_URL = 'api/contents';


/**
 * Options for a contents object.
 */
export
interface IContentsOpts {
  type?: string;
  format?: string;
  content?: any;
  ext?: string;
}


/**
 * Interface that a content manager should implement.
 **/
export 
interface IContents {
  get(path: string, type: string, options: IContentsOpts): Promise<any>;
  newUntitled(path: string, options: IContentsOpts): Promise<any>;
  delete(path: string): void;
  rename(path: string, newPath: string): Promise<any>;
  save(path: string, model: any): Promise<any>;
  listContents(path: string): Promise<any>;
  copy(path: string, toDir: string): Promise<any>;
  createCheckpoint(path: string): Promise<any>;
  restoreCheckpoint(path: string, checkpointID: string): Promise<any>;
  listCheckpoints(path: string): Promise<any>;
}


/**
 * A contents handle passing file operations to the back-end.  
 * This includes checkpointing with the normal file operations.
 */
export 
class Contents implements IContents {

  /**
   * Create a new contents object.
   */
  constructor(baseUrl: string) {
    this._apiUrl = utils.urlJoinEncode(baseUrl, SERVICE_CONTENTS_URL);
  }

  /**
   * Get a file.
   */
  get(path: string, options: IContentsOpts): Promise<any> {
     // We do the call with settings so we can set cache to false.
    var settings = {
      method : "GET",
      dataType : "json",
    };
    var url = this._getUrl(path);
    var params: IContentsOpts = {};
    if (options.type) { params.type = options.type; }
    if (options.format) { params.format = options.format; }
    if (options.content === false) { params.content = '0'; }
    return utils.ajaxRequest(url + utils.jsonToQueryString(params), settings);
  }

  /**
   * Create a new untitled file or directory in the specified directory path.
   */
  newUntitled(path: string, options: IContentsOpts): Promise<any> {
    var data = JSON.stringify({
      ext: options.ext,
      type: options.type
    });
    var settings = {
      method : "POST",
      data: data,
      contentType: 'application/json',
      dataType : "json",
    };
    return utils.ajaxRequest(this._getUrl(path), settings);
  }

  /**
   * Delete a file.
   */
  delete(path: string): Promise<any> {
    var settings = {
      method : "DELETE",
      dataType : "json",
    };
    var url = this._getUrl(path);
    return utils.ajaxRequest(url, settings).catch(
      // Translate certain errors to more specific ones.
      function(error) {
        // TODO: update IPEP27 to specify errors more precisely, so
        // that error types can be detected here with certainty.
        if (error.xhr.status === 400) {
          throw new Error('Directory not found');
        }
        throw error;
      }
    );
  }

  /**
   * Rename a file.
   */
  rename(path: string, newPath: string): Promise<any> {
    var data = {path: newPath};
    var settings = {
      method : "PATCH",
      data : JSON.stringify(data),
      dataType: "json",
      contentType: 'application/json',
    };
    var url = this._getUrl(path);
    return utils.ajaxRequest(url, settings);
  }

  /**
   * Save a file.
   */
  save(path: string, model: any): Promise<any> {
    var settings = {
      method : "PUT",
      dataType: "json",
      data : JSON.stringify(model),
      contentType: 'application/json',
    };
    var url = this._getUrl(path);
    return utils.ajaxRequest(url, settings);
  }
  
  /**
   * Copy a file into a given directory via POST
   * The server will select the name of the copied file.
   */
  copy(fromFile: string, toDir: string): Promise<any> {
    var settings = {
      method: "POST",
      data: JSON.stringify({copy_from: fromFile}),
      contentType: 'application/json',
      dataType : "json",
    };
    var url = this._getUrl(toDir);
    return utils.ajaxRequest(url, settings);
  }

  /**
   * Create a checkpoint for a file.
   */
  createCheckpoint(path: string): Promise<any> {
    var settings = {
      method : "POST",
      dataType : "json",
    };
    var url = this._getUrl(path, 'checkpoints');
    return utils.ajaxRequest(url, settings);
  }

  /** 
   * List available checkpoints for a file.
   */
  listCheckpoints(path: string): Promise<any> {
    var settings = {
      method : "GET",
      dataType: "json",
    };
    var url = this._getUrl(path, 'checkpoints');
    return utils.ajaxRequest(url, settings);
  }

  /**
   * Restore a file to a known checkpoint state.
   */
  restoreCheckpoint(path: string, checkpointID: string): Promise<any> {
    var settings = {
      method : "POST",
    };
    var url = this._getUrl(path, 'checkpoints', checkpointID);
    return utils.ajaxRequest(url, settings);
  }

  /**
   * Delete a checkpoint for a file.
   */
  deleteCheckpoint(path: string, checkpointID: string): Promise<any> {
    var settings = {
      method : "DELETE",
    };
    var url = this._getUrl(path, 'checkpoints', checkpointID);
    return utils.ajaxRequest(url, settings);
  }

  /**
   * List notebooks and directories at a given path.
   */
  listContents(path: string): Promise<any> {
    return this.get(path, {type: 'directory'});
  }

  /**
   * Get an REST url for this file given a path.
   */
  private _getUrl(...args: string[]): string {
    var url_parts = [this._apiUrl].concat(
                Array.prototype.slice.apply(args));
    return utils.urlJoinEncode.apply(null, url_parts);
  }

  private _apiUrl = "unknown";
}


/**
 * The interface token for IContents.
 */
export
var IContents = new Token<IContents>('IContents');
