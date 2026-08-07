import {
  AddCircleIcon,
  Briefcase01Icon,
  BubbleChatIcon,
  CheckmarkCircle02Icon,
  CreditCardIcon,
  CustomerService01Icon,
  House01Icon,
  RankingIcon,
  Search01Icon,
  SecurityValidationIcon,
  Setting06Icon,
  UserGroupIcon,
  WorkflowCircle01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

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
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/features/auth/provider";
import { WorkflowGuideDialog } from "@/features/dashboard/components/workflow-guide-dialog";
import { FeedbackDialog } from "@/features/feedback/components/feedback-dialog";
import type { User } from "@/router";
import type { CompanyMemberRole } from "@/shared/enums";

import { Logo } from "./public-layout";

type SidebarNavItem = {
  title: string;
  url?: string;
  onSelect?: () => void;
  icon: React.ReactNode;
  matchPrefix?: boolean;
};

type SidebarNavSection = {
  label: string;
  items: SidebarNavItem[];
};

const buildCompanyNavSections = (
  showBilling: boolean,
  showTeam: boolean,
  onOpenGuide: () => void,
): SidebarNavSection[] => {
  const sections: SidebarNavSection[] = [
    {
      label: "Hiring",
      items: [
        {
          title: "Overview",
          url: "/dashboard",
          matchPrefix: false,
          icon: <HugeiconsIcon icon={House01Icon} strokeWidth={2} className="size-4" />,
        },
        {
          title: "Jobs",
          url: "/dashboard/jobs",
          icon: <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-4" />,
        },
      ],
    },
    {
      label: "Review",
      items: [
        {
          title: "Awaiting review",
          url: "/dashboard/awaiting-review",
          icon: <HugeiconsIcon icon={RankingIcon} strokeWidth={2} className="size-4" />,
        },
        {
          title: "Shortlisted",
          url: "/dashboard/shortlisted",
          icon: <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />,
        },
      ],
    },
    {
      label: "Company",
      items: [
        ...(showTeam
          ? [
              {
                title: "Team",
                url: "/dashboard/team",
                icon: <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-4" />,
              },
            ]
          : []),
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
          title: "How it works",
          onSelect: onOpenGuide,
          icon: <HugeiconsIcon icon={WorkflowCircle01Icon} strokeWidth={2} className="size-4" />,
        },
        {
          title: "Support",
          url: "/dashboard/support",
          icon: <HugeiconsIcon icon={CustomerService01Icon} strokeWidth={2} className="size-4" />,
        },
        {
          title: "Settings",
          url: "/dashboard/settings",
          icon: <HugeiconsIcon icon={Setting06Icon} strokeWidth={2} className="size-4" />,
        },
      ],
    },
  ];

  return sections.filter((section) => section.items.length > 0);
};

const buildCandidateNavSections = (onOpenGuide: () => void): SidebarNavSection[] => [
  {
    label: "Overview",
    items: [
      {
        title: "Overview",
        url: "/dashboard",
        matchPrefix: false,
        icon: <HugeiconsIcon icon={House01Icon} strokeWidth={2} className="size-4" />,
      },
    ],
  },
  {
    label: "Applications",
    items: [
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
    ],
  },
  {
    label: "Account",
    items: [
      {
        title: "How it works",
        onSelect: onOpenGuide,
        icon: <HugeiconsIcon icon={WorkflowCircle01Icon} strokeWidth={2} className="size-4" />,
      },
      {
        title: "Support",
        url: "/dashboard/support",
        icon: <HugeiconsIcon icon={CustomerService01Icon} strokeWidth={2} className="size-4" />,
      },
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: <HugeiconsIcon icon={Setting06Icon} strokeWidth={2} className="size-4" />,
      },
    ],
  },
];

export function AppSidebar({
  user,
  isCompany,
  membershipRole,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: User;
  isCompany: boolean;
  membershipRole: CompanyMemberRole | null;
}) {
  const { signOut, isSigningOut } = useAuth();
  const { setOpenMobile } = useSidebar();
  const [guideOpen, setGuideOpen] = useState(false);
  const canManageTeam = membershipRole === "owner" || membershipRole === "admin";
  const onOpenGuide = () => setGuideOpen(true);
  const onGuideOpenChange = (open: boolean) => {
    setGuideOpen(open);
    if (!open) setOpenMobile(false);
  };
  const navSections = isCompany
    ? buildCompanyNavSections(membershipRole === "owner", canManageTeam, onOpenGuide)
    : buildCandidateNavSections(onOpenGuide);

  if (user.isPlatformAdmin) {
    navSections.push({
      label: "Internal",
      items: [
        {
          title: "Admin",
          url: "/admin",
          matchPrefix: false,
          icon: <HugeiconsIcon icon={SecurityValidationIcon} strokeWidth={2} className="size-4" />,
        },
      ],
    });
  }

  return (
    <Sidebar collapsible="offcanvas" {...props} variant="floating">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-1 px-1 py-0.5 font-medium">
          <Logo />
          <span className="font-heading text-[18px] leading-none tracking-[-0.01em]">
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
                  <SidebarMenuButton
                    asChild
                    className="min-w-8 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                  >
                    <Link to="/dashboard/jobs/new" className="no-underline hover:no-underline">
                      <HugeiconsIcon icon={AddCircleIcon} strokeWidth={2} className="size-4" />
                      <span>Post a job</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <NavMain sections={navSections} />
      </SidebarContent>

      <SidebarFooter className="flex flex-col gap-2">
        <FeedbackDialog />
        <NavUser user={user} onSignOut={signOut} isSigningOut={isSigningOut} />
      </SidebarFooter>
      <WorkflowGuideDialog
        open={guideOpen}
        onOpenChange={onGuideOpenChange}
        isCompany={isCompany}
      />
    </Sidebar>
  );
}
