import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { AnswerValue, PreferenceAnswer } from "@/lib/questions";

export function PreferenceQuestion({ options, value, onChange }: {
  options: string[]; value: AnswerValue | undefined; onChange: (value: PreferenceAnswer) => void;
}) {
  const answer: PreferenceAnswer = value && typeof value === "object" && !Array.isArray(value)
    ? value : { self: "", acceptable: [], required: false };
  return <View style={{ gap: 12 }}>
    <Text style={styles.label}>Your answer</Text>
    {[...options, "Prefer not to say"].map(option => <TouchableOpacity key={option}
      accessibilityRole="radio" accessibilityState={{ selected: answer.self === option }}
      onPress={() => onChange({ ...answer, self: option })} style={[styles.option, answer.self === option && styles.selected]}>
      <Text>{answer.self === option ? "● " : "○ "}{option}</Text>
    </TouchableOpacity>)}
    <Text style={styles.label}>Answers you would accept in a partner</Text>
    {options.map(option => <TouchableOpacity key={option} accessibilityRole="checkbox"
      accessibilityState={{ checked: answer.acceptable.includes(option) }}
      onPress={() => onChange({ ...answer, acceptable: answer.acceptable.includes(option)
        ? answer.acceptable.filter(v => v !== option) : [...answer.acceptable, option] })}
      style={[styles.option, answer.acceptable.includes(option) && styles.selected]}>
      <Text>{answer.acceptable.includes(option) ? "☑ " : "☐ "}{option}</Text>
    </TouchableOpacity>)}
    <TouchableOpacity onPress={() => onChange({ ...answer, acceptable: [...options] })}><Text style={styles.link}>Accept any of these answers</Text></TouchableOpacity>
    <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: answer.required }}
      onPress={() => onChange({ ...answer, required: !answer.required })} style={styles.option}>
      <Text>{answer.required ? "☑" : "☐"} Firm requirement: only introduce people with a known, accepted answer.</Text>
    </TouchableOpacity>
  </View>;
}
const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", color: "#374151" },
  option: { padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb", backgroundColor: "white" },
  selected: { borderColor: "#f43f5e", backgroundColor: "#fff1f2" },
  link: { color: "#e11d48", fontSize: 13 },
});
