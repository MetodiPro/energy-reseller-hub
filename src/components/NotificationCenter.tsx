import { Bell, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Notification } from "@/hooks/useNotifications";

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

export const NotificationCenter = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onClearAll,
}: NotificationCenterProps) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive/10 border-destructive/30 text-destructive';
      case 'medium':
        return 'bg-warning/10 border-warning/30 text-warning';
      case 'low':
        return 'bg-muted border-border text-muted-foreground';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deadline':
        return '⏰';
      case 'priority':
        return '⚠️';
      case 'reminder':
        return '🔔';
      default:
        return '📌';
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Notifiche e Reminder</span>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-8 text-xs"
              >
                Cancella tutto
              </Button>
            )}
          </SheetTitle>
          <SheetDescription>
            {unreadCount > 0
              ? `Hai ${unreadCount} notifiche non lette`
              : 'Nessuna notifica'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-3" />
                <p className="text-muted-foreground">
                  Tutto a posto! Nessuna notifica al momento.
                </p>
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-4 transition-all ${
                    notification.read ? 'opacity-60' : 'border-l-4'
                  } ${!notification.read && getPriorityColor(notification.priority)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">
                          {getTypeIcon(notification.type)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {notification.priority === 'high' && 'Alta priorità'}
                          {notification.priority === 'medium' && 'Media priorità'}
                          {notification.priority === 'low' && 'Bassa priorità'}
                        </Badge>
                      </div>
                      <p
                        className={`text-sm ${
                          notification.read
                            ? 'text-muted-foreground'
                            : 'font-medium'
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.createdAt.toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onMarkAsRead(notification.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
