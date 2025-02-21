'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User } from '@supabase/supabase-js'
import { signOutAction } from '@/app/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Settings, User as UserIcon, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface UserProfileDropdownProps {
  user: User
}

export function UserProfileDropdown({ user }: UserProfileDropdownProps) {
  const router = useRouter()
  const userInitials = user.email
    ? user.email.substring(0, 2).toUpperCase()
    : '??'

  const handleLogout = async () => {
    // Clear any cached data here if needed
    router.push('/sign-in')
    await signOutAction()
  }

  return (
    <DropdownMenu>
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