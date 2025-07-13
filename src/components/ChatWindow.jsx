import React, { useRef, useEffect, useState } from 'react';
import ReactionPicker from './ReactionPicker';
import ReadReceipt from './ReadReceipt';

export default function ChatWindow({ messages, onSend, user, typing, onTyping, onReact, onRead, chat, reactions = {}, readBy = {}, loading = false, error = '', hideHeader = false }) {
  const inputRef = useRef();
  const messagesEndRef = useRef();
  const [showPicker, setShowPicker] = useState(null); // msgId

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const value = inputRef.current.value.trim();
    if (value) {
      onSend(value);
      inputRef.current.value = '';
      // Emit stopTyping when message is sent
      if (typeof onTyping === 'function') onTyping('');
    }
  };

  return (
    <div className="flex flex-col h-full" aria-label="Chat window">
      {!hideHeader && (
        <div className="flex items-center gap-3 p-4 border-b bg-white">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-600" aria-label="Chat avatar">
            {chat?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="font-medium">{chat?.name}</div>
            <div className="text-xs text-gray-400">{chat?.isOnline ? 'online' : chat?.lastSeen ? `last seen ${chat.lastSeen}` : ''}</div>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 py-2 bg-green-50" role="log" aria-live="polite">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">Loading messages...</div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">{error}</div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">No messages yet</div>
        ) : (
          messages.map(msg => {
            if (msg.type === 'system') {
              return (
                <div key={msg._id} className="flex justify-center mb-2">
                  <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-xs font-semibold shadow">
                    {msg.content}
                  </div>
                </div>
              );
            }
            const isMine = msg.sender._id === user.id;
            return (
              <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2 relative`}>
                <div className={`flex flex-col max-w-xs px-4 py-2 rounded-2xl shadow text-sm ${isMine ? 'bg-green-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none'}`}
                  style={isMine ? {alignItems: 'flex-end'} : {alignItems: 'flex-start'}}
                  onMouseEnter={() => setShowPicker(msg._id)}
                  onMouseLeave={() => setShowPicker(null)}
                  tabIndex={0}
                  aria-label={`Message from ${msg.sender.username}`}
                >
                  {/* Username inside bubble, above content */}
                  <div className={`font-bold mb-1 ${isMine ? 'text-white' : 'text-green-800'}`}>{msg.sender?.username || 'User'}</div>
                  <div>{msg.content}</div>
                  <div className={`flex items-center gap-1 mt-1 text-xs ${isMine ? 'text-green-100' : 'text-gray-400'}`}>
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {/* Reactions */}
                    {reactions[msg._id] && reactions[msg._id].length > 0 && (
                      <span className="ml-2" aria-label="Reactions">
                        {reactions[msg._id].map((r, i) => <span key={i}>{r}</span>)}
                      </span>
                    )}
                    {/* Read receipts */}
                    {isMine && (
                      <ReadReceipt readBy={readBy[msg._id] || []} total={chat?.members?.length || 2} userId={user.id} />
                    )}
                  </div>
                  {/* Reaction Picker */}
                  {showPicker === msg._id && (
                    <ReactionPicker onSelect={emoji => onReact(msg._id, emoji)} onClose={() => setShowPicker(null)} />
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
        {typing && typing.length > 0 && (
          (() => {
            const names = typing
              .map(id => {
                const user = chat?.members?.find(m => m._id == id);
                return user ? user.username : null;
              })
              .filter(Boolean);
            if (names.length === 0) return null;
            return (
              <div className="text-xs text-gray-400 mb-2">
                {names.join(', ')}{' '}
                {names.length === 1 ? 'is' : 'are'} typing...
              </div>
            );
          })()
        )}
      </div>
      <form onSubmit={handleSend} className="flex items-center gap-2 p-4 border-t bg-white" aria-label="Send message form">
        <input ref={inputRef} type="text" className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" placeholder="Type a message..." onChange={e => {
          if (typeof onTyping === 'function') onTyping(e.target.value);
        }} aria-label="Type a message" />
        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full font-semibold transition" aria-label="Send">Send</button>
      </form>
    </div>
  );
}
