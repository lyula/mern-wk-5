import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import UserChatWindow from '../components/UserChatWindow';
import MobilePrivateChatbox from '../components/MobilePrivateChatbox';

// Helper to get the other user in a private chat
function getOtherUser(chat, currentUserId) {
  if (!chat || !chat.members || !Array.isArray(chat.members)) return null;
  return chat.members.find(m => m._id !== currentUserId);
}
import Pagination from '../components/Pagination';
import GroupAdminPanel from '../components/GroupAdminPanel';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

export default function Chat() {
  // Add state for selected group members (must be inside Chat component, before any JSX)
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const params = useParams();
  // Loading state for messages/chat switching
  const [loadingMessages, setLoadingMessages] = useState(false);
  // Pagination state
  const [chats, setChats] = useState([]);
  const [chatPage, setChatPage] = useState(1);
  const [chatPages, setChatPages] = useState(1);
  const [activeChat, setActiveChat] = useState(null);
  // Sync activeChat with URL param
  useEffect(() => {
    if (!user) return;
    const groupId = params.groupId;
    const userId = params.userId;
    // When switching chats, clear messages and show loading
    setMessages([]);
    setLoadingMessages(true);
    const sortChats = arr => {
      return [...arr].sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.updatedAt || a.createdAt || 0;
        const bTime = b.lastMessage?.createdAt || b.updatedAt || b.createdAt || 0;
        return new Date(bTime) - new Date(aTime);
      });
    };
    if (groupId) {
      fetch(`${import.meta.env.VITE_API_URL}/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
        .then(res => res.json())
        .then(data => {
          setActiveChat(data);
          setChats(prev => {
            let exists = prev.some(c => c._id === data._id);
            let newArr = exists ? prev.map(c => c._id === data._id ? data : c) : [data, ...prev];
            return sortChats(newArr);
          });
        })
        .catch(() => setActiveChat(null));
    } else if (userId) {
      fetch(`${import.meta.env.VITE_API_URL}/api/chats/private/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
        .then(res => res.json())
        .then(data => {
          setActiveChat(data);
          setChats(prev => {
            let exists = prev.some(c => c._id === data._id);
            let newArr = exists ? prev.map(c => c._id === data._id ? data : c) : [data, ...prev];
            return sortChats(newArr);
          });
        })
        .catch(() => setActiveChat(null));
    } else {
      setActiveChat(null);
    }
  }, [params.groupId, params.userId, user]);
  const [messages, setMessages] = useState([]);
  const [msgPage, setMsgPage] = useState(1);
  const [msgPages, setMsgPages] = useState(1);
  // Only used for desktop sidebar and mobile overlay
  const [showSidebar, setShowSidebar] = useState(false);
  // For mobile create group
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  // Sidebar users/groups pagination
  const [sidebarUserPage, setSidebarUserPage] = useState(1);
  const [sidebarUserPages, setSidebarUserPages] = useState(1);
  const [sidebarUsers, setSidebarUsers] = useState([]);
  const [sidebarGroupPage, setSidebarGroupPage] = useState(1);
  const [sidebarGroupPages, setSidebarGroupPages] = useState(1);
  const [sidebarGroups, setSidebarGroups] = useState([]);
  // Fetch paginated users for sidebar
  const fetchSidebarUsers = useCallback(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/users?page=${sidebarUserPage}&limit=8`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => res.json())
      .then(data => {
        setSidebarUsers(data.users || []);
        setSidebarUserPages(data.pages || 1);
      })
      .catch(err => {
        setSidebarUsers([]);
        setSidebarUserPages(1);
        alert('Failed to fetch users: ' + err.message);
      });
  }, [sidebarUserPage, user.id]);

  useEffect(() => {
    fetchSidebarUsers();
  }, [fetchSidebarUsers]);

  // Fetch paginated groups for sidebar
  useEffect(() => {
    // Always fetch groups for sidebar, regardless of showSidebar (for desktop)
    console.log('[FETCH GROUPS] Fetching groups for sidebar, page:', sidebarGroupPage);
    fetch(`${import.meta.env.VITE_API_URL}/api/groups?page=${sidebarGroupPage}&limit=8`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => {
        console.log('[FETCH GROUPS] Response:', res);
        return res.json();
      })
      .then(data => {
        console.log('[FETCH GROUPS] Data:', data);
        setSidebarGroups(data.groups || []);
        setSidebarGroupPages(data.pages || 1);
      })
      .catch(err => {
        console.error('[FETCH GROUPS] Error:', err);
      });
  }, [sidebarGroupPage]);
  // Chat state
  const [typing, setTyping] = useState([]); // array of userIds
  const [showAdmin, setShowAdmin] = useState(false);
  const [reactions, setReactions] = useState({}); // {msgId: [emoji,...]}
  const [readBy, setReadBy] = useState({}); // {msgId: [userId,...]}

  // Fetch paginated chats/groups and always include global chat at the top
  useEffect(() => {
    if (!user) return;
    // Fetch global chat first
    fetch(`${import.meta.env.VITE_API_URL}/api/groups/global`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => res.json())
      .then(globalChat => {
        fetch(`${import.meta.env.VITE_API_URL}/api/groups?page=${chatPage}&limit=15`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
          .then(res => res.json())
          .then(data => {
            // Remove global chat from list if present, then add at top
            const filtered = (data.groups || []).filter(g => g._id !== globalChat._id);
            // Always sort by latest message
            const sortChats = arr => {
              return [...arr].sort((a, b) => {
                const aTime = a.lastMessage?.createdAt || a.updatedAt || a.createdAt || 0;
                const bTime = b.lastMessage?.createdAt || b.updatedAt || b.createdAt || 0;
                return new Date(bTime) - new Date(aTime);
              });
            };
            setChats(sortChats([globalChat, ...filtered]));
            setChatPages(data.pages || 1);
          });
      });
  }, [user, chatPage]);

  // Fetch paginated messages for active chat
  useEffect(() => {
    if (!activeChat) return;
    setLoadingMessages(true);
    fetch(`${import.meta.env.VITE_API_URL}/api/messages/${activeChat._id}?page=${msgPage}&limit=20`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => res.json())
      .then(data => {
        setMessages(data.messages || []);
        setMsgPages(data.pages || 1);
        setLoadingMessages(false);
      });
  }, [activeChat, msgPage]);

  // Socket events for real-time (messages, typing, reactions, online status)
  useEffect(() => {
    if (!socket) return;
    // Online/offline status for users
    const handleUserOnline = ({ userId }) => {
      setSidebarUsers(prev => prev.map(u => u._id === userId ? { ...u, online: true } : u));
      setChats(prev => prev.map(c => {
        if (!c.isGroup && c.members) {
          return {
            ...c,
            members: c.members.map(m => m._id === userId ? { ...m, isOnline: true } : m)
          };
        }
        return c;
      }));
    };
    const handleUserOffline = ({ userId, lastSeen }) => {
      setSidebarUsers(prev => prev.map(u => u._id === userId ? { ...u, online: false, lastSeen } : u));
      setChats(prev => prev.map(c => {
        if (!c.isGroup && c.members) {
          return {
            ...c,
            members: c.members.map(m => m._id === userId ? { ...m, isOnline: false, lastSeen } : m)
          };
        }
        return c;
      }));
    };

    socket.on('userOnline', handleUserOnline);
    socket.on('userOffline', handleUserOffline);

    // Chat-specific events
    if (activeChat) {
      socket.emit('joinRoom', activeChat._id);
      socket.on('receiveMessage', async msg => {
        setMessages(prev => [...prev, msg]);
        // Ensure conversation is in chats
        if (!chats.some(c => c._id === msg.chat)) {
          // Fetch conversation details (group or private)
          let conv = null;
          try {
            if (msg.isGroup || msg.group) {
              const res = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${msg.chat}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
              });
              conv = await res.json();
            } else {
              const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chats/private/${msg.sender._id === user.id ? msg.receiver : msg.sender._id}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
              conv = await res.json();
            }
          } catch (e) { conv = null; }
          if (conv && conv._id) setChats(prev => [conv, ...prev]);
        }
      });
      socket.on('typing', ({ userId }) => {
        setTyping(prev => prev.includes(userId) ? prev : [...prev, userId]);
      });
      socket.on('stopTyping', ({ userId }) => {
        setTyping(prev => prev.filter(id => id !== userId));
      });
      socket.on('reactMessage', ({ messageId, reaction }) => {
        setReactions(prev => ({ ...prev, [messageId]: [...(prev[messageId] || []), reaction] }));
      });
      socket.on('readMessage', ({ messageId, userId }) => {
        setReadBy(prev => ({ ...prev, [messageId]: [...(prev[messageId] || []), userId] }));
      });
    }
    return () => {
      socket.off('userOnline', handleUserOnline);
      socket.off('userOffline', handleUserOffline);
      if (activeChat) {
        socket.emit('leaveRoom', activeChat._id);
        socket.off('receiveMessage');
        socket.off('typing');
        socket.off('stopTyping');
        socket.off('reactMessage');
        socket.off('readMessage');
      }
    };
  }, [socket, activeChat && activeChat._id, user && user.id, chats.length]);

  const handleSend = async (content) => {
    if (!socket || !activeChat) return;
    console.log('[Socket] sendMessage', { roomId: activeChat._id, content });
    socket.emit('sendMessage', { roomId: activeChat._id, content });
    // Ensure conversation is in chats after sending
    if (!chats.some(c => c._id === activeChat._id)) {
      let conv = null;
      try {
        if (activeChat.isGroup) {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${activeChat._id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          });
          conv = await res.json();
        } else {
          const other = getOtherUser(activeChat, user.id);
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chats/private/${other?._id}`,
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
          conv = await res.json();
        }
      } catch (e) { conv = null; }
      if (conv && conv._id) setChats(prev => [conv, ...prev]);
    }
  };

  // Only emit typing if input is not empty, stopTyping if empty
  const handleTyping = (value) => {
    if (!socket || !activeChat) return;
    if (value && value.trim().length > 0) {
      socket.emit('typing', activeChat._id);
    } else {
      socket.emit('stopTyping', activeChat._id);
    }
  };


  // Group management handlers (with API and real-time logic)
  // Add member by userId
  const handleAddMember = async (memberId) => {
    if (!activeChat) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${activeChat._id}/add-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) throw new Error('Failed to add member');
      // Fetch updated group with all member details
      const groupRes = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${activeChat._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!groupRes.ok) throw new Error('Failed to fetch updated group');
      setActiveChat(await groupRes.json());
    } catch (err) {
      alert(err.message);
    }
  };

  // Remove self from group (leave)
  const handleRemoveMember = async (memberId) => {
    if (!activeChat) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${activeChat._id}/remove-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) throw new Error('Failed to remove member');
      // Fetch updated group with all member details
      const groupRes = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${activeChat._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!groupRes.ok) throw new Error('Failed to fetch updated group');
      setActiveChat(await groupRes.json());
    } catch (err) {
      alert(err.message);
    }
  };

  // Admin kick member
  const handleKickMember = async (memberId) => {
    if (!activeChat) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${activeChat._id}/kick-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) throw new Error('Failed to remove member');
      // Fetch updated group with all member details
      const groupRes = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${activeChat._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!groupRes.ok) throw new Error('Failed to fetch updated group');
      setActiveChat(await groupRes.json());
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePromote = async (memberId) => {
    if (!activeChat) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${activeChat._id}/promote-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) throw new Error('Failed to promote admin');
      // Fetch updated group with all member details
      const groupRes = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${activeChat._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!groupRes.ok) throw new Error('Failed to fetch updated group');
      setActiveChat(await groupRes.json());
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDemote = async (memberId) => {
    if (!activeChat) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${activeChat._id}/demote-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) throw new Error('Failed to demote admin');
      // Fetch updated group with all member details
      const groupRes = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${activeChat._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!groupRes.ok) throw new Error('Failed to fetch updated group');
      setActiveChat(await groupRes.json());
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteGroup = async () => {
    if (!activeChat) return;
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${activeChat._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!res.ok) throw new Error('Failed to delete group');
      setActiveChat(null);
      setChats(chats.filter(c => c._id !== activeChat._id));
    } catch (err) {
      alert(err.message);
    }
  };

  // Ensure global group is always at the top of the main group list and never in the sidebar
  const globalGroup = chats.find(g => g.name && g.name.toLowerCase() === 'global');
  let myGroups = chats.filter(g => g.members?.some(m => m._id === user.id));
  // Always include global group at the top if it exists
  if (globalGroup) {
    myGroups = [globalGroup, ...myGroups.filter(g => g._id !== globalGroup._id)];
  }
  // Sidebar should never show global group (by _id and name, case-insensitive)
  const otherGroups = chats.filter(g => {
    const name = g.name?.toLowerCase();
    return !g.members?.some(m => m._id === user.id) &&
      g._id !== globalGroup?._id &&
      name !== 'global' && name !== 'global chat';
  });

  // Mobile: track if user is in chat view (activeChat != null)
  // When user logs in or logs out, always reset to group list
  useEffect(() => {
    setActiveChat(null);
  }, [user]);

  // Fetch all private chats and groups for the conversation list (mobile)
  useEffect(() => {
    if (!user) return;
    // Fetch global group
    const fetchGlobal = fetch(`${import.meta.env.VITE_API_URL}/api/groups/global`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(res => res.json());
    // Fetch paginated groups
    const fetchGroups = fetch(`${import.meta.env.VITE_API_URL}/api/groups?page=${chatPage}&limit=15`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(res => res.json());
    // Fetch all private chats for the user
    const fetchPrivates = fetch(`${import.meta.env.VITE_API_URL}/api/chats/private`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(res => res.json());

    Promise.all([fetchGlobal, fetchGroups, fetchPrivates]).then(([globalChat, groupData, privateData]) => {
      // Remove global from group list if present, then add at top
      const filteredGroups = (groupData.groups || []).filter(g => g._id !== globalChat._id);
      // Private chats array
      const privateChats = privateData.chats || [];
      // Combine: global, groups, privates
      const allChats = [globalChat, ...filteredGroups, ...privateChats];
      // Always sort by latest message
      const sortChats = arr => {
        return [...arr].sort((a, b) => {
          const aTime = a.lastMessage?.createdAt || a.updatedAt || a.createdAt || 0;
          const bTime = b.lastMessage?.createdAt || b.updatedAt || b.createdAt || 0;
          return new Date(bTime) - new Date(aTime);
        });
      };
      setChats(sortChats(allChats));
      setChatPages(groupData.pages || 1);
    });
  }, [user, chatPage]);

  return (
    <div className="h-screen w-full bg-gray-100 overflow-hidden">
      <div className="flex h-full w-full overflow-hidden">
        {/* Desktop sidebar styled like mobile sidebar */}
        {/* Removed duplicate header for group chats, only mobile header with back arrow remains */}
        {/* Desktop pagination (unchanged) */}
        {/* Desktop sidebar: always visible on md+ screens */}
        <aside className="hidden md:flex flex-col w-80 h-full border-r bg-white z-10">
          {/* User info and actions */}
          <div className="flex items-center gap-3 px-4 py-4 border-b">
            <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-lg font-bold text-green-700">
              {user?.username ? user.username[0].toUpperCase() : '?'}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-green-700">{user?.username || 'User'}</span>
              <span className="text-xs text-green-500 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Online
              </span>
            </div>
          </div>
          {/* Users list */}
          <div className="flex-1 overflow-y-auto p-2 flex flex-col divide-y">
            <div className="flex-1 flex flex-col">
              <div className="font-semibold text-green-700 mb-2">Users</div>
              {sidebarUsers.length === 0 ? (
                <div className="text-gray-400 text-sm text-center mt-4">No users found.</div>
              ) : (
                sidebarUsers
                  .filter(u => {
                    const currentUserId = user.id || user._id;
                    return currentUserId ? u._id !== currentUserId : true;
                  })
                  .map(u => (
                    <div
                      key={u._id}
                      className="flex items-center gap-3 py-2 px-2 rounded hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        navigate(`/chat/user/${u._id}`);
                      }}
                    >
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
                        {u.username ? u.username[0].toUpperCase() : '?'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-800">{u.username || 'User'}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          {u.online ? (
                            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Online" />
                          ) : (
                            <span className="inline-block w-2 h-2 rounded-full bg-gray-400" title="Offline" />
                          )}
                          {u.online ? 'Online' : `Last seen ${u.lastSeen ? new Date(u.lastSeen).toLocaleString() : 'recently'}`}
                        </div>
                      </div>
                    </div>
                  ))
              )}
              <div className="flex justify-between mt-2">
                <button
                  className="text-xs px-2 py-1 rounded bg-gray-100 disabled:opacity-50"
                  disabled={sidebarUserPage <= 1}
                  onClick={() => setSidebarUserPage(p => Math.max(1, p - 1))}
                >Prev</button>
                <span className="text-xs text-gray-500">Page {sidebarUserPage} / {sidebarUserPages}</span>
                <button
                  className="text-xs px-2 py-1 rounded bg-gray-100 disabled:opacity-50"
                  disabled={sidebarUserPage >= sidebarUserPages}
                  onClick={() => setSidebarUserPage(p => Math.min(sidebarUserPages, p + 1))}
                >Next</button>
              </div>
            </div>
            {/* Groups list */}
            <div className="flex-1 flex flex-col mt-4">
              <div className="font-semibold text-green-700 mb-2">Groups</div>
              {sidebarGroups.length === 0 ? (
                <div className="text-gray-400 text-sm text-center mt-4">No groups found.</div>
              ) : (
                sidebarGroups.map(g => (
                  <div
                    key={g._id}
                    className="flex items-center gap-3 py-2 px-2 rounded hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      navigate(`/chat/${g._id}`);
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-sm font-bold text-green-700">
                      {g.name ? g.name[0].toUpperCase() : '?'}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-800">{g.name || 'Group'}</div>
                      <div className="text-xs text-gray-500">{g.members?.length || 0} members</div>
                    </div>
                  </div>
                ))
              )}
              <div className="flex justify-between mt-2">
                <button
                  className="text-xs px-2 py-1 rounded bg-gray-100 disabled:opacity-50"
                  disabled={sidebarGroupPage <= 1}
                  onClick={() => setSidebarGroupPage(p => Math.max(1, p - 1))}
                >Prev</button>
                <span className="text-xs text-gray-500">Page {sidebarGroupPage} / {sidebarGroupPages}</span>
                <button
                  className="text-xs px-2 py-1 rounded bg-gray-100 disabled:opacity-50"
                  disabled={sidebarGroupPage >= sidebarGroupPages}
                  onClick={() => setSidebarGroupPage(p => Math.min(sidebarGroupPages, p + 1))}
                >Next</button>
              </div>
            </div>
          </div>
          {/* Sidebar actions */}
          <div className="px-4 py-4 border-t flex flex-col gap-2 mt-auto">
            <button
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg"
              onClick={() => setShowCreateGroup(true)}
            >
              + Create Group
            </button>
            <button
              className="w-full bg-gray-100 hover:bg-red-100 text-red-600 font-semibold py-2 rounded-lg"
              onClick={() => { logout(); }}
            >
              Log out
            </button>
          </div>
        </aside>
        {/* Redesigned mobile and shared main content */}
        <main className="flex-1 flex flex-col h-full w-full max-w-full overflow-x-hidden">
          {/* Mobile: fixed header, group list, and chat overlay */}
          <div className="md:hidden w-full h-full flex flex-col">
            {/* Header with hamburger (only on group list) or back arrow (in chat) */}
            <div className="w-full bg-white border-b flex items-center px-4 py-3 shadow-sm" style={{height: 64}}>
              {!activeChat ? (
                <button
                  className="mr-3 p-2 rounded-full hover:bg-gray-200"
                  aria-label="Open menu"
                  onClick={() => setShowSidebar(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                  </svg>
                </button>
              ) : (
                <button
                  className="mr-3 p-2 rounded-full hover:bg-gray-200"
                  onClick={() => setActiveChat(null)}
                  aria-label="Back to group list"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
              )}
              <span className="font-bold text-green-700 text-lg">{activeChat ? activeChat.name : 'Groups'}</span>
            </div>
            {/* Mobile sidebar overlay */}
            {showSidebar && !activeChat && (
              <div className="fixed inset-0 z-40 flex">
                {/* Overlay background */}
                <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setShowSidebar(false)} />
                {/* Sidebar panel */}
                <div className="relative w-64 max-w-[80vw] h-full bg-white shadow-lg flex flex-col z-50 animate-slideInLeft">
                  <div className="flex items-center justify-between px-4 py-4 border-b">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-lg font-bold text-green-700">
                        {user?.username ? user.username[0].toUpperCase() : '?'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-green-700">{user?.username || 'User'}</span>
                        <span className="text-xs text-green-500 flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Online
                        </span>
                      </div>
                    </div>
                    <button className="p-2 rounded-full hover:bg-gray-200" onClick={() => setShowSidebar(false)} aria-label="Close sidebar">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col divide-y">
                    {/* Users list (top half) */}
                    <div className="flex-1 overflow-y-auto p-2 flex flex-col">
                      <div className="font-semibold text-green-700 mb-2">Users</div>
                      {console.log('sidebarUsers:', sidebarUsers)}
                      {console.log('user object:', user)}
                      {console.log('current user id:', user.id || user._id)}
                      {sidebarUsers.length === 0 ? (
                        <div className="text-gray-400 text-sm text-center mt-4">No users found.</div>
                      ) : (
                        sidebarUsers
                          .filter(u => {
                            const currentUserId = user.id || user._id;
                            return currentUserId ? u._id !== currentUserId : true;
                          })
                          .map(u => (
                            <div
                              key={u._id}
                              className="flex items-center gap-3 py-2 px-2 rounded hover:bg-gray-100 cursor-pointer"
                              onClick={() => {
                                navigate(`/chat/user/${u._id}`);
                                setShowSidebar(false);
                              }}
                            >
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
                                {u.username ? u.username[0].toUpperCase() : '?'}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm text-gray-800">{u.username || 'User'}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                  {u.online ? (
                                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Online" />
                                  ) : (
                                    <span className="inline-block w-2 h-2 rounded-full bg-gray-400" title="Offline" />
                                  )}
                                  {u.online ? 'Online' : `Last seen ${u.lastSeen ? new Date(u.lastSeen).toLocaleString() : 'recently'}`}
                                </div>
                              </div>
                            </div>
                          ))
                      )}
                      <div className="flex justify-between mt-2">
                        <button
                          className="text-xs px-2 py-1 rounded bg-gray-100 disabled:opacity-50"
                          disabled={sidebarUserPage <= 1}
                          onClick={() => setSidebarUserPage(p => Math.max(1, p - 1))}
                        >Prev</button>
                        <span className="text-xs text-gray-500">Page {sidebarUserPage} / {sidebarUserPages}</span>
                        <button
                          className="text-xs px-2 py-1 rounded bg-gray-100 disabled:opacity-50"
                          disabled={sidebarUserPage >= sidebarUserPages}
                          onClick={() => setSidebarUserPage(p => Math.min(sidebarUserPages, p + 1))}
                        >Next</button>
                      </div>
                    </div>
                    {/* Groups list (bottom half) */}
                    <div className="flex-1 overflow-y-auto p-2 flex flex-col">
                      <div className="font-semibold text-green-700 mb-2">Groups</div>
                      {sidebarGroups.length === 0 ? (
                        <div className="text-gray-400 text-sm text-center mt-4">No groups found.</div>
                      ) : (
                        sidebarGroups.map(g => (
                          <div
                            key={g._id}
                            className="flex items-center gap-3 py-2 px-2 rounded hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              navigate(`/chat/${g._id}`);
                              setShowSidebar(false);
                            }}
                          >
                            <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-sm font-bold text-green-700">
                              {g.name ? g.name[0].toUpperCase() : '?'}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-800">{g.name || 'Group'}</div>
                              <div className="text-xs text-gray-500">{g.members?.length || 0} members</div>
                            </div>
                          </div>
                        ))
                      )}
                      <div className="flex justify-between mt-2">
                        <button
                          className="text-xs px-2 py-1 rounded bg-gray-100 disabled:opacity-50"
                          disabled={sidebarGroupPage <= 1}
                          onClick={() => setSidebarGroupPage(p => Math.max(1, p - 1))}
                        >Prev</button>
                        <span className="text-xs text-gray-500">Page {sidebarGroupPage} / {sidebarGroupPages}</span>
                        <button
                          className="text-xs px-2 py-1 rounded bg-gray-100 disabled:opacity-50"
                          disabled={sidebarGroupPage >= sidebarGroupPages}
                          onClick={() => setSidebarGroupPage(p => Math.min(sidebarGroupPages, p + 1))}
                        >Next</button>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-4 border-t flex flex-col gap-2 mt-auto">
                    <button
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg"
                      onClick={() => setShowCreateGroup(true)}
                    >
                      + Create Group
                    </button>
                    <button
                      className="w-full bg-gray-100 hover:bg-red-100 text-red-600 font-semibold py-2 rounded-lg"
                      onClick={() => { logout(); setShowSidebar(false); }}
                    >
                      Log out
                    </button>
                  </div>
                </div>
                {/* Create group modal */}
                {showCreateGroup && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-96 max-w-full">
                      <h2 className="text-lg font-bold mb-4 text-green-700">Create Group</h2>
                      <input
                        className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-green-400"
                        placeholder="Group name"
                        value={newGroupName}
                        onChange={e => setNewGroupName(e.target.value)}
                        autoFocus
                      />
                      <div className="mb-4">
                        <div className="font-semibold mb-1">Add Members</div>
                        <div className="max-h-40 overflow-y-auto border rounded p-2 flex flex-col gap-1">
                          {sidebarUsers.map(u => (
                            <label key={u._id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedGroupMembers.includes(u._id)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setSelectedGroupMembers(m => [...m, u._id]);
                                  } else {
                                    setSelectedGroupMembers(m => m.filter(id => id !== u._id));
                                  }
                                }}
                              />
                              <span>{u.username}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button className="px-3 py-1 rounded bg-gray-200" onClick={() => setShowCreateGroup(false)}>Cancel</button>
                        <button
                          className="px-3 py-1 rounded bg-green-600 text-white font-semibold disabled:opacity-50"
                          disabled={!newGroupName.trim()}
                          onClick={async () => {
                            const selectedMembers = [user.id, ...selectedGroupMembers];
                            if (selectedMembers.length < 2 && newGroupName.trim().toLowerCase() !== 'global chat') {
                              alert('Please select at least 2 members to create a group.');
                              return;
                            }
                            try {
                              const res = await fetch(`${import.meta.env.VITE_API_URL}/api/groups`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${localStorage.getItem('token')}`,
                                },
                                body: JSON.stringify({ name: newGroupName.trim(), members: selectedMembers }),
                              });
                              if (!res.ok) throw new Error('Failed to create group');
                              const group = await res.json();
                              setChats(prev => [group, ...prev]);
                              setShowCreateGroup(false);
                              setShowSidebar(false);
                              setNewGroupName("");
                              setSelectedGroupMembers([]);
                            } catch (err) {
                              alert(err.message);
                            }
                          }}
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              {/* End Users/Groups sidebar and modals */}
            </div>
          )}
            {/* Group list (hidden if chat open) */}
            {!activeChat && (
              <div className="flex-1 overflow-y-auto px-2 pt-2 pb-4 bg-gray-50">
                {/* Render all conversations in chats (groups and private chats) */}
                {chats.length === 0 ? (
                  <div className="text-gray-400 text-center mt-8">You have no conversations yet.</div>
                ) : (
                  chats.map(conv => {
                    // For private chat, get the other user
                    const other = !conv.isGroup && conv.members ? conv.members.find(m => m._id !== user.id && m._id !== user._id) : null;
                    // Last message preview
                    let lastMsg = conv.lastMessage;
                    // If lastMessage is missing, fetch it (only once per chat)
                    if (!lastMsg && conv._id) {
                      // Only fetch if conv._id is defined
                      fetch(`${import.meta.env.VITE_API_URL}/api/messages/${conv._id}?page=1&limit=1`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                      })
                        .then(res => res.json())
                        .then(data => {
                          if (data.messages && data.messages.length > 0) {
                            conv.lastMessage = data.messages[0];
                          }
                        });
                    }
                    // Avatar letter
                    const avatarLetter = conv.isGroup
                      ? (conv.name ? conv.name[0].toUpperCase() : 'G')
                      : (other?.username ? other.username[0].toUpperCase() : '?');
                    // Username
                    const displayName = conv.isGroup
                      ? conv.name
                      : (other?.username || 'User');
                    // Status (online/last seen)
                    function formatLastSeen(lastSeen) {
                      if (!lastSeen) return 'recently';
                      const now = new Date();
                      const seen = new Date(lastSeen);
                      const isToday = now.toDateString() === seen.toDateString();
                      const yesterday = new Date(now);
                      yesterday.setDate(now.getDate() - 1);
                      const isYesterday = yesterday.toDateString() === seen.toDateString();
                      if (isToday) {
                        return seen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      } else if (isYesterday) {
                        return `Yesterday ${seen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                      } else {
                        return seen.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                      }
                    }
                    const status = conv.isGroup
                      ? `${conv.members?.length || 0} members`
                      : (other?.isOnline ? 'Online' : other?.lastSeen ? `Last seen ${formatLastSeen(other.lastSeen)}` : '');
                    // Last message time
                    const lastMsgTime = lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    // Use a unique key: conv._id (always present for chats)
                    return (
                      <button
                        key={conv._id || `${displayName}-${Math.random()}`}
                        className={`w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-lg border transition-all duration-150 bg-white border-gray-200`}
                        onClick={() => {
                          if (conv.isGroup) {
                            navigate(`/chat/${conv._id}`);
                          } else {
                            if (other) navigate(`/chat/user/${other._id}`);
                          }
                          setActiveChat(conv);
                        }}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${conv.isGroup ? 'bg-green-200 text-green-700' : 'bg-green-100 text-green-700'}`}>{avatarLetter}</div>
                        <div className="flex flex-col items-start">
                          <span className="text-base font-semibold truncate max-w-[160px]">{displayName}</span>
                          <span className="text-xs text-gray-500">{status}</span>
                          <span className="text-xs text-gray-400 max-w-[180px] truncate">
                            {lastMsg ? (
                              <>
                                <span className="font-semibold">{lastMsg.sender?.username || 'User'}:</span> {lastMsg.content}
                                <span className="ml-2">{lastMsgTime}</span>
                              </>
                            ) : (
                              <span className="italic">No messages yet</span>
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
            {/* Chat window overlays group list when open */}
            {activeChat && (
              <div className="flex-1 flex flex-col h-full w-full bg-white">
                {/* Render new mobile private chatbox for private chats, ChatWindow for groups */}
                {activeChat.isGroup === false ? (
                  <MobilePrivateChatbox
                    messages={messages}
                    onSend={handleSend}
                    user={user}
                    typing={typing}
                    onTyping={handleTyping}
                    chat={activeChat}
                    loading={loadingMessages}
                  />
                ) : (
                  <>
                    <ChatWindow
                      messages={messages}
                      onSend={handleSend}
                      user={user}
                      typing={typing}
                      onTyping={handleTyping}
                      chat={activeChat}
                      reactions={reactions}
                      onReact={() => {}}
                      readBy={readBy}
                      onRead={() => {}}
                      hideHeader={true}
                    />
                    <Pagination page={msgPage} pages={msgPages} onPageChange={setMsgPage} />
                    <button className="absolute top-4 right-4 bg-gray-200 px-3 py-1 rounded text-xs" onClick={() => setShowAdmin(v => !v)}>
                      {showAdmin ? 'Hide' : 'Group Admin'}
                    </button>
                    {showAdmin && (
                      <GroupAdminPanel
                        group={activeChat}
                        user={user}
                        onAddMember={handleAddMember}
                        onRemoveMember={handleRemoveMember}
                        onPromote={handlePromote}
                        onDemote={handleDemote}
                        onDelete={handleDeleteGroup}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          {/* Desktop: show chat window as before */}
          <div className="hidden md:flex flex-1 flex-col h-full w-full">
            {(activeChat || params.groupId || params.userId) ? (
              <>
                {/* Show loading indicator if switching chats or messages are loading */}
                {loadingMessages ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-green-600 text-lg">
                    <svg className="animate-spin h-8 w-8 mb-2 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                    Loading chat...
                  </div>
                ) : (
                  <>
                    {/* Render UserChatWindow for private chats, ChatWindow for group chats */}
                    {activeChat && activeChat.isGroup === false ? (
                      <UserChatWindow
                        messages={messages}
                        onSend={handleSend}
                        user={user}
                        typing={typing}
                        onTyping={handleTyping}
                        chat={activeChat}
                        reactions={reactions}
                        onReact={() => {}}
                        readBy={readBy}
                        onRead={() => {}}
                        loading={loadingMessages}
                      />
                    ) : activeChat && activeChat.isGroup === true ? (
                      <>
                        <button className="absolute top-4 right-4 bg-gray-200 px-3 py-1 rounded text-xs" onClick={() => setShowAdmin(v => !v)}>
                          {showAdmin ? 'Hide' : 'Group Admin'}
                        </button>
                        {showAdmin && (
                          <GroupAdminPanel
                            group={activeChat}
                            user={user}
                            onAddMember={handleAddMember}
                            onRemoveMember={handleRemoveMember}
                            onPromote={handlePromote}
                            onDemote={handleDemote}
                            onDelete={handleDeleteGroup}
                          />
                        )}
                        <ChatWindow
                          messages={messages}
                          onSend={handleSend}
                          user={user}
                          typing={typing}
                          onTyping={handleTyping}
                          chat={activeChat}
                          reactions={reactions}
                          onReact={() => {}}
                          readBy={readBy}
                          onRead={() => {}}
                          loading={loadingMessages}
                        />
                      </>
                    ) : null}
                    <Pagination page={msgPage} pages={msgPages} onPageChange={setMsgPage} />
                  </>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-xl">Select a chat to start messaging</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
