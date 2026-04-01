import { useState, useEffect } from 'react'

interface SignatureDisplayProps {
  signatureData?: {
    signature?: string
    signature_name?: string
    signed_at?: string
  }
  title?: string
}

export function SignatureDisplay({ signatureData, title = 'Signature' }: SignatureDisplayProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (signatureData?.signature) {
      setImageLoaded(false)
      setImageError(false)
    }
  }, [signatureData?.signature])

  if (!signatureData || !signatureData.signature) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-500 text-center">No signature captured</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <h4 className="font-medium text-gray-900 mb-2">{title}</h4>
      
      {!imageError && (
        <div className="mb-3">
          <img
            src={signatureData.signature}
            alt="Digital Signature"
            className={`max-w-full h-auto ${imageLoaded ? '' : 'hidden'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
          {!imageLoaded && (
            <div className="animate-pulse bg-gray-200 rounded w-full h-24" />
          )}
        </div>
      )}
      
      {imageError && (
        <div className="bg-red-50 text-red-800 p-3 rounded mb-3">
          <p>Unable to load signature image</p>
        </div>
      )}

      <div className="text-sm text-gray-600 space-y-1">
        <p><span className="font-medium">Signed by:</span> {signatureData.signature_name || 'N/A'}</p>
        {signatureData.signed_at && (
          <p><span className="font-medium">Signed at:</span> {new Date(signatureData.signed_at).toLocaleString()}</p>
        )}
      </div>
    </div>
  )
}