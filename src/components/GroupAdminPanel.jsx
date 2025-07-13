import React, { useState } from 'react';

export default function GroupAdminPanel({ group, user, onAddMember, onRemoveMember, onPromote, onDemote, onDelete }) {
  const [newMember, setNewMember] = useState('');
  const isAdmin = group.admins.includes(user.id);

  return (
    <div className="p-4 border-t bg-white">
      <div className="font-semibold mb-2">Group Management</div>
      {isAdmin && (
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            placeholder="Add member by username/email"
            className="border rounded px-2 py-1 flex-1"
            value={newMember}
            onChange={e => setNewMember(e.target.value)}
          />
          <button className="bg-green-500 text-white px-3 py-1 rounded" onClick={() => { onAddMember(newMember); setNewMember(''); }}>Add</button>
        </div>
      )}
      <ul className="mb-2">
        {group.members.map(m => (
          <li key={m._id} className="flex items-center gap-2 py-1">
            <span>{m.username}</span>
            {group.admins.includes(m._id) && <span className="text-xs text-green-600 font-bold">admin</span>}
            {isAdmin && m._id !== user.id && (
              <>
                <button className="text-xs text-red-500 ml-2" onClick={() => onRemoveMember(m._id)}>Remove</button>
                {group.admins.includes(m._id) ? (
                  <button className="text-xs text-yellow-500 ml-1" onClick={() => onDemote(m._id)}>Demote</button>
                ) : (
                  <button className="text-xs text-blue-500 ml-1" onClick={() => onPromote(m._id)}>Promote</button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      {isAdmin && (
        <button className="bg-red-100 text-red-600 px-3 py-1 rounded w-full" onClick={onDelete}>Delete Group</button>
      )}
    </div>
  );
}
