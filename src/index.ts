import NotebookApp = require("./app");
import NotebookComponent = require("./NotebookComponent");
import render = phosphor.virtualdom.render;
import demo = require("./demodata")
import mathjaxutils = require("./mathjaxutils");
import contents = require("./drivecontents")

interface Mwin extends Window {
  demo:any;
  rerender:any;
  content:any;
  contents:any;

}

export function main(): void {
    //    var notebook = new NotebookApp.NotebookApplication;
    // notebook.run();

    mathjaxutils.init();
    rerender();
    var ct = new contents.GoogleDriveContents({
      base_url:'',
      common_config:{}

    })
    var mw = (<Mwin>window);
    mw.content = ct;
    ct.get('AAAAA.ipynb',{}).then(function(data){
      console.log(data)
      rerender(data.content)
    })
};

export function rerender(data?): void {
  var test = document.getElementById('nb');
  (<Mwin>window).demo = demo;
  var notebook = data || demo.notebook;
  //console.log("rerender with", notebook)
  render(NotebookComponent.Notebook(notebook), test);
}

(<Mwin>window).rerender = rerender;
(<Mwin>window).contents = contents;
/*

            this.session = new session.Session(options);
            this.session.start(success, failure);

    Notebook.prototype._session_started = function (){
        this._session_starting = false;
        this.kernel = this.session.kernel;
        var ncells = this.ncells();
        for (var i=0; i<ncells; i++) {
            var cell = this.get_cell(i);
            if (cell instanceof codecell.CodeCell) {
                cell.set_kernel(this.session.kernel);
            }
        }
    };

    Notebook.prototype._session_start_failed = function(jqxhr, status, error){
        this._session_starting = false;
        utils.log_ajax_error(jqxhr, status, error);
    };


The notebook has a kernel associated with it.  It passes an "execute" call back down to the cells, which the
cells can call with their ids and the text in the cell.  Or maybe the cell should set its text in a separate call
and then execute it.

   */
