import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminRow } from "@/components/AdminRow/AdminRow";
import { Button } from "@/ui/Button/Button";
import { EmptyState } from "@/ui/EmptyState/EmptyState";
import { FormSection } from "@/ui/FormSection/FormSection";
import { Input } from "@/ui/Input/Input";
import { Modal } from "@/ui/Modal/Modal";
import { useToast } from "@/ui/Toast/Toast";
import { supabase } from "@/lib/supabase";

type Plan = { id: string; name: string; scans_per_month: number | null; max_pieces: number | null };

const toNumber = (text: string) => (text.trim() === "" ? null : Math.max(0, Math.round(Number(text))));

export function PlansTab() {
    const { t } = useTranslation();
    const toast = useToast();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [editing, setEditing] = useState<Plan>();
    const [scans, setScans] = useState("");
    const [pieces, setPieces] = useState("");

    const load = useCallback(async () => {
        const { data } = await supabase.from("plans").select("id, name, scans_per_month, max_pieces").order("id");
        setPlans((data as Plan[]) ?? []);
    }, []);
    useEffect(() => { load(); }, [load]);

    const open = (p: Plan) => { setEditing(p); setScans(p.scans_per_month?.toString() ?? ""); setPieces(p.max_pieces?.toString() ?? ""); };
    const save = async () => {
        if (!editing) return;
        const { error } = await supabase.from("plans").update({ scans_per_month: toNumber(scans), max_pieces: toNumber(pieces), updated_at: new Date().toISOString() }).eq("id", editing.id);
        toast(error ? t("error.generic") : t("admin.saved"), error ? "default" : "success");
        setEditing(undefined);
        load();
    };

    const unlimited = t("admin.unlimited");
    if (!plans.length) return <EmptyState title={t("admin.empty")} />;
    return (
        <>
            {plans.map((p) => (
                <AdminRow key={p.id} title={p.name} lines={[`${p.scans_per_month ?? unlimited} / ${p.max_pieces ?? unlimited}`]} onPress={() => open(p)} />
            ))}
            <Modal open={!!editing} onClose={() => setEditing(undefined)} title={editing?.name} hasCloseBtn closeLabel={t("common.back")} mobileCard
                footer={<Button onPress={save}>{t("admin.save")}</Button>}>
                <FormSection title={t("admin.plan")}>
                    <Input label={t("admin.scansPerMonth")} value={scans} onChangeText={setScans} keyboardType="number-pad" />
                    <Input label={t("admin.maxPieces")} value={pieces} onChangeText={setPieces} keyboardType="number-pad" />
                </FormSection>
            </Modal>
        </>
    );
}
