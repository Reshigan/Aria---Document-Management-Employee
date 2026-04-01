import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer, Mail, Pen } from 'lucide-react'
import { DocumentHeader } from '@/components/erp/document-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SignaturePad } from '@/components/ui/signature-pad'
import { SignatureDisplay } from '@/components/ui/signature-display'
import { useDocumentSignature } from '@/lib/hooks'
import api from '@/lib/api'

interface Delivery {
  id: string
  delivery_number: string
  order_number: string
  delivery_date: string
  customer_name: string
  status: string
  carrier: string
  tracking_number: string
  notes: string
  created_by: string
  created_at: string
  updated_at: string
  signature?: string
  signature_name?: string
  signed_at?: string
  items: DeliveryItem[]
}

interface DeliveryItem {
  id: string
  product_name: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  line_total: number
}

export default function DeliveryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [signerName, setSignerName] = useState('')

  const { data: delivery, isLoading, error } = useQuery({
    queryKey: ['delivery', id],
    queryFn: () => api.get<Delivery>(`/erp/order-to-cash/deliveries/${id}`),
    enabled: !!id,
  })

  const {
    signatureData,
    isLoading: isSignatureLoading,
    saveSignature,
    isSaving,
  } = useDocumentSignature('delivery', id || '')

  // Handle saving the signature
  const handleSaveSignature = async (signatureData: string) => {
    try {
      await saveSignature({
        signature: signatureData,
        signature_name: signerName,
        signed_at: new Date().toISOString(),
      })
      setShowSignaturePad(false)
    } catch (error) {
      console.error('Failed to save signature:', error)
    }
  }

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading delivery</div>
  if (!delivery) return <div>Delivery not found</div>

  const statusVariant = delivery.status === 'delivered' ? 'paid' : delivery.status === 'shipped' ? 'posted' : 'draft'

  const handlePrint = () => {
    window.open(`/api/go-live/pdf/delivery/${delivery.id}`, '_blank')
  }

  const handleEmail = async () => {
    try {
      // In a real implementation, you'd prompt for recipient email, subject, etc.
      // For now, we'll just simulate sending it
      alert('In a full implementation, this would send the delivery note via email with a PDF attachment.')
      
      // Simulate API call
      console.log('Sending delivery note email...')
    } catch (error) {
      console.error('Failed to send email:', error)
      alert('Failed to send email')
    }
  }

  return (
    <div className="space-y-6">
      <DocumentHeader
        docNumber={delivery.delivery_number}
        status={delivery.status}
        statusVariant={statusVariant}
        entity={delivery.customer_name}
        onEdit={() => navigate(`/sales/deliveries/${id}/edit`)}
        onPrint={handlePrint}
        onEmail={handleEmail}
        actions={[
          {
            label: delivery.signature ? 'View Signature' : 'Sign Document',
            onClick: () => setShowSignaturePad(true),
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {delivery.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product_name || 'N/A'}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item.unit}</TableCell>
                      <TableCell className="text-right">
                        {item.unit_price?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.line_total?.toFixed(2) || '0.00'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {delivery.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {delivery.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{delivery.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Order Number</p>
                <p>{delivery.order_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivery Date</p>
                <p>{new Date(delivery.delivery_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Carrier</p>
                <p>{delivery.carrier || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tracking Number</p>
                <p>{delivery.tracking_number || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Digital Signature</CardTitle>
            </CardHeader>
            <CardContent>
              <SignatureDisplay 
                signatureData={{
                  signature: delivery.signature || signatureData?.signature,
                  signature_name: delivery.signature_name || signatureData?.signature_name,
                  signed_at: delivery.signed_at || signatureData?.signed_at,
                }} 
              />
              
              <div className="mt-4">
                <Button 
                  onClick={() => setShowSignaturePad(true)} 
                  variant="outline" 
                  className="w-full"
                >
                  <Pen className="mr-2 h-4 w-4" />
                  {delivery.signature || signatureData?.signature ? 'Resign Document' : 'Sign Document'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showSignaturePad} onOpenChange={setShowSignaturePad}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sign Delivery Note</DialogTitle>
          </DialogHeader>
          <SignaturePad
            onSave={handleSaveSignature}
            onCancel={() => setShowSignaturePad(false)}
            signerName={signerName}
            onSignerNameChange={setSignerName}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}