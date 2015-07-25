///<reference path="../components/phosphor/dist/phosphor.d.ts"/>

/* TODO:

For executing, need:

* kernelselector
* session
* kernel
* comm


*/


import {INotebookRTModel, IRTString, IRTStringEvent} from "./rtmodel"

import rtmodel = require("./rtmodel");
import mathjaxutils = require("./mathjaxutils");
import DOM = phosphor.virtualdom.dom;
import Component = phosphor.virtualdom.Component;
import BaseComponent = phosphor.virtualdom.BaseComponent;
import Elem = phosphor.virtualdom.Elem;
import createFactory = phosphor.virtualdom.createFactory;
import render = phosphor.virtualdom.render;
import IMessage = phosphor.core.IMessage;

var div = DOM.div;
var pre = DOM.pre;
var img = DOM.img;

class MimeBundleComponent extends Component<rtmodel.IRTMimeBundle> {
  render() {
    // possible optimization: iterate through
    var x: string | string[];
    if (x = this.data["image/png"]) {
      return img({src:"data:image/png;base64,"+x})
    } else if (x = this.data["image/jpg"]) {
      return img({src:"data:image/jpg;base64,"+x})
    } else if (x = this.data["text/plain"]) {
      return pre(x);
    }
  }
}
export var MimeBundle = createFactory(MimeBundleComponent);

class ExecuteResultComponent extends Component<rtmodel.IRTExecuteResult> {
  render() {
    return MimeBundle(this.data.data);
  }
}
export var ExecuteResult = createFactory(ExecuteResultComponent);

class DisplayDataComponent extends Component<rtmodel.IRTDisplayData> {
  render() {
    return MimeBundle(this.data.data);
  }
}
export var DisplayData = createFactory(DisplayDataComponent);

class StreamComponent extends Component<rtmodel.IRTStream> {
  render() {
    return pre(this.data.text);
  }
}
export var Stream = createFactory(StreamComponent);

class JupyterErrorComponent extends Component<rtmodel.IRTJupyterError> {
  render() {
    var o = this.data;
    return pre(o.ename+'\n'+o.evalue+'\n'+(o.traceback.join('\n')));
  }
}
export var JupyterError = createFactory(JupyterErrorComponent)

// customized renderer example from marked.js readme
var renderer = new (<any>marked).Renderer();
renderer.heading = function (text: string, level: number) {
  var escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
  return `<h${level} id="${escapedText}">${text}<a class="anchor-link" href="#${escapedText}">¶</a></h${level}>`;
}

renderer.unescape = function(html: string): string {
  // from https://github.com/chjj/marked/blob/2b5802f258c5e23e48366f2377fbb4c807f47658/lib/marked.js#L1085
  return html.replace(/&([#\w]+);/g, function(_, n) {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}

renderer.check_url = function(href: string): boolean {
    try {
        var prot = decodeURIComponent(this.unescape(href))
            .replace(/[^\w:]/g, '')
            .toLowerCase();
    } catch (e) {
        return false;
    }
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
        return false;
    }
    return true;
};

renderer.link = function(href: string, title: string, text: string) {
    //modified from the mark.js source to open all urls in new tabs
    if (this.options.sanitize && !this.check_url(href)) {
        return '';
    }
    return `<a href="${href}" ${title ? `title="${title}"` : ""} ${href[0] !== "#" ? "target=_blank" : ""}>${text}</a>`;
};

/**
 * get the absolute cursor position from CodeMirror's col, ch
 */
var toAbsoluteCursorPosition = function(cm:any, cursor:any):number {
    var cursor_pos = cursor.ch;
    for (var i = 0; i < cursor.line; i++) {
        try {
          cursor_pos += cm.getLine(i).length + 1;
        } catch (e){
          debugger;
        }
    }
    return cursor_pos;
};

export interface LC {
  line:number
  ch:number
}
export interface FromTo {
  from:LC
  to:LC
}

/**
 * turn absolute cursor position into CodeMirror col, ch cursor
 */
var fromAbsoluteCursorPos = function (cm:any, cursor_pos:number):LC {
  var i:number, line, next_line;
  var offset = 0;
  for (i = 0, next_line=cm.getLine(i); next_line !== undefined; i++, next_line=cm.getLine(i)) {
      line = next_line;
      if (offset + next_line.length < cursor_pos) {
          offset += next_line.length + 1;
      } else {
          return {
              line : i,
              ch : cursor_pos - offset,
          };
      }
  }
  // reached end, return endpoint
  return {
      line : i - 1,
      ch : line.length - 1,
  };
};

class MarkdownCellComponent extends BaseComponent<rtmodel.IRTMarkdownCell> {
  onUpdateRequest(msg: IMessage): void {
    // replace the innerHTML of the node with the rendered markdown
    //var t = mathjaxutils.remove_math(this.data.source);
    var t = mathjaxutils.remove_math(this.data.source.value);
    marked(t.html, { sanitize: true, renderer: renderer}, (err: any, html: string) => {
        this.node.innerHTML = mathjaxutils.replace_math(html, t.math);
        // TODO: do some serious sanitization, using, for example, the caja sanitizer
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, this.node]);
    });
  }
}
export var MarkdownCell = createFactory(MarkdownCellComponent)

/**
 * factory for codemirror's callback on add and on delete
 * that shoudl be triggers by the model.
 **/
 // TODO, the event is still a GoogleRT event.
 // wrap it in our own implementation.
var on_add = function(cm){
    return function(evts:IRTStringEvent):void{
        var str = evts.text;
        var from = fromAbsoluteCursorPos(cm, evts.index)
        var to = from;
        cm.getDoc().replaceRange(str, from, to, '+remote_sync');
    }
};

/**
 * factory for codemirror's callback on add and on delete
 * that shoudl be triggers by the model.
 **/
 // TODO, the event is still a GoogleRT event.
 // wrap it in our own implementation.
var on_del = function(cm){
    return function(evts:IRTStringEvent):void{
        var from = fromAbsoluteCursorPos(cm, evts.index);
        var to   = fromAbsoluteCursorPos(cm, evts.index+evts.text.length);
        cm.getDoc().replaceRange('', from, to, '+remote_sync');
    }
};

/**
 * We inherit from BaseComponent so that we can explicitly control the rendering.  We want to use the virtual dom to render
 * the output, but we want to explicitly manage the code editor.
*/
class CodeCellComponent extends BaseComponent<rtmodel.IRTCodeCell> {

  constructor(data: rtmodel.IRTCodeCell, children: Elem[]) {
    super(data, children);
    this.editor_node = document.createElement('div');
    this.editor_node.classList.add("ipy-input")
    this.output_node = document.createElement('div');
    this.node.appendChild(this.editor_node);
    this.node.appendChild(this.output_node);

    var source = this.data.source;
    this._editor  = CodeMirror(this.editor_node, {
      mode: 'python',
      value: source.value,
      lineNumbers: true});
    var that = this;
  
    // change tha to changes at some point that are triggerd
    // in batch operation. That shoudl make a difference for
    // combining changes like commenting.
    this._editor.on('change', (cm, change) => {
        console.log("[NotebookComponent] handeling change of type", change.origin)
        if(change.origin === 'setValue'){
          return
        }
        // TODO need to handle undo/redo
        if(change.origin === '+input' || change.origin === 'paste' || change.origin === '*compose'){
            var index = toAbsoluteCursorPosition(cm, change.from)
            // handle insertion of new lines.
            //
            var text = change.text[0];
            if(change.text.length >= 2){
                text = change.text.join('\n');
            }
            // if htere is a to != from than we need to trigger a delete. first.
            var indexto = toAbsoluteCursorPosition(cm, change.to)
            if(index != indexto){
              source.deleteRange(index, indexto)
            }
            source.insert(index, text)
          } else if (change.origin == '+delete'){
              // TODO do not use cm here to calculate new position,
              // as we are not in beforeChange, use the actual removed text.
              // this might also be a problem when deleting across lines boundaries.,
              // as we compute the new thign positon with line n+1
              // leading to only a new line bbeign deleted on the local codemirro instance.
              // but the full line beeing destryed on the other side
              var startIndex = toAbsoluteCursorPosition(cm, change.from);
              var endIndex = toAbsoluteCursorPosition(cm, change.to);
              source.deleteRange(startIndex, endIndex);
          } else if (change.origin === '+remote_sync'){
            var len= change.text.reduce(function(s, next) {
                return s + next.length;
            }, 0);
            this._editor.getDoc().markText({line:change.from.line, ch:change.from.ch},
                                           {line:change.to.line, ch:change.to.ch+1+len},
                                           {css:'background-color: #DDF;', title:'Nyan Cat cursor'})
          } else {
            console.log("[NotebookComponent] Non known change, not updating model to avoid recursive update", change)
          }
    });
    
    source.oninsert(on_add(this._editor));
    source.ondelete(on_del(this._editor));
  }


  protected onUpdateRequest(msg: IMessage): void {
    this._editor.getDoc().setValue(this.data.source.value);
    // we may want to save the refs at some point
    render(this.renderOutput(), this.output_node);
  }

  protected onAfterAttach(msg: IMessage): void {
    this._editor.refresh();
  }
  
  renderOutput(): Elem[] {
    var r: Elem[] = [];
    var outputs: rtmodel.IRTOutput[] = this.data.outputs;
    for(var i = 0; i < outputs.length; i++) {
      var x = outputs[i];
      switch(x.output_type) {
        case "execute_result":
          r.push(ExecuteResult(<rtmodel.IRTExecuteResult>x));
          break;
        case "display_data":
          r.push(DisplayData(<rtmodel.IRTDisplayData>x));
          break;
        case "stream":
          r.push(Stream(<rtmodel.IRTStream>x));
          break;
        case "error":
          r.push(JupyterError(<rtmodel.IRTJupyterError>x));
          break;
      }
    }
    return r;
  }

  editor_node: HTMLElement;
  output_node: HTMLElement;
  _editor: CodeMirror.Editor;
}
export var CodeCell = createFactory(CodeCellComponent);



import {GDriveRTStringEvent, GDriveRTString} from "./gmodel"
import {MockRTString} from "./mockrtmodel"


class CellAcessor implements rtmodel.IRTBaseCell{
  _thing;
  constructor(thing:any){
    this._thing = thing
  }
  
  get cell_type():string{
    return this._thing.cell_type||this._thing.get('cell_type')
  }
  
  get metadata():Object{
    return this._thing.metadata||this._thing.get('metadata')
  }
  
  get source():any{
    if (this._thing.get !== undefined){
      return new GDriveRTString(this._thing.get('source'))
    } else {
      return new GDriveRTString(this._thing.source || 'default source')
    }
  }
  
  get outputs(){
    return this._thing.output ||[]
  }

}


class NotebookComponent extends Component<rtmodel.INotebookRTModel> {
  render() {
    console.info("[NotebookComponent] rendering notebook...")
    var cells = this.data.cells;
    var r: Elem[] = [];
    for(var i = 0; i < cells.count; i++) {
      var c = <any>(new CellAcessor(cells.get(i)));
      switch(c.cell_type) {
        case "code":
          r.push(CodeCell(<rtmodel.IRTCodeCell>c));
          break;
        case "markdown":
          r.push(MarkdownCell(<rtmodel.IRTMarkdownCell>c));
          break;
        }
    }
    return r;
  }
}
export var Notebook = createFactory(NotebookComponent);
