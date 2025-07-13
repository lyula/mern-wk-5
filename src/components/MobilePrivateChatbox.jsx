import React, { useRef, useEffect } from 'react';

export default function MobilePrivateChatbox({ messages, onSend, user, typing, onTyping, chat, loading, error }) {
  const inputRef = useRef();
  const messagesEndRef = useRef();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const value = inputRef.current.value.trim();
    if (value) {
      onSend(value);
      inputRef.current.value = '';
      if (typeof onTyping === 'function') onTyping('');
    }
  };

  // Get the other user in the chat
  const other = chat && chat.members ? chat.members.find(m => m._id !== user.id && m._id !== user._id) : null;

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b bg-green-600 text-white sticky top-0 z-10">
        <div className="w-10 h-10 rounded-full bg-white text-green-700 flex items-center justify-center text-lg font-bold">
          {other?.username ? other.username[0].toUpperCase() : '?'}
        </div>
        <div className="flex-1">
          <div className="font-semibold">{other?.username || 'User'}</div>
          <div className="text-xs opacity-80 flex items-center gap-1">
            {other?.isOnline ? (
              <><span className="inline-block w-2 h-2 rounded-full bg-green-300 animate-pulse" title="Online" /> Online</>
            ) : (
              <><span className="inline-block w-2 h-2 rounded-full bg-gray-300" title="Offline" /> Last seen {other?.lastSeen ? new Date(other.lastSeen).toLocaleString() : 'recently'}</>
            )}
          </div>
        </div>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 py-2" style={{ background: '#f6fef9' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">Loading messages...</div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">{error}</div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">No messages yet</div>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender._id === user.id;
            return (
              <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
                <div className={`max-w-[80vw] px-4 py-2 rounded-2xl shadow text-sm break-words ${isMine ? 'bg-green-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none'}`}>
                  <div>{msg.content}</div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                    <span>{msg.sender.username}</span>
                    <span>·</span>
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
        {typing && typing.length > 0 && (() => {
          const names = typing
            .map(id => {
              const u = chat?.members?.find(m => m._id == id);
              return u ? u.username : null;
            })
            .filter(Boolean);
          if (names.length === 0) return null;
          return (
            <div className="text-xs text-gray-400 mb-2">
              {names.join(', ')} {names.length === 1 ? 'is' : 'are'} typing...
            </div>
          );
        })()}
      </div>
      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t bg-white sticky bottom-0 z-10">
        <input ref={inputRef} type="text" className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" placeholder="Type a message..." onChange={e => {
          if (typeof onTyping === 'function') onTyping(e.target.value);
        }} aria-label="Type a message" />
        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full font-semibold transition" aria-label="Send">Send</button>
      </form>
    </div>
  );
}
