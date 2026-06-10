import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const path = request.nextUrl.pathname

  // Skip static assets, public files, and API routes
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.includes('.') ||
    path.startsWith('/favicon.ico')
  ) {
    return supabaseResponse
  }

  // Get current user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginPage = path === '/login'

  // If user is not logged in, redirect to login if they are not already there
  if (!user) {
    if (!isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Get user profile role and business_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, business_id')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // If no role, log them out or redirect to login
  if (!role) {
    if (!isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Resolve correct path based on user role
  let correctPath = '/login'
  if (role === 'superadmin') {
    correctPath = '/superadmin/dashboard'
  } else if (role === 'admin') {
    correctPath = '/dashboard'
  } else if (role === 'cashier' || role === 'waiter') {
    correctPath = '/pos'
  } else if (role === 'cook') {
    correctPath = '/kitchen'
  }

  // Redirect to correct dashboard if at login, root page, or exactly /superadmin
  if (isLoginPage || path === '/' || path === '/superadmin' || path === '/superadmin/') {
    const url = request.nextUrl.clone()
    url.pathname = correctPath
    return NextResponse.redirect(url)
  }

  // Force superadmin to always remain within /superadmin routes
  if (role === 'superadmin' && !path.startsWith('/superadmin')) {
    const url = request.nextUrl.clone()
    url.pathname = '/superadmin/dashboard'
    return NextResponse.redirect(url)
  }

  // Enforce role-based path protections
  if (path.startsWith('/superadmin') && role !== 'superadmin') {
    const url = request.nextUrl.clone()
    url.pathname = correctPath
    return NextResponse.redirect(url)
  }

  if (path.startsWith('/dashboard') && role !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = correctPath
    return NextResponse.redirect(url)
  }

  if (path.startsWith('/pos') && role !== 'cashier' && role !== 'waiter' && role !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = correctPath
    return NextResponse.redirect(url)
  }

  if (path.startsWith('/kitchen') && role !== 'cook' && role !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = correctPath
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
