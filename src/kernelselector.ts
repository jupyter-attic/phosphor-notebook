// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import utils = require('./utils');


/**
 * The url for the kernelspec service.
 */
var SESSION_KERNELSPEC_URL = 'api/kernelspecs';


/**
 * KernelSpec help link interface.
 */
export 
interface IKernelSpecHelpLink {
  text: string;
  url: string;
}


/**
 * KernelSpecId interface.
 */
export
interface IKernelSpec {
  language: string;
  argv: string[];
  display_name: string;
  codemirror_mode: string;
  env: any;
  help_links: IKernelSpecHelpLink[];
}


/**
 * KernelSpecId interface.
 */
 export
interface IKernelSpecId {
  name: string;
  spec: IKernelSpec;
  resources: { [key: string]: string; };
}


/**
 * Handler for available kernelspecs.
 */
export
class KernelSelector {
  
  /**
   * Create a kernel selector.
   */
  constructor(baseUrl: string) {
    var url = utils.urlJoinEncode(baseUrl, 
                                  SESSION_KERNELSPEC_URL);
    var settings = {
      method: "GET",
      dataType: "json"
    }
    this._kernelspecs = new Map<string, IKernelSpecId>();
    this._loaded = utils.ajaxRequest(url, settings).then(
      (success: utils.IAjaxSuccess) => {
          var err = new Error('Invalid KernelSpec info');
          if (success.xhr.status !== 200) {
            throw err;
          }
          var data = success.data;
          if (!data.hasOwnProperty('default') || 
              typeof data.default !== 'string') {
            throw err;
          }
          if (!data.hasOwnProperty('kernelspecs') ||
              !Array.isArray(data.kernelspecs)) {
            throw err;
          }
          for (var i = 0; i < data.kernelspecslength; i++) {
            var ks = data.kernelspecs[i]
            validateKernelSpec(ks);
            this._kernelspecs.set(ks.name, ks);
          }
      });
  }

  /**
   * Select a kernel by name, ensuring kernelspecs have been loaded.
   */
  select(kernel: string | IKernelSpecId): Promise<IKernelSpecId> {
    if (typeof kernel === 'string') {
      kernel = <IKernelSpecId>{name: kernel};
    }
    var selected = <IKernelSpecId>kernel;
    return this._loaded.then(function() {
        return this._kernelspecs.get(selected.name);
    });
  }

  /**
   * Select a kernel by language.
   */
  selectByLanguage(kernel: string | IKernelSpecId): Promise<IKernelSpecId> {
    return this.select(kernel).then((selected: IKernelSpecId) => {
      if (selected !== undefined) {
          return selected;
      }
      var kernelspecs = this._kernelspecs;
      var available = _sortedNames(kernelspecs);
      var matches: string[] = [];
      var language = selected.spec.language;
      if (language && language.length > 0) {
        available.map(function(name) {
          if (kernelspecs.get(name).spec.language.toLowerCase() === language.toLowerCase()) {
              matches.push(name);
          }
        });
      }
      if (matches.length === 1) {
        return kernelspecs.get(matches[0]);
      } else {

      }
    });
  }

  private _kernelspecs: Map<string, IKernelSpecId>;
  private _loaded: Promise<void>;
}


/**
 * Sort kernel names.
 */
function _sortedNames(kernelspecs: Map<string, IKernelSpecId>) {
  return Object.keys(kernelspecs).sort(function (a, b) {
    // sort by display_name
    var da = kernelspecs.get(a).spec.display_name;
    var db = kernelspecs.get(b).spec.display_name;
    if (da === db) {
      return 0;
    } else if (da > db) {
      return 1;
    } else {
      return -1;
    }
  });
}


/**
 * Validate an object as being of IKernelSpecID type.
 */
function validateKernelSpec(info: IKernelSpecId): void {
  var err = new Error("Invalid IKernelSpecId");
  if (!info.hasOwnProperty('name') || typeof info.name !== 'string') {
    throw err;
  }
  if (!info.hasOwnProperty('spec') || !info.hasOwnProperty('resources')) {
    throw err;
  }
  var spec = info.spec;
  if (!spec.hasOwnProperty('language') || typeof spec.language !== 'string') {
    throw err;
  }
  if (!spec.hasOwnProperty('display_name') ||
      typeof spec.display_name !== 'string') {
    throw err;
  }
  if (!spec.hasOwnProperty('argv') || !Array.isArray(spec.argv)) {
    throw err;
  }
  if (!spec.hasOwnProperty('codemirror_mode') ||
      typeof spec.codemirror_mode !== 'string') {
    throw err;
  }
  if (!spec.hasOwnProperty('env') || !spec.hasOwnProperty('help_links')) {
    throw err;
  }
}
