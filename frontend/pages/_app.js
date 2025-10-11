import '../styles/globals.css'
import VantaXFooter from '../components/VantaXFooter'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <VantaXFooter />
    </>
  )
}