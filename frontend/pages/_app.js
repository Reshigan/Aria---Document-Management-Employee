import '../styles/globals.css'
import axios from 'axios'

// Set base URL for axios
// In production, use relative URLs so requests go to the same domain
// In development, use empty string to make requests relative to current domain
axios.defaults.baseURL = ''

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}
