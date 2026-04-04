'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Map, PlusCircle, Truck, User } from 'lucide-react';

const navItems = [
  { href: '/map', label: 'Carte', icon: Map },
  { href: '/report/new', label: 'Observation', icon: PlusCircle },
  { href: '/shuttle', label: 'Navette', icon: Truck },
  { href: '/profile', label: 'Profil', icon: User },
];

interface BottomNavProps {
  /** When provided, the "Observation" button calls this instead of navigating directly */
  onCreateReport?: () => void;
}

export default function BottomNav({ onCreateReport }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleClick = (href: string, isAdd: boolean) => {
    if (isAdd && onCreateReport) {
      onCreateReport();
    } else {
      router.push(href);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          const isAdd = href === '/report/new';

          return (
            <button
              key={href}
              onClick={() => handleClick(href, isAdd)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isAdd
                  ? ''
                  : isActive
                  ? 'text-sky-500'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {isAdd ? (
                <div className="flex flex-col items-center -mt-4">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-mountain-500 shadow-lg">
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-[10px] mt-0.5 text-gray-500 font-medium">
                    {label}
                  </span>
                </div>
              ) : (
                <>
                  <Icon className={`h-6 w-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  <span
                    className={`text-[10px] mt-1 font-medium ${
                      isActive ? 'text-sky-500' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
