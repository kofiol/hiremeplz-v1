/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as React from 'react';
import {
  CompassIcon,
  FeatherIcon,
  HouseIcon,
  PlusIcon,
  SearchIcon,
} from 'lucide-react';
import NotificationMenu from './NotificationMenu';
import TeamSwitcher from './TeamSwitcher';
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
  teams?: string[];
  defaultTeam?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    time: string;
    unread?: boolean;
  }>;
  onNavItemClick?: (href: string) => void;
  onTeamChange?: (team: string) => void;
  onUserItemClick?: (item: string) => void;
  onNotificationClick?: (notificationId: string) => void;
}

// Default navigation links
const defaultNavigationLinks: Navbar12NavItem[] = [
  { href: '#', label: 'Dashboard', icon: HouseIcon },
  { href: '#', label: 'Explore', icon: CompassIcon },
  { href: '#', label: 'Write', icon: FeatherIcon },
  { href: '#', label: 'Search', icon: SearchIcon },
];

// Default teams
const defaultTeams = ['shadcn/ui', 'Acme Inc.', 'Origin UI'];

export const Navbar12 = React.forwardRef<HTMLElement, Navbar12Props>(
  (
    {
      className,
      navigationLinks = defaultNavigationLinks,
      teams = defaultTeams,
      defaultTeam = teams[0],
      userName = 'John Doe',
      userEmail = 'john@example.com',
      userAvatar,
      notifications,
      onNavItemClick,
      onTeamChange,
      onUserItemClick,
      onNotificationClick,
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
            <TeamSwitcher 
              teams={teams} 
              defaultTeam={defaultTeam} 
              onTeamChange={onTeamChange}
            />
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
            <Button 
              size="sm" 
              className="text-sm max-sm:aspect-square max-sm:p-0"
              onClick={(e) => {
                e.preventDefault();
                if (onUserItemClick) onUserItemClick('post');
              }}
            >
              <PlusIcon
                className="opacity-60 sm:-ms-1"
                size={16}
                aria-hidden={true}
              />
              <span className="max-sm:sr-only">Post</span>
            </Button>
            <NotificationMenu 
              notifications={notifications}
              onNotificationClick={onNotificationClick}
            />
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

export { HamburgerIcon, NotificationMenu, TeamSwitcher, UserMenu };