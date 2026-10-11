import { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/ui/Text/Text";
import classes from "./AdminRow.module.scss";

type Props = { title: string; lines?: string[]; right?: ReactNode; onPress?: () => void };

// One row of an admin list: title, small lines under it, an optional badge or value at the end. Tappable when onPress is given.
export function AdminRow({ title, lines = [], right, onPress }: Props) {
    const body = (
        <>
            <View style={classes.text}>
                <Text variant="bodyLarge" numberOfLines={1}>{title}</Text>
                {lines.map((line, i) => (
                    <Text key={i} variant="caption" tone="inkMuted" numberOfLines={2}>{line}</Text>
                ))}
            </View>
            {right}
        </>
    );
    if (!onPress) return <View style={classes.row}>{body}</View>;
    return (
        <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [classes.row, pressed && classes.pressed]}>
            {body}
        </Pressable>
    );
}
