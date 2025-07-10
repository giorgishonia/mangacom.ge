"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/supabase-auth-provider'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { formatDistance } from 'date-fns'
import { Crown, Check, X, UserPlus, Edit2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { VIPBadge } from '@/components/ui/vip-badge'

interface VIPUser {
  id: string
  username: string
  email: string
  vip_status: boolean
  vip_theme: string
  started_at?: string
  expires_at?: string | null
}

export default function VIPManagementPage() {
  const [vipUsers, setVipUsers] = useState<VIPUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<VIPUser | null>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // New VIP user form state
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedTheme, setSelectedTheme] = useState('purple')
  const [expiryDate, setExpiryDate] = useState('')
  
  const { user, profile, isAdmin } = useAuth()
  const router = useRouter()
  
  // Check if user is admin, redirect if not
  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/')
    }
  }, [user, isAdmin, isLoading, router])
  
  // Fetch VIP users
  useEffect(() => {
    async function fetchVIPUsers() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            username,
            email,
            vip_status,
            vip_theme,
            user_memberships (
              started_at,
              expires_at
            )
          `)
          .eq('vip_status', true)
          .order('username')
        
        if (error) throw error
        
        // Process data to include membership info
        const processedData = data.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          vip_status: user.vip_status,
          vip_theme: user.vip_theme,
          started_at: user.user_memberships?.[0]?.started_at,
          expires_at: user.user_memberships?.[0]?.expires_at
        }))
        
        setVipUsers(processedData)
      } catch (error) {
        console.error('Error fetching VIP users:', error)
        toast.error('Failed to load VIP users')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchVIPUsers()
  }, [])
  
  // Search for users
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, vip_status, vip_tier')
        .or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10)
      
      if (error) throw error
      
      setSearchResults(data || [])
    } catch (error) {
      console.error('Error searching users:', error)
      toast.error('Failed to search users')
    } finally {
      setIsSearching(false)
    }
  }
  
  // Add VIP status to user
  const handleAddVIP = async () => {
    if (!selectedUserId) return
    
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          vip_status: true,
          vip_theme: selectedTheme
        })
        .eq('id', selectedUserId)
      
      if (profileError) throw profileError
      
      // Create or update membership record
      const membershipData = {
        id: selectedUserId,
        started_at: new Date().toISOString(),
        expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
        vip_theme: selectedTheme
      }
      
      const { error: membershipError } = await supabase
        .from('user_memberships')
        .upsert(membershipData)
      
      if (membershipError) throw membershipError
      
      toast.success('VIP status added successfully')
      setShowAddDialog(false)
      
      // Refresh the list
      const { data } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          email,
          vip_status,
          vip_theme,
          user_memberships (
            started_at,
            expires_at
          )
        `)
        .eq('vip_status', true)
        .order('username')
      
      // Process data
      const processedData = data?.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        vip_status: user.vip_status,
        vip_theme: user.vip_theme,
        started_at: user.user_memberships?.[0]?.started_at,
        expires_at: user.user_memberships?.[0]?.expires_at
      }))
      
      setVipUsers(processedData || [])
      
    } catch (error) {
      console.error('Error adding VIP status:', error)
      toast.error('Failed to add VIP status')
    }
  }
  
  // Update VIP user
  const handleUpdateVIP = async () => {
    if (!selectedUser) return
    
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          vip_theme: selectedTheme
        })
        .eq('id', selectedUser.id)
      
      if (profileError) throw profileError
      
      // Update membership record
      const membershipData = {
        id: selectedUser.id,
        expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
        vip_theme: selectedTheme
      }
      
      const { error: membershipError } = await supabase
        .from('user_memberships')
        .update(membershipData)
        .eq('id', selectedUser.id)
      
      if (membershipError) throw membershipError
      
      toast.success('VIP status updated successfully')
      setShowEditDialog(false)
      
      // Update the user in the list
      setVipUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === selectedUser.id 
            ? {
                ...user,
                vip_theme: selectedTheme,
                expires_at: expiryDate ? new Date(expiryDate).toISOString() : null
              }
            : user
        )
      )
      
    } catch (error) {
      console.error('Error updating VIP status:', error)
      toast.error('Failed to update VIP status')
    }
  }
  
  // Remove VIP status
  const handleRemoveVIP = async (userId: string) => {
    if (!confirm('Are you sure you want to remove VIP status from this user?')) {
      return
    }
    
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          vip_status: false
        })
        .eq('id', userId)
      
      if (profileError) throw profileError
      
      toast.success('VIP status removed successfully')
      
      // Remove from list
      setVipUsers(prevUsers => prevUsers.filter(user => user.id !== userId))
      
    } catch (error) {
      console.error('Error removing VIP status:', error)
      toast.error('Failed to remove VIP status')
    }
  }
  
  // Handle edit click
  const handleEditClick = (user: VIPUser) => {
    setSelectedUser(user)
    setSelectedTheme(user.vip_theme || 'purple')
    setExpiryDate(user.expires_at ? new Date(user.expires_at).toISOString().split('T')[0] : '')
    setShowEditDialog(true)
  }
  
  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">VIP User Management</h1>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add VIP User
        </Button>
      </div>
      
      {/* VIP Users Table */}
      <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
        <h2 className="text-xl font-semibold mb-4">Current VIP Users ({vipUsers.length})</h2>
        
        <div className="rounded-md overflow-hidden">
          <Table>
            <TableHeader className="bg-black/40">
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Theme</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vipUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-gray-400">
                    No VIP users found
                  </TableCell>
                </TableRow>
              ) : (
                vipUsers.map(user => (
                  <TableRow key={user.id} className="border-t border-white/5">
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className={`h-4 w-4 rounded-full bg-${user.vip_theme || 'purple'}-500`}></div>
                    </TableCell>
                    <TableCell>
                      {user.started_at ? (
                        formatDistance(new Date(user.started_at), new Date(), { addSuffix: true })
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      {user.expires_at ? (
                        formatDistance(new Date(user.expires_at), new Date(), { addSuffix: true })
                      ) : (
                        'Never'
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditClick(user)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleRemoveVIP(user.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Add VIP User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add VIP User</DialogTitle>
            <DialogDescription>
              Search for a user and assign VIP status
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* User Search */}
            <div className="flex gap-2">
              <Input
                placeholder="Search by username or email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black/20 border-white/10"
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-md border border-white/10">
                <Table>
                  <TableBody>
                    {searchResults.map((result) => (
                      <TableRow 
                        key={result.id}
                        className={`cursor-pointer ${selectedUserId === result.id ? 'bg-purple-900/30' : 'hover:bg-black/40'}`}
                        onClick={() => setSelectedUserId(result.id)}
                      >
                        <TableCell className="py-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{result.username}</div>
                              <div className="text-sm text-gray-400">{result.email}</div>
                            </div>
                            {selectedUserId === result.id && (
                              <Check className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* VIP Settings */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Theme Color</Label>
                  <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="amber">Amber</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Expiry Date (Optional)</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="bg-black/20 border-white/10"
                />
                <p className="text-xs text-gray-400">Leave empty for permanent VIP status</p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddVIP} disabled={!selectedUserId}>
              <Crown className="h-4 w-4 mr-2" />
              Add VIP Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit VIP User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit VIP User</DialogTitle>
            <DialogDescription>
              Update VIP settings for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Theme Color</Label>
                <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purple">Purple</SelectItem>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="amber">Amber</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Expiry Date (Optional)</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="bg-black/20 border-white/10"
              />
              <p className="text-xs text-gray-400">Leave empty for permanent VIP status</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateVIP}>
              <Check className="h-4 w-4 mr-2" />
              Update VIP Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 