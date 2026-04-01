import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer, Mail, Pen, FileText } from 'lucide-react'
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

interface Quote {
  id: string
  quote_number: string
  customer_name: string
  quote_date: string
  valid_until: string
  status: string
  customer_email: string
  notes: string
  terms: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  created_at: string
  updated_at: string
  signature?: string
  signature_name?: string
  signed_at?: string
  items: QuoteItem[]
}

interface QuoteItem {
  id: string
  product_name: string
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  tax_rate: number
  line_total: number
}

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [signerName, setSignerName] = useState('')

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => api.get<Quote>(`/erp/order-to-cash/quotes/${id}`),
    enabled: !!id,
  })

  const {
    signatureData,
    isLoading: isSignatureLoading,
    saveSignature,
    isSaving,
  } = useDocumentSignature('quote', id || '')

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
  if (error) return <div>Error loading quote</div>
  if (!quote) return <div>Quote not found</div>

  const statusVariant = quote.status === 'accepted' ? 'paid' : quote.status === 'sent' ? 'posted' : quote.status === 'declined' ? 'cancelled' : 'draft'

  const handlePrint = () => {
    window.open(`/api/go-live/pdf/quote/${quote.id}`, '_blank')
  }

  const handleEmail = async () => {
    try {
      // In a real implementation, you'd prompt for recipient email, subject, etc.
      // For now, we'll just log that we'd send it
      const response: any = await api.post('/go-live/email/send-document', {
        doc_type: 'quote',
        doc_id: id,
        recipient_email: quote.customer_email || 'customer@example.com',
        subject: `Quotation ${quote.quote_number} from our company`
      })
      
      if (response.success) {
        alert('Email sent successfully!')
      } else {
        alert('Failed to send email: ' + response.error)
      }
    } catch (error) {
      console.error('Failed to send email:', error)
      alert('Failed to send email')
    }
  }

  const handleConvertToOrder = async () => {
    try {
      const response = await api.post<{ id: string; order_number: string }>(`/erp/order-to-cash/quotes/${id}/convert`)
      navigate(`/sales/orders/${response.id}`)
    } catch (error) {
      console.error('Failed to convert quote to order:', error)
    }
  }

  return (
    <div className="space-y-6">
      <DocumentHeader
        docNumber={quote.quote_number}
        status={quote.status}
        statusVariant={statusVariant}
        entity={quote.customer_name}
        onEdit={() => navigate(`/sales/quotes/${id}/edit`)}
        onPrint={handlePrint}
        onEmail={handleEmail}
        actions={[
          {
            label: quote.signature ? 'View Signature' : 'Sign Document',
            onClick: () => setShowSignaturePad(true),
          },
          {
            label: 'Convert to Order',
            onClick: handleConvertToOrder,
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quote Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quote.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product_name || 'N/A'}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {item.unit_price?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.line_total?.toFixed(2) || '0.00'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {quote.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {(quote.notes || quote.terms) && (
            <Card>
              <CardHeader>
                <CardTitle>Notes & Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quote.notes && (
                  <div>
                    <h4 className="font-medium mb-1">Notes</h4>
                    <p className="text-muted-foreground">{quote.notes}</p>
                  </div>
                )}
                {quote.terms && (
                  <div>
                    <h4 className="font-medium mb-1">Terms</h4>
                    <p className="text-muted-foreground">{quote.terms}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quote Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quote Date</p>
                <p>{new Date(quote.quote_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valid Until</p>
                <p>{new Date(quote.valid_until).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customer Email</p>
                <p>{quote.customer_email || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{quote.subtotal?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-{quote.discount_amount?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{quote.tax_amount?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total:</span>
                <span>{quote.total_amount?.toFixed(2) || '0.00'}</span>
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
                  signature: quote.signature || signatureData?.signature,
                  signature_name: quote.signature_name || signatureData?.signature_name,
                  signed_at: quote.signed_at || signatureData?.signed_at,
                }} 
              />
              
              <div className="mt-4">
                <Button 
                  onClick={() => setShowSignaturePad(true)} 
                  variant="outline" 
                  className="w-full"
                >
                  <Pen className="mr-2 h-4 w-4" />
                  {quote.signature || signatureData?.signature ? 'Resign Document' : 'Sign Document'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showSignaturePad} onOpenChange={setShowSignaturePad}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sign Quote</DialogTitle>
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