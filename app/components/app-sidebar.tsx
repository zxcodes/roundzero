import {
  AddCircleIcon,
  Briefcase01Icon,
  BubbleChatIcon,
  House01Icon,
  Search01Icon,
  Setting06Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { User } from "@/router";

const companyMain = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: <HugeiconsIcon icon={House01Icon} strokeWidth={2} className="size-4" />,
  },
  {
    title: "Jobs",
    url: "/dashboard/jobs",
    icon: <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-4" />,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: <HugeiconsIcon icon={Setting06Icon} strokeWidth={2} className="size-4" />,
  },
];

const candidateMain = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: <HugeiconsIcon icon={House01Icon} strokeWidth={2} className="size-4" />,
  },
  {
    title: "Browse Jobs",
    url: "/dashboard/jobs",
    icon: <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="size-4" />,
  },
  {
    title: "My Applications",
    url: "/dashboard/applications",
    icon: <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-4" />,
  },
  {
    title: "Interviews",
    url: "/interview",
    icon: <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-4" />,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: <HugeiconsIcon icon={Setting06Icon} strokeWidth={2} className="size-4" />,
  },
];

export function AppSidebar({
  user,
  isCompany,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: User; isCompany: boolean }) {
  const mainItems = isCompany ? companyMain : candidateMain;

  return (
    <Sidebar collapsible="offcanvas" {...props} variant="floating">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2.5 px-1 py-0.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-bold text-primary-foreground">R0</span>
          </div>
          <span className="text-base font-semibold tracking-tight">roundzero</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {isCompany ? (
                <SidebarMenuItem className="flex items-center gap-2">
                  <SidebarMenuButton
                    asChild
                    className="bg-primary text-primary-foreground min-w-8 hover:bg-primary/90 hover:text-primary-foreground"
                  >
                    <Link to="/dashboard/jobs/new">
                      <HugeiconsIcon icon={AddCircleIcon} strokeWidth={2} className="size-4" />
                      <span>Post a job</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <NavMain sections={[{ items: mainItems }]} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
