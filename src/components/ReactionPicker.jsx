import React from 'react';

const reactions = ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🎉'];

export default function ReactionPicker({ onSelect, onClose }) {
  return (
    <div className="absolute bottom-10 right-0 bg-white border rounded shadow-lg flex gap-2 p-2 z-30">
      {reactions.map(r => (
        <button
          key={r}
          className="text-xl hover:scale-125 transition-transform"
          onClick={() => { onSelect(r); onClose(); }}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
