import { useState } from 'react'
import { PageHeader } from '@/components/erp/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'

export default function CompanySettings() {
  const [saving, setSaving] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader title="Company Settings" description="Manage your organization details" />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="tax">Tax & Compliance</TabsTrigger>
          <TabsTrigger value="banking">Banking</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input defaultValue="ARIA ERP Solutions (Pty) Ltd" />
                </div>
                <div className="space-y-2">
                  <Label>Registration Number</Label>
                  <Input defaultValue="2024/123456/07" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" defaultValue="info@ariaerp.co.za" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input defaultValue="+27 11 123 4567" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Address</Label>
                  <Input defaultValue="123 Business Park, Sandton, Gauteng, 2196" />
                </div>
              </div>
              <Button loading={saving} onClick={() => { setSaving(true); setTimeout(() => setSaving(false), 1000) }}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Tax Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>VAT Number</Label>
                  <Input defaultValue="4123456789" />
                </div>
                <div className="space-y-2">
                  <Label>SARS Tax Number</Label>
                  <Input defaultValue="9876543210" />
                </div>
                <div className="space-y-2">
                  <Label>BBBEE Level</Label>
                  <Input defaultValue="Level 2" />
                </div>
                <div className="space-y-2">
                  <Label>Financial Year End</Label>
                  <Input defaultValue="February" />
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banking" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Banking configuration coming soon.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">System Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto-number documents</p>
                  <p className="text-xs text-muted-foreground">Automatically assign sequential numbers to new documents</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email notifications</p>
                  <p className="text-xs text-muted-foreground">Send email alerts for important events</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Two-factor authentication</p>
                  <p className="text-xs text-muted-foreground">Require 2FA for all users</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
