import {IRTString} from './rtmodel'


export class MockRTString implements IRTString {
  value:string;
  _oninsert:( IRTStringEvent )=>void;
  _ondelete:( IRTStringEvent )=>void;
  constructor(origin){
    this.value = origin;
    this._oninsert = function(){}
    this._ondelete = function(){}
  }
  
  get collaborative(){
    return false;
  }
  
  oninsert(callback:any):void {
    this._oninsert = callback
  }
  ondelete(callback:any):void {
    this._ondelete = callback
  }
  
  insert(index, value):void {
    var before = value.slice(0, index);
    var after = value.slice(index);
    this.value = before.concat(value, after)
    //this._oninsert({index:index, text:value})
  }
  
  deleteRange(from:number, to:number):void {
    var before  = this.value.slice(0   , from)
    var removed = this.value.slice(from, to  )
    var after   = this.value.slice(to)
    this.value = before.concat(after)
    //this._ondelete({index:from, text:removed})
  }
}
