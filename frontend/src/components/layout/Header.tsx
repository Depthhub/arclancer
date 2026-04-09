'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Icon } from '@iconify/react';
import { Menu, X } from 'lucide-react';

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const pathname = usePathname();

    const navigation = [
        { name: 'Home', href: '/' },
        { name: 'Comparison', href: '/#comparison' },
        { name: 'How It Works', href: '/#how-it-works' },
        { name: 'Savings', href: '/#calculator' },
    ];

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href.replace('/#', '/'));
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b bg-white/80 backdrop-blur-md border-neutral-100/50">
            <div className="flex max-w-7xl mx-auto py-4 px-6 items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <Image src="/logo.png" alt="ArcLancer" width={32} height={32} className="h-8 w-auto" />
                    <span className="text-xl font-bold tracking-tight text-neutral-900">ArcLancer</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-1 p-1 rounded-full border overflow-x-auto bg-neutral-100/50 border-neutral-100 no-scrollbar">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`px-4 lg:px-5 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                                isActive(item.href)
                                    ? 'text-neutral-900 bg-white shadow-sm'
                                    : 'text-neutral-500 hover:text-neutral-900'
                            }`}
                        >
                            {item.name}
                        </Link>
                    ))}
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-3">
                    <div className="hidden sm:block">
                        <ConnectButton
                            showBalance={false}
                            chainStatus="icon"
                            accountStatus={{
                                smallScreen: 'avatar',
                                largeScreen: 'full',
                            }}
                        />
                    </div>

                    <Link 
                        href="/create" 
                        className="hidden lg:flex items-center gap-2 px-4 py-2.5 lg:px-5 lg:py-2.5 rounded-full text-sm font-medium transition-all shadow-lg whitespace-nowrap bg-neutral-900 text-white hover:bg-neutral-800 shadow-neutral-200"
                    >
                        Start Saving
                        <Icon icon="solar:arrow-right-linear" width="16" />
                    </Link>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                    >
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden border-t border-neutral-100 bg-white">
                    <div className="px-6 py-4">
                        <nav className="flex flex-col gap-1 mb-4">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                        isActive(item.href)
                                            ? 'bg-neutral-100 text-neutral-900'
                                            : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                                    }`}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                        <div className="pt-4 border-t border-neutral-100 space-y-3">
                            <div className="sm:hidden">
                                <ConnectButton />
                            </div>
                            <Link 
                                href="/create" 
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-full text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800"
                            >
                                Start Saving
                                <Icon icon="solar:arrow-right-linear" width="16" />
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
