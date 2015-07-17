// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import utils = require('./utils');


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
 * A contents handle passing file operations to the back-end.  
 * This includes checkpointing with the normal file operations.
 */
export 
class Contents {

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
  rename(path: string, new_path: string): Promise<any> {
    var data = {path: new_path};
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
  copy(from_file: string, to_dir: string): Promise<any> {
    var settings = {
      method: "POST",
      data: JSON.stringify({copy_from: from_file}),
      contentType: 'application/json',
      dataType : "json",
    };
    var url = this._getUrl(to_dir);
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
  restoreCheckpoint(path: string, checkpoint_id: string): Promise<any> {
    var settings = {
      method : "POST",
    };
    var url = this._getUrl(path, 'checkpoints', checkpoint_id);
    return utils.ajaxRequest(url, settings);
  }

  /**
   * Delete a checkpoint for a file.
   */
  deleteCheckpoint(path: string, checkpoint_id: string): Promise<any> {
    var settings = {
      method : "DELETE",
    };
    var url = this._getUrl(path, 'checkpoints', checkpoint_id);
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
