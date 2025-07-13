import React, { useState } from 'react';

export default function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex justify-center items-center gap-2 py-2">
      <button
        className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
      >
        Prev
      </button>
      <span className="text-sm text-gray-600">Page {page} of {pages}</span>
      <button
        className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
        onClick={() => onPageChange(page + 1)}
        disabled={page === pages}
      >
        Next
      </button>
    </div>
  );
}
