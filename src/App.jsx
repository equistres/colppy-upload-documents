import { useEffect, useState } from 'react'
import ColppyDocumentUploaderWrapper from './components/ColppyDocumentUploaderWrapper'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function App() {
  const [empresaId, setEmpresaId] = useState(null);
  const [email, setEmail] = useState(null);
  const [sessionKey, setSessionKey] = useState(null);

  useEffect(() => {
    const fetchEmpresa = async () => {
      const token = getCookie('token');

      const sRes = await fetch(`${API_BASE_URL}/auth/session-info`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      })

      const sJson = await sRes.json()
      const idUltimaEmpresa = sJson.data?.companyId || sJson.companyId;
      const email = sJson.data?.userId || sJson.userId;
      const sessionKey = sJson.data?.sessionKey || sJson.sessionKey;
      setEmpresaId(idUltimaEmpresa);
      setEmail(email);
      setSessionKey(sessionKey);
    }

    fetchEmpresa()
  }, [])

  return <ColppyDocumentUploaderWrapper empresaId={empresaId} email={email} sessionKey={sessionKey} getCookie={getCookie} />
}

export default App