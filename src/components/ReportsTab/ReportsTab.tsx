import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminRow } from "@/components/AdminRow/AdminRow";
import { Badge, BadgeStatus } from "@/ui/Badge/Badge";
import { Button } from "@/ui/Button/Button";
import { EmptyState } from "@/ui/EmptyState/EmptyState";
import { FormSection } from "@/ui/FormSection/FormSection";
import { Modal } from "@/ui/Modal/Modal";
import { RadioGroup } from "@/ui/RadioGroup/RadioGroup";
import { Text } from "@/ui/Text/Text";
import { useToast } from "@/ui/Toast/Toast";
import { supabase } from "@/lib/supabase";

type Report = { id: string; kind: "bug" | "idea" | "other"; message: string; status: string; email: string | null; created_at: string };

const STATUSES = ["new", "in_progress", "done", "wont_do"] as const;
const BADGE: Record<string, BadgeStatus> = { new: "warning", in_progress: "processing", done: "done", wont_do: "queued" };

export function ReportsTab() {
    const { t } = useTranslation();
    const toast = useToast();
    const [reports, setReports] = useState<Report[]>([]);
    const [open, setOpen] = useState<Report>();
    const [status, setStatus] = useState("new");

    const load = useCallback(async () => {
        const { data } = await supabase.rpc("admin_feedback");
        setReports((data as Report[]) ?? []);
    }, []);
    useEffect(() => { load(); }, [load]);

    const save = async () => {
        if (!open) return;
        const { error } = await supabase.from("feedback").update({ status }).eq("id", open.id);
        toast(error ? t("error.generic") : t("admin.saved"), error ? "default" : "success");
        setOpen(undefined);
        load();
    };

    if (!reports.length) return <EmptyState title={t("admin.empty")} />;
    return (
        <>
            {reports.map((r) => (
                <AdminRow
                    key={r.id}
                    title={t(`feedback.${r.kind}`)}
                    lines={[r.message, `${r.email ?? ""} ${new Date(r.created_at).toLocaleDateString()}`.trim()]}
                    right={<Badge status={BADGE[r.status] ?? "queued"} label={t(`admin.status.${r.status}`)} size="small" />}
                    onPress={() => { setOpen(r); setStatus(r.status); }}
                />
            ))}
            <Modal open={!!open} onClose={() => setOpen(undefined)} title={open ? t(`feedback.${open.kind}`) : ""} hasCloseBtn closeLabel={t("common.back")} mobileCard
                footer={<Button onPress={save}>{t("admin.save")}</Button>}>
                <FormSection title={t("admin.status")}>
                    <Text variant="body">{open?.message}</Text>
                    <RadioGroup options={STATUSES.map((s) => ({ value: s, label: t(`admin.status.${s}`) }))} value={status} onChange={setStatus} />
                </FormSection>
            </Modal>
        </>
    );
}
