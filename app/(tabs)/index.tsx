import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Href, Link, RelativePathString } from "expo-router";
import { Image } from "expo-image";
import { ServiceJob } from "@/types";
import { fetchJobs, fetchJobsFromSalesforce } from "@/lib/api";

const statusColors: Record<string, string> = {
  Dispatched: "bg-[#FF8C00]",
  "En Route": "bg-[#0035AD]",
  "In Progress": "bg-emerald-500",
  Complete: "bg-zinc-400 dark:bg-zinc-600",
};

const priorityColors: Record<string, string> = {
  Low: "bg-zinc-400 dark:bg-zinc-600",
  Medium: "bg-[#0035AD]",
  High: "bg-[#FF8C00]",
  Urgent: "bg-red-600",
};

const jobTypeIcons: Record<string, string> = {
  Dispatch: "🏗️",
  Service: "🔧",
  Inspection: "📋",
  Rigging: "⛓️",
};

function JobCard({ job, isSalesforce }: { job: ServiceJob; isSalesforce: boolean }) {
  const scheduledDate = new Date(job.scheduledDate);
  const isToday = new Date().toDateString() === scheduledDate.toDateString();
  const timeString = scheduledDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const href: Href = isSalesforce ? `/job/${job.id}?source=salesforce` : `/job/${job.id}`;

  return (
    <Link href={href} asChild>
      <Pressable className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-3 active:bg-zinc-50 dark:active:bg-zinc-800 shadow-sm">
        {/* Salesforce Badge */}
        {isSalesforce && (
          <View className="absolute top-2 right-2 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
            <Text className="text-[#0035AD] dark:text-blue-300 text-xs font-bold">SALESFORCE</Text>
          </View>
        )}
        
        {/* Header Row */}
        <View className="flex-row justify-between items-start mb-3 pr-20">
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl">{jobTypeIcons[job.jobType] || "📋"}</Text>
            <View>
              <Text className="text-[#444444] dark:text-white font-bold text-lg">
                {job.workOrderNumber}
              </Text>
              <Text className="text-zinc-500 text-sm">{job.jobType}</Text>
            </View>
          </View>
        </View>

        {/* Customer & Equipment */}
        <Text className="text-[#444444] dark:text-white font-semibold text-base mb-1">
          {job.customerName}
        </Text>
        <Text className="text-[#0035AD] font-medium text-sm mb-2">
          {job.equipmentModel}
        </Text>

        {/* Address */}
        {job.siteAddress && (
          <Text className="text-zinc-500 text-sm mb-3" numberOfLines={1}>
            📍 {job.siteAddress}
          </Text>
        )}

        {/* Footer Row */}
        <View className="flex-row justify-between items-center pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <View className="flex-row items-center gap-2">
            <View
              className={`${statusColors[job.status] || "bg-zinc-400"} px-2 py-1 rounded-full`}
            >
              <Text className="text-white text-xs font-bold">
                {job.status?.toUpperCase()}
              </Text>
            </View>
            <View className={`${priorityColors[job.priority] || "bg-zinc-400"} px-2 py-1 rounded`}>
              <Text className="text-white text-xs font-bold">
                {job.priority?.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text className="text-zinc-500 text-sm">
            {isToday ? `Today ${timeString}` : scheduledDate.toLocaleDateString()}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

export default function JobsScreen() {
  const [jobs, setJobs] = useState<ServiceJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSalesforce, setShowSalesforce] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      setError(null);
      const data = showSalesforce 
        ? await fetchJobsFromSalesforce()
        : await fetchJobs();
      setJobs(data);
    } catch (e) {
      setError("Could not connect to WorkPro API");
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showSalesforce]);

  useEffect(() => {
    setLoading(true);
    loadJobs();
  }, [loadJobs, showSalesforce]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadJobs();
  }, [loadJobs]);

  if (loading) {
    return (
      <View className="flex-1 bg-white dark:bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#FF8C00" />
        <Text className="text-zinc-500 mt-4">
          {showSalesforce ? "Loading from Salesforce..." : "Loading jobs..."}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-white dark:bg-black justify-center items-center px-6">
        <Text className="text-4xl mb-4">⚠️</Text>
        <Text className="text-[#444444] dark:text-white text-lg font-bold text-center mb-2">
          Connection Error
        </Text>
        <Text className="text-zinc-500 text-center mb-6">{error}</Text>
        <Pressable
          onPress={loadJobs}
          className="bg-[#FF8C00] px-6 py-3 rounded-lg active:opacity-80"
        >
          <Text className="text-white font-bold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const activeJobs = jobs.filter((j) => j.status !== "Complete");

  return (
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
        <Text className="text-white text-2xl font-bold">Field Service</Text>
        <Text className="text-white/70 mt-1">
          {activeJobs.length} active job{activeJobs.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Data Source Toggle */}
      <View className="flex-row px-4 pt-4 gap-2">
        <Pressable
          onPress={() => setShowSalesforce(false)}
          className={`flex-1 py-2 rounded-lg items-center ${
            !showSalesforce ? "bg-[#0035AD]" : "bg-zinc-200 dark:bg-zinc-800"
          }`}
        >
          <Text className={`font-semibold ${!showSalesforce ? "text-white" : "text-[#444444] dark:text-white"}`}>
            Local
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setShowSalesforce(true)}
          className={`flex-1 py-2 rounded-lg items-center ${
            showSalesforce ? "bg-[#0035AD]" : "bg-zinc-200 dark:bg-zinc-800"
          }`}
        >
          <Text className={`font-semibold ${showSalesforce ? "text-white" : "text-[#444444] dark:text-white"}`}>
            Salesforce
          </Text>
        </Pressable>
      </View>

      {/* Job List */}
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <JobCard job={item} isSalesforce={showSalesforce} />}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF8C00"
          />
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-zinc-500 text-lg">
              {showSalesforce ? "No cases in Salesforce" : "No jobs scheduled"}
            </Text>
          </View>
        }
      />
    </View>
  );
}