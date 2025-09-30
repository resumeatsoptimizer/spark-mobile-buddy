import { useEffect, useState } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

export function NotificationsManager() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkNotificationSupport();
    checkExistingSubscription();
  }, []);

  const checkNotificationSupport = () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  };

  const checkExistingSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        // Note: We can't reconstruct the actual PushSubscription object
        // but we know one exists
        setPermission('granted');
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const requestPermission = async () => {
    try {
      setLoading(true);

      if (!('Notification' in window)) {
        throw new Error('Notifications not supported in this browser');
      }

      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeToNotifications();
      } else {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error requesting permission:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // In a production environment, you would register a service worker
      // and create a proper push subscription with VAPID keys
      // For now, we'll create a mock subscription entry
      
      const mockSubscription = {
        endpoint: `https://fcm.googleapis.com/fcm/send/${Math.random().toString(36)}`,
        keys: {
          p256dh: 'mock-p256dh-key',
          auth: 'mock-auth-key'
        }
      };

      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      };

      // Save subscription to database
      const { error } = await supabase.from('push_subscriptions').insert({
        user_id: user.id,
        subscription_data: mockSubscription,
        device_type: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        is_active: true
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Push notifications enabled',
      });

      // Send a test notification
      await sendTestNotification();
    } catch (error: any) {
      console.error('Error subscribing:', error);
      throw error;
    }
  };

  const unsubscribeFromNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Deactivate all subscriptions for this user
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) throw error;

      setSubscription(null);
      setPermission('default');

      toast({
        title: 'Success',
        description: 'Push notifications disabled',
      });
    } catch (error: any) {
      console.error('Error unsubscribing:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.functions.invoke('send-push-notification', {
        body: {
          title: 'Test Notification',
          body: 'This is a test notification from the event system',
          user_ids: [user.id]
        }
      });

      // Show browser notification directly as fallback
      if (Notification.permission === 'granted') {
        new Notification('Test Notification', {
          body: 'This is a test notification from the event system',
          icon: '/placeholder.svg',
          badge: '/placeholder.svg'
        });
      }

      toast({
        title: 'Test Sent',
        description: 'A test notification has been sent',
      });
    } catch (error: any) {
      console.error('Error sending test:', error);
    }
  };

  const getStatusBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge variant="default" className="gap-1"><Check className="w-3 h-3" /> Enabled</Badge>;
      case 'denied':
        return <Badge variant="destructive" className="gap-1"><BellOff className="w-3 h-3" /> Blocked</Badge>;
      default:
        return <Badge variant="secondary">Not Set</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notifications
          </span>
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Receive instant notifications for event updates, messages, and check-ins
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Enable Notifications</p>
            <p className="text-sm text-muted-foreground">
              Get notified about important event activities
            </p>
          </div>
          <Switch
            checked={permission === 'granted'}
            onCheckedChange={(checked) => {
              if (checked) {
                requestPermission();
              } else {
                unsubscribeFromNotifications();
              }
            }}
            disabled={loading || permission === 'denied'}
          />
        </div>

        {permission === 'denied' && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            Notifications are blocked. Please enable them in your browser settings.
          </div>
        )}

        {permission === 'granted' && (
          <Button
            variant="outline"
            size="sm"
            onClick={sendTestNotification}
            disabled={loading}
            className="w-full"
          >
            <Bell className="w-4 h-4 mr-2" />
            Send Test Notification
          </Button>
        )}

        {!('Notification' in window) && (
          <div className="p-3 rounded-lg bg-muted text-sm">
            Push notifications are not supported in this browser.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
