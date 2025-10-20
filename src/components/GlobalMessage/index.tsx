import {Modal} from "antd";

export default function GlobalMessage(props:any){
  // const init = (props:any) => Modal.info(props);
  return Modal.info({icon: null,...props});
}

