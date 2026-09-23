import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Upload, History, Trophy, Brain, Home } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Home",
    url: createPageUrl("HomeDashboard"),
    icon: Home,
  },
  {
    title: "New Notes",
    url: createPageUrl("Upload"),
    icon: Upload,
  },
  {
    title: "Your Library",
    url: createPageUrl("Dashboard"),
    icon: History,
  },
  {
    title: "Brain Dump",
    url: createPageUrl("BrainDump"),
    icon: Brain,
  },
  {
    title: "Exam Prep",
    url: createPageUrl("ExamPrepSetup"),
    icon: Trophy,
  },
  {
    title: "Prep History",
    url: createPageUrl("exam-prep-history"),
    icon: BookOpen,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  // Redirect to HomeDashboard if on root or index
  React.useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/index' || location.pathname === '') {
      window.location.href = createPageUrl('HomeDashboard');
    }
  }, [location.pathname]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full font-sans bg-slate-50/30">
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            :root {
              --background: hsl(0, 0%, 98%);
              --foreground: hsl(220, 10%, 15%);
              --card: hsl(0, 0%, 100%);
              --card-foreground: hsl(220, 10%, 15%);
              --popover: hsl(0, 0%, 100%);
              --popover-foreground: hsl(220, 10%, 15%);
              --primary: hsl(210, 60%, 55%);
              --primary-foreground: hsl(0, 0%, 98%);
              --secondary: hsl(210, 15%, 95%);
              --secondary-foreground: hsl(220, 10%, 25%);
              --muted: hsl(210, 15%, 95%);
              --muted-foreground: hsl(210, 3%, 50%);
              --accent: hsl(210, 60%, 95%);
              --accent-foreground: hsl(220, 10%, 25%);
              --destructive: hsl(0, 60%, 60%);
              --destructive-foreground: hsl(0, 0%, 98%);
              --border: hsl(210, 8%, 90%);
              --input: hsl(210, 8%, 90%);
              --ring: hsl(210, 60%, 55%);
              --radius: 1rem;

              /* Soft, muted color system */
              --soft-blue: hsl(210, 60%, 55%);
              --soft-blue-light: hsl(210, 60%, 95%);
              --soft-blue-dark: hsl(210, 60%, 35%);
              
              --soft-purple: hsl(255, 50%, 65%);
              --soft-purple-light: hsl(255, 50%, 95%);
              --soft-purple-dark: hsl(255, 50%, 45%);
              
              --soft-green: hsl(140, 40%, 60%);
              --soft-green-light: hsl(140, 40%, 95%);
              --soft-green-dark: hsl(140, 40%, 40%);

              --soft-pink: hsl(340, 50%, 70%);
              --soft-pink-light: hsl(340, 50%, 95%);
              --soft-pink-dark: hsl(340, 50%, 50%);

              --soft-yellow: hsl(45, 70%, 75%);
              --soft-yellow-light: hsl(45, 70%, 95%);
              --soft-yellow-dark: hsl(45, 70%, 55%);

              /* Text colors */
              --text-main: hsl(220, 10%, 15%);
              --text-muted: hsl(210, 3%, 50%);
              
              /* Shadows */
              --shadow-subtle: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06);
              --shadow-soft: 0 4px 12px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.08);
              --shadow-medium: 0 8px 20px rgba(0, 0, 0, 0.08), 0 4px 6px rgba(0, 0, 0, 0.1);
            }

            * {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            body {
              font-size: 20px;
              line-height: 1.7;
              letter-spacing: 0.01em;
            }

            .text-base {
              font-size: 20px;
            }
            
            .text-lg {
              font-size: 22px;
            }
            
            .text-xl {
              font-size: 26px;
            }
            
            .text-2xl {
              font-size: 32px;
            }
            
            .text-3xl {
              font-size: 40px;
            }

            .text-4xl {
              font-size: 48px;
            }

            .text-5xl {
              font-size: 56px;
            }

            /* Custom sidebar width */
            .sidebar-custom-width {
              width: 280px !important;
              min-width: 280px !important;
            }
          `}
        </style>
        
        <Sidebar className="border-r-0 bg-white shadow-[var(--shadow-soft)] sidebar-custom-width">
          <SidebarHeader className="py-10 px-8 border-b border-slate-100/60">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[1.5rem] flex items-center justify-center border border-blue-100/50 shadow-[var(--shadow-soft)]">
                <Brain className="w-8 h-8 text-[var(--soft-blue)]" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-semibold text-[var(--text-main)] leading-tight">DIVRGNT.io</h1>
                <p className="text-base text-[var(--text-muted)] font-normal leading-relaxed">learning without limits</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="py-8 px-6">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`transition-all duration-300 rounded-[1.5rem] py-4 px-6 text-lg font-medium min-h-[3.5rem] ${
                          location.pathname === item.url 
                            ? 'bg-gradient-to-r from-[var(--soft-blue-light)] to-blue-50/80 text-[var(--soft-blue-dark)] shadow-[var(--shadow-subtle)] border border-[var(--soft-blue)]/20 scale-[1.02]' 
                            : 'text-slate-600 hover:text-[var(--text-main)] hover:bg-slate-50/80 hover:scale-[1.01] hover:shadow-[var(--shadow-subtle)]'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-4 w-full">
                          <item.icon className="w-6 h-6 flex-shrink-0" />
                          <span className="flex-1">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col bg-slate-50/30">
          <header className="h-20 flex items-center justify-end px-8 border-b border-slate-100/60 bg-white/80 backdrop-blur-md shadow-[var(--shadow-subtle)]">
            <SidebarTrigger className="lg:hidden p-3 rounded-[1.5rem] hover:bg-slate-50/80 transition-colors">
              <BookOpen className="w-6 h-6" />
            </SidebarTrigger>
          </header>

          <div className="flex-1 overflow-auto py-12 px-8 md:py-16 md:px-12">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}