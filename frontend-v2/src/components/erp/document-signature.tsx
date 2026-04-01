import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SignaturePad } from '@/components/ui/signature-pad'
import { SignatureDisplay } from '@/components/ui/signature-display'
import { Pen } from 'lucide-react'

interface DocumentSignatureProps {
  docType: string
  docId: string
  signatureData?: {
    signature?: string
    signature_name?: string
    signed_at?: string
  }
  onSave: (signatureData: { signature: string; signature_name: string; signed_at: string }) => void
  isSaving?: boolean
}

export function DocumentSignature({ 
  docType, 
  docId, 
  signatureData,
  onSave,
  isSaving 
}: DocumentSignatureProps) {
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [signerName, setSignerName] = useState('')

  const handleSaveSignature = async (signatureDataUrl: string) => {
    try {
      await onSave({
        signature: signatureDataUrl,
        signature_name: signerName,
        signed_at: new Date().toISOString(),
      })
      setShowSignaturePad(false)
    } catch (error) {
      console.error('Failed to save signature:', error)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Digital Signature</CardTitle>
        </CardHeader>
        <CardContent>
          <SignatureDisplay signatureData={signatureData} />
          
          <div className="mt-4">
            <Button 
              onClick={() => setShowSignaturePad(true)} 
              variant="outline" 
              className="w-full"
              disabled={isSaving}
            >
              <Pen className="mr-2 h-4 w-4" />
              {signatureData?.signature ? 'Resign Document' : 'Sign Document'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showSignaturePad} onOpenChange={setShowSignaturePad}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sign Document</DialogTitle>
          </DialogHeader>
          <SignaturePad
            onSave={handleSaveSignature}
            onCancel={() => setShowSignaturePad(false)}
            signerName={signerName}
            onSignerNameChange={setSignerName}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}