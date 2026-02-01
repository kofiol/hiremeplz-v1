/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as React from 'react';
import {
  FeatherIcon,
  HouseIcon,
  MicIcon,
  SettingsIcon,
  UserIcon,
} from 'lucide-react';
import UserMenu from './UserMenu';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/components/ui/utils'; 

// Hamburger icon component
const HamburgerIcon = ({ className, ...props }: React.SVGAttributes<SVGElement>) => (
  <svg
    className={cn('pointer-events-none', className)}
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...(props as any)}
  >
    <path
      d="M4 12L20 12"
      className="origin-center -translate-y-1.75 transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
    />
    <path
      d="M4 12H20"
      className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
    />
    <path
      d="M4 12H20"
      className="origin-center -translate-y-1.75 transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
    />
  </svg>
);

// Types
export interface Navbar12NavItem {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number; 'aria-hidden'?: boolean }>;
}

export interface Navbar12Props extends React.HTMLAttributes<HTMLElement> {
  navigationLinks?: Navbar12NavItem[];
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  onNavItemClick?: (href: string) => void;
  onUserItemClick?: (item: string) => void;
}

// Default navigation links
const defaultNavigationLinks: Navbar12NavItem[] = [
  { href: '/overview', label: 'Overview', icon: HouseIcon },
  { href: '/profile', label: 'Profile', icon: UserIcon },
  { href: '/interview-prep', label: 'Interview Prep', icon: MicIcon },
  { href: '/proposal-writer', label: 'Proposal Writer', icon: FeatherIcon },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];


export const Navbar12 = React.forwardRef<HTMLElement, Navbar12Props>(
  (
    {
      className,
      navigationLinks = defaultNavigationLinks,
      userName = 'John Doe',
      userEmail = 'john@example.com',
      userAvatar,
      onNavItemClick,
      onUserItemClick,
      ...props
    },
    ref
  ) => {
    return (
      <header
        ref={ref}
        className={cn(
          'border-b px-4 md:px-6 [&_*]:no-underline',
          className
        )}
        {...(props as any)}
      >
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left side */}
          <div className="flex flex-1 items-center gap-2">
            {/* Mobile menu trigger */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  className="group size-8 md:hidden hover:bg-accent hover:text-accent-foreground"
                  variant="ghost"
                  size="icon"
                >
                  <HamburgerIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-48 p-1 md:hidden">
                <NavigationMenu className="max-w-none *:w-full">
                  <NavigationMenuList className="flex-col items-start gap-0 md:gap-2">
                    {navigationLinks.map((link, index) => {
                      const Icon = link.icon;
                      return (
                        <NavigationMenuItem key={index} className="w-full">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              if (onNavItemClick && link.href) onNavItemClick(link.href);
                            }}
                            className="flex w-full items-center gap-2 py-1.5 px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-md no-underline"
                          >
                            <Icon
                              size={16}
                              className="text-muted-foreground"
                              aria-hidden={true}
                            />
                            <span>{link.label}</span>
                          </button>
                        </NavigationMenuItem>
                      );
                    })}
                  </NavigationMenuList>
                </NavigationMenu>
              </PopoverContent>
            </Popover>
          </div>

          {/* Middle area */}
          <NavigationMenu className="max-md:hidden">
            <NavigationMenuList className="gap-2">
              {navigationLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                  <NavigationMenuItem key={index}>
                    <NavigationMenuLink
                      href={link.href}
                      onClick={(e) => {
                        e.preventDefault();
                        if (onNavItemClick && link.href) onNavItemClick(link.href);
                      }}
                      className="flex size-8 items-center justify-center p-1.5 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors cursor-pointer"
                      title={link.label}
                    >
                      <Icon aria-hidden={true} />
                      <span className="sr-only">{link.label}</span>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right side */}
          <div className="flex flex-1 items-center justify-end gap-4">
            <UserMenu
              userName={userName}
              userEmail={userEmail}
              userAvatar={userAvatar}
              onItemClick={onUserItemClick}
            />
          </div>
        </div>
      </header>
    );
  }
);


Navbar12.displayName = 'Navbar12';

export { HamburgerIcon, UserMenu };