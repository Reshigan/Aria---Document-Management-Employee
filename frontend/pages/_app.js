import '../styles/globals.css'
import axios from 'axios'

// Set base URL for axios
axios.defaults.baseURL = process.env.NODE_ENV === 'production' 
  ? 'https://aria.vantax.co.za' 
  : 'http://localhost:12002'

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}