import RideCard from "@/components/RideCard"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "@/components/ui/sonner"
import { Textarea } from "@/components/ui/textarea"
import { AuthContext } from "@/context/AuthContext"
import useFetch from "@/hooks/useFetch"
import axios from "axios"
import { Loader2, Pencil, Star, Trash } from "lucide-react"
import { Fragment, useContext, useState, useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { Navigate, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const apiUri = import.meta.env.VITE_REACT_API_URI
const Profile = () => {
  const { user, dispatch } = useContext(AuthContext)
  const cloudinaryPreset = import.meta.env.VITE_CLOUDINARY_PRESET
  const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const navigate = useNavigate()

  const [rideDeleteMode, setRideDeleteMode] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const { loading, data, refetch } = useFetch(`users/${user?.user?._id}`, true)
  const [carbonSavings, setCarbonSavings] = useState(null)
  const [carbonLoading, setCarbonLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user?.user?._id) {
      setCarbonLoading(true)
      const apiUrl = import.meta.env.DEV 
        ? `/api/users/${user.user._id}/carbon-savings` 
        : `${apiUri}/api/users/${user.user._id}/carbon-savings`
      
      console.log('Fetching carbon savings from:', apiUrl)
      
      axios.get(apiUrl, { 
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        validateStatus: function (status) {
          return status >= 200 && status < 500
        }
      })
        .then(res => {
          console.log('Carbon savings response:', res)
          if (res.status === 401) {
            toast.error('Please log in to view carbon savings')
            return
          }
          setCarbonSavings(res.data)
        })
        .catch(err => {
          console.error('Error fetching carbon savings:', err)
          toast.error(err.response?.data?.message || 'Failed to fetch carbon savings')
        })
        .finally(() => setCarbonLoading(false))
    }
  }, [user])

  const handleImageUpload = async (event) => {
    try {
      const file = event.target.files[0]
      
      if (!file) {
        toast.error('Please select an image file')
        return
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPEG, PNG, or GIF)')
        return
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        toast.error('Image size should be less than 5MB')
        return
      }

      if (!cloudinaryPreset || !cloudinaryCloudName) {
        toast.error('Image upload configuration is missing. Please check your environment variables.')
        return
      }

      setUploading(true)
      toast.info('Starting upload...')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', cloudinaryPreset)

      const uploadResponse = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
        formData,
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      if (!uploadResponse.data?.secure_url) {
        throw new Error('No secure URL in response')
      }

      toast.info('Updating profile...')
      
      const apiUrl = import.meta.env.DEV 
        ? `/api/users/${user.user._id}` 
        : `${apiUri}/api/users/${user.user._id}`
      
      console.log('Updating profile at:', apiUrl)
      
      await axios.patch(
        apiUrl,
        { profilePicture: uploadResponse.data.secure_url },
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          timeout: 10000
        }
      )

      refetch()
      toast.success('Profile picture updated successfully')
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        toast.error('Upload timed out. Please try again')
      } else if (error.response?.status === 413) {
        toast.error('File size too large for upload')
      } else if (error.response?.status === 415) {
        toast.error('Unsupported file type')
      } else if (!navigator.onLine) {
        toast.error('No internet connection')
      } else if (error.response?.data?.error?.message) {
        toast.error(`Upload failed: ${error.response.data.error.message}`)
      } else {
        toast.error('Failed to upload image. Please try again.')
      }
    } finally {
      setUploading(false)
      // Reset the file input
      event.target.value = ''
    }
  }

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      name: data?.name || "",
      bio: data?.profile?.bio || "",
    },
  })

  const onSubmit = async (formData) => {
    if (!user) {
      toast.error("Please log in to update your profile")
      return
    }

    setIsSubmitting(true)
    try {
      const apiUrl = `/api/users/${user.user._id}`
      
      console.log('Updating profile at:', apiUrl)
      
      const updateData = {
        name: formData.name,
        profile: {
          ...data?.profile,
          bio: formData.bio
        }
      }

      const res = await axios.patch(
        apiUrl,
        updateData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          validateStatus: function (status) {
            return status >= 200 && status < 500
          }
        }
      )

      console.log('Update response:', res)

      if (res.status === 401) {
        toast.error('Please log in to update your profile')
        return
      }

      if (res.status === 200) {
        toast.success("Profile updated successfully!")
        // Update the user context with new data
        dispatch({ type: "LOGIN_SUCCESS", payload: { user: res.data, isAdmin: user.isAdmin } })
        // Refetch the user data
        if (typeof refetch === 'function') {
          await refetch()
        }
        setEditMode(false)
      } else {
        toast.error(res.data?.message || 'Failed to update profile')
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          "Failed to update profile"
      toast.error(errorMessage)
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id) {
    try {
      const apiUrl = import.meta.env.DEV 
        ? `/api/rides/${id}` 
        : `${apiUri}/api/rides/${id}`
      
      console.log('Deleting ride at:', apiUrl)
      
      await axios.delete(
        apiUrl,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      )
      refetch()
      toast.success("The ride has been deleted")
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error(error.response?.data?.message || 'Failed to delete ride')
    }
  }

  if (loading) {
    return (
      <main className="pb-12 md:py-14 px-6 2xl:px-20 2xl:container 2xl:mx-auto">
        <div className="flex flex-col sm:flex-row h-full w-full">
          <div className="w-full sm:w-96 flex p-0 py-6 md:p-6 xl:p-8 flex-col">
            <div className="relative flex w-full space-x-4 my-8">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (fetchError) {
    return (
      <main className="pb-12 md:py-14 px-6 2xl:px-20 2xl:container 2xl:mx-auto">
        <div className="flex flex-col sm:flex-row h-full w-full">
          <div className="w-full sm:w-96 flex p-0 py-6 md:p-6 xl:p-8 flex-col">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Error</h1>
              <p className="text-muted-foreground">{fetchError}</p>
              <Button 
                className="mt-4" 
                onClick={() => navigate('/', { replace: true })}
              >
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!user) return <Navigate to="/" replace />

  return (
    <main className="pb-12 md:py-14 px-6 2xl:px-20 2xl:container 2xl:mx-auto">
      <div className="flex flex-col sm:flex-row h-full w-full">
        <div className="w-full sm:w-96 flex p-0 py-6 md:p-6 xl:p-8 flex-col">
          <div className="relative flex w-full space-x-4 my-8">
            {loading ? (
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ) : (
              <>
                <Avatar>
                  <AvatarImage src={data?.profilePicture} />
                  <AvatarFallback className="select-none text-primary text-xl font-bold">{data?.name[0]}</AvatarFallback>
                </Avatar>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Pencil size={20} className="absolute bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 p-1 cursor-pointer rounded-full bottom-0 -left-5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <div className="p-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => document.getElementById('avatar').click()}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Pencil className="mr-2 h-4 w-4" />
                            Upload image
                          </>
                        )}
                      </Button>
                      <Input
                        type="file" 
                        id='avatar' 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </div>
                    <DropdownMenuItem>
                      <p>Remove profile</p>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex justify-center items-start flex-col space-y-2">
                  <p className="text-base font-semibold leading-4 text-left">{data?.name}</p>
                  <div className="flex items-center text-sm gap-1 text-muted-foreground"><Star fill="yellow" size={20} className="text-transparent" /> {data?.stars} - {data?.ratings.length} ratings</div>
                  {data?.trustScore !== undefined && (
                    <div className="text-sm text-muted-foreground">Trust Score: <span className="font-medium text-blue-600">{data.trustScore.toFixed(0)}</span></div>
                  )}
                </div>
              </>
            )}
          </div>
          {
            !editMode ? (
              <>
                <Button variant='outline' onClick={() => setEditMode(true)}>Edit Profile</Button>
                <div className="flex justify-center items-start flex-col space-y-4 mt-8">
                  <h3 className="text-base font-semibold leading-4 text-center md:text-left">About</h3>
                  <p className="text-sm text-muted-foreground">Bio: {data?.profile.bio}</p>
                  <p className="text-sm text-muted-foreground">{data?.age && `${data?.age} y/o`}</p>
                  <p className="text-sm text-muted-foreground">{data?.ridesCreated.length} Rides published</p>
                  <p className="text-sm text-muted-foreground">Member since {data?.createdAt.substring(0,4)}</p>
                </div>
                <div className="flex justify-center items-start flex-col space-y-4 mt-8">
                  <h3 className="text-base font-semibold leading-4 text-center md:text-left">Preferences</h3>
                  <p className="text-sm text-muted-foreground">{data?.profile.preferences?.music}</p>
                  <p className="text-sm text-muted-foreground">{data?.profile.preferences?.smoking}</p>
                  <p className="text-sm text-muted-foreground">{data?.profile.preferences?.petFriendly}</p>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
                <Label htmlFor="name">Name</Label>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => <Input required autoComplete="name" placeholder="Full name" id="name" {...field} />}
                />
                <Label htmlFor="bio">Bio</Label>
                <Controller
                  name="bio"
                  control={control}
                  render={({ field }) => <Textarea placeholder="Bio" id="bio" {...field} />}
                />

                <Button type="submit">Save</Button>
                <Button variant='outline' onClick={(e) => {e.preventDefault(); reset(); setEditMode(false)}}>Cancel</Button>
              </form>
            )
          }

          {/* Carbon Savings Section */}
          <div className="mt-8 space-y-4">
            <h3 className="text-xl font-semibold">Carbon Footprint Savings</h3>
            {carbonLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : carbonSavings ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">Weekly: <span className="font-medium text-green-600">{(carbonSavings.weekly / 1000).toFixed(2)} kg CO₂</span></p>
                <p className="text-muted-foreground">Monthly: <span className="font-medium text-green-600">{(carbonSavings.monthly / 1000).toFixed(2)} kg CO₂</span></p>
              </div>
            ) : (
              <p className="text-muted-foreground">Savings data not available.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-start items-start gap-2 w-full sm:w-2/3">
          <div className="flex justify-between items-center w-full">
            <h1 className="text-xl font-semibold">Published Rides</h1>
            <Pencil className={`cursor-pointer p-1 rounded-lg ${rideDeleteMode && 'bg-primary text-primary-foreground'} `} size={25} onClick={() => setRideDeleteMode(!rideDeleteMode)} />
          </div>
          <ScrollArea className="h-[275px] w-full rounded-md border p-4">
            {data?.ridesCreated.map(ride => 
              <Fragment key={ride._id} >
                <RideCard details={ride} />
                { rideDeleteMode && <Trash className="text-destructive cursor-pointer" onClick={()=> handleDelete(ride._id)} />}
              </Fragment>
            )}
          </ScrollArea>

          <div className="flex mt-5 justify-between items-center w-full">
            <h1 className="text-xl font-semibold">Recently joined rides</h1>
          </div>
          <ScrollArea className="h-[275px] w-full rounded-md border p-4">
            {data?.ridesJoined.length === 0
              ? <h3>No rides</h3>
              :
              data?.ridesJoined.map(ride => 
                <RideCard key={ride._id} details={ride} />
              )}
          </ScrollArea>
        </div>
      </div>
      <Toaster />
    </main>
  )
}

export default Profile