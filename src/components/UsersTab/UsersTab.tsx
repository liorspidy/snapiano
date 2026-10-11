import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { AdminRow } from "@/components/AdminRow/AdminRow";
import { useAuth } from "@/auth/AuthProvider";
import { Badge } from "@/ui/Badge/Badge";
import { Button } from "@/ui/Button/Button";
import { EmptyState } from "@/ui/EmptyState/EmptyState";
import { FormSection } from "@/ui/FormSection/FormSection";
import { Input } from "@/ui/Input/Input";
import { Modal } from "@/ui/Modal/Modal";
import { RadioGroup } from "@/ui/RadioGroup/RadioGroup";
import { Text } from "@/ui/Text/Text";
import { useToast } from "@/ui/Toast/Toast";
import { deleteUserFiles } from "@/lib/pieces";
import { supabase } from "@/lib/supabase";
import classes from "./UsersTab.module.scss";

type User = {
    id: string;
    email: string;
    display_name: string | null;
    role: string;
    plan_id: string;
    scans_this_month: number;
    created_at: string;
    banned_until: string | null;
};
type Plan = { id: string; name: string };

const DAY = 24 * 60 * 60 * 1000;
const DURATIONS = { "1w": 7 * DAY, "1m": 30 * DAY, "1y": 365 * DAY } as const;
type Duration = keyof typeof DURATIONS | "forever";

const isBanned = (u: User) => !!u.banned_until && (u.banned_until === "infinity" || new Date(u.banned_until) > new Date());

export function UsersTab() {
    const { t } = useTranslation();
    const toast = useToast();
    const { session } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [editing, setEditing] = useState<User>();
    const [deleting, setDeleting] = useState<User>();
    const [roleChange, setRoleChange] = useState<User>();
    const [banning, setBanning] = useState<User>();
    const [busy, setBusy] = useState(false);
    const [plan, setPlan] = useState("");
    const [duration, setDuration] = useState<Duration>("1w");
    const [banOpen, setBanOpen] = useState(false);
    const [query, setQuery] = useState("");

    const load = useCallback(async () => {
        const [u, p] = await Promise.all([supabase.rpc("admin_users"), supabase.from("plans").select("id, name").order("id")]);
        setUsers((u.data as User[]) ?? []);
        setPlans((p.data as Plan[]) ?? []);
    }, []);
    useEffect(() => { load(); }, [load]);

    const open = (u: User) => { setEditing(u); setPlan(u.plan_id); setDuration("1w"); setBanOpen(false); };

    // Runs one admin action, reports the result, refreshes the list and closes the dialog.
    const run = async (action: () => PromiseLike<{ error: unknown }>) => {
        setBusy(true);
        const { error } = await action();
        toast(error ? t("error.generic") : t("admin.saved"), error ? "default" : "success");
        setBusy(false);
        setEditing(undefined);
        setDeleting(undefined);
        setRoleChange(undefined);
        setBanning(undefined);
        load();
    };

    const savePlan = () => run(() => supabase.from("profiles").update({ plan_id: plan, plan_source: "admin", plan_until: null }).eq("id", editing!.id));
    const ban = () => run(() => supabase.rpc("admin_set_ban", {
        p_user: banning!.id,
        p_until: duration === "forever" ? "infinity" : new Date(Date.now() + DURATIONS[duration]).toISOString(),
    }));
    const unban = () => run(() => supabase.rpc("admin_set_ban", { p_user: editing!.id, p_until: null }));
    const toggleAdmin = () => run(() => supabase.rpc("admin_set_role", { p_user: roleChange!.id, p_role: roleChange!.role === "admin" ? "user" : "admin" }));
    const removeUser = () => run(async () => {
        await deleteUserFiles(deleting!.id);
        return supabase.rpc("admin_delete_user", { p_user: deleting!.id });
    });

    if (!users.length) return <EmptyState title={t("admin.empty")} />;
    const needle = query.trim().toLowerCase();
    const shown = needle ? users.filter((u) => `${u.email} ${u.display_name ?? ""}`.toLowerCase().includes(needle)) : users;
    const self = editing?.id === session?.user.id;

    return (
        <>
            <Input label={t("admin.search")} value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} />
            {shown.length === 0 && <EmptyState title={t("admin.noResults")} />}
            {shown.map((u) => (
                <AdminRow
                    key={u.id}
                    title={u.email}
                    lines={[`${plans.find((p) => p.id === u.plan_id)?.name ?? u.plan_id} · ${t("admin.scansThisMonth", { count: u.scans_this_month })}`]}
                    right={
                        isBanned(u) ? <Badge status="failed" label={t("admin.banUser")} size="small" />
                        : u.role === "admin" ? <Badge status="processing" label={t("admin.title")} size="small" />
                        : undefined
                    }
                    onPress={() => open(u)}
                />
            ))}

            <Modal open={!!editing} onClose={() => !busy && setEditing(undefined)} title={editing?.email} hasCloseBtn closeLabel={t("account.cancel")} mobileCard>
                <View style={classes.sections}>
                    <FormSection title={t("admin.plan")}>
                        <RadioGroup options={plans.map((p) => ({ value: p.id, label: p.name }))} value={plan} onChange={setPlan} />
                        <Button secondary onPress={savePlan} disabled={busy || plan === editing?.plan_id}>{t("admin.savePlan")}</Button>
                    </FormSection>

                    {self && (
                        <Text variant="body" tone="inkSecondary">
                            {t("admin.selfNote")}
                        </Text>
                    )}
                    {!self && editing && (
                        <>
                            {isBanned(editing) ? (
                                <FormSection title={t("admin.banUser")}>
                                    <Text variant="body" tone="error">
                                        {editing.banned_until === "infinity"
                                            ? t("admin.bannedForever")
                                            : t("admin.bannedUntil", { date: new Date(editing.banned_until!).toLocaleDateString() })}
                                    </Text>
                                    <Button secondary onPress={unban} disabled={busy}>{t("admin.unban")}</Button>
                                </FormSection>
                            ) : (
                                <>
                                    <Button secondary expanded={banOpen} onPress={() => setBanOpen((o) => !o)}>
                                        {t("admin.banUser")}
                                    </Button>
                                    {banOpen && (
                                        <FormSection title={t("admin.banUser")}>
                                            <RadioGroup
                                                options={(["1w", "1m", "1y", "forever"] as const).map((d) => ({ value: d, label: t(`admin.ban.${d}`) }))}
                                                value={duration}
                                                onChange={(v) => setDuration(v as Duration)}
                                            />
                                            <Button destructive onPress={() => { setBanning(editing); setEditing(undefined); }} disabled={busy}>{t("admin.banConfirm")}</Button>
                                        </FormSection>
                                    )}
                                </>
                            )}

                            <Button secondary onPress={() => { setRoleChange(editing); setEditing(undefined); }} disabled={busy}>
                                {t(editing.role === "admin" ? "admin.removeAdmin" : "admin.makeAdmin")}
                            </Button>
                            <Button destructive onPress={() => { setDeleting(editing); setEditing(undefined); }} disabled={busy}>
                                {t("admin.deleteUser")}
                            </Button>
                        </>
                    )}
                </View>
            </Modal>

            <Modal
                open={!!banning}
                onClose={() => !busy && setBanning(undefined)}
                title={t("admin.banTitle")}
                closeLabel={t("account.cancel")}
                mobileCard
                footer={
                    <View style={classes.sections}>
                        <Button destructive onPress={ban} isPending={busy} pending={t("auth.sending")}>{t("admin.banConfirm")}</Button>
                        <Button secondary onPress={() => setBanning(undefined)} disabled={busy}>{t("account.cancel")}</Button>
                    </View>
                }
            >
                <Text variant="bodyLarge" tone="inkSecondary">
                    {t("admin.banMessage", { email: banning?.email, length: t(`admin.ban.${duration}`) })}
                </Text>
            </Modal>

            <Modal
                open={!!roleChange}
                onClose={() => !busy && setRoleChange(undefined)}
                title={t(roleChange?.role === "admin" ? "admin.removeAdminTitle" : "admin.makeAdminTitle")}
                closeLabel={t("account.cancel")}
                mobileCard
                footer={
                    <View style={classes.sections}>
                        <Button onPress={toggleAdmin} isPending={busy} pending={t("auth.sending")}>
                            {t(roleChange?.role === "admin" ? "admin.removeAdmin" : "admin.makeAdmin")}
                        </Button>
                        <Button secondary onPress={() => setRoleChange(undefined)} disabled={busy}>{t("account.cancel")}</Button>
                    </View>
                }
            >
                <Text variant="bodyLarge" tone="inkSecondary">
                    {t(roleChange?.role === "admin" ? "admin.removeAdminMessage" : "admin.makeAdminMessage", { email: roleChange?.email })}
                </Text>
            </Modal>

            <Modal
                open={!!deleting}
                onClose={() => !busy && setDeleting(undefined)}
                title={t("admin.deleteUserTitle")}
                closeLabel={t("account.cancel")}
                mobileCard
                footer={
                    <View style={classes.sections}>
                        <Button destructive onPress={removeUser} isPending={busy} pending={t("auth.sending")}>{t("admin.deleteUser")}</Button>
                        <Button secondary onPress={() => setDeleting(undefined)} disabled={busy}>{t("account.cancel")}</Button>
                    </View>
                }
            >
                <Text variant="bodyLarge" tone="inkSecondary">{t("admin.deleteUserMessage", { email: deleting?.email })}</Text>
            </Modal>
        </>
    );
}
