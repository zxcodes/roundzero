import { AnalyticsUpIcon, ArrowLeft01Icon, ChatFeedback01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Logo } from "@/components/public-layout";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/features/auth/provider";
import type { User } from "@/router";

const adminNavSections = [
  {
    label: "Platform",
    items: [
      {
        title: "Metrics",
        url: "/admin",
        matchPrefix: false,
        icon: <HugeiconsIcon icon={AnalyticsUpIcon} strokeWidth={2} className="size-4" />,
      },
      {
        title: "Feedback",
        url: "/admin/feedback",
        icon: <HugeiconsIcon icon={ChatFeedback01Icon} strokeWidth={2} className="size-4" />,
      },
    ],
  },
];

export function AdminSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: User;
}) {
  const { signOut, isSigningOut } = useAuth();

  return (
    <Sidebar collapsible="offcanvas" {...props} variant="floating">
      <SidebarHeader>
        <Link to="/admin" className="flex items-center gap-1 px-1 py-0.5 font-medium">
          <Logo />
          <span className="font-heading text-[18px] leading-none tracking-[-0.01em]">
            RoundZero
          </span>
          <span className="ml-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Admin
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <NavMain sections={adminNavSections} />
      </SidebarContent>

      <SidebarFooter className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Back to dashboard">
              <Link to="/dashboard" className="no-underline hover:no-underline">
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
                <span>Back to dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser user={user} onSignOut={signOut} isSigningOut={isSigningOut} />
      </SidebarFooter>
    </Sidebar>
  );
}
