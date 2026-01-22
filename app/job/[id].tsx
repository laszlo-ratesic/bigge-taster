import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
  RefreshControl,  // Add this
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ServiceJob, JobStatus } from "@/types";
import { fetchJob, fetchJobFromSalesforce, updateJobStatus, updateSalesforceJobStatus } from "@/lib/api";
import { geocodeAddress } from "@/lib/geocode";
import { Image } from "expo-image";
import MapView, { Marker } from "react-native-maps";

const colors = {
  blue: "#0035AD",
  orange: "#FF8C00",
  textDark: "#444444",
  white: "#FFFFFF",
};

const statusFlow: JobStatus[] = ["Dispatched", "En Route", "In Progress", "Complete"];

const statusColors: Record<string, string> = {
  Dispatched: "bg-[#FF8C00]",
  "En Route": "bg-[#0035AD]",
  "In Progress": "bg-emerald-500",
  Complete: "bg-zinc-400 dark:bg-zinc-600",
};

const priorityConfig: Record<string, { bg: string; text: string }> = {
  Low: { bg: "bg-zinc-200 dark:bg-zinc-800", text: "text-zinc-600 dark:text-zinc-300" },
  Medium: { bg: "bg-blue-100 dark:bg-blue-900", text: "text-[#0035AD] dark:text-blue-300" },
  High: { bg: "bg-orange-100 dark:bg-orange-900", text: "text-[#FF8C00] dark:text-orange-300" },
  Urgent: { bg: "bg-red-100 dark:bg-red-900", text: "text-red-600 dark:text-red-300" },
};

const jobTypeIcons: Record<string, string> = {
  Dispatch: "🏗️",
  Service: "🔧",
  Inspection: "📋",
  Rigging: "⛓️",
};

function InfoRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="mb-4">
      <Text className="text-zinc-500 text-xs font-bold tracking-wider mb-1">
        {label}
      </Text>
      <Text className={`${accent ? "text-[#0035AD]" : "text-[#444444] dark:text-white"} text-base`}>
        {value}
      </Text>
    </View>
  );
}

export default function JobDetailScreen() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();
  const router = useRouter();
  const [job, setJob] = useState<ServiceJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isSalesforce = source === "salesforce";

  useEffect(() => {
    if (id) {
      const fetchFn = isSalesforce ? fetchJobFromSalesforce : fetchJob;
      fetchFn(id)
        .then(setJob)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id, isSalesforce]);

  useEffect(() => {
    if (job?.siteAddress) {
      geocodeAddress(job.siteAddress).then(setCoordinates);
    }
  }, [job?.siteAddress]);

  const handleStatusUpdate = async (newStatus: JobStatus) => {
    if (!job || updating) return;
    
    setUpdating(true);
    try {
      if (isSalesforce) {
        await updateSalesforceJobStatus(job.id, newStatus);
        setJob({ ...job, status: newStatus });
      } else {
        const updated = await updateJobStatus(job.id, newStatus);
        setJob(updated);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const fetchFn = isSalesforce ? fetchJobFromSalesforce : fetchJob;
      const updated = await fetchFn(id);
      setJob(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  const openMapsNavigation = () => {
    if (!job) return;
    const scheme = Platform.select({ ios: "maps:", android: "geo:" });
    const url = Platform.select({
      ios: `maps:?daddr=${encodeURIComponent(job.siteAddress)}`,
      android: `geo:0,0?q=${encodeURIComponent(job.siteAddress)}`,
    });
    if (url) {
      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://maps.google.com/?daddr=${encodeURIComponent(job.siteAddress)}`);
      });
    }
  };

  const callSite = () => {
    const phoneMatch = job?.notes?.match(/\d{3}-\d{3}-\d{4}/);
    if (phoneMatch) {
      Linking.openURL(`tel:${phoneMatch[0]}`);
    } else {
      Alert.alert("No Contact", "No phone number found in job notes");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white dark:bg-black justify-center items-center">
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  if (!job) {
    return (
      <View className="flex-1 bg-white dark:bg-black justify-center items-center">
        <Text className="text-[#444444] dark:text-white text-lg">Job not found</Text>
      </View>
    );
  }

  const scheduledDate = new Date(job.scheduledDate);
  const currentStatusIndex = statusFlow.indexOf(job.status as JobStatus);
  const nextStatus = statusFlow[currentStatusIndex + 1];
  const priorityStyle = priorityConfig[job.priority] || priorityConfig.Medium;

  return (
    <View className="flex-1 bg-zinc-100 dark:bg-black">
      {/* Header */}
      <View className="bg-[#0035AD] pt-14 pb-5 px-5">
        <View className="flex-row items-center justify-between mb-3">
          <Pressable onPress={() => router.back()} className="flex-row items-center">
            <Text className="text-white/80 text-base mr-3">←</Text>
            <Image
              source={require("@/assets/images/bigge-logo.svg")}
              style={{ width: 100, height: 32, tintColor: "white" }}
              contentFit="contain"
            />
          </Pressable>
          <View className="flex-row items-center gap-2">
            {isSalesforce && (
              <View className="bg-blue-400/30 px-2 py-1 rounded">
                <Text className="text-white text-xs font-bold">SALESFORCE</Text>
              </View>
            )}
            <View className="bg-white/20 px-2 py-1 rounded">
              <Text className="text-white text-xs font-bold">WORKPRO</Text>
            </View>
          </View>
        </View>
        
        <View className="flex-row justify-between items-start mt-2">
          <View className="flex-row items-center gap-3">
            <Text className="text-4xl">{jobTypeIcons[job.jobType] || "📋"}</Text>
            <View>
              <Text className="text-white text-2xl font-bold">
                {job.workOrderNumber}
              </Text>
              <Text className="text-white/70">{job.jobType}</Text>
            </View>
          </View>
          <View className={`${priorityStyle.bg} px-3 py-1 rounded`}>
            <Text className={`${priorityStyle.text} text-sm font-bold`}>
              {job.priority?.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF8C00"
          />
        }
      >
        {/* Status Section */}
        <View className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-zinc-500 text-xs font-bold tracking-wider mb-3">
            CURRENT STATUS {isSalesforce && "(SYNCED WITH SALESFORCE)"}
          </Text>
          <View className="flex-row gap-2 mb-4">
            {statusFlow.map((status, i) => (
              <View
                key={status}
                className={`flex-1 h-2 rounded-full ${
                  i <= currentStatusIndex ? statusColors[job.status] || "bg-zinc-400" : "bg-zinc-200 dark:bg-zinc-700"
                }`}
              />
            ))}
          </View>
          <View className="flex-row justify-between items-center">
            <View className={`${statusColors[job.status] || "bg-zinc-400"} px-3 py-2 rounded-lg`}>
              <Text className="text-white font-bold">{job.status}</Text>
            </View>
            {nextStatus && (
              <Pressable
                onPress={() => handleStatusUpdate(nextStatus)}
                disabled={updating}
                className="bg-[#FF8C00] px-4 py-2 rounded-lg active:opacity-80 disabled:opacity-50"
              >
                <Text className="text-white font-bold">
                  {updating ? "..." : `Mark ${nextStatus}`}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Location Section with Map */}
        <View className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden mb-4 shadow-sm">
          {coordinates ? (
            <MapView
              style={{ width: "100%", height: 180 }}
              initialRegion={{
                latitude: coordinates.lat,
                longitude: coordinates.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: coordinates.lat,
                  longitude: coordinates.lng,
                }}
                title={job.customerName}
                description={job.siteAddress}
              />
            </MapView>
          ) : job.siteAddress ? (
            <View 
              className="w-full bg-zinc-200 dark:bg-zinc-800 items-center justify-center"
              style={{ height: 180 }}
            >
              <ActivityIndicator size="small" color={colors.blue} />
              <Text className="text-zinc-500 text-sm mt-2">Loading map...</Text>
            </View>
          ) : null}
          
          <View className="p-4">
            <Text className="text-zinc-500 text-xs font-bold tracking-wider mb-3">
              CUSTOMER
            </Text>
            <InfoRow label="COMPANY" value={job.customerName} />
            {job.siteAddress && <InfoRow label="SITE ADDRESS" value={job.siteAddress} />}
            
            {job.siteAddress && (
              <View className="flex-row gap-3 mt-2">
                <Pressable
                  onPress={openMapsNavigation}
                  className="flex-1 bg-[#0035AD] py-3 rounded-lg items-center active:opacity-80"
                >
                  <Text className="text-white font-semibold">📍 Navigate</Text>
                </Pressable>
                <Pressable
                  onPress={callSite}
                  className="flex-1 bg-zinc-200 dark:bg-zinc-800 py-3 rounded-lg items-center active:opacity-80"
                >
                  <Text className="text-[#444444] dark:text-white font-semibold">📞 Call Site</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Equipment Section */}
        {job.equipmentModel && (
          <View className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-zinc-500 text-xs font-bold tracking-wider mb-3">
              EQUIPMENT
            </Text>
            <InfoRow label="TYPE" value={job.equipmentType} />
            <InfoRow label="MODEL" value={job.equipmentModel} accent />
          </View>
        )}

        {/* Schedule Section */}
        <View className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-zinc-500 text-xs font-bold tracking-wider mb-3">
            SCHEDULE
          </Text>
          <InfoRow
            label="DATE & TIME"
            value={scheduledDate.toLocaleString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          />
          {job.technicianName && <InfoRow label="ASSIGNED TECHNICIAN" value={job.technicianName} />}
        </View>

        {/* Notes Section */}
        {job.notes && (
          <View className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-8 shadow-sm">
            <Text className="text-zinc-500 text-xs font-bold tracking-wider mb-3">
              NOTES
            </Text>
            <Text className="text-[#444444] dark:text-zinc-300 leading-6">{job.notes}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}