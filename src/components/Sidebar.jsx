
import React, { useState } from 'react';

export default function Sidebar({ onSelectChat, chats, activeChatId, onToggle, showSidebar, user, onLogout, loading = false, error = '', onCreateGroup, debugStyle }) {
  console.log('[DEBUG] Sidebar mounted. showSidebar:', showSidebar, 'debugStyle:', debugStyle);
  const [showModal, setShowModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupError, setGroupError] = useState('');
  const handleCreate = (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setGroupError('Group name is required');
      return;
    }
    onCreateGroup(groupName.trim());
    setGroupName('');
    setGroupError('');
    setShowModal(false);
  };
  return (
    <aside
      className={`bg-white border-r w-80 max-w-full h-full flex flex-col transition-transform duration-200 z-20 ${showSidebar ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static top-0 left-0`}
      aria-label="Sidebar"
    >
      <div className="flex items-center p-4 border-b">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-lg font-bold text-green-700 shrink-0" aria-label="User avatar">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="truncate">
            <div className="font-semibold truncate">{user?.username}</div>
            <div className="text-xs text-gray-400">Online</div>
          </div>
        </div>
        <div className="flex-shrink-0 ml-2 flex gap-2">
          <button className="px-3 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700 transition" onClick={() => setShowModal(true)} aria-label="Create group">
            Create Group
          </button>
          <button className="md:hidden p-2" onClick={onToggle} aria-label="Open menu">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>
        </div>
      </div>
      {/* Create Group Modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30">
          <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg shadow-lg w-full max-w-xs relative">
            <button type="button" className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowModal(false)} aria-label="Close">
              <span className="material-icons">close</span>
            </button>
            <h3 className="text-lg font-bold mb-4 text-green-700">Create Group</h3>
            <input type="text" className="w-full border rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-green-400" placeholder="Group name" value={groupName} onChange={e => setGroupName(e.target.value)} autoFocus />
            {groupError && <div className="text-red-500 text-sm mb-2">{groupError}</div>}
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded transition">Create</button>
          </form>
        </div>
      )}
      <div className="flex-1 overflow-y-auto" role="listbox" aria-label="Chat list">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">{error}</div>
        ) : chats.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">No groups found. Create one!</div>
        ) : (
          chats.map((chat, idx) => (
            <div
              key={chat._id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-green-50 ${activeChatId === chat._id ? 'bg-green-100' : ''} ${idx === 0 && chat.name === 'Global Chat' ? 'border-b-2 border-green-400' : ''}`}
              onClick={() => onSelectChat(chat)}
              tabIndex={0}
              role="option"
              aria-selected={activeChatId === chat._id}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${chat.name === 'Global Chat' ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{chat.name[0].toUpperCase()}</div>
              <div className="flex-1">
                <div className="font-medium">{chat.name}</div>
                {/* Show online count for global chat, else show group info */}
                {chat.name === 'Global Chat' ? (
                  <div className="text-xs text-green-600">Global chat for all users</div>
                ) : (
                  <div className="text-xs text-gray-400">{chat.members?.filter(m => m.isOnline).length || 0} online</div>
                )}
              </div>
              {chat.unread > 0 && (
                <span className="bg-green-500 text-white text-xs rounded-full px-2 py-0.5 ml-2" aria-label="Unread messages">{chat.unread}</span>
              )}
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t">
        <button onClick={onLogout} className="w-full bg-red-100 text-red-600 py-2 rounded font-semibold hover:bg-red-200 transition" aria-label="Logout">Logout</button>
      </div>
    </aside>
  );
}
