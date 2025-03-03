import { useEffect } from 'react';

function SomeComponent() {
  useEffect(() => {
    console.log('SomeComponent mounted');
  }, []);

  return (
    <div>
      {/* Contenido de tu componente */}
    </div>
  );
}

export default SomeComponent; 