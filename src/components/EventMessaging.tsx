import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EventMessagingProps {
  eventId: string;
}

export function EventMessaging({ eventId }: EventMessagingProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    getCurrentUser();

    // Subscribe to real-time messages
    const channel = supabase
      .channel(`event-messages-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_messages',
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          console.log('New message received:', payload.new);
          
          // Fetch complete message with sender info from profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', (payload.new as any).sender_id)
            .single();

          const completeMessage: any = {
            ...payload.new,
            sender_name: profile?.name,
            sender_email: profile?.email
          };

          setMessages((prev) => [...prev, completeMessage]);
          scrollToBottom();
          
          // Show browser notification if not from current user
          if (completeMessage.sender_id !== currentUser?.id && 
              Notification.permission === 'granted') {
            const senderName = profile?.name || 
                              profile?.email?.split('@')[0] || 
                              'Someone';
            new Notification(`New message from ${senderName}`, {
              body: completeMessage.content,
              icon: '/placeholder.svg',
              badge: '/placeholder.svg'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, currentUser]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('event-messaging', {
        body: { action: 'fetch', event_id: eventId },
      });

      if (error) throw error;
      if (data?.messages) {
        setMessages(data.messages);
        scrollToBottom();
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('event-messaging', {
        body: {
          action: 'send',
          event_id: eventId,
          content: newMessage.trim(),
          message_type: 'text',
        },
      });

      if (error) throw error;

      setNewMessage('');
      scrollToBottom();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Event Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {messages.map((message) => {
              const isOwnMessage = message.sender_id === currentUser?.id;
              const senderName =
                message.sender_name ||
                message.sender?.profiles?.name ||
                message.sender_email ||
                message.sender?.email?.split('@')[0] ||
                'Unknown';

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>
                      {senderName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{senderName}</span>
                      {message.is_announcement && (
                        <Badge variant="secondary" className="text-xs">
                          <Bell className="w-3 h-3 mr-1" />
                          Announcement
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div
                      className={`inline-block rounded-lg px-3 py-2 ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={loading}
            />
            <Button onClick={sendMessage} disabled={loading || !newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
