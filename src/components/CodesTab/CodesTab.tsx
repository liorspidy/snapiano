import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminRow } from "@/components/AdminRow/AdminRow";
import { Button } from "@/ui/Button/Button";
import { EmptyState } from "@/ui/EmptyState/EmptyState";
import { FormSection } from "@/ui/FormSection/FormSection";
import { Input } from "@/ui/Input/Input";
import { Modal } from "@/ui/Modal/Modal";
import { RadioGroup } from "@/ui/RadioGroup/RadioGroup";
import { useToast } from "@/ui/Toast/Toast";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";

type Code = { code: string; plan_id: string; duration_days: number | null; max_uses: number; used_count: number };
type Plan = { id: string; name: string };

// Letters and digits without look-alikes (no 0/O, 1/I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => "PIANO-" + Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

export function CodesTab() {
    const { t } = useTranslation();
    const toast = useToast();
    const { session } = useAuth();
    const [codes, setCodes] = useState<Code[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [creating, setCreating] = useState(false);
    const [plan, setPlan] = useState("pro");
    const [days, setDays] = useState("");
    const [uses, setUses] = useState("1");

    const load = useCallback(async () => {
        const [c, p] = await Promise.all([
            supabase.from("access_codes").select("code, plan_id, duration_days, max_uses, used_count").order("created_at", { ascending: false }),
            supabase.from("plans").select("id, name").order("id"),
        ]);
        setCodes((c.data as Code[]) ?? []);
        setPlans((p.data as Plan[]) ?? []);
    }, []);
    useEffect(() => { load(); }, [load]);

    const create = async () => {
        const { error } = await supabase.from("access_codes").insert({
            code: newCode(),
            plan_id: plan,
            duration_days: days.trim() === "" ? null : Math.max(1, Math.round(Number(days))),
            max_uses: Math.max(1, Math.round(Number(uses) || 1)),
            created_by: session?.user.id,
        });
        toast(error ? t("error.generic") : t("admin.saved"), error ? "default" : "success");
        setCreating(false);
        load();
    };

    return (
        <>
            <Button secondary onPress={() => setCreating(true)}>{t("admin.newCode")}</Button>
            {codes.length === 0 && <EmptyState title={t("admin.empty")} />}
            {codes.map((c) => (
                <AdminRow
                    key={c.code}
                    title={c.code}
                    lines={[`${plans.find((p) => p.id === c.plan_id)?.name ?? c.plan_id} · ${t("admin.codeUses", { used: c.used_count, max: c.max_uses })}`]}
                />
            ))}
            <Modal open={creating} onClose={() => setCreating(false)} title={t("admin.newCode")} hasCloseBtn closeLabel={t("common.back")} mobileCard
                footer={<Button onPress={create}>{t("admin.save")}</Button>}>
                <FormSection title={t("admin.plan")}>
                    <RadioGroup options={plans.map((p) => ({ value: p.id, label: p.name }))} value={plan} onChange={setPlan} />
                    <Input label={t("admin.duration")} value={days} onChangeText={setDays} keyboardType="number-pad" />
                    <Input label={t("admin.maxUses")} value={uses} onChangeText={setUses} keyboardType="number-pad" />
                </FormSection>
            </Modal>
        </>
    );
}
