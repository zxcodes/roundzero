import {
  AddCircleIcon,
  Briefcase01Icon,
  BubbleChatIcon,
  CheckmarkCircle02Icon,
  CreditCardIcon,
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
import { useAuth } from "@/features/auth/provider";
import { FeedbackDialog } from "@/features/feedback/components/feedback-dialog";
import type { User } from "@/router";
import { Logo } from "./public-layout";

const buildCompanyMain = (showBilling: boolean) => [
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
    title: "Shortlisted",
    url: "/dashboard/shortlisted",
    icon: <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />,
  },
  ...(showBilling
    ? [
        {
          title: "Billing",
          url: "/dashboard/billing",
          icon: <HugeiconsIcon icon={CreditCardIcon} strokeWidth={2} className="size-4" />,
        },
      ]
    : []),
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
  membershipRole,
  atLimit,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: User;
  isCompany: boolean;
  membershipRole: string | null;
  atLimit: boolean;
}) {
  const { signOut, isSigningOut } = useAuth();
  const mainItems = isCompany ? buildCompanyMain(membershipRole === "owner") : candidateMain;

  return (
    <Sidebar collapsible="offcanvas" {...props} variant="floating">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-1 px-1 py-0.5">
          <Logo />
          <span
            className="font-heading text-[18px] leading-none tracking-[-0.01em]"
            style={{ fontWeight: 400 }}
          >
            RoundZero
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {isCompany ? (
                <SidebarMenuItem className="flex items-center gap-2">
                  {atLimit ? (
                    <SidebarMenuButton
                      asChild
                      className="bg-brand text-brand-foreground min-w-8 hover:bg-brand/90 hover:text-brand-foreground shadow-sm shadow-brand/20"
                    >
                      <Link to="/dashboard/billing">
                        <HugeiconsIcon icon={AddCircleIcon} strokeWidth={2} className="size-4" />
                        <span>Upgrade to Pro</span>
                      </Link>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      className="bg-brand text-brand-foreground min-w-8 hover:bg-brand/90 hover:text-brand-foreground shadow-sm shadow-brand/20"
                    >
                      <Link to="/dashboard/jobs/new">
                        <HugeiconsIcon icon={AddCircleIcon} strokeWidth={2} className="size-4" />
                        <span>Post a job</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <NavMain sections={[{ items: mainItems }]} />
      </SidebarContent>

      <SidebarFooter className="flex flex-col gap-2">
        <FeedbackDialog />
        <NavUser user={user} onSignOut={signOut} isSigningOut={isSigningOut} />
      </SidebarFooter>
    </Sidebar>
  );
}
