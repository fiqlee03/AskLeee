'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LogOut, Shirt, MessageSquare, Tag, BarChart3, Menu, X, User } from 'lucide-react';
import { useState } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Wardrobe', href: '/wardrobe', icon: Shirt },
    { name: 'AI Stylist', href: '/ask', icon: MessageSquare },
    { name: 'Thrift Mode', href: '/thrift', icon: Tag },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <nav className="border-b border-[#c9a96e]/10 bg-[#252118] text-[#f5f0e8]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="font-serif text-2xl tracking-widest text-[#c9a96e]">
              ASKLEE
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors border-b-2 ${
                    isActive
                      ? 'border-[#c9a96e] text-[#f5f0e8]'
                      : 'border-transparent text-[#8a8070] hover:text-[#f5f0e8] hover:border-[#c9a96e]/30'
                  }`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Sign Out Button */}
          <div className="hidden md:flex items-center">
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 border border-[#c9a96e]/20 bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#8a8070] hover:border-[#c9a96e] hover:text-[#c9a96e] transition-all rounded-sm cursor-pointer"
            >
              <LogOut className="h-3 w-3" />
              Sign Out
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 text-[#8a8070] hover:text-[#f5f0e8] focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#c9a96e]/10 bg-[#252118]">
          <div className="space-y-1 pb-3 pt-2 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center py-2 px-3 text-base font-medium rounded-sm ${
                    isActive
                      ? 'bg-[#1a1814] text-[#c9a96e]'
                      : 'text-[#8a8070] hover:bg-[#1a1814]/50 hover:text-[#f5f0e8]'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={handleSignOut}
              className="flex w-full items-center py-2 px-3 text-base font-medium text-[#8a8070] hover:bg-[#1a1814]/50 hover:text-[#f5f0e8] rounded-sm cursor-pointer"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
