import {IRTStringEvent, IRTString} from "./rtmodel"
declare var gapi;

/**
 * Wrapper around the cells' sources, that expose potentially
 * collaborative methods.
 **/
export class GDriveRTString implements IRTString{
  
  _origin:any
  constructor(origin:any){
    console.info("[gmodel] Construction with object of type", typeof(origin), origin)
    this._origin = origin
  }
  
  get value():string{
    if(this.collaborative){
      return this._origin.getText()
    } else {
      return this._origin
    }
  }
  
  set value(newValue:string){
    if(this.collaborative){
      this._origin.setText(newValue);
    } else {
      this._origin = newValue;
    }
  }
  
  get collaborative():boolean{
    return (this._origin.addEventListener !== undefined)
  }
  
  oninsert(callback:(evt:IRTStringEvent)=>void, onlocal=false):void{
    if(this.collaborative){
      this._origin.addEventListener(gapi.drive.realtime.EventType.TEXT_INSERTED,
        (event) => {
          if(event.isLocal !== true){
            console.log('>>> and we are NOT LOCAL')
            callback(new GDriveRTStringEvent(event))
          }
        }
      )
    }
  }
  
  ondelete(callback:(evt)=>void, onlocal=false):void{
    if(this.collaborative){
      this._origin.addEventListener(gapi.drive.realtime.EventType.TEXT_DELETED,
        (event) => {
          if(event.isLocal !== true){
            callback(new GDriveRTStringEvent(event))
          }
        }
      )
    }
  }
  
  insert(index:number, text:string):void{
    console.log(".......=> we are inserting", this.collaborative)
    if(this.collaborative){
      console.log("......=>  trigger insert")
      this._origin.insertString(index, text)
    }
  }
  
  deleteRange(from:number, to:number):void{
    if(this.collaborative){
        console.log("[gmodel] remove range from ", from, "to:", to)
        this._origin.removeRange(from, to)
    }
  }
  
}
export class GDriveRTStringEvent implements IRTStringEvent {
  index:number
  text:string
  constructor(evt:any){
    this.index = evt.index
    this.text = evt.text
  }
}
