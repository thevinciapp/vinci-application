'use client'

import { Button } from '@/components/ui/common/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/common/dropdown-menu'
import { User } from '@supabase/supabase-js'
import { signOutAction } from '@/app/actions/auth'
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '@/app/actions/notifications'
import { useNotificationStore } from '@/stores/notification-store'
import { Bell } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/common/avatar'
import { Settings, User as UserIcon, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { cn } from '@/lib/utils'

interface UserProfileDropdownProps {
  user: User;
  initialNotifications?: any[];
}

export function UserProfileDropdown({ user, initialNotifications = [] }: UserProfileDropdownProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    const notificationsResponse = await getNotifications();
    if (notificationsResponse.status === 200) {
      setNotifications(notificationsResponse.data || []);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    const notificationsResponse = await getNotifications();
    if (notificationsResponse.status === 200) {
      setNotifications(notificationsResponse.data || []);
    }
  };
  
  const router = useRouter()
  const userInitials = user.email
    ? user.email.substring(0, 2).toUpperCase()
    : '??'

  const handleLogout = async () => {
    router.push('/sign-in')
    await signOutAction()
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-8 w-8 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300 group"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.user_metadata.avatar_url} alt={user.email || ''} />
            <AvatarFallback className="bg-transparent text-white/60 group-hover:text-[#3ecfff]/80 transition-colors duration-300">{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-56 bg-black/20 border border-white/[0.05] backdrop-blur-xl" 
        align="end" 
        forceMount
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1.5">
            <p className="text-sm font-medium leading-none text-white/90 truncate max-w-[200px]">
              {user.user_metadata.full_name || user.email}
            </p>
            <p className="text-xs leading-none text-white/40 truncate max-w-[200px]">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/[0.05]" />
        <DropdownMenuGroup>
          <DropdownMenuItem 
            onClick={(e) => {
              e.preventDefault();
              setShowNotifications(!showNotifications);
            }}
            className="group px-3 py-1.5 hover:bg-transparent focus:bg-transparent cursor-pointer relative"
          >
            <Bell className="mr-2 h-4 w-4 text-white/60 group-hover:text-[#3ecfff]/80 transition-colors duration-300" />
            <span className="text-white/75 group-hover:text-white/95 transition-colors duration-300">Notifications</span>
            {unreadCount > 0 && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#3ecfff] text-black text-xs px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </DropdownMenuItem>
          {showNotifications && (
            <>
              {unreadCount > 0 && (
                <div className="px-3 py-2">
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-white/50 hover:text-white/90 transition-colors"
                  >
                    Mark all as read
                  </button>
                </div>
              )}
              <div className="max-h-48 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3 py-2 text-sm text-white/50">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'px-3 py-2 text-sm hover:bg-white/[0.03] transition-colors cursor-default',
                    !notification.is_read && 'bg-white/[0.03]'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-white/90">{notification.title}</div>
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-xs text-white/50 hover:text-white/90 transition-colors"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                  <div className="mt-1 text-white/70 text-xs">{notification.description}</div>
                  <div className="mt-1 text-[10px] text-white/40">
                    {new Date(notification.created_at).toLocaleDateString()} at{' '}
                    {new Date(notification.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
              </div>
            </>
          )}
          <Link href="/protected/profile">
          <DropdownMenuItem className="group px-3 py-1.5 hover:bg-transparent focus:bg-transparent cursor-pointer">
              <UserIcon className="mr-2 h-4 w-4 text-white/60 group-hover:text-[#3ecfff]/80 transition-colors duration-300" />
            <span className="text-white/75 group-hover:text-white/95 transition-colors duration-300">Profile</span>
          </DropdownMenuItem>
          </Link>
          <Link href="/protected/settings">
            <DropdownMenuItem className="group px-3 py-1.5 hover:bg-transparent focus:bg-transparent cursor-pointer">
              <Settings className="mr-2 h-4 w-4 text-white/60 group-hover:text-[#3ecfff]/80 transition-colors duration-300" />
              <span className="text-white/75 group-hover:text-white/95 transition-colors duration-300">Settings</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-white/[0.05]" />
        <DropdownMenuItem asChild>
          <button
            onClick={handleLogout}
            className="w-full group px-3 py-1.5 flex items-center hover:bg-transparent focus:bg-transparent outline-none transition-all duration-300"
          >
            <LogOut className="mr-2 h-4 w-4 text-white/60 group-hover:text-[#3ecfff]/80 transition-colors duration-300" />
            <span className="text-white/75 group-hover:text-white/95 transition-colors duration-300">Log out</span>
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 