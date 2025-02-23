import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'

interface Profile {
  full_name: string
  avatar_url: string
  website: string
  bio: string
}

interface PageProps {
  user: User | null
  initialProfile: Profile
  error?: string
}

async function getProfile() {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return {
        user: null,
        initialProfile: {
          full_name: '',
          avatar_url: '',
          website: '',
          bio: ''
        },
        error: 'Not authenticated'
      }
    }

    const profile = {
      full_name: user.user_metadata?.full_name || '',
      avatar_url: user.user_metadata?.avatar_url || '',
      website: user.user_metadata?.website || '',
      bio: user.user_metadata?.bio || ''
    }

    return {
      user,
      initialProfile: profile,
    } as PageProps      
  } catch (error) {
    console.error('Error fetching profile:', error)
    return {
      user: null,
      initialProfile: {
        full_name: '',
        avatar_url: '',
        website: '',
        bio: ''
      },
      error: 'Error loading user data'
    }
  }
}

export default async function ProfilePage() {
  const { user, initialProfile, error } = await getProfile()
  
  if (error === 'Not authenticated') {
    redirect('/auth/login')
  }
  
  return (
    <div className="min-h-screen bg-black">
      <div className="fixed top-4 left-4 z-50 flex items-center space-x-4 text-sm">
        <Link 
          href="/protected" 
          className="flex items-center space-x-2 text-white/40 hover:text-white/60 transition-colors duration-200"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Chat</span>
        </Link>
        <div className="flex items-center space-x-2 text-white/40">
          <span>/</span>
          <span className="text-white/90">Profile</span>
        </div>
      </div>
      
      <div className="container max-w-2xl py-8 space-y-6 relative z-10">
        <Card className="bg-black/40 border border-white/[0.05] backdrop-blur-xl shadow-[0_4px_20px_rgba(62,207,255,0.03)]">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20 border-2 border-white/[0.08]">
                <AvatarImage src={initialProfile.avatar_url} />
                <AvatarFallback className="bg-transparent text-white/60">
                  {initialProfile.full_name?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl font-medium text-white/90">
                  {initialProfile.full_name || 'Your Profile'}
                </CardTitle>
                <CardDescription className="text-white/40">
                  {user?.email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action="/api/update-profile" method="POST" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-white/60">
                  Full Name
                </Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  defaultValue={initialProfile.full_name}
                  className="bg-black/40 border-white/[0.05] text-white/90 focus:border-[#3ecfff]/40 focus:ring-[#3ecfff]/20 placeholder-white/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar_url" className="text-white/60">
                  Avatar URL
                </Label>
                <Input
                  id="avatar_url"
                  name="avatar_url"
                  type="url"
                  defaultValue={initialProfile.avatar_url}
                  className="bg-black/40 border-white/[0.05] text-white/90 focus:border-[#3ecfff]/40 focus:ring-[#3ecfff]/20 placeholder-white/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-white/60">
                  Website
                </Label>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  defaultValue={initialProfile.website}
                  className="bg-black/40 border-white/[0.05] text-white/90 focus:border-[#3ecfff]/40 focus:ring-[#3ecfff]/20 placeholder-white/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-white/60">
                  Bio
                </Label>
                <Input
                  id="bio"
                  name="bio"
                  type="text"
                  defaultValue={initialProfile.bio}
                  className="bg-black/40 border-white/[0.05] text-white/90 focus:border-[#3ecfff]/40 focus:ring-[#3ecfff]/20 placeholder-white/20"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="cyan"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border border-white/[0.05] backdrop-blur-xl shadow-[0_4px_20px_rgba(62,207,255,0.03)]">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-white/90">
              Account Settings
            </CardTitle>
            <CardDescription className="text-white/40">
              Manage your account settings and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white/90">Email Notifications</h3>
                <p className="text-sm text-white/40">Receive email notifications about your account</p>
              </div>
              <Button variant="cyan">
                Configure
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white/90">Password</h3>
                <p className="text-sm text-white/40">Change your password</p>
              </div>
              <Button variant="cyan">
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}