import React from "react"
import type { Metadata } from 'next'
import { Bricolage_Grotesque } from 'next/font/google'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _bricolageGrotesque = Bricolage_Grotesque({ subsets: ["latin"] });
const _plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Tripline - Reliable Shared Mobility & Transportation in Lagos, Nigeria',
  description: 'Experience structured, reliable shared mobility with Tripline. Fixed routes, guaranteed seats, and predictable schedules for professionals, schools, and travelers across Nigeria. Book your ride to work stress-free.',
  keywords: 'shared mobility, transportation Nigeria, Lagos commute, reliable bus service, corporate routes, school transport, shared transport, online bus booking',
  creator: 'Tripline',
  publisher: 'Tripline',
  authors: [{ name: 'Tripline Team' }],
  metadataBase: new URL('https://tripline.ng'),
  alternates: {
    canonical: 'https://tripline.ng',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://tripline.ng',
    title: 'Tripline - Reliable Shared Mobility in Lagos, Nigeria',
    description: 'Fixed routes, guaranteed seats, and predictable schedules. Join thousands of Lagos professionals who trust Tripline for stress-free commuting.',
    siteName: 'Tripline',
    images: [
      {
        url: 'https://tripline.ng/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Tripline - Reliable Shared Mobility',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tripline - Reliable Shared Mobility',
    description: 'Fixed routes, guaranteed seats, and predictable schedules for Lagos professionals',
    images: ['https://tripline.ng/og-image.jpg'],
  },
  icons: {
    icon: [
      {
        url: '/tripline-icon.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/tripline-icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
    shortcut: '/tripline-icon.png',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
