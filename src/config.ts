// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import utils = require('./utils');


/**
 * Configurable data section.
 */
export 
class ConfigSection {

  /**
   * Create a config section.
   */
  constructor(sectionName: string, baseUrl: string) {
    this._sectionName = sectionName;
    this._baseUrl = baseUrl;
    this._oneLoadFinished = false;
    this._onLoaded = new Promise((resolve, reject) => {
      this._finishFirstload = resolve;
    });
  }

  /**
   * Get the data for this section.
   */
  get data(): any {
      return this._data;
  }

  /**
   * Return the onLoaded Promise.
   */
  get onLoaded(): Promise<any> {
      return this._onLoaded;
  }

  /**
   * Get the url for this section.
   */
  get apiUrl(): string {
    return utils.urlJoinEncode(this._baseUrl, 'api/config', this._sectionName);
  }
  
  /**
   * Retrieve the data for this section.
   */
  load(): Promise<any> {
    return utils.ajaxRequest(this.apiUrl, {
      method: "GET",
      dataType: "json",
    }).then((data) => {
      this._data = data;
      this._loadDone();
      return data;
    });
  }
  
  /**
   * Modify the config values stored. Update the local data immediately,
   * send the change to the server, and use the updated data from the server
   * when the reply comes.
   */
  update(newdata: any) : any {
    utils.extend(this._data, newdata);  // true -> recursive update
    
    return utils.ajaxRequest(this.apiUrl, {
      method : "PATCH",
      data: JSON.stringify(newdata),
      dataType : "json",
      contentType: 'application/json',
    }).then((data) => {
      this._data = data;
      this._loadDone();
      return data;
    });
  }

  /**
   * Internal callback for handling load finished.
   */
  private _loadDone(): void {
    if (!this._oneLoadFinished) {
      this._oneLoadFinished = true;
      this._finishFirstload();
    }
  }

  private _sectionName = "unknown";
  private _baseUrl = "unknown";
  private _data: any = null;
  private _onLoaded: Promise<any> = null;
  private _oneLoadFinished = false;
  private _finishFirstload: () => any = null;

}


/**
 * Configurable object with defaults.
 */
export 
class ConfigWithDefaults {
  
  /**
   * Create a new config with defaults.
   */
  constructor(section: ConfigSection, defaults: any, classname: string) {
    this._section = section;
    this._defaults = defaults;
    this._className = classname;
  }
  
  /**
   * Wait for config to have loaded, then get a value or the default.
   */
  get(key: string): any {
    var that = this;
    return this._section.onLoaded.then(function() {
      return this._class_data()[key] || this._defaults[key]
    });
  }
  
  /**
   * Return a config value. If config is not yet loaded, return the default
   * instead of waiting for it to load.
   */
  getSync(key: string): any {
    return this._classData()[key] || this._defaults[key];
  }
  
  /**
   * Set a config value. Send the update to the server, and change our
   * local copy of the data immediately.
   */
  set(key: string, value: any): Promise<any> {
     var d: any = {};
     d[key] = value;
     if (this._className) {
      var d2: any = {};
      d2[this._className] = d;
      return this._section.update(d2);
    } else {
      return this._section.update(d);
    }
  }

  /**
   * Get data from the Section with our classname, if available.
   * If we have no classname, get all of the data in the Section
   */
  private _classData(): any {
    if (this._className) {
      return this._section.data[this._className] || {};
    } else {
      return this._section.data
    }
  }

  private _section: ConfigSection = null;
  private _defaults: any = null;
  private _className = "unknown";
}
