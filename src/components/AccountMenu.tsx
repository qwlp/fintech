import type { ReactNode } from "react";
import { DropdownMenu } from "radix-ui";
import { LogOut, Settings, UserRound } from "lucide-react";
import "../styles/account-menu.css";

export default function AccountMenu({
  children,
  onProfile,
  onSetup,
  onSignOut,
}: {
  children: ReactNode;
  onProfile?: () => void;
  onSetup: () => void;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="account-menu"
          side="top"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          aria-label="Account actions"
        >
          <DropdownMenu.Label className="account-menu-label">
            Your account
          </DropdownMenu.Label>
          {onProfile && (
            <DropdownMenu.Item
              className="account-menu-item"
              onSelect={onProfile}
            >
              <UserRound size={16} aria-hidden="true" />
              View profile
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item className="account-menu-item" onSelect={onSetup}>
            <Settings size={16} aria-hidden="true" />
            Set up account
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="account-menu-separator" />
          <DropdownMenu.Item className="account-menu-item" onSelect={onSignOut}>
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
