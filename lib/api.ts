import { supabase } from "@/lib/supabase"

// Types
export type Trip = {
  id?: number
  title: string
  destination: string
  status: string
  group_size_min: number
  group_size_max: number
  meals_included: string
  accommodation: string
  description: string
  host_id: number
  start_date?: string
  end_date?: string
  price?: number
}

export type Host = {
  id?: number
  name: string
  bio: string
  rating: number
  reviews: number
  social_link: string
}

export type TripActivity = {
  id?: number
  trip_id: number
  name: string
  category: string
  is_optional: boolean
  description: string
}

export type TripInclusion = {
  id?: number
  trip_id: number
  item: string
}

export type TripExclusion = {
  id?: number
  trip_id: number
  item: string
}

export type TripInfluencer = {
  id?: number
  trip_id: number
  influencer_name: string
  influencer_category: string
  price: number
  start_date: string
  end_date: string
}

export type TripImage = {
  id?: number
  trip_id: number
  image_url: string
}

export type User = {
  id?: number
  name: string
  email: string
  role: string
  status: string
  join_date: string
  last_login: string
}

export type Booking = {
  id?: number
  customer_id: number
  trip_id: number
  booking_date: string
  status: string
  payment_status: string
  amount: number
}

export type Message = {
  id?: number
  sender_id: number
  subject: string
  message: string
  date: string
  status: string
}

export type Setting = {
  id?: number
  key: string
  value: string
  category: string
}

// Package/Trip API
export const packageApi = {
  // Get all trips with related data
  getTripsWithRelated: async () => {
    const { data: tripsData, error: tripsError } = await supabase.from("trips").select("*")

    if (tripsError) throw tripsError

    const { data: activitiesData } = await supabase.from("trip_activities").select("*")
    const { data: inclusionsData } = await supabase.from("trip_inclusions").select("*")
    const { data: exclusionsData } = await supabase.from("trip_exclusions").select("*")
    const { data: influencersData } = await supabase.from("trip_influencers").select("*")
    const { data: imagesData } = await supabase.from("trip_images").select("*")

    // Join all data on trip_id
    const combined = tripsData?.map((trip) => ({
      ...trip,
      activities: activitiesData?.filter((a) => a.trip_id === trip.id) || [],
      inclusions: inclusionsData?.filter((i) => i.trip_id === trip.id) || [],
      exclusions: exclusionsData?.filter((e) => e.trip_id === trip.id) || [],
      influencers: influencersData?.filter((f) => f.trip_id === trip.id) || [],
      images: imagesData?.filter((img) => img.trip_id === trip.id) || [],
    }))

    return combined || []
  },

  // Get a single trip with related data
  getTripWithRelated: async (tripId: number) => {
    const { data: trip, error: tripError } = await supabase.from("trips").select("*").eq("id", tripId).single()

    if (tripError) throw tripError

    const { data: activities } = await supabase.from("trip_activities").select("*").eq("trip_id", tripId)
    const { data: inclusions } = await supabase.from("trip_inclusions").select("*").eq("trip_id", tripId)
    const { data: exclusions } = await supabase.from("trip_exclusions").select("*").eq("trip_id", tripId)
    const { data: influencers } = await supabase.from("trip_influencers").select("*").eq("trip_id", tripId)
    const { data: images } = await supabase.from("trip_images").select("*").eq("trip_id", tripId)

    return {
      ...trip,
      activities: activities || [],
      inclusions: inclusions || [],
      exclusions: exclusions || [],
      influencers: influencers || [],
      images: images || [],
    }
  },

  // Get host information
  getHost: async (hostId: number) => {
    const { data, error } = await supabase.from("hosts").select("*").eq("id", hostId).single()

    if (error) throw error
    return data
  },

  // Create a new trip
  createTrip: async (trip: Trip) => {
    const { data, error } = await supabase.from("trips").insert(trip).select()
    if (error) throw error
    return data[0]
  },

  // Update a trip
  updateTrip: async (tripId: number, trip: Partial<Trip>) => {
    const { data, error } = await supabase.from("trips").update(trip).eq("id", tripId).select()
    if (error) throw error
    return data[0]
  },

  // Delete a trip and all related data
  deleteTrip: async (tripId: number) => {
    // Delete related data first (due to foreign key constraints)
    await supabase.from("trip_activities").delete().eq("trip_id", tripId)
    await supabase.from("trip_inclusions").delete().eq("trip_id", tripId)
    await supabase.from("trip_exclusions").delete().eq("trip_id", tripId)
    await supabase.from("trip_influencers").delete().eq("trip_id", tripId)
    await supabase.from("trip_images").delete().eq("trip_id", tripId)

    // Delete the trip
    const { error } = await supabase.from("trips").delete().eq("id", tripId)
    if (error) throw error
    return true
  },

  // Add activities to a trip
  addActivities: async (activities: TripActivity[]) => {
    const { data, error } = await supabase.from("trip_activities").insert(activities).select()
    if (error) throw error
    return data
  },

  // Add inclusions to a trip
  addInclusions: async (inclusions: TripInclusion[]) => {
    const { data, error } = await supabase.from("trip_inclusions").insert(inclusions).select()
    if (error) throw error
    return data
  },

  // Add exclusions to a trip
  addExclusions: async (exclusions: TripExclusion[]) => {
    const { data, error } = await supabase.from("trip_exclusions").insert(exclusions).select()
    if (error) throw error
    return data
  },

  // Add influencers to a trip
  addInfluencers: async (influencers: TripInfluencer[]) => {
    const { data, error } = await supabase.from("trip_influencers").insert(influencers).select()
    if (error) throw error
    return data
  },

  // Add images to a trip
  addImages: async (images: TripImage[]) => {
    const { data, error } = await supabase.from("trip_images").insert(images).select()
    if (error) throw error
    return data
  },
}

// Host API
export const hostApi = {
  getHosts: async () => {
    const { data, error } = await supabase.from("hosts").select("*")
    if (error) throw error
    return data || []
  },

  createHost: async (host: Host) => {
    const { data, error } = await supabase.from("hosts").insert(host).select()
    if (error) throw error
    return data[0]
  },

  updateHost: async (hostId: number, host: Partial<Host>) => {
    const { data, error } = await supabase.from("hosts").update(host).eq("id", hostId).select()
    if (error) throw error
    return data[0]
  },
}

// User API
export const userApi = {
  getUsers: async () => {
    const { data, error } = await supabase.from("users").select("*")
    if (error) throw error
    return data || []
  },

  getUser: async (userId: number) => {
    const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()
    if (error) throw error
    return data
  },

  createUser: async (user: User) => {
    const { data, error } = await supabase.from("users").insert(user).select()
    if (error) throw error
    return data[0]
  },

  updateUser: async (userId: number, user: Partial<User>) => {
    const { data, error } = await supabase.from("users").update(user).eq("id", userId).select()
    if (error) throw error
    return data[0]
  },

  deleteUser: async (userId: number) => {
    const { error } = await supabase.from("users").delete().eq("id", userId)
    if (error) throw error
    return true
  },
}

// Booking API
export const bookingApi = {
  getBookings: async () => {
    const { data, error } = await supabase.from("bookings").select("*")
    if (error) throw error
    return data || []
  },

  getBooking: async (bookingId: number) => {
    const { data, error } = await supabase.from("bookings").select("*").eq("id", bookingId).single()
    if (error) throw error
    return data
  },

  createBooking: async (booking: Booking) => {
    const { data, error } = await supabase.from("bookings").insert(booking).select()
    if (error) throw error
    return data[0]
  },

  updateBooking: async (bookingId: number, booking: Partial<Booking>) => {
    const { data, error } = await supabase.from("bookings").update(booking).eq("id", bookingId).select()
    if (error) throw error
    return data[0]
  },

  deleteBooking: async (bookingId: number) => {
    const { error } = await supabase.from("bookings").delete().eq("id", bookingId)
    if (error) throw error
    return true
  },
}

// Message API
export const messageApi = {
  getMessages: async () => {
    const { data, error } = await supabase.from("messages").select("*")
    if (error) throw error
    return data || []
  },

  getMessage: async (messageId: number) => {
    const { data, error } = await supabase.from("messages").select("*").eq("id", messageId).single()
    if (error) throw error
    return data
  },

  createMessage: async (message: Message) => {
    const { data, error } = await supabase.from("messages").insert(message).select()
    if (error) throw error
    return data[0]
  },

  updateMessage: async (messageId: number, message: Partial<Message>) => {
    const { data, error } = await supabase.from("messages").update(message).eq("id", messageId).select()
    if (error) throw error
    return data[0]
  },

  deleteMessage: async (messageId: number) => {
    const { error } = await supabase.from("messages").delete().eq("id", messageId)
    if (error) throw error
    return true
  },
}

// Settings API
export const settingApi = {
  getSettings: async () => {
    const { data, error } = await supabase.from("settings").select("*")
    if (error) throw error
    return data || []
  },

  getSetting: async (settingId: number) => {
    const { data, error } = await supabase.from("settings").select("*").eq("id", settingId).single()
    if (error) throw error
    return data
  },

  createSetting: async (setting: Setting) => {
    const { data, error } = await supabase.from("settings").insert(setting).select()
    if (error) throw error
    return data[0]
  },

  updateSetting: async (settingId: number, setting: Partial<Setting>) => {
    const { data, error } = await supabase.from("settings").update(setting).eq("id", settingId).select()
    if (error) throw error
    return data[0]
  },

  deleteSetting: async (settingId: number) => {
    const { error } = await supabase.from("settings").delete().eq("id", settingId)
    if (error) throw error
    return true
  },
}
