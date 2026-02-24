import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/TRIPLINE%201-T0uXpNlWuBnWJ9udnApnnZXJoNoUEk.png"
                alt="Tripline Logo"
                className="h-8 w-[80px] object-contain"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Building Nigeria's most structured shared mobility platform.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/routes" className="hover:text-primary transition-colors">
                  Browse Routes
                </Link>
              </li>
              <li>
                <Link href="#services" className="hover:text-primary transition-colors">
                  Our Services
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="hover:text-primary transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="#drivers" className="hover:text-primary transition-colors">
                  Become a Driver
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#" className="hover:text-primary transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-primary transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-primary transition-colors">
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-sm text-muted-foreground">
            © 2025 Tripline. All rights reserved.
          </p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link
              href="#"
              className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.29 20v-7.21H5.5V9.25h2.79V7.07c0-2.77 1.69-4.28 4.16-4.28 1.18 0 2.2.09 2.5.13v2.9h-1.72c-1.35 0-1.61.64-1.61 1.59v2.09h3.22l-4.2 3.54V20H8.29z" />
              </svg>
            </Link>
            <Link
              href="#"
              className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75-2.25 7-5.5 7-5.5s-1.25 2.5-5 4.25" />
              </svg>
            </Link>
            <Link
              href="#"
              className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.722-2.004 1.418-.103.249-.129.597-.129.946v5.441h-3.554s.05-8.824 0-9.749h3.554v1.381c.43-.666 1.199-1.612 2.923-1.612 2.136 0 3.74 1.393 3.74 4.388v5.592zM5.337 5.432a2.063 2.063 0 01-2.067-2.067c0-1.141.926-2.047 2.067-2.047 1.14 0 2.066.906 2.066 2.047 0 1.141-.925 2.067-2.066 2.067zm1.782 14.02H3.555V9.703h3.564v9.749zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
