'use client';

import { Button, Input, Label } from 'vinci-ui'
import { Avatar, AvatarFallback, AvatarImage } from 'vinci-ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'vinci-ui'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@/src/hooks/use-user'
import { useAuth } from '@/src/hooks/use-auth'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const router = useRouter();
  const { session } = useAuth();
  const { 
    profile, 
    isLoading, 
    updateProfile, 
    updatePassword,
    updateEmailPreferences 
  } = useUser();

  useEffect(() => {
    if (!session) {
      router.push('/auth/login');
    }
  }, [session, router]);

  if (!profile || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
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
        <Card className="border border-white/[0.05] bg-white/[0.03] backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-white/60">
                  {profile.full_name?.substring(0, 2).toUpperCase() || profile.email?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl font-medium text-white/90">
                  {profile.full_name || 'Your Profile'}
                </CardTitle>
                <CardDescription className="text-white/50">
                  {profile.email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              await updateProfile({
                full_name: formData.get('full_name') as string,
                avatar_url: formData.get('avatar_url') as string,
                website: formData.get('website') as string,
                bio: formData.get('bio') as string
              });
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Full Name
                </Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  defaultValue={profile.full_name}
                  className="bg-white/[0.03] border-white/[0.05] text-white/90 focus:border-[#3ecfff]/40 focus:ring-[#3ecfff]/20 placeholder-white/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar_url">
                  Avatar URL
                </Label>
                <Input
                  id="avatar_url"
                  name="avatar_url"
                  type="url"
                  defaultValue={profile.avatar_url}
                  className="bg-white/[0.03] border-white/[0.05] text-white/90 focus:border-[#3ecfff]/40 focus:ring-[#3ecfff]/20 placeholder-white/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">
                  Website
                </Label>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  defaultValue={profile.website}
                  className="bg-white/[0.03] border-white/[0.05] text-white/90 focus:border-[#3ecfff]/40 focus:ring-[#3ecfff]/20 placeholder-white/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">
                  Bio
                </Label>
                <Input
                  id="bio"
                  name="bio"
                  type="text"
                  defaultValue={profile.bio}
                  className="bg-white/[0.03] border-white/[0.05] text-white/90 focus:border-[#3ecfff]/40 focus:ring-[#3ecfff]/20 placeholder-white/20"
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

        <Card className="border border-white/[0.05] bg-white/[0.03] backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-white/90">
              Account Settings
            </CardTitle>
            <CardDescription className="text-white/50">
              Manage your account settings and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white/90">Email Notifications</h3>
                <p className="text-sm text-white/50">Receive email notifications about your account</p>
              </div>
              <Button 
                variant="cyan"
                onClick={() => updateEmailPreferences({ notifications: true })}
                disabled={isLoading}
              >
                {isLoading ? 'Configuring...' : 'Configure'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white/90">Password</h3>
                <p className="text-sm text-white/50">Change your password</p>
              </div>
              <Button 
                variant="cyan"
                onClick={() => {
                  // For demonstration, you might want to show a modal here
                  updatePassword('current-password', 'new-password');
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Changing...' : 'Change'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}