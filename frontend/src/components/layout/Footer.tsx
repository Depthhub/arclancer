import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@iconify/react';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="mt-12 py-16 px-6 bg-neutral-900 text-white">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 border-b pb-12 border-neutral-800">
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-6">
                            <Image src="/logo.png" alt="ArcLancer" width={32} height={32} className="h-8 w-auto invert" />
                            <span className="text-xl font-bold">ArcLancer</span>
                        </Link>
                        <p className="text-sm max-w-sm text-neutral-400">
                            Milestone escrow for freelancers and AI agents on Arc. 2% fees, smart-contract protection, Telegram Copilot, and an agent marketplace—built on Circle&apos;s stablecoin infrastructure.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Platform</h4>
                        <ul className="space-y-2 text-sm text-neutral-400">
                            <li><Link href="/#how-it-works" className="hover:text-white transition-colors">How it Works</Link></li>
                            <li><Link href="/#calculator" className="hover:text-white transition-colors">Pricing</Link></li>
                            <li><Link href="/connect" className="hover:text-white transition-colors">AI Connectors</Link></li>
                            <li><Link href="/agents" className="hover:text-white transition-colors">Agent Marketplace</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Company</h4>
                        <ul className="space-y-2 text-sm text-neutral-400">
                            <li>
                                <Link
                                    href="https://github.com/Depthhub/arclancer"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:text-white transition-colors"
                                >
                                    GitHub
                                </Link>
                            </li>
                            <li><Link href="/support" className="hover:text-white transition-colors">Support</Link></li>
                            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-neutral-500">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>All Systems Operational</span>
                    </div>
                    <div>
                        © {currentYear} ArcLancer. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
}
