import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { createJob, CreateJobInput } from "@/lib/api";
import { Image } from "expo-image";

const priorityOptions = ["Low", "Medium", "High", "Urgent"];
const jobTypeOptions = ["Dispatch", "Service", "Inspection", "Rigging"];
const equipmentTypes = ["Crane", "Rigging"];

function SelectButton({ 
  label, 
  selected, 
  onPress 
}: { 
  label: string; 
  selected: boolean; 
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-2 rounded-lg mr-2 mb-2 ${
        selected 
          ? "bg-[#0035AD]" 
          : "bg-zinc-200 dark:bg-zinc-800"
      }`}
    >
      <Text className={`font-medium ${
        selected 
          ? "text-white" 
          : "text-[#444444] dark:text-white"
      }`}>
        {label}
      </Text>
    </Pressable>
  );
}

function FormField({ 
  label, 
  value, 
  onChangeText, 
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View className="mb-4">
      <Text className="text-zinc-500 text-xs font-bold tracking-wider mb-2">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        className={`bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-[#444444] dark:text-white ${
          multiline ? "min-h-[80px] text-top" : ""
        }`}
        style={multiline ? { textAlignVertical: "top" } : {}}
      />
    </View>
  );
}

export default function ManageJobsScreen() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState<CreateJobInput>({
    customerName: "",
    siteAddress: "",
    equipmentType: "Crane",
    equipmentModel: "",
    priority: "Medium",
    scheduledDate: new Date().toISOString(),
    technicianName: "",
    jobType: "Dispatch",
    notes: "",
  });

  const updateForm = (key: keyof CreateJobInput, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!form.customerName || !form.siteAddress || !form.equipmentModel || !form.technicianName) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      await createJob(form);
      Alert.alert("Success", "Job created successfully!", [
        { text: "OK", onPress: () => {
          // Reset form
          setForm({
            customerName: "",
            siteAddress: "",
            equipmentType: "Crane",
            equipmentModel: "",
            priority: "Medium",
            scheduledDate: new Date().toISOString(),
            technicianName: "",
            jobType: "Dispatch",
            notes: "",
          });
        }}
      ]);
    } catch (e) {
      Alert.alert("Error", "Failed to create job. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <View className="flex-1 bg-zinc-100 dark:bg-black">
        {/* Header */}
        <View className="bg-[#0035AD] pt-14 pb-5 px-5">
          <View className="flex-row items-center justify-between mb-3">
            <Image
              source={require("@/assets/images/bigge-logo.svg")}
              style={{ width: 100, height: 32, tintColor: "white" }}
              contentFit="contain"
            />
            <View className="bg-white/20 px-2 py-1 rounded">
              <Text className="text-white text-xs font-bold">WORKPRO</Text>
            </View>
          </View>
          <Text className="text-white text-2xl font-bold">Create Job</Text>
          <Text className="text-white/70 mt-1">Dispatch new work order</Text>
        </View>

        <ScrollView className="flex-1 px-4 pt-4">
          {/* Customer Info */}
          <View className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-4">
            <Text className="text-zinc-500 text-xs font-bold tracking-wider mb-3">
              CUSTOMER INFORMATION
            </Text>
            <FormField
              label="CUSTOMER NAME *"
              value={form.customerName}
              onChangeText={(v) => updateForm("customerName", v)}
              placeholder="e.g. Turner Construction"
            />
            <FormField
              label="SITE ADDRESS *"
              value={form.siteAddress}
              onChangeText={(v) => updateForm("siteAddress", v)}
              placeholder="e.g. 4200 Westheimer Rd, Houston, TX"
            />
          </View>

          {/* Equipment */}
          <View className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-4">
            <Text className="text-zinc-500 text-xs font-bold tracking-wider mb-3">
              EQUIPMENT
            </Text>
            
            <Text className="text-zinc-500 text-xs font-bold tracking-wider mb-2">
              TYPE
            </Text>
            <View className="flex-row flex-wrap mb-4">
              {equipmentTypes.map((type) => (
                <SelectButton
                  key={type}
                  label={type}
                  selected={form.equipmentType === type}
                  onPress={() => updateForm("equipmentType", type)}
                />
              ))}
            </View>

            <FormField
              label="MODEL *"
              value={form.equipmentModel}
              onChangeText={(v) => updateForm("equipmentModel", v)}
              placeholder="e.g. Liebherr LTM 1300-6.2"
            />
          </View>

          {/* Job Details */}
          <View className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-4">
            <Text className="text-zinc-500 text-xs font-bold tracking-wider mb-3">
              JOB DETAILS
            </Text>

            <Text className="text-zinc-500 text-xs font-bold tracking-wider mb-2">
              JOB TYPE
            </Text>
            <View className="flex-row flex-wrap mb-4">
              {jobTypeOptions.map((type) => (
                <SelectButton
                  key={type}
                  label={type}
                  selected={form.jobType === type}
                  onPress={() => updateForm("jobType", type)}
                />
              ))}
            </View>

            <Text className="text-zinc-500 text-xs font-bold tracking-wider mb-2">
              PRIORITY
            </Text>
            <View className="flex-row flex-wrap mb-4">
              {priorityOptions.map((priority) => (
                <SelectButton
                  key={priority}
                  label={priority}
                  selected={form.priority === priority}
                  onPress={() => updateForm("priority", priority)}
                />
              ))}
            </View>

            <FormField
              label="ASSIGNED TECHNICIAN *"
              value={form.technicianName}
              onChangeText={(v) => updateForm("technicianName", v)}
              placeholder="e.g. Marcus Johnson"
            />
          </View>

          {/* Notes */}
          <View className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-4">
            <Text className="text-zinc-500 text-xs font-bold tracking-wider mb-3">
              ADDITIONAL INFO
            </Text>
            <FormField
              label="NOTES"
              value={form.notes || ""}
              onChangeText={(v) => updateForm("notes", v)}
              placeholder="Any special instructions, contact info, etc."
              multiline
            />
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={saving}
            className="bg-[#FF8C00] py-4 rounded-xl items-center mb-8 active:opacity-80 disabled:opacity-50"
          >
            <Text className="text-white text-lg font-bold">
              {saving ? "Creating..." : "Create Work Order"}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}