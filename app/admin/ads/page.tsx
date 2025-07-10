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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CldUploadWidget } from 'next-cloudinary'
import { Upload, Trash2, Edit2, BarChart3, Eye, ExternalLink } from 'lucide-react'

interface Ad {
  id: number
  name: string
  image_url: string
  target_url: string
  placement: string
  active: boolean
  impressions: number
  clicks: number
  start_date?: string | null
  end_date?: string | null
}

export default function AdManagementPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null)
  
  // Form state
  const [adName, setAdName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [placement, setPlacement] = useState('homepage')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isActive, setIsActive] = useState(true)
  
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  
  // Check if user is admin, redirect if not
  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/')
    }
  }, [user, isAdmin, isLoading, router])
  
  // Fetch ads
  useEffect(() => {
    async function fetchAds() {
      try {
        const { data, error } = await supabase
          .from('ads')
          .select('*')
          .order('id', { ascending: false })
        
        if (error) throw error
        
        setAds(data || [])
      } catch (error) {
        console.error('Error fetching ads:', error)
        toast.error('Failed to load advertisements')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchAds()
  }, [])
  
  // Handle image upload success
  const handleUploadSuccess = (result: any) => {
    const url = result.info.secure_url
    setImageUrl(url)
  }
  
  // Reset form
  const resetForm = () => {
    setAdName('')
    setImageUrl('')
    setTargetUrl('')
    setPlacement('homepage')
    setStartDate('')
    setEndDate('')
    setIsActive(true)
  }
  
  // Add new ad
  const handleAddAd = async () => {
    if (!adName || !imageUrl || !targetUrl) {
      toast.error('Please fill in all required fields')
      return
    }
    
    try {
      const newAd = {
        name: adName,
        image_url: imageUrl,
        target_url: targetUrl,
        placement,
        start_date: startDate || null,
        end_date: endDate || null,
        active: isActive,
      }
      
      const { data, error } = await supabase
        .from('ads')
        .insert(newAd)
        .select()
      
      if (error) throw error
      
      toast.success('Advertisement added successfully')
      setShowAddDialog(false)
      resetForm()
      
      // Add the new ad to the list
      if (data && data[0]) {
        setAds(prevAds => [data[0], ...prevAds])
      }
      
    } catch (error) {
      console.error('Error adding ad:', error)
      toast.error('Failed to add advertisement')
    }
  }
  
  // Update ad
  const handleUpdateAd = async () => {
    if (!selectedAd || !adName || !imageUrl || !targetUrl) {
      toast.error('Please fill in all required fields')
      return
    }
    
    try {
      const updatedAd = {
        name: adName,
        image_url: imageUrl,
        target_url: targetUrl,
        placement,
        start_date: startDate || null,
        end_date: endDate || null,
        active: isActive,
      }
      
      const { error } = await supabase
        .from('ads')
        .update(updatedAd)
        .eq('id', selectedAd.id)
      
      if (error) throw error
      
      toast.success('Advertisement updated successfully')
      setShowEditDialog(false)
      
      // Update the ad in the list
      setAds(prevAds => 
        prevAds.map(ad => 
          ad.id === selectedAd.id 
            ? { ...ad, ...updatedAd }
            : ad
        )
      )
      
    } catch (error) {
      console.error('Error updating ad:', error)
      toast.error('Failed to update advertisement')
    }
  }
  
  // Delete ad
  const handleDeleteAd = async (id: number) => {
    if (!confirm('Are you sure you want to delete this advertisement?')) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('ads')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      toast.success('Advertisement deleted successfully')
      
      // Remove from list
      setAds(prevAds => prevAds.filter(ad => ad.id !== id))
      
    } catch (error) {
      console.error('Error deleting ad:', error)
      toast.error('Failed to delete advertisement')
    }
  }
  
  // Toggle ad active status
  const handleToggleActive = async (ad: Ad) => {
    try {
      const { error } = await supabase
        .from('ads')
        .update({ active: !ad.active })
        .eq('id', ad.id)
      
      if (error) throw error
      
      toast.success(`Advertisement ${!ad.active ? 'activated' : 'deactivated'} successfully`)
      
      // Update in list
      setAds(prevAds => 
        prevAds.map(a => 
          a.id === ad.id 
            ? { ...a, active: !ad.active }
            : a
        )
      )
      
    } catch (error) {
      console.error('Error toggling ad status:', error)
      toast.error('Failed to update advertisement status')
    }
  }
  
  // Edit ad
  const handleEditClick = (ad: Ad) => {
    setSelectedAd(ad)
    setAdName(ad.name)
    setImageUrl(ad.image_url)
    setTargetUrl(ad.target_url)
    setPlacement(ad.placement)
    setStartDate(ad.start_date || '')
    setEndDate(ad.end_date || '')
    setIsActive(ad.active)
    setShowEditDialog(true)
  }
  
  // Get placement label
  const getPlacementLabel = (placement: string) => {
    switch (placement) {
      case 'homepage': return 'Home Page'
      case 'profile': return 'Profile Page'
      case 'manga': return 'Manga Details'
      case 'sidebar': return 'Sidebar'
      default: return placement
    }
  }
  
  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Ad Management</h1>
        <Button onClick={() => {
          resetForm()
          setShowAddDialog(true)
        }}>
          <Upload className="h-4 w-4 mr-2" />
          Add New Ad
        </Button>
      </div>
      
      {/* Ad metrics summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <h3 className="text-lg font-medium mb-1">Total Ads</h3>
          <p className="text-3xl font-bold">{ads.length}</p>
        </div>
        <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <h3 className="text-lg font-medium mb-1">Total Impressions</h3>
          <p className="text-3xl font-bold">{ads.reduce((sum, ad) => sum + ad.impressions, 0)}</p>
        </div>
        <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <h3 className="text-lg font-medium mb-1">Total Clicks</h3>
          <p className="text-3xl font-bold">{ads.reduce((sum, ad) => sum + ad.clicks, 0)}</p>
        </div>
      </div>
      
      {/* Ads Table */}
      <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
        <h2 className="text-xl font-semibold mb-4">Current Advertisements</h2>
        
        <div className="rounded-md overflow-hidden">
          <Table>
            <TableHeader className="bg-black/40">
              <TableRow>
                <TableHead>Preview</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4 text-gray-400">
                    No advertisements found
                  </TableCell>
                </TableRow>
              ) : (
                ads.map(ad => (
                  <TableRow key={ad.id} className="border-t border-white/5">
                    <TableCell>
                      <div className="relative h-12 w-24 overflow-hidden rounded">
                        <Image 
                          src={ad.image_url} 
                          alt={ad.name} 
                          fill 
                          className="object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{ad.name}</div>
                      <div className="text-xs text-gray-400 truncate max-w-[200px]">
                        <a href={ad.target_url} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-blue-400">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {ad.target_url}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>{getPlacementLabel(ad.placement)}</TableCell>
                    <TableCell className="text-right">{ad.impressions.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{ad.clicks.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : 0}%
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded text-xs ${ad.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {ad.active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleToggleActive(ad)}
                        title={ad.active ? 'Deactivate' : 'Activate'}
                      >
                        <Eye className={`h-4 w-4 ${ad.active ? 'text-green-400' : 'text-gray-400'}`} />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleEditClick(ad)}
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleDeleteAd(ad.id)}
                        className="hover:bg-red-900/20 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Add Ad Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Advertisement</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Ad Name</Label>
              <Input
                placeholder="Enter ad name"
                value={adName}
                onChange={(e) => setAdName(e.target.value)}
                className="bg-black/20 border-white/10"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Ad Image</Label>
              {imageUrl ? (
                <div className="relative w-full h-[150px] bg-gray-900 rounded-md overflow-hidden">
                  <Image 
                    src={imageUrl} 
                    alt="Ad preview" 
                    fill 
                    className="object-contain"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setImageUrl('')}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <CldUploadWidget
                  uploadPreset="ad_uploads"
                  options={{
                    maxFiles: 1,
                    resourceType: "image",
                    folder: "ads",
                  }}
                  onSuccess={handleUploadSuccess}
                >
                  {({ open }) => (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => open()}
                      className="w-full bg-black/20 border-white/10"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                  )}
                </CldUploadWidget>
              )}
              <p className="text-xs text-gray-400">Recommended sizes: 728x90 (banner), 300x250 (rectangle), 300x600 (skyscraper)</p>
            </div>
            
            <div className="space-y-2">
              <Label>Target URL</Label>
              <Input
                placeholder="https://example.com"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="bg-black/20 border-white/10"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Placement</Label>
              <select
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
                className="w-full rounded-md bg-black/20 border border-white/10 p-2 text-white"
              >
                <option value="homepage">Home Page</option>
                <option value="profile">Profile Page</option>
                <option value="manga">Manga Details</option>
                <option value="sidebar">Sidebar</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date (Optional)</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-black/20 border-white/10"
                />
              </div>
              
              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-black/20 border-white/10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="active" 
                checked={isActive}
                onCheckedChange={(value) => setIsActive(value === true)}
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAd}>
              Save Advertisement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Ad Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Advertisement</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Ad Name</Label>
              <Input
                placeholder="Enter ad name"
                value={adName}
                onChange={(e) => setAdName(e.target.value)}
                className="bg-black/20 border-white/10"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Ad Image</Label>
              {imageUrl ? (
                <div className="relative w-full h-[150px] bg-gray-900 rounded-md overflow-hidden">
                  <Image 
                    src={imageUrl} 
                    alt="Ad preview" 
                    fill 
                    className="object-contain"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setImageUrl('')}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <CldUploadWidget
                  uploadPreset="ad_uploads"
                  options={{
                    maxFiles: 1,
                    resourceType: "image",
                    folder: "ads",
                  }}
                  onSuccess={handleUploadSuccess}
                >
                  {({ open }) => (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => open()}
                      className="w-full bg-black/20 border-white/10"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                  )}
                </CldUploadWidget>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Target URL</Label>
              <Input
                placeholder="https://example.com"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="bg-black/20 border-white/10"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Placement</Label>
              <select
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
                className="w-full rounded-md bg-black/20 border border-white/10 p-2 text-white"
              >
                <option value="homepage">Home Page</option>
                <option value="profile">Profile Page</option>
                <option value="manga">Manga Details</option>
                <option value="sidebar">Sidebar</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date (Optional)</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-black/20 border-white/10"
                />
              </div>
              
              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-black/20 border-white/10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="edit-active" 
                checked={isActive}
                onCheckedChange={(value) => setIsActive(value === true)}
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAd}>
              Update Advertisement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 