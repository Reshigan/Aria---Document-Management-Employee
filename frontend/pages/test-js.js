import { useState, useEffect } from 'react'

export default function TestJS() {
  const [count, setCount] = useState(0)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    console.log('🟢 TEST PAGE: useEffect running!')
    console.log('🟢 TEST PAGE: Setting isClient to true')
    setIsClient(true)
    
    setTimeout(() => {
      console.log('🟢 TEST PAGE: Timeout executed - JavaScript is working!')
    }, 1000)
  }, [])

  const handleClick = () => {
    console.log('🟢 TEST PAGE: Button clicked!')
    setCount(count + 1)
  }

  console.log('🟢 TEST PAGE: Component rendering, count:', count)

  return (
    <div style={{ padding: '50px', fontFamily: 'Arial' }}>
      <h1>JavaScript Test Page</h1>
      <p>Count: {count}</p>
      <p>Is Client: {isClient ? 'YES' : 'NO'}</p>
      
      <button 
        onClick={handleClick}
        style={{ 
          padding: '10px 20px', 
          fontSize: '16px', 
          backgroundColor: 'blue', 
          color: 'white',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Click Me (Count: {count})
      </button>
      
      <div style={{ marginTop: '20px' }}>
        <p>If JavaScript is working:</p>
        <ul>
          <li>✅ "Is Client" should show "YES"</li>
          <li>✅ Button clicks should increase the count</li>
          <li>✅ Console should show useEffect and click messages</li>
        </ul>
      </div>
    </div>
  )
}