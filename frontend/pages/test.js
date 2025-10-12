import { useState, useEffect } from 'react'

export default function Test() {
  const [isClient, setIsClient] = useState(false)
  const [clickCount, setClickCount] = useState(0)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  const handleClick = () => {
    setClickCount(prev => prev + 1)
    console.log('Button clicked! Count:', clickCount + 1)
  }
  
  if (!isClient) {
    return <div>Loading...</div>
  }
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Page</h1>
      <p>Click count: {clickCount}</p>
      <button onClick={handleClick} style={{ padding: '10px', fontSize: '16px' }}>
        Click Me
      </button>
    </div>
  )
}