'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState({
    full_name: '',
    avatar_url: '',
    website: '',
    bio: ''
  })

  // Fetch user data on mount
  useState(() => {
    getProfile()
  })

  async function getProfile() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setUser(user)
        setProfile({
          full_name: user.user_metadata.full_name || '',
          avatar_url: user.user_metadata.avatar_url || '',
          website: user.user_metadata.website || '',
          bio: user.user_metadata.bio || ''
        })
      }
    } catch (error) {
      toast.error('Error loading user data!')
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile() {
    try {
      setLoading(true)

      const { error } = await supabase.auth.updateUser({
        data: profile
      })

      if (error) throw error
      
      toast.success('Profile updated successfully!')
      router.refresh()
    } catch (error) {
      toast.error('Error updating the data!')
    } finally {
      setLoading(false)
    }
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
        <Card className="bg-black/40 border border-white/[0.05] backdrop-blur-xl shadow-[0_4px_20px_rgba(62,207,255,0.03)]">       <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20 border-2 border-white/[0.08]">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="bg-transparent text-white/60">
                {profile.full_name?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl font-medium text-white/90">
                {profile.full_name || 'Your Profile'}
              </CardTitle>
              <CardDescription className="text-white/40">
                {user?.email}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-white/60">
                Full Name
              </Label>
              <Input
                id="full_name"
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="bg-black/40 border-white/[0.05] text-white/90 focus:border-[#3ecfff]/40 focus:ring-[#3ecfff]/20 placeholder-white/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar_url" className="text-white/60">
                Avatar URL
              </Label>
              <Input
                id="avatar_url"
                type="url"
                value={profile.avatar_url}
                onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                className="bg-black/40 border-white/[0.05] text-white/90 focus:border-[#3ecfff]/40 focus:ring-[#3ecfff]/20 placeholder-white/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="text-white/60">
                Website
              </Label>
              <Input
                id="website"
                type="url"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                className="bg-black/40 border-white/[0.05] text-white/90 focus:border-[#3ecfff]/40 focus:ring-[#3ecfff]/20 placeholder-white/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-white/60">
                Bio
              </Label>
              <Input
                id="bio"
                type="text"
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="bg-black/40 border-white/[0.05] text-white/90 focus:border-[#3ecfff]/40 focus:ring-[#3ecfff]/20 placeholder-white/20"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={updateProfile}
              disabled={loading}
              variant="cyan"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
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
            <Button
              variant="cyan"
            >
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white/90">Password</h3>
              <p className="text-sm text-white/40">Change your password</p>
            </div>
            <Button
              variant="cyan"
            >
              Change
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
