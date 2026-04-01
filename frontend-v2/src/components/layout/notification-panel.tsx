import { useState } from 'react'
import { Bell, X, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { usePickerNotifications } from '@/lib/hooks'
import { useNavigate } from 'react-router-dom'

export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, isLoading, refresh } = usePickerNotifications()
  const navigate = useNavigate()

  const togglePanel = () => setIsOpen(!isOpen)
  const closePanel = () => setIsOpen(false)

  const handleNotificationClick = (notificationId: string) => {
    closePanel()
    // Navigate to the delivery detail page for signing
    navigate(`/sales/deliveries/${notificationId}`)
  }

  return (
    <>
      {/* Notification Button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative h-8 w-8"
        onClick={togglePanel}
      >
        <Bell className="h-4 w-4" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive flex items-center justify-center text-[10px] text-white">
            {notifications.length}
          </span>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closePanel}
          />
          
          <div className="fixed inset-y-0 right-0 max-w-sm w-full bg-background border-l shadow-lg transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Picking Notifications</h2>
                <Button variant="ghost" size="icon" onClick={closePanel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mb-4 opacity-50" />
                    <p className="font-medium">No pending deliveries</p>
                    <p className="text-sm">All picking slips are complete</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <Card 
                        key={notification.id} 
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleNotificationClick(notification.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{notification.delivery_number}</h3>
                              <p className="text-sm text-muted-foreground">{notification.customer_name}</p>
                            </div>
                            <span className="text-xs bg-muted px-2 py-1 rounded-full">
                              {new Date(notification.delivery_date).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className="mt-2 text-sm">
                            <p className="truncate">{notification.notes || 'No special notes'}</p>
                          </div>
                          
                          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                            <span>Status: {notification.status}</span>
                            <span>Warehouse: {notification.warehouse_id || 'Main'}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={refresh}
                >
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}