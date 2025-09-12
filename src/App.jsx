import { useEffect, useState } from 'react'
import ColppyDocumentUploader from './components/ColppyDocumentUploader'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function App() {
  const [empresaId, setEmpresaId] = useState(null)

  useEffect(() => {
    const fetchEmpresa = async () => {
      const token = getCookie('token');

      debugger;

      const sRes = await fetch(`${API_BASE_URL}/auth/session-info`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      })
      
      const sJson = await sRes.json()
      const idUltimaEmpresa = sJson.data?.idUltimaEmpresa || sJson.idUltimaEmpresa
      setEmpresaId(idUltimaEmpresa)
    }

    fetchEmpresa()
  }, [])

  return <ColppyDocumentUploader empresaId={empresaId} getCookie={getCookie} />
}

export default App