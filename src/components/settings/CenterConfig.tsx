import { useState, useEffect } from 'react';
import { getCenterConfig, saveCenterConfig } from '../../lib/db';

interface CenterConfiguration {
  id: string;
  name: string;
  logo?: string;
}

export function CenterConfig() {
  const [config, setConfig] = useState<CenterConfiguration>({
    id: crypto.randomUUID(),
    name: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'unsaved' | 'saved'>('saved');

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const centerConfig = await getCenterConfig();
        if (centerConfig) {
          setConfig(centerConfig);
        }
      } catch (error) {
        console.error('Error loading center config:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setSaveStatus('unsaved');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        
        setConfig(prev => ({
          ...prev,
          logo: base64
        }));
        setSaveStatus('unsaved');
      } catch (error) {
        console.error('Error al cargar el logo:', error);
      }
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveCenterConfig(config);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error saving center config:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="mb-6 text-xl font-semibold text-gray-800">Configuración del Centro</h2>
      
      <div className="space-y-6">
        {/* Nombre del centro */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Nombre del Centro
          </label>
          <input
            type="text"
            name="name"
            value={config.name}
            onChange={handleChange}
            className="block px-3 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Nombre del centro educativo"
          />
        </div>

        {/* Logo del centro */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Logo del Centro
          </label>
          <div className="flex items-start space-x-4">
            {config.logo ? (
              <div className="relative w-40 h-40">
                <img 
                  src={config.logo} 
                  alt="Logo del centro"
                  className="object-contain w-full h-full rounded-lg border"
                />
                <button
                  onClick={() => {
                    setConfig(prev => ({ ...prev, logo: undefined }));
                    setSaveStatus('unsaved');
                  }}
                  className="absolute top-2 right-2 p-1 text-red-600 bg-white rounded-full hover:bg-red-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex justify-center items-center w-40 h-40 bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed">
                <label className="flex flex-col items-center cursor-pointer">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="mt-2 text-sm text-gray-500">Subir logo</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botón de guardar */}
      <div className="flex justify-end mt-6">
        <button
          onClick={handleSave}
          disabled={saving || saveStatus === 'saved'}
          className={`
            px-4 py-2 font-medium text-white rounded-md
            ${saveStatus === 'saved'
              ? 'bg-green-600'
              : 'bg-indigo-600 hover:bg-indigo-700'
            }
            ${saving ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {saving ? 'Guardando...' : saveStatus === 'saved' ? 'Guardado' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
} 