import { useMutation } from "@tanstack/react-query";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteAccount } from "@/features/auth/server/functions";

export function DeleteAccountSection() {
  const router = useRouter();

  const deleteAccountFn = useServerFn(deleteAccount);
  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccountFn,
    onSuccess: async () => {
      toast.success(
        "Your account has been scheduled for deletion. You have 30 days to log back in if you change your mind.",
      );
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
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base text-destructive">Delete Account</CardTitle>
        <CardDescription>Permanently remove your account and all associated data.</CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={deleteAccountMutation.isPending}>
              {deleteAccountMutation.isPending ? "Deleting…" : "Delete account"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                Your account will be deactivated immediately. If you log back in within 30 days,
                your account will be restored automatically. After 30 days, your account and all
                associated data will be permanently deleted and cannot be recovered.
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
      </CardContent>
    </Card>
  );
}
