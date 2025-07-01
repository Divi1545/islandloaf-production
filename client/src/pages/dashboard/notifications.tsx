import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  CheckCheck,
  User,
  CreditCard,
  Calendar,
  FileText,
  Settings2,
  Clock
} from "lucide-react";
import { format } from "date-fns";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface SystemLog {
  id: number;
  action: string;
  details: string;
  user: string;
  timestamp: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [notificationsResponse, logsResponse] = await Promise.all([
          fetch('/api/notifications', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('islandloaf_auth_token') ? JSON.parse(localStorage.getItem('islandloaf_auth_token')!).token : ''}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch('/api/system/logs', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('islandloaf_auth_token') ? JSON.parse(localStorage.getItem('islandloaf_auth_token')!).token : ''}`,
              'Content-Type': 'application/json',
            },
          })
        ]);

        if (!notificationsResponse.ok) {
          throw new Error('Failed to fetch notifications');
        }

        if (!logsResponse.ok) {
          throw new Error('Failed to fetch system logs');
        }

        const notificationsData = await notificationsResponse.json();
        const logsData = await logsResponse.json();

        setNotifications(notificationsData);
        setSystemLogs(logsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        console.error('Data fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const markAllRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('islandloaf_auth_token') ? JSON.parse(localStorage.getItem('islandloaf_auth_token')!).token : ''}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Update local state to mark all notifications as read
        setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "info":
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };
  
  const getSystemLogIcon = (action: string) => {
    if (action.includes("Profile")) return <User className="h-5 w-5 text-purple-500" />;
    if (action.includes("Price") || action.includes("Payment")) return <CreditCard className="h-5 w-5 text-green-500" />;
    if (action.includes("Calendar")) return <Calendar className="h-5 w-5 text-blue-500" />;
    if (action.includes("Booking")) return <FileText className="h-5 w-5 text-amber-500" />;
    if (action.includes("Login")) return <CheckCheck className="h-5 w-5 text-green-500" />;
    return <Settings2 className="h-5 w-5 text-neutral-500" />;
  };
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">Notifications & Logs</h1>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">Notifications & Logs</h1>
        <div className="text-center py-8 text-red-500">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Notifications & Logs</h1>
      
      <Tabs defaultValue="notifications">
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center mb-6">
          <TabsList>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="system-logs">System Logs</TabsTrigger>
          </TabsList>
          
          <div className="mb-4 sm:mb-0">
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllRead}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All as Read
            </Button>
          </div>
        </div>
        
        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center p-8 border rounded-md bg-neutral-50">
                    <Bell className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium mb-1">No notifications</h3>
                    <p className="text-neutral-500 mb-4">
                      You're all caught up! New notifications will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`flex p-4 border rounded-md ${notification.read ? "" : "bg-blue-50 border-blue-100"}`}
                    >
                      <div className="mr-4 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                          <h3 className="font-medium">{notification.title}</h3>
                          <span className="text-sm text-neutral-500 mt-1 sm:mt-0">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-neutral-700 mt-1">{notification.message}</p>
                        
                        <div className="flex justify-end mt-2">
                          {!notification.read && (
                            <Button variant="ghost" size="sm">
                              Mark as Read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* System Logs Tab */}
        <TabsContent value="system-logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Activity Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemLogs.length === 0 ? (
                  <div className="text-center p-8 border rounded-md bg-neutral-50">
                    <Clock className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium mb-1">No activity logs</h3>
                    <p className="text-neutral-500 mb-4">
                      System activity logs will appear here.
                    </p>
                  </div>
                ) : (
                  systemLogs.map((log) => (
                    <div key={log.id} className="flex p-4 border rounded-md">
                      <div className="mr-4 mt-1">
                        {getSystemLogIcon(log.action)}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                          <h3 className="font-medium">{log.action}</h3>
                          <span className="text-sm text-neutral-500 mt-1 sm:mt-0">
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                        <p className="text-neutral-700 mt-1">{log.details}</p>
                        <div className="flex items-center mt-2">
                          <Badge variant="outline" className="text-xs">
                            {log.user}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
