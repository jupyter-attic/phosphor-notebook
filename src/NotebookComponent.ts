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
// marked does not yet have render on DefinitivelyTyped, PR in progress.
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
var toAbsoluteCursorPosition = function(cmdoc:CodeMirror.Doc, cursor:CodeMirror.Position):number {
    var cursor_pos = cursor.ch;
    for (var i = 0; i < cursor.line; i++) {
        try {
          cursor_pos += cmdoc.getLine(i).length + 1;
        } catch (e){
          
          // sometime I do get dropped here.
          // figure out why. Auto trigger debugger to be able to investigate
          // imediately once this happend
          
          debugger;
        }
    }
    return cursor_pos;
};


/**
 * turn absolute cursor position into CodeMirror col, ch cursor
 */
var fromAbsoluteCursorPos = function (cmdoc:CodeMirror.Doc, cursor_pos:number):CodeMirror.Position {
  var i:number, line, next_line;
  var offset = 0;
  for (i = 0, next_line=cmdoc.getLine(i); next_line !== undefined; i++, next_line=cmdoc.getLine(i)) {
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
    var source = this.data.source.value;
    var t = mathjaxutils.remove_math(source);
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
var on_del = function(cm){
    return function(evts:IRTStringEvent):void{
        var from = fromAbsoluteCursorPos(cm, evts.index);
        var to   = fromAbsoluteCursorPos(cm, evts.index+evts.text.length);
        cm.getDoc().replaceRange('', from, to, '+remote_sync');
    }
};

var onchange = (cm:CodeMirror.Editor, change:CodeMirror.EditorChange, source?) => {
    console.info("[NotebookComponent] onchange called")
    if(change.origin === 'setValue'){
      return
    }
    // TODO need to handle undo/redo
    var origin = change.origin;
    if(  origin === '+input'
      || origin === '+delete'
      || origin === '*compose'
      || origin === 'paste'
      || origin === 'undo'
      || origin === 'redo'
      || origin === 'cut'
      || origin === 'drag'
        ){
        // there is s abug around with multicursors.
        var index = toAbsoluteCursorPosition(cm.getDoc(), change.from);
        // handle insertion of new lines.
        var text = change.text.join('\n');
        if(change.removed.length !== 0){
          console.log("[NotebookComponent], got a removed changed", change.removed)
          var endIndex = index + change.removed.join('').length
          endIndex += change.removed.length-1;
          source.deleteRange(index, endIndex);
        }
        console.log("[NotebookComponent], get change: ", change, "at index", index);
        if(text.length > 0){
          source.insert(index, text)
        }
      } else if (change.origin === '+remote_sync'){
        var len= change.text.reduce(function(s, next) {
            return s + next.length;
        }, 0);
        // from-to is not correct on multiline paste.
        cm.getDoc().markText({line:change.from.line, ch:change.from.ch},
                                       {line:change.to.line, ch:change.to.ch+1+len},
                                       {css:'background-color: #DDF;', title:'Nyan Cat cursor'})
      } else {
        console.log("[NotebookComponent] Non known change, not updating model to avoid recursive update", change)
      }
}

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
      lineNumbers: true
    });
  
    // change tha to changes at some point that are triggerd
    // in batch operation. That shoudl make a difference for
    // combining changes like commenting.
    //this._editor.on('changes', (cm, changes) => {
      //debugger;
    //})
   
    // - Cannot use beforeChange here as the chace event does not have a `removed`
    // field. We could compute this ourself.
    // - We might want to use `beforeChange`, as for multiple cursors the events emitted by
    // codemirror are in a pre-change coordinate system, that we change to a character
    // index using a post-change value of the document that lead to errors on `operations`
    // - We should also have a look at `changes` that groups events per operations.
    // last possibility is to actually use a list of string and map the insertions
    // of new lines to insertinos of list in this thing.
    // - I not sure in which of this painful path we want to venture.
    // - `changes` does not only have bundeled changes on multicursor,
    // it does also trigger on newlines insertions and "Electric Chars" that auto-insert
    // the correct number of space for indentation...
    this._editor.on('changes', (cm, changes) => {
      console.info("[NotebookComponent] reacting to changes");
      if(changes.length >= 1){
        console.log("[NotebookComponent]: got multiple changes at once (", changes.length ,"), is it a multi-cursor ?")
        console.log("[NotebookComponent]:", changes)
        var ch = {line:0, ch:0};
        for(var i=0; i < changes.length; i++){
          if(ch.line < changes[i].from.line){
            ch = changes[i].from;
            continue;
            if(ch.line < changes[i].from.line){
              ch = changes[i].from;
              continue
            }
            console.log("[NotebookComponent]: got unordered changes", changes)
          }
        }
      }
      console.info("[Notebook Component] looping through N changes", changes.length);
      for(var i=changes.length-1; i>=0 ; i--){
        onchange(cm, changes[i], source)
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
    console.log("[NotebookComponents] this cell has outputs;", outputs)
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
    try {
      return this._thing.cell_type||this._thing.get('cell_type')
    } catch (e) {
      debugger; 
    }
  }
  
  get metadata():Object{
    return this._thing.metadata||this._thing.get('metadata')
  }
  
  get source():any{
    if (this._thing.get !== undefined){
      return new GDriveRTString(this._thing.get('source'))
    } else {
      return new MockRTString(this._thing.source)
    }
  }
  
  get outputs(){
    var out = this._thing.get('outputs')
    var res = []
    for(var i=0; i < out.length; i++){
        res.push(out.get(i))
    }
    return res
    
  }

}


class NotebookComponent extends Component<rtmodel.INotebookRTModel> {
  render() {
    console.info("[NotebookComponent] rendering notebook...")
    var cells:rtmodel.IRTCellList = this.data.cells;
    var r: Elem[] = [];
    for(var i = 0; i < cells.count; i++) {
      if(cells.get(i) == null){
        debugger;
      }
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
