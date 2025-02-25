// Eliminar esta línea si no usas React directamente
// import React from 'react';

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
      aria-label="Volver atrás"
    >
      <ArrowLeft className="h-6 w-6" />
    </button>
  );
}