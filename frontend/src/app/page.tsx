import Link from 'next/link';
import { Icon } from '@iconify/react';

export default function HomePage() {
  return (
    <div className="antialiased selection:bg-neutral-900 selection:text-white bg-white text-neutral-600">
      {/* Hero Section */}
      <section className="md:pt-20 lg:pt-28 md:pb-24 lg:pb-32 overflow-hidden pt-16 pb-24 relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="z-10 max-w-2xl relative mx-auto lg:mx-0 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 border rounded-full px-3 py-1.5 mb-8 bg-blue-50 border-blue-100">
              <Icon icon="solar:verified-check-linear" width="16" className="text-blue-600" />
              <span className="text-xs font-semibold tracking-wide uppercase text-blue-700">Built on Arc Blockchain</span>
            </div>

            {/* Responsive Text Sizing */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl leading-[1.1] font-bold tracking-tight mb-6 text-neutral-900">
              Keep 98% of <br className="hidden md:block" /> What You Earn. <br />
              <span className="text-neutral-300">Not 75%.</span>
            </h1>

            <p className="text-lg md:text-xl leading-relaxed text-neutral-500 max-w-lg mb-10 mx-auto lg:mx-0">
              The freelance platform that stops fees from eating your income. Secure milestone escrow and instant global payouts in your local currency.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center lg:justify-start">
              <Link href="/create" className="transition-all flex text-base font-medium rounded-full pt-4 pr-8 pb-4 pl-8 shadow-lg gap-x-2 gap-y-2 items-center justify-center hover:bg-neutral-800 shadow-neutral-200 text-white bg-neutral-900">
                Create Your First Contract
                <Icon icon="solar:pen-new-square-linear" width="18" />
              </Link>
              <Link href="/dashboard" className="transition-all text-base font-medium border rounded-full py-4 px-8 flex items-center justify-center gap-2 hover:bg-neutral-50 text-neutral-600 bg-white border-neutral-200">
                Dashboard
                <Icon icon="solar:arrow-right-linear" width="18" />
              </Link>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center lg:justify-start gap-4 text-xs font-medium text-neutral-400">
              <span className="flex items-center gap-1"><Icon icon="solar:shield-check-linear" className="text-green-500" /> $0 in stuck payments</span>
              <span className="hidden md:block w-1 h-1 rounded-full bg-neutral-300"></span>
              <span className="flex items-center gap-1"><Icon icon="solar:document-add-linear" /> 2,847 contracts completed</span>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative w-full h-full min-h-[450px] md:min-h-[500px] flex items-center justify-center lg:justify-end mt-8 lg:mt-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] md:w-[140%] md:h-[140%] bg-gradient-to-tr rounded-full blur-3xl opacity-60 -z-10 from-blue-50 via-white to-purple-50"></div>

            {/* Main Card Stack */}
            <div className="relative w-80 md:w-96 rounded-[2rem] shadow-2xl border p-6 z-20 transform lg:rotate-[-2deg] bg-white shadow-neutral-200/50 border-neutral-100">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-neutral-100 text-neutral-900">MC</div>
                  <div>
                    <div className="text-sm font-bold text-neutral-900">Marcus Chen</div>
                    <div className="text-xs text-neutral-400">Full-Stack Developer</div>
                  </div>
                </div>
                <div className="text-xs font-medium px-2 py-1 rounded-full text-green-600 bg-green-50">Online</div>
              </div>

              <div className="rounded-2xl p-6 mb-6 border bg-neutral-50 border-neutral-100">
                <div className="text-xs text-neutral-500 mb-1">Contract Payout</div>
                <div className="text-3xl font-bold tracking-tight text-neutral-900">$4,890.00</div>
                <div className="flex items-center gap-2 mt-2 text-xs line-through text-neutral-400">
                  Old Platform: $3,760.00
                </div>
                <div className="mt-4 flex gap-2">
                  <span className="text-[10px] px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">Fee: 2%</span>
                  <span className="text-[10px] px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700">Instant</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border shadow-sm bg-white border-neutral-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50 text-blue-600">
                      <Icon icon="solar:wallet-money-linear" width="16" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">Sent to Bank Account</div>
                      <div className="text-[10px] text-neutral-400">2 seconds ago</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-neutral-900">Completed</span>
                </div>
              </div>

              {/* Floating Badge */}
              <div className="absolute -right-4 md:-right-8 top-1/2 p-4 rounded-xl shadow-xl animate-bounce duration-[3000ms] bg-neutral-900 text-white shadow-neutral-900/20">
                <div className="flex items-center gap-3">
                  <Icon icon="solar:confetti-minimalistic-linear" width="20" className="text-yellow-400" />
                  <div>
                    <div className="text-xs text-neutral-300">You saved</div>
                    <div className="text-sm font-bold text-white">+$1,130.00</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section (Comparison) */}
      <section className="pt-24 pb-24 bg-neutral-50/50" id="comparison">
        <div className="max-w-7xl mr-auto ml-auto pr-6 pl-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-neutral-900">
              Freelancing Shouldn&apos;t Cost You <span className="text-red-500">25%</span> of Your Income
            </h2>
            <p className="text-neutral-500">Stop losing money to hidden fees, conversion markups, and slow payouts.</p>
          </div>

          {/* Tab View Optimized Grid: 2 columns on tablet, 3 on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Upwork (The Old Way) */}
            <div className="overflow-hidden group border rounded-3xl pt-8 pr-8 pb-8 pl-8 relative bg-white border-neutral-200">
              <div className="w-full h-1 absolute top-0 left-0"></div>
              <div className="flex gap-3 mb-6 gap-x-3 gap-y-3 items-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-red-500 bg-red-50">
                  <Icon icon="solar:sad-circle-linear" width="24" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">The Old Way</h3>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Icon icon="solar:close-circle-linear" className="text-red-500 mt-1 shrink-0" />
                  <div>
                    <span className="block text-sm font-semibold text-neutral-900">20% Platform Fee</span>
                    <span className="text-xs text-neutral-500">On a $5k project, they take $1,000.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Icon icon="solar:close-circle-linear" className="text-red-500 mt-1 shrink-0" />
                  <div>
                    <span className="block text-sm font-semibold text-neutral-900">14-Day Payment Hold</span>
                    <span className="text-xs text-neutral-500">Your money sits in their account.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Icon icon="solar:close-circle-linear" className="text-red-500 mt-1 shrink-0" />
                  <div>
                    <span className="block text-sm font-semibold text-neutral-900">5% Currency Markup</span>
                    <span className="text-xs text-neutral-500">Lose $200 converting currency.</span>
                  </div>
                </li>
              </ul>

              <div className="pt-6 border-t border-neutral-100">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">Total Loss</span>
                  <span className="text-xl font-bold text-red-600">$1,240</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-sm font-medium text-neutral-500">You Keep</span>
                  <span className="text-2xl font-bold text-neutral-400">$3,760</span>
                </div>
              </div>
            </div>

            {/* ArcLancer (The New Way) */}
            <div className="rounded-3xl p-8 border relative overflow-hidden shadow-2xl transform lg:-translate-y-4 bg-neutral-900 border-neutral-800">
              <div className="w-full h-1 absolute top-0 left-0"></div>
              <div className="mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-800 text-blue-400">
                  <Icon icon="solar:stars-minimalistic-linear" width="24" />
                </div>
                <h3 className="text-lg font-bold text-white">ArcLancer</h3>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Icon icon="solar:check-circle-bold" className="text-blue-500 mt-1 shrink-0" />
                  <div>
                    <span className="block text-sm font-semibold text-white">2% Platform Fee</span>
                    <span className="text-xs text-neutral-400">We take $100. That&apos;s it.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Icon icon="solar:check-circle-bold" className="text-blue-500 mt-1 shrink-0" />
                  <div>
                    <span className="block text-sm font-semibold text-white">Instant Payment</span>
                    <span className="text-xs text-neutral-400">Funds hit your wallet immediately.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Icon icon="solar:check-circle-bold" className="text-blue-500 mt-1 shrink-0" />
                  <div>
                    <span className="block text-sm font-semibold text-white">0.2% Real FX Rate</span>
                    <span className="text-xs text-neutral-400">Pay what banks pay.</span>
                  </div>
                </li>
              </ul>

              <div className="pt-6 border-t border-neutral-800">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Total Cost</span>
                  <span className="text-xl font-bold text-blue-300">$110</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-sm font-medium text-neutral-400">You Keep</span>
                  <span className="text-4xl font-bold text-white">$4,890</span>
                </div>
              </div>
            </div>

            {/* The Difference - Spans 2 cols on tablet for better balance */}
            <div className="rounded-3xl p-8 border flex flex-col justify-center md:col-span-2 lg:col-span-1 bg-white border-neutral-200">
              <div className="text-center md:max-w-md md:mx-auto lg:max-w-none">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-green-50 text-green-600">
                  <Icon icon="solar:wallet-2-linear" width="32" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-neutral-900">The Difference</h3>
                <p className="text-4xl font-bold tracking-tight mb-2 text-neutral-900">+$1,130</p>
                <p className="text-sm text-neutral-500 mb-8">Extra in your pocket per $5k project.</p>

                <div className="space-y-4 text-left p-6 rounded-2xl mb-8 bg-neutral-50">
                  <div className="flex items-center gap-2">
                    <Icon icon="solar:graph-up-linear" className="text-neutral-900" />
                    <span className="text-xs font-medium text-neutral-700">~30% More Income for same work</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon icon="solar:bag-heart-linear" className="text-neutral-900" />
                    <span className="text-xs font-medium text-neutral-700">Save $11,300/yr on $50k revenue</span>
                  </div>
                </div>

                <Link href="/create" className="w-full border py-3 rounded-xl text-sm font-semibold transition-colors bg-white border-neutral-200 text-neutral-900 hover:border-neutral-400 inline-block text-center">
                  Stop Losing Money →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 border rounded-full px-3 py-1.5 mb-6 shadow-sm bg-white border-neutral-200">
              <Icon icon="solar:rocket-linear" width="16" className="text-neutral-500" />
              <span className="text-xs font-medium text-neutral-600">Dead Simple</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-neutral-900">
              Three Steps. <span className="text-neutral-400">Zero Middlemen.</span> <br /> Your Money, Your Terms.
            </h2>
          </div>

          {/* Bento Grid - Optimized for Tablet */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1: Create */}
            <div className="md:col-span-1 rounded-[2rem] p-8 md:p-6 lg:p-8 border shadow-sm flex flex-col justify-between h-auto md:h-96 group hover:shadow-md transition-shadow bg-white border-neutral-100">
              <div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold mb-6 bg-neutral-100 text-neutral-900">1</div>
                <h3 className="text-xl font-bold mb-2 text-neutral-900">Create Contract</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">Set milestones and amounts. Terms are locked in a smart contract.</p>
              </div>
              {/* Abstract UI */}
              <div className="mt-6 rounded-xl p-4 border bg-neutral-50 border-neutral-100">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-neutral-400">Milestone 1</span>
                  <span className="font-semibold text-neutral-900">$2,500</span>
                </div>
                <div className="h-2 rounded-full w-full overflow-hidden bg-neutral-200">
                  <div className="h-full w-1/2 bg-neutral-900"></div>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-[10px] text-neutral-400">Status</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-200 text-neutral-600">Locked</span>
                </div>
              </div>
            </div>

            {/* Step 2: Deliver (Large) */}
            <div className="md:col-span-2 rounded-[2rem] p-8 md:p-8 lg:p-12 border shadow-xl flex flex-col md:flex-row items-center gap-8 lg:gap-12 overflow-hidden relative bg-neutral-900 text-white border-neutral-800">
              <div className="flex-1 order-2 md:order-1 relative z-10">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold mb-6 bg-neutral-800 text-white">2</div>
                <h3 className="text-2xl font-bold mb-4">Submit &amp; Deliver</h3>
                <p className="mb-8 leading-relaxed max-w-sm text-sm lg:text-base text-neutral-400">Upload deliverables. Client has 7 days to review. No response? Payment auto-approves.</p>
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <Icon icon="solar:clock-circle-linear" />
                  <span>Auto-release timer active</span>
                </div>
              </div>

              {/* Visual */}
              <div className="flex-1 order-1 md:order-2 w-full flex items-center justify-center">
                <div className="rounded-2xl p-6 w-full max-w-xs border relative bg-neutral-800 border-neutral-700">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-neutral-400">Review Period</span>
                    <span className="text-xs font-mono text-white">6d : 23h : 59m</span>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded flex items-center justify-center bg-neutral-700">
                      <Icon icon="solar:file-check-linear" className="text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-white">Final_Design_v2.fig</div>
                      <div className="text-[10px] text-neutral-500">Uploaded 1m ago</div>
                    </div>
                  </div>
                  <button className="w-full text-xs font-semibold py-2 rounded-lg bg-blue-600 text-white">Mark as Delivered</button>
                </div>
              </div>
            </div>

            {/* Step 3: Get Paid */}
            <div className="md:col-span-3 rounded-[2rem] p-8 md:p-8 lg:p-12 border shadow-sm flex flex-col md:flex-row items-center gap-12 bg-white border-neutral-100">
              <div className="flex-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold mb-6 bg-neutral-100 text-neutral-900">3</div>
                <h3 className="text-2xl font-bold mb-4 text-neutral-900">Instant Payout, Your Currency</h3>
                <p className="text-neutral-500 mb-8 leading-relaxed max-w-lg">Convert to Brazilian Real, Mexican Peso, or 6 other currencies. Receive in seconds, not weeks. Cash out to your bank in under an hour.</p>
                <Link href="/create" className="font-semibold text-sm flex items-center gap-2 group text-neutral-900">
                  Create First Contract Free
                  <Icon icon="solar:arrow-right-linear" className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="flex-1 w-full max-w-md rounded-3xl p-6 border bg-neutral-50 border-neutral-100">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm font-medium text-neutral-900">Withdraw Funds</span>
                  <Icon icon="solar:settings-linear" className="text-neutral-400" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-white border-neutral-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg bg-green-100">🇧🇷</div>
                      <span className="text-sm font-medium">BRL (Pix)</span>
                    </div>
                    <span className="text-xs font-semibold text-green-600">0% Fee</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-white border-neutral-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg bg-red-100">🇲🇽</div>
                      <span className="text-sm font-medium">MXN (SPEI)</span>
                    </div>
                    <span className="text-xs font-semibold text-green-600">0% Fee</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-white border-neutral-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg bg-yellow-100">🇵🇭</div>
                      <span className="text-sm font-medium">PHP (InstaPay)</span>
                    </div>
                    <span className="text-xs font-semibold text-green-600">0% Fee</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-neutral-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-neutral-900">Everything Upwork Should Have Been</h2>
          </div>
          {/* Grid optimized for Tablet: 2 cols on md, 3 on lg */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl border shadow-sm hover:shadow-md transition-shadow bg-white border-neutral-100">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-blue-50 text-blue-600">
                <Icon icon="solar:shield-check-linear" width="24" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-neutral-900">Milestone-Based Escrow</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">Client funds the contract upfront. Money releases only when you deliver. No more &quot;I&apos;ll pay next week&quot;.</p>
            </div>
            {/* Feature 2 */}
            <div className="p-8 rounded-3xl border shadow-sm hover:shadow-md transition-shadow bg-white border-neutral-100">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-green-50 text-green-600">
                <Icon icon="solar:globe-linear" width="24" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-neutral-900">Multi-Currency Payouts</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">Get paid in BRL, MXN, PHP and 5 more. Real exchange rates, not a 5% markup.</p>
            </div>
            {/* Feature 3 */}
            <div className="p-8 rounded-3xl border shadow-sm hover:shadow-md transition-shadow bg-white border-neutral-100">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-purple-50 text-purple-600">
                <Icon icon="solar:clock-circle-linear" width="24" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-neutral-900">Auto-Approval Protection</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">No response in 7 days? Payment releases automatically. Your time is protected.</p>
            </div>
            {/* Feature 4 */}
            <div className="p-8 rounded-3xl border shadow-sm hover:shadow-md transition-shadow bg-white border-neutral-100">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-neutral-100 text-neutral-600">
                <Icon icon="solar:incognito-linear" width="24" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-neutral-900">Privacy-First Transactions</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">Optional confidential payments. Competitors can&apos;t see your rates or clients.</p>
            </div>
            {/* Feature 5 */}
            <div className="p-8 rounded-3xl border shadow-sm hover:shadow-md transition-shadow bg-white border-neutral-100">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-yellow-50 text-yellow-600">
                <Icon icon="solar:bolt-linear" width="24" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-neutral-900">Instant Settlement</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">No 14-day holds. Payments settle in under 2 seconds. Bills are due now, not later.</p>
            </div>
            {/* Feature 6 */}
            <div className="p-8 rounded-3xl border shadow-sm hover:shadow-md transition-shadow bg-white border-neutral-100">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-red-50 text-red-600">
                <Icon icon="solar:tag-price-linear" width="24" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-neutral-900">Transparent 2% Fee</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">No hidden costs. No withdrawal fees. Just 2% on the contract value. Period.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 border rounded-full px-3 py-1.5 mb-6 bg-neutral-50 border-neutral-100">
              <Icon icon="solar:users-group-rounded-linear" width="16" className="text-neutral-500" />
              <span className="text-xs font-medium text-neutral-600">Join the movement</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-neutral-900">
              Freelancers Are Already <span className="text-neutral-400">Saving Thousands</span>
            </h2>
          </div>

          {/* Optimized Grid for Tablet: 2 cols -> 3 cols */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {/* Testimonial 1 */}
            <div className="p-8 rounded-[2rem] relative border bg-neutral-50 border-neutral-100">
              <div className="mb-6">
                <div className="flex gap-1 mb-2 text-yellow-400">
                  <Icon icon="solar:star-bold" width="16" />
                  <Icon icon="solar:star-bold" width="16" />
                  <Icon icon="solar:star-bold" width="16" />
                  <Icon icon="solar:star-bold" width="16" />
                  <Icon icon="solar:star-bold" width="16" />
                </div>
                <p className="text-sm font-medium leading-relaxed text-neutral-700">
                  &quot;I made $47,000 last year on Upwork. They took $9,400. This year on ArcLancer, I&apos;ll save $8,460. That&apos;s a new car.&quot;
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-neutral-200">MC</div>
                <div>
                  <div className="text-sm font-bold text-neutral-900">Marcus Chen</div>
                  <div className="text-xs text-neutral-500">Full-Stack Developer, Brazil</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t text-xs font-semibold border-neutral-200 text-green-600">
                💰 Saved $8,460 in 7 months
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="p-8 rounded-[2rem] relative border shadow-xl bg-neutral-900 text-white border-neutral-800">
              <div className="mb-6">
                <div className="flex gap-1 mb-2 text-yellow-400">
                  <Icon icon="solar:star-bold" width="16" />
                  <Icon icon="solar:star-bold" width="16" />
                  <Icon icon="solar:star-bold" width="16" />
                  <Icon icon="solar:star-bold" width="16" />
                  <Icon icon="solar:star-bold" width="16" />
                </div>
                <p className="text-sm font-medium leading-relaxed text-neutral-300">
                  &quot;Had a client ghost me. On Upwork, I&apos;d fight for weeks. Here, payment auto-released after 7 days. Game changer.&quot;
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-white/10">AR</div>
                <div>
                  <div className="text-sm font-bold text-white">Ana Rodríguez</div>
                  <div className="text-xs text-neutral-400">UX Designer, Mexico</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t text-xs font-semibold border-neutral-700 text-green-400">
                ⚡ Auto-approved payment: $3,200
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="p-8 rounded-[2rem] relative border md:col-span-2 lg:col-span-1 bg-neutral-50 border-neutral-100">
              <div className="mb-6">
                <div className="flex gap-1 mb-2 text-yellow-400">
                  <Icon icon="solar:star-bold" width="16" />
                  <Icon icon="solar:star-bold" width="16" />
                  <Icon icon="solar:star-bold" width="16" />
                  <Icon icon="solar:star-bold" width="16" />
                  <Icon icon="solar:star-bold" width="16" />
                </div>
                <p className="text-sm font-medium leading-relaxed text-neutral-700">
                  &quot;Getting paid in pesos instead of USD saved me 4% on every project. Plus instant payout. I&apos;ll never go back.&quot;
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-neutral-200">CM</div>
                <div>
                  <div className="text-sm font-bold text-neutral-900">Carlos Mendoza</div>
                  <div className="text-xs text-neutral-500">Content Writer, Manila</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t text-xs font-semibold border-neutral-200 text-green-600">
                🌎 Average savings: $180/project
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="rounded-xl p-6 flex flex-wrap justify-center md:justify-between items-center gap-4 text-xs md:text-sm font-medium bg-neutral-100 text-neutral-600">
            <span className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div> $2.4M+ Total Paid Out</span>
            <span className="hidden md:block text-neutral-300">•</span>
            <span>2,847 Contracts Completed</span>
            <span className="hidden md:block text-neutral-300">•</span>
            <span>98% Success Rate</span>
            <span className="hidden md:block text-neutral-300">•</span>
            <span>&lt;2 min Avg. Payout Time</span>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900">The Numbers Don&apos;t Lie</h2>
        </div>
        <div className="overflow-x-auto rounded-[2rem] border shadow-sm scrollbar-hide border-neutral-200">
          <table className="w-full text-sm text-left min-w-[700px] bg-white">
            <thead className="text-neutral-500 uppercase font-semibold text-xs bg-neutral-50">
              <tr>
                <th className="px-6 py-4"></th>
                <th className="px-6 py-4 font-bold text-blue-600 bg-blue-50/50">ArcLancer</th>
                <th className="px-6 py-4">Upwork</th>
                <th className="px-6 py-4">Fiverr</th>
                <th className="px-6 py-4">Traditional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              <tr className="hover:bg-neutral-50/50">
                <td className="px-6 py-4 font-medium text-neutral-900">Platform Fee</td>
                <td className="px-6 py-4 font-bold text-blue-600 bg-blue-50/30">2%</td>
                <td className="px-6 py-4 text-neutral-500">20%</td>
                <td className="px-6 py-4 text-neutral-500">20%</td>
                <td className="px-6 py-4 text-neutral-500">0%</td>
              </tr>
              <tr className="hover:bg-neutral-50/50">
                <td className="px-6 py-4 font-medium text-neutral-900">Payment Hold</td>
                <td className="px-6 py-4 font-bold text-blue-600 bg-blue-50/30">0 Days</td>
                <td className="px-6 py-4 text-neutral-500">14 Days</td>
                <td className="px-6 py-4 text-neutral-500">14 Days</td>
                <td className="px-6 py-4 text-neutral-500">Net 30-60</td>
              </tr>
              <tr className="hover:bg-neutral-50/50">
                <td className="px-6 py-4 font-medium text-neutral-900">Currency Conversion</td>
                <td className="px-6 py-4 font-bold text-blue-600 bg-blue-50/30">0.2%</td>
                <td className="px-6 py-4 text-neutral-500">5%</td>
                <td className="px-6 py-4 text-neutral-500">3%</td>
                <td className="px-6 py-4 text-neutral-500">4%</td>
              </tr>
              <tr className="hover:bg-neutral-50/50">
                <td className="px-6 py-4 font-medium text-neutral-900">Wire Fee</td>
                <td className="px-6 py-4 font-bold text-blue-600 bg-blue-50/30">$0.001</td>
                <td className="px-6 py-4 text-neutral-500">$30-50</td>
                <td className="px-6 py-4 text-neutral-500">$40</td>
                <td className="px-6 py-4 text-neutral-500">$45</td>
              </tr>
              <tr className="bg-neutral-900 text-white">
                <td className="px-6 py-4 font-medium">Example $5k Project <span className="text-xs font-normal text-neutral-400">Take Home Pay</span></td>
                <td className="px-6 py-4 font-bold text-lg text-blue-300 bg-neutral-800">$4,890</td>
                <td className="px-6 py-4 text-neutral-400">$3,760</td>
                <td className="px-6 py-4 text-neutral-400">$3,800</td>
                <td className="px-6 py-4 text-neutral-400">$4,660*</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Calculator Section */}
      <section id="calculator" className="py-24 px-6 rounded-[3rem] mx-4 md:mx-6 mb-12 bg-neutral-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-12">See How Much You&apos;ll Save</h2>

          <div className="rounded-3xl p-8 md:p-12 border shadow-2xl bg-neutral-800 border-neutral-700">
            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 text-left">
              <div>
                <label className="block text-xs font-medium mb-2 text-neutral-400">Annual Freelance Income</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 font-semibold text-white">$</span>
                  <input type="range" min="10000" max="200000" defaultValue="50000" className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-2 bg-neutral-600" />
                  <span className="absolute right-0 top-0 text-xl font-bold">50,000</span>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-500 mt-2">
                  <span>$10k</span>
                  <span>$200k</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-2 text-neutral-400">Current Platform</label>
                <div className="rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer transition-colors bg-neutral-700 hover:bg-neutral-600">
                  <span className="font-medium">Upwork</span>
                  <Icon icon="solar:alt-arrow-down-linear" />
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-left">
                <div className="text-xs font-medium uppercase mb-4 text-red-400">Current Cost</div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>Platform fees (20%)</span>
                    <span>-$10,000</span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>Conversion/Fees (5%)</span>
                    <span>-$2,500</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-red-500/20 pt-3 text-white">
                  <span>Total Loss</span>
                  <span>-$12,500</span>
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-green-500 text-[10px] font-bold px-2 py-1 rounded-bl-lg text-black">WINNER</div>
                <div className="text-xs font-medium uppercase mb-4 text-green-400">With ArcLancer</div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs text-neutral-300">
                    <span>Platform fees (2%)</span>
                    <span>-$1,000</span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-300">
                    <span>Hidden Fees</span>
                    <span>$0</span>
                  </div>
                </div>
                <div className="flex justify-between text-xl font-bold border-t border-green-500/20 pt-3 text-white">
                  <span>You Save</span>
                  <span className="text-green-400">$11,500/yr</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-neutral-700">
              <Link href="/create" className="px-8 py-3 rounded-full font-bold transition-colors w-full md:w-auto bg-white text-neutral-900 hover:bg-blue-50 inline-block">Start Saving Money →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Regional Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 text-neutral-900">Built For Freelancers Everywhere</h2>
        </div>
        {/* Optimized Grid for Tablet: 2 cols on md, 3 on lg */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Brazil */}
          <div className="border p-8 rounded-[2rem] transition-colors shadow-sm bg-white border-neutral-100 hover:border-blue-200">
            <div className="text-4xl mb-6">🇧🇷</div>
            <h3 className="text-xl font-bold mb-4 text-neutral-900">For Brazilian Freelancers</h3>
            <ul className="space-y-3 mb-8">
              <li className="flex gap-2 text-sm text-neutral-500"><Icon icon="solar:check-circle-linear" className="text-green-500 mt-0.5" /> Receive in BRLA (Stablecoin)</li>
              <li className="flex gap-2 text-sm text-neutral-500"><Icon icon="solar:check-circle-linear" className="text-green-500 mt-0.5" /> Cash out via PIX in 10 mins</li>
              <li className="flex gap-2 text-sm text-neutral-500"><Icon icon="solar:check-circle-linear" className="text-green-500 mt-0.5" /> Save R$23,000/year avg</li>
            </ul>
            <Link href="/create" className="font-semibold text-sm hover:underline text-blue-600">Criar Meu Primeiro Contrato →</Link>
          </div>

          {/* Mexico */}
          <div className="border p-8 rounded-[2rem] transition-colors shadow-sm bg-white border-neutral-100 hover:border-green-200">
            <div className="text-4xl mb-6">🇲🇽</div>
            <h3 className="text-xl font-bold mb-4 text-neutral-900">For Mexican Freelancers</h3>
            <ul className="space-y-3 mb-8">
              <li className="flex gap-2 text-sm text-neutral-500"><Icon icon="solar:check-circle-linear" className="text-green-500 mt-0.5" /> Receive in MXNB (Stablecoin)</li>
              <li className="flex gap-2 text-sm text-neutral-500"><Icon icon="solar:check-circle-linear" className="text-green-500 mt-0.5" /> Cash out via SPEI transfer</li>
              <li className="flex gap-2 text-sm text-neutral-500"><Icon icon="solar:check-circle-linear" className="text-green-500 mt-0.5" /> Save MXN$197k/year avg</li>
            </ul>
            <Link href="/create" className="font-semibold text-sm hover:underline text-green-600">Crear Mi Primer Contrato →</Link>
          </div>

          {/* Philippines */}
          <div className="border p-8 rounded-[2rem] transition-colors shadow-sm md:col-span-2 lg:col-span-1 bg-white border-neutral-100 hover:border-yellow-200">
            <div className="text-4xl mb-6">🇵🇭</div>
            <h3 className="text-xl font-bold mb-4 text-neutral-900">For Filipino Freelancers</h3>
            <ul className="space-y-3 mb-8">
              <li className="flex gap-2 text-sm text-neutral-500"><Icon icon="solar:check-circle-linear" className="text-green-500 mt-0.5" /> Receive in PHPC (Stablecoin)</li>
              <li className="flex gap-2 text-sm text-neutral-500"><Icon icon="solar:check-circle-linear" className="text-green-500 mt-0.5" /> Cash out via InstaPay</li>
              <li className="flex gap-2 text-sm text-neutral-500"><Icon icon="solar:check-circle-linear" className="text-green-500 mt-0.5" /> Save ₱493k/year avg</li>
            </ul>
            <Link href="/create" className="font-semibold text-sm hover:underline text-yellow-600">Gumawa ng Unang Kontrata →</Link>
          </div>
        </div>
      </section>

      {/* FAQ Section (Objection Handling) */}
      <section className="py-24 px-6 bg-neutral-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 border rounded-full px-3 py-1.5 mb-6 bg-white border-neutral-200">
              <Icon icon="solar:question-circle-linear" width="16" className="text-neutral-500" />
              <span className="text-xs font-medium text-neutral-600">No Crypto Knowledge Needed</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-neutral-900">
              &quot;But I Don&apos;t Know Crypto...&quot; <span className="text-neutral-400">Good. You Don&apos;t Need To.</span>
            </h2>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl px-8 py-6 shadow-sm border bg-white border-neutral-100">
              <details className="group" open>
                <summary className="flex justify-between items-center cursor-pointer list-none">
                  <span className="font-bold text-neutral-900">Do I need to understand blockchain?</span>
                  <span className="transition group-open:rotate-180">
                    <Icon icon="solar:alt-arrow-down-linear" width="20" />
                  </span>
                </summary>
                <p className="text-neutral-500 text-sm mt-4 leading-relaxed">
                  Nope. You need to understand: Client pays → You deliver → You get money. That&apos;s it. Everything else runs in the background.
                </p>
              </details>
            </div>

            <div className="rounded-2xl px-8 py-6 shadow-sm border bg-white border-neutral-100">
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none">
                  <span className="font-bold text-neutral-900">How do I get my money into my bank account?</span>
                  <span className="transition group-open:rotate-180">
                    <Icon icon="solar:alt-arrow-down-linear" width="20" />
                  </span>
                </summary>
                <p className="text-neutral-500 text-sm mt-4 leading-relaxed">
                  We partner with local exchanges in your country. One click transfers your stablecoin to your bank. Takes 10 to 30 minutes depending on your bank. Supported: Brazil, Mexico, Philippines, Canada, Australia, Japan, Korea + more.
                </p>
              </details>
            </div>

            <div className="rounded-2xl px-8 py-6 shadow-sm border bg-white border-neutral-100">
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none">
                  <span className="font-bold text-neutral-900">What if there&apos;s a dispute?</span>
                  <span className="transition group-open:rotate-180">
                    <Icon icon="solar:alt-arrow-down-linear" width="20" />
                  </span>
                </summary>
                <p className="text-neutral-500 text-sm mt-4 leading-relaxed">
                  Built-in arbitration. Both parties agree on an arbitrator, or we provide one. They review the work and decide. Escrow releases to the winner. Fair and fast.
                </p>
              </details>
            </div>

            <div className="rounded-2xl px-8 py-6 shadow-sm border bg-white border-neutral-100">
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none">
                  <span className="font-bold text-neutral-900">Is my money safe?</span>
                  <span className="transition group-open:rotate-180">
                    <Icon icon="solar:alt-arrow-down-linear" width="20" />
                  </span>
                </summary>
                <p className="text-neutral-500 text-sm mt-4 leading-relaxed">
                  Safer than Upwork. Your money sits in a smart contract that cannot be changed. Upwork holds funds in a corporate account. We hold nothing. The blockchain holds everything. That&apos;s why we&apos;ve had $0 in stuck or lost payments. Ever.
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-neutral-900">
            Your Next Project. <span className="text-blue-600">30% More Money</span> in Your Pocket.
          </h2>
          <p className="text-lg text-neutral-500 mb-10">
            Free to create contracts. Free to get started. You only pay when you get paid. 2%, not 20%.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            <Link href="/create" className="px-8 py-4 rounded-full font-bold transition-all shadow-xl bg-neutral-900 text-white hover:bg-neutral-800 shadow-neutral-200">
              Create Your First Contract, Free
            </Link>
            <button className="border px-8 py-4 rounded-full font-bold transition-colors bg-white border-neutral-200 text-neutral-900 hover:bg-neutral-50">
              Schedule a Demo
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-xs font-medium text-neutral-400">
            <span className="flex items-center gap-1"><Icon icon="solar:check-circle-linear" /> No credit card required</span>
            <span className="flex items-center gap-1"><Icon icon="solar:check-circle-linear" /> Set up in under 5 minutes</span>
            <span className="flex items-center gap-1"><Icon icon="solar:check-circle-linear" /> First contract 0% fee (limited time)</span>
          </div>
        </div>
      </section>
    </div>
  );
}
