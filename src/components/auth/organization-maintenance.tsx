import { AuthCard, AuthPage } from "./auth-card";
import { AccountControls } from "./account-controls";

export function OrganizationMaintenance() {
  return (
    <AuthPage>
      <AuthCard
        title="Organization setup in progress"
        description="Shared work is temporarily unavailable while organization setup finishes. This page will update when access is ready."
      >
        <AccountControls />
      </AuthCard>
    </AuthPage>
  );
}
