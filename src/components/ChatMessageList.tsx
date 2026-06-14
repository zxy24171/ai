import React, { useEffect, useRef } from 'react';
import type { Message } from '../types';
interface Props { messages: Message[]; streamingText?: string; isProcessing?: boolean; }
export const ChatMessageList: React.FC<Props> = ({ messages, streamingText, isProcessing }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'});},[messages,streamingText]);
  const visible = messages.filter((m)=>m.role!=='system');
  return (<div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
    {visible.length===0&&!isProcessing&&(
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center space-y-2"><p className="text-lg">开始对话</p><p className="text-sm">按住说话或输入消息</p></div>
      </div>
    )}
    {visible.map((msg)=>(<div key={msg.id} className={'flex '+(msg.role==='user'?'justify-end':'justify-start')}>
      <div className={'max-w-[85%] rounded-2xl px-4 py-3 '+(msg.role==='user'?'bg-blue-600 text-white rounded-br-md':'bg-gray-800 text-gray-100 rounded-bl-md')}>
        {msg.images&&msg.images.length>0&&(<div className="flex gap-1 mb-2 flex-wrap">
          {msg.images.map((img,i)=><img key={i} src={'data:image/jpeg;base64,'+img} alt="" className="w-16 h-12 object-cover rounded-lg border border-gray-600" />)}
        </div>)}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
      </div>
    </div>))}
    {streamingText&&(<div className="flex justify-start">
      <div className="max-w-[85%] bg-gray-800 text-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
        <p className="text-sm leading-relaxed">{streamingText}</p><span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-text-bottom" />
      </div>
    </div>)}
    {isProcessing&&!streamingText&&(<div className="flex justify-start">
      <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
        </div>
      </div>
    </div>)}
    <div ref={bottomRef} />
  </div>);
};