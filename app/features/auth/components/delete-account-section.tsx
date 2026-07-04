import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { currentUserQueryKey, deleteAccount } from "@/features/auth/server/functions";

export function DeleteAccountSection() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const deleteAccountFn = useServerFn(deleteAccount);
  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccountFn,
    onSuccess: async () => {
      toast.success(
        "Your account has been scheduled for deletion. You have 30 days to log back in if you change your mind.",
      );
      queryClient.setQueryData(currentUserQueryKey, null);
      await router.navigate({ to: "/" });
      await router.invalidate();
    },
    onError: () => {
      toast.error("Failed to delete account. Please try again.");
    },
  });

  const onDelete = async () => {
    await deleteAccountMutation.mutateAsync({});
  };

  return (
    <section className="space-y-4 rounded-3xl border border-destructive/20 px-5 py-4 md:px-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-destructive">Delete account</h2>
        <p className="text-sm text-muted-foreground">
          Permanently remove your account and all associated data.
        </p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={deleteAccountMutation.isPending}>
            {deleteAccountMutation.isPending ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="size-4 animate-spin"
                />
                Deleting...
              </>
            ) : (
              "Delete account"
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your account will be deactivated immediately. If you log back in within 30 days, your
              account will be restored automatically. After 30 days, your account and all associated
              data will be permanently deleted and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} variant="destructive">
              Delete my account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
