        import React from "react";
        import ReactDOM from "react-dom/client";
        import {Assistant, ChatHistory} from "../src/Chat.tsx";
        import "../src/styles.css"; import "../src/components/ui/ui.css"; import "../src/app-clean.css"; import "../src/chat.css";
        function Preview() {
          const [messages,setMessages]=React.useState([]);
          const [id,setId]=React.useState("first");
          const [history,setHistory]=React.useState(false);
          return React.createElement("div",{className:"content",style:{height:"100dvh",padding:0}},
            history ? React.createElement(ChatHistory,{messages,onBack:()=>setHistory(false),onNew:()=>{setId("second");setHistory(false)},onOpen:chat=>{setId(chat);setHistory(false)}}) :
            React.createElement(Assistant,{key:id,messages:messages.filter(m=>m.chatId===id),onHistory:()=>setHistory(true),
              onNew:()=>setId("second"),onSend:async text=>{
                await new Promise(resolve=>setTimeout(resolve,150));
                setMessages(m=>[...m,{_id:crypto.randomUUID(),chatId:id,from:"user",text,timestamp:Date.now()},
                  {_id:crypto.randomUUID(),chatId:id,from:"agent",text:"Your funding gap is **£250**.\n\n- **Income**: confirmed funding\n- Essential expenses\n\n[Review your plan](https://example.com)",timestamp:Date.now()+1}]);return true;
              }})
          );
        }
        ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(Preview));
