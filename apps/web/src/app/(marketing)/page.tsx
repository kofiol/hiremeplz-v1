'use client';
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  ShieldCheck,
  Zap,
  TrendingUp,
  Globe,
  Smile,
  Users,
  ArrowRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32 md:pt-32 md:pb-48">
        {/* Aurora Background */}
        <div className="absolute inset-0 -z-10 h-full w-full bg-background overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-full blur-[100px] opacity-30 pointer-events-none" />
        </div>

        <div className="container px-4 md:px-6 mx-auto flex flex-col items-center text-center space-y-8">
          <Badge variant="secondary" className="px-4 py-2 text-sm rounded-full bg-secondary/50 backdrop-blur-sm border border-border/50">
            Now accepting early access
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70 max-w-4xl">
            Your personal AI agent for finding <span className="text-primary">freelance projects</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            We find projects for you — 24/7.
            <br className="hidden md:inline" /> You work. You live. You plan your life.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Button size="lg" className="text-lg px-8 py-6 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all" asChild>
              <Link href="#waitlist">
                Join the waitlist <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 rounded-full backdrop-blur-sm" asChild>
              <Link href="#how-it-works">
                How it works
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">The real problem with freelancing today</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              If you’re a freelancer, you know this all too well. You know how to do your job — but spend hours <span className="font-semibold text-foreground">not actually doing it</span>.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                  <Users className="h-6 w-6" />
                </div>
                <CardTitle>Overcrowded Market</CardTitle>
                <CardDescription>
                  The freelance market is saturated. Standing out is harder than ever.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mb-4 text-orange-600 dark:text-orange-400">
                  <Clock className="h-6 w-6" />
                </div>
                <CardTitle>Wasted Time</CardTitle>
                <CardDescription>
                  Upwork, LinkedIn, job boards... Hours spent searching instead of earning.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mb-4 text-yellow-600 dark:text-yellow-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <CardTitle>Unstable Income</CardTitle>
                <CardDescription>
                  The constant question hangs over you: &quot;What&apos;s next?&quot; No predictability.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          
          <div className="mt-12 text-center max-w-3xl mx-auto">
             <p className="text-lg text-muted-foreground italic border-l-4 border-primary/30 pl-6 py-2 bg-muted/50 rounded-r-lg">
              &quot;The hardest part isn&rsquo;t finding projects — it&rsquo;s building a systematic, predictable workflow.&quot;
            </p>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 -z-10 skew-y-3 transform origin-top-left scale-110"></div>
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <Badge className="mb-4">Our Solution</Badge>
                <h2 className="text-3xl md:text-5xl font-bold mb-4">HireMePlz</h2>
                <p className="text-xl text-muted-foreground">
                  A <strong>personal AI agent</strong> that handles all the tedious work of finding freelance projects for you.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Global Monitoring</h3>
                    <p className="text-muted-foreground">Monitors all key project sources worldwide.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Smart Filtering</h3>
                    <p className="text-muted-foreground">Filters opportunities to match your profile and removes junk.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Continuous Stream</h3>
                    <p className="text-muted-foreground">Provides a reliable stream of projects. A system that works while you sleep.</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-4">This isn't another marketplace or template generator.</p>
                <Button size="lg" className="rounded-full">
                  Learn more about the AI
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl rounded-full -z-10 transform rotate-6"></div>
              <Card className="border-2 border-primary/10 shadow-2xl bg-card/80 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    AI Agent Status: Active
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sources scanned</span>
                      <span className="font-mono font-medium">142</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[85%] animate-pulse"></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-md bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div className="text-sm">
                        <p className="font-medium">Found: React/Next.js Senior Dev</p>
                        <p className="text-xs text-muted-foreground">$60-80/hr • Remote • Posted 10m ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-md bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div className="text-sm">
                        <p className="font-medium">Found: Frontend Tech Lead</p>
                        <p className="text-xs text-muted-foreground">$5k-8k/mo • Contract • Posted 25m ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-md opacity-50">
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                      <div className="text-sm">
                        <p className="font-medium text-muted-foreground line-through">Filtered: WordPress Maintenance</p>
                        <p className="text-xs text-muted-foreground">Budget too low • Mismatch</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="py-24 bg-muted/30">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-xl text-muted-foreground">Onboarding takes just 15 minutes. Then the AI takes over.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { title: "1. Upload CV", desc: "Share your professional background." },
              { title: "2. Add Portfolio", desc: "Showcase your best work and profiles." },
              { title: "3. Set Preferences", desc: "Specify rates, experience, and project types." },
              { title: "4. Profit", desc: "Choose from the best opportunities delivered to you." },
            ].map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center p-6 bg-background rounded-xl border shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-4">
                  {i + 1}
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.desc}</p>
                {i < 3 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-[2px] bg-border -z-10 transform translate-x-1/2"></div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-16 bg-background rounded-2xl p-8 border shadow-sm max-w-4xl mx-auto">
            <h3 className="text-xl font-bold mb-6 text-center">What the AI analyzes for you:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="font-semibold text-primary">Budget</div>
                <div className="text-xs text-muted-foreground mt-1">Is it worth it?</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="font-semibold text-primary">Reliability</div>
                <div className="text-xs text-muted-foreground mt-1">Client history</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="font-semibold text-primary">Repeatability</div>
                <div className="text-xs text-muted-foreground mt-1">Long-term potential</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="font-semibold text-primary">Response</div>
                <div className="text-xs text-muted-foreground mt-1">Likelihood to reply</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Current job search vs HireMePlz</h2>
            <p className="text-xl text-muted-foreground">Stop being your own free recruiter.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Cost Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Cost</CardTitle>
                <CardDescription>Monthly expenses for a serious freelancer</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Yourself</TableHead>
                      <TableHead className="text-primary font-bold">HireMePlz</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Upwork Connects</TableCell>
                      <TableCell>$30–50</TableCell>
                      <TableCell className="text-primary font-bold">$0</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">LinkedIn Premium</TableCell>
                      <TableCell>$39–59</TableCell>
                      <TableCell className="text-primary font-bold">$0</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Job boards</TableCell>
                      <TableCell>$20–50</TableCell>
                      <TableCell className="text-primary font-bold">$0</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Tools (CRM, AI)</TableCell>
                      <TableCell>$60–150</TableCell>
                      <TableCell className="text-primary font-bold">$0</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>Total / mo</TableCell>
                      <TableCell className="text-destructive">$150–300</TableCell>
                      <TableCell className="text-primary">~$49–99</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Time Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Time = Money</CardTitle>
                <CardDescription>The hidden cost of your time</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Now</TableHead>
                      <TableHead className="text-primary font-bold">HireMePlz</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Search time / day</TableCell>
                      <TableCell>1–3 hrs</TableCell>
                      <TableCell className="text-primary font-bold">0–15 min</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Search time / month</TableCell>
                      <TableCell>30–90 hrs</TableCell>
                      <TableCell className="text-primary font-bold">2–5 hrs</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Your Role</TableCell>
                      <TableCell className="text-xs">Freelancer + Recruiter + Sales</TableCell>
                      <TableCell className="text-primary font-bold">Just Freelancer</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>Hidden Cost</TableCell>
                      <TableCell className="text-destructive">$900–5,400</TableCell>
                      <TableCell className="text-primary">~$0</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-gradient-to-b from-background to-muted/30">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
             <div className="order-2 lg:order-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card p-6 rounded-2xl shadow-sm border space-y-2">
                    <Smile className="h-8 w-8 text-yellow-500" />
                    <h3 className="font-bold">Peace of Mind</h3>
                    <p className="text-sm text-muted-foreground">Anxiety about "what's next" disappears.</p>
                  </div>
                  <div className="bg-card p-6 rounded-2xl shadow-sm border space-y-2 translate-y-8">
                    <Briefcase className="h-8 w-8 text-blue-500" />
                    <h3 className="font-bold">Reliable Income</h3>
                    <p className="text-sm text-muted-foreground">A continuous stream of opportunities.</p>
                  </div>
                  <div className="bg-card p-6 rounded-2xl shadow-sm border space-y-2">
                    <Clock className="h-8 w-8 text-green-500" />
                    <h3 className="font-bold">More Time</h3>
                    <p className="text-sm text-muted-foreground">Dozens of hours freed per week.</p>
                  </div>
                  <div className="bg-card p-6 rounded-2xl shadow-sm border space-y-2 translate-y-8">
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                    <h3 className="font-bold">Growth</h3>
                    <p className="text-sm text-muted-foreground">Focus on professional growth and hobbies.</p>
                  </div>
                </div>
             </div>
             
             <div className="order-1 lg:order-2 space-y-6">
               <h2 className="text-3xl md:text-5xl font-bold">What changes in your life?</h2>
               <p className="text-xl text-muted-foreground">
                 This isn’t about "more money at any cost." It’s about a <span className="text-foreground font-semibold">normal, sustainable life</span>.
               </p>
               <ul className="space-y-4">
                 {[
                   "Travel without worrying about the next gig",
                   "Spend more time with family",
                   "Focus on your health",
                   "Stop living project to project"
                 ].map((item, i) => (
                   <li key={i} className="flex items-center gap-3">
                     <CheckCircle2 className="h-5 w-5 text-primary" />
                     <span>{item}</span>
                   </li>
                 ))}
               </ul>
             </div>
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-20 border-t">
        <div className="container px-4 md:px-6 mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">Who is this for?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="p-6 rounded-xl bg-secondary/30 border border-border/50">
              <div className="font-bold text-lg mb-2">Solo Freelancers</div>
              <p className="text-sm text-muted-foreground">Looking for stability and time freedom.</p>
            </div>
            <div className="p-6 rounded-xl bg-secondary/30 border border-border/50">
              <div className="font-bold text-lg mb-2">Small Teams (2-10)</div>
              <p className="text-sm text-muted-foreground">Need a consistent project pipeline.</p>
            </div>
            <div className="p-6 rounded-xl bg-secondary/30 border border-border/50">
              <div className="font-bold text-lg mb-2">Team Leaders</div>
              <p className="text-sm text-muted-foreground">Who need to keep their team busy.</p>
            </div>
          </div>
          <p className="mt-8 text-muted-foreground">
            It’s like having an <strong>HR department for yourself</strong>. Not for a company — for <strong>your life</strong>.
          </p>
        </div>
      </section>

      {/* Early Access / CTA */}
      <section id="waitlist" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 -z-10"></div>
        <div className="container px-4 md:px-6 mx-auto text-center space-y-8 max-w-3xl">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Early Access
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground">
            We’re opening a waitlist for early users. Get priority access, influence the product, and special pricing.
          </p>
          
          <div className="bg-background p-8 rounded-2xl shadow-xl border max-w-md mx-auto">
             <div className="space-y-4">
               <h3 className="font-semibold text-lg">Join the waitlist</h3>
               <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                 <div className="space-y-2 text-left">
                   <label htmlFor="email" className="text-sm font-medium">Email address</label>
                   <div className="flex gap-2">
                     <input 
                        type="email" 
                        id="email" 
                        placeholder="you@example.com" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                     />
                   </div>
                 </div>
                 <Button type="submit" className="w-full text-lg py-6" size="lg">
                   Join Waitlist <ArrowRight className="ml-2 h-4 w-4" />
                 </Button>
               </form>
               <p className="text-xs text-muted-foreground">
                 Limited spots available. No spam, we promise.
               </p>
             </div>
          </div>
          
          <div className="pt-8">
            <p className="font-bold text-2xl tracking-widest text-primary/80">LET&apos;S GO!!!</p>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 border-t bg-muted/20">
        <div className="container px-4 md:px-6 mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-xl">
            HireMePlz
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} HireMePlz. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground">Privacy</Link>
            <Link href="#" className="hover:text-foreground">Terms</Link>
            <Link href="#" className="hover:text-foreground">Twitter</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
