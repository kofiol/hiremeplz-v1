"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
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

import { siteConfig } from "@/config/site";

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }
    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  return prefersReducedMotion;
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
};

function Reveal({ children, className, delayMs = 0 }: RevealProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const [hasIntersected, setHasIntersected] = useState(false);
  const isVisible = prefersReducedMotion || hasIntersected;

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setHasIntersected(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={cn(
        prefersReducedMotion
          ? ""
          : "transform-gpu will-change-[opacity,transform] transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <section className="relative overflow-hidden min-h-[86svh] flex items-center pt-28 pb-10 sm:min-h-[88svh] sm:pt-32 sm:pb-14">
        <div className="absolute inset-0 -z-10 bg-primary/5 skew-y-3 transform origin-top-left scale-110" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-muted/40 via-background to-background" />

        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <Reveal className="space-y-8">
              <div>
                <Badge variant="outline" className="mb-5 gap-2 px-3 py-1.5 border-border/60 inline-flex flex-wrap">
                  <span className="text-muted-foreground">Now accepting early access</span>
                  <Link href={siteConfig.getStartedUrl} className="flex items-center gap-1 text-foreground">
                    Join waitlist
                    <ArrowRight className="size-3" />
                  </Link>
                </Badge>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter mb-5 text-balance">
                  Meet your personal <span className="animated-gradient">AI agent</span> for finding freelance work
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-xl">
                  HireMePlz monitors the market, filters the noise, and delivers high-fit opportunities while you focus on
                  delivery.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg tracking-tighter">Global Monitoring</h3>
                    <p className="text-muted-foreground">Monitors key project sources across the web.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg tracking-tighter">Smart Filtering</h3>
                    <p className="text-muted-foreground">Matches your profile and filters out junk instantly.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg tracking-tighter">Continuous Stream</h3>
                    <p className="text-muted-foreground">Keeps a steady pipeline flowing while you sleep.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  size="lg"
                  className="text-base sm:text-lg px-7 sm:px-8 py-6 rounded-full transition-all shadow-sm hover:shadow-md"
                  asChild
                >
                  <Link href="https://forms.gle/RYhbUrwwxhWn1dwS9">
                    Get early access <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="text-base sm:text-lg px-7 sm:px-8 py-6 rounded-full" asChild>
                  <Link href="#features">See what it does</Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delayMs={120} className="relative max-h-[460px] overflow-hidden">
              <Card className="border-2 border-primary/10 shadow-2xl bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 tracking-tighter">
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
                      <div className="h-full bg-white w-[85%] animate-pulse"></div>
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
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-background" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4 md:px-6 mx-auto">
          <Reveal className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">The real problem with freelancing today</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              If you’re a freelancer, you know this all too well. You know how to do your job — but spend hours{" "}
              <span className="font-semibold text-foreground">not actually doing it</span>.
            </p>
          </Reveal>

          <Reveal delayMs={120} className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="bg-card border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                  <Users className="h-6 w-6" />
                </div>
                <CardTitle className="tracking-tighter">Overcrowded Market</CardTitle>
                <CardDescription>
                  The freelance market is saturated. Standing out is harder than ever.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-card border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mb-4 text-orange-600 dark:text-orange-400">
                  <Clock className="h-6 w-6" />
                </div>
                <CardTitle className="tracking-tighter">Wasted Time</CardTitle>
                <CardDescription>
                  Upwork, LinkedIn, job boards... Hours spent searching instead of earning.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-card border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mb-4 text-yellow-600 dark:text-yellow-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <CardTitle className="tracking-tighter">Unstable Income</CardTitle>
                <CardDescription>
                  The constant question hangs over you: &quot;What&apos;s next?&quot; No predictability.
                </CardDescription>
              </CardHeader>
            </Card>
          </Reveal>
          
          <Reveal delayMs={220} className="mt-12 text-center max-w-3xl mx-auto">
             <p className="text-lg text-muted-foreground   border-primary/30 pl-6 py-2  ">
              The hardest part isn&rsquo;t finding projects — it&rsquo;s building a systematic, <span className="text-green-500">predictable</span> workflow.
            </p> 
          </Reveal>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 bg-dark/30">
        <div className="container px-4 md:px-6 mx-auto">
          <Reveal className="text-center mb-16 space-y-4">
            <Badge variant="outline" className="border-border/60">The Outcome</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter">A pipeline that feels predictable</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Stop refreshing boards. Get a stream of opportunities that match your profile and are worth responding to.
            </p>
          </Reveal>

          <Reveal delayMs={120} className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="bg-background border-border/60 shadow-sm">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center mb-4 text-violet-600 dark:text-violet-400">
                  <Clock className="h-6 w-6" />
                </div>
                <CardTitle className="tracking-tighter">Time Back</CardTitle>
                <CardDescription>
                  Hours of searching become minutes of decision-making.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-background border-border/60 shadow-sm">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <CardTitle className="tracking-tighter">Higher Quality Leads</CardTitle>
                <CardDescription>
                  Less spam, fewer mismatches, more opportunities you can win.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-background border-border/60 shadow-sm">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <CardTitle className="tracking-tighter">More Consistent Work</CardTitle>
                <CardDescription>
                  Build a steady system instead of relying on luck.
                </CardDescription>
              </CardHeader>
            </Card>
          </Reveal>

          <Reveal delayMs={220} className="mt-12 text-center">
            <Button size="lg" className="rounded-full" asChild>
              <Link href="#how-it-works">See how it works</Link>
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">Onboarding takes ~15 minutes.</p>
          </Reveal>
        </div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="py-24 bg-muted/30 scroll-mt-28">
        <div className="container px-4 md:px-6 mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">How it works</h2>
            <p className="text-xl text-muted-foreground">Onboarding takes just 15 minutes. Then the AI takes over.</p>
          </Reveal>

          <Reveal delayMs={120} className="grid md:grid-cols-4 gap-8">
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
                <h3 className="font-bold text-lg tracking-tighter mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.desc}</p>
                {i < 3 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-[2px] bg-border -z-10 transform translate-x-1/2"></div>
                )}
              </div>
            ))}
          </Reveal>

          <Reveal delayMs={220} className="mt-16 bg-background rounded-2xl p-6 sm:p-8 border shadow-sm max-w-4xl mx-auto">
            <h3 className="text-xl font-bold tracking-tighter mb-6 text-center">What the AI analyzes for you:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
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
          </Reveal>
        </div>
      </section>

      <section id="features" className="py-24 scroll-mt-28">
        <div className="container px-4 md:px-6 mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">Features built for serious freelancers</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A real pipeline system, not another place to scroll.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Globe,
                title: "Multi-source monitoring",
                desc: "Tracks opportunities across marketplaces, networks, and boards.",
                iconClassName: "text-cyan-600 dark:text-cyan-400",
                iconBgClassName: "bg-cyan-500/10",
              },
              {
                icon: ShieldCheck,
                title: "Quality filtering",
                desc: "Keeps scams, low-budget work, and mismatches out of your feed.",
                iconClassName: "text-emerald-600 dark:text-emerald-400",
                iconBgClassName: "bg-emerald-500/10",
              },
              {
                icon: Zap,
                title: "Fast alerts",
                desc: "Gets you the best leads early, when response rates are highest.",
                iconClassName: "text-fuchsia-600 dark:text-fuchsia-400",
                iconBgClassName: "bg-fuchsia-500/10",
              },
              {
                icon: TrendingUp,
                title: "Smarter prioritization",
                desc: "Ranks leads by fit and likelihood to convert, not by hype.",
                iconClassName: "text-amber-600 dark:text-amber-400",
                iconBgClassName: "bg-amber-500/10",
              },
              {
                icon: Briefcase,
                title: "Built for your workflow",
                desc: "Designed to support a consistent, predictable client pipeline.",
                iconClassName: "text-blue-600 dark:text-blue-400",
                iconBgClassName: "bg-blue-500/10",
              },
              {
                icon: Clock,
                title: "Time back every week",
                desc: "Turns hours of searching into minutes of decision-making.",
                iconClassName: "text-violet-600 dark:text-violet-400",
                iconBgClassName: "bg-violet-500/10",
              },
            ].map((feature, i) => (
              <Reveal key={feature.title} delayMs={80 + i * 60}>
                <Card className="h-full bg-card border-border/60">
                  <CardHeader>
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", feature.iconBgClassName)}>
                      <feature.icon className={cn("h-6 w-6", feature.iconClassName)} />
                    </div>
                    <CardTitle className="text-lg tracking-tighter">{feature.title}</CardTitle>
                    <CardDescription className="text-sm">{feature.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24">
        <div className="container px-4 md:px-6 mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">Current job search vs HireMePlz</h2>
            <p className="text-xl text-muted-foreground">Stop being your own free recruiter.</p>
          </Reveal>

          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Cost Comparison */}
            <Reveal delayMs={120}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="tracking-tighter">Financial Cost</CardTitle>
                <CardDescription>Monthly expenses for a serious freelancer</CardDescription>
              </CardHeader>
              <CardContent>
                <Table className="table-fixed text-xs sm:text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[44%] whitespace-normal">Category</TableHead>
                      <TableHead className="w-[28%] whitespace-normal">Yourself</TableHead>
                      <TableHead className="w-[28%] whitespace-normal text-primary font-bold">HireMePlz</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium whitespace-normal">Upwork Connects</TableCell>
                      <TableCell className="whitespace-normal">$30–50</TableCell>
                      <TableCell className="whitespace-normal text-primary font-bold">$0</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium whitespace-normal">LinkedIn Premium</TableCell>
                      <TableCell className="whitespace-normal">$39–59</TableCell>
                      <TableCell className="whitespace-normal text-primary font-bold">$0</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium whitespace-normal">Job boards</TableCell>
                      <TableCell className="whitespace-normal">$20–50</TableCell>
                      <TableCell className="whitespace-normal text-primary font-bold">$0</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium whitespace-normal">Tools (CRM, AI)</TableCell>
                      <TableCell className="whitespace-normal">$60–150</TableCell>
                      <TableCell className="whitespace-normal text-primary font-bold">$0</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell className="whitespace-normal">Total / mo</TableCell>
                      <TableCell className="whitespace-normal text-destructive">$150–300</TableCell>
                      <TableCell className="whitespace-normal text-primary">~$49–99</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            </Reveal>

            {/* Time Comparison */}
            <Reveal delayMs={180}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="tracking-tighter">Time = Money</CardTitle>
                <CardDescription>The hidden cost of your time</CardDescription>
              </CardHeader>
              <CardContent>
                <Table className="table-fixed text-xs sm:text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[44%] whitespace-normal">Task</TableHead>
                      <TableHead className="w-[28%] whitespace-normal">Now</TableHead>
                      <TableHead className="w-[28%] whitespace-normal text-primary font-bold">HireMePlz</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium whitespace-normal">Search time / day</TableCell>
                      <TableCell className="whitespace-normal">1–3 hrs</TableCell>
                      <TableCell className="whitespace-normal text-primary font-bold">0–15 min</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium whitespace-normal">Search time / month</TableCell>
                      <TableCell className="whitespace-normal">30–90 hrs</TableCell>
                      <TableCell className="whitespace-normal text-primary font-bold">2–5 hrs</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium whitespace-normal">Your Role</TableCell>
                      <TableCell className="whitespace-normal">Freelancer + Recruiter + Sales</TableCell>
                      <TableCell className="whitespace-normal text-primary font-bold">Just Freelancer</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell className="whitespace-normal">Hidden Cost</TableCell>
                      <TableCell className="whitespace-normal text-destructive">$900–5,400</TableCell>
                      <TableCell className="whitespace-normal text-primary">~$0</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-gradient-to-b from-background to-muted/30">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
             <div className="order-2 lg:order-1">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-card p-6 rounded-2xl shadow-sm border space-y-2">
                    <Smile className="h-8 w-8 text-yellow-500" />
                    <h3 className="font-bold tracking-tighter">Peace of Mind</h3>
                    <p className="text-sm text-muted-foreground">Anxiety about &quot;what&apos;s next&quot; disappears.</p>
                  </div>
                  <div className="bg-card p-6 rounded-2xl shadow-sm border space-y-2 sm:translate-y-8">
                    <Briefcase className="h-8 w-8 text-blue-500" />
                    <h3 className="font-bold tracking-tighter">Reliable Income</h3>
                    <p className="text-sm text-muted-foreground">A continuous stream of opportunities.</p>
                  </div>
                  <div className="bg-card p-6 rounded-2xl shadow-sm border space-y-2">
                    <Clock className="h-8 w-8 text-green-500" />
                    <h3 className="font-bold tracking-tighter">More Time</h3>
                    <p className="text-sm text-muted-foreground">Dozens of hours freed per week.</p>
                  </div>
                  <div className="bg-card p-6 rounded-2xl shadow-sm border space-y-2 sm:translate-y-8">
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                    <h3 className="font-bold tracking-tighter">Growth</h3>
                    <p className="text-sm text-muted-foreground">Focus on professional growth and hobbies.</p>
                  </div>
                </div>
             </div>
             
             <div className="order-1 lg:order-2 space-y-6">
               <h2 className="text-3xl md:text-5xl font-bold tracking-tighter">What changes in your life?</h2>
               <p className="text-xl text-muted-foreground">
                 This isn’t about &quot;more money at any cost.&quot; It’s about a <span className="text-foreground font-semibold">normal, sustainable life</span>.
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
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tighter mb-12">Who is this for?</h2>
          </Reveal>
          <Reveal delayMs={120} className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="p-6 rounded-xl bg-secondary/30 border border-border/50">
              <div className="font-bold text-lg tracking-tighter mb-2">Solo Freelancers</div>
              <p className="text-sm text-muted-foreground">Looking for stability and time freedom.</p>
            </div>
            <div className="p-6 rounded-xl bg-secondary/30 border border-border/50">
              <div className="font-bold text-lg tracking-tighter mb-2">Small Teams (2-10)</div>
              <p className="text-sm text-muted-foreground">Need a consistent project pipeline.</p>
            </div>
            <div className="p-6 rounded-xl bg-secondary/30 border border-border/50">
              <div className="font-bold text-lg tracking-tighter mb-2">Team Leaders</div>
              <p className="text-sm text-muted-foreground">Who need to keep their team busy.</p>
            </div>
          </Reveal>
          <Reveal delayMs={200}>
            <p className="mt-8 text-muted-foreground">
              It’s like having an <strong>HR department for yourself</strong>. Not for a company — for <strong>your life</strong>.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Early Access / CTA */}
      <section id="waitlist" className="py-24 relative overflow-hidden scroll-mt-28">
        <div className="absolute inset-0 bg-primary/5 -z-10"></div>
        <div className="container px-4 md:px-6 mx-auto text-center space-y-8 max-w-3xl">
          <Reveal>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">Early Access</h2>
          </Reveal>
          <Reveal delayMs={120}>
            <p className="text-xl md:text-2xl text-muted-foreground">
              We’re opening a waitlist for early users. Get priority access, influence the product, and special pricing.
            </p>
          </Reveal>
          
          <Reveal delayMs={200} className="bg-background p-6 sm:p-8 rounded-[1rem] shadow-xl border max-w-md mx-auto">
             <div className="space-y-4">

               <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                 <div className="space-y-2 text-left">
                  
                 </div>
<Button asChild className="w-full text-lg py-6 rounded-[1rem]" size="lg">
  <a
    href="https://forms.gle/RYhbUrwwxhWn1dwS9"
    target="_blank"
    rel="noopener noreferrer"
  >
    Join the waitlist <ArrowRight className="ml-2 h-4 w-4" />
  </a>
</Button>

               </form>
               <p className="text-xs text-muted-foreground">
                 Limited spots available. 
               </p>
             </div>
          </Reveal>
          
          <div className="pt-8">

          </div>
        </div>
      </section>
      

    </div>
  );
}
