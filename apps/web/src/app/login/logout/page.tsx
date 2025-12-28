'use client'

import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'



export default function LogoutPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const router = useRouter()                                    

  useEffect(() => {
    const logout = async () => {
      await supabase.auth.signOut()
      router.replace('/login') // or '/'
    }
    logout()
  }, [])

  return null
}
