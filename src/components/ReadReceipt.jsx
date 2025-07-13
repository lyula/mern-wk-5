import React, { useState } from 'react';

export default function ReadReceipt({ readBy, total, userId }) {
  // WhatsApp-like: single tick (sent), double tick (delivered), double blue (read)
  // For simplicity, if all except sender have read, show blue; if any delivered, show gray double; else single
  if (!total || total <= 1) return null;
  const others = readBy.filter(id => id !== userId);
  let icon = '✔';
  let color = 'text-gray-400';
  if (others.length === total - 1 && others.length > 0) {
    icon = '✔✔';
    color = 'text-blue-500';
  } else if (others.length > 0) {
    icon = '✔✔';
    color = 'text-gray-400';
  }
  return <span className={`ml-1 text-xs ${color}`}>{icon}</span>;
}
