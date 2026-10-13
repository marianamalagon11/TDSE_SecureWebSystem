import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

function App() {
  const {
    loginWithRedirect,
    logout,
    isAuthenticated,
    isLoading,
    user,
    getAccessTokenSilently,
  } = useAuth0()
  const [result, setResult] = useState('')

  async function callApi() {
    const token = await getAccessTokenSilently()
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/risk-status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    setResult(JSON.stringify(await response.json(), null, 2))
  }

  if (isLoading) {
    return (
      <div className="card">
        <p className="subtitle">Loading...</p>
      </div>
    )
  }

  return (
    <div className="card">
      <p className="eyebrow">Enterprise Risk Lab</p>
      <h1>Secure Web System</h1>
      <p className="subtitle">OAuth 2.0 resource server access demo</p>

      {!isAuthenticated ? (
        <button className="full" onClick={() => loginWithRedirect()}>
          Log in
        </button>
      ) : (
        <>
          <div className="user-row">
            {user.picture && <img src={user.picture} alt="" />}
            <div>
              <div className="name">{user.name}</div>
              <div className="email">{user.email}</div>
            </div>
          </div>

          <div className="actions">
            <button onClick={callApi}>Call protected API</button>
            <button
              className="secondary"
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            >
              Log out
            </button>
          </div>

          {result && <pre>{result}</pre>}
        </>
      )}
    </div>
  )
}

export default App
