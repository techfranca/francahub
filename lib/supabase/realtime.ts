"use client"

import { useEffect } from "react"
import { createClient } from "./client"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

type TableName =
  | "hub_clients"
  | "hub_credentials"
  | "hub_notes"
  | "hub_timeline_events"
  | "hub_meetings"
  | "hub_transcriptions"
  | "hub_campaigns"
  | "hub_campaign_metrics"
  | "hub_ai_insights"
  | "hub_ad_accounts"

/**
 * Subscribe to Supabase Realtime changes on a table.
 * Automatically cleans up on unmount.
 *
 * Usage:
 * ```
 * useRealtimeTable("hub_clients", () => { refetchClients() })
 * useRealtimeTable("hub_notes", () => { refetchNotes() }, { filter: `client_id=eq.${clientId}` })
 * ```
 */
export function useRealtimeTable(
  table: TableName,
  onChangeCallback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
  options?: { filter?: string }
) {
  useEffect(() => {
    const supabase = createClient()

    const channelConfig: {
      event: "INSERT" | "UPDATE" | "DELETE" | "*"
      schema: string
      table: string
      filter?: string
    } = {
      event: "*",
      schema: "public",
      table,
    }

    if (options?.filter) {
      channelConfig.filter = options.filter
    }

    const channel = supabase
      .channel(`realtime-${table}-${options?.filter || "all"}`)
      .on("postgres_changes", channelConfig, onChangeCallback)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, onChangeCallback, options?.filter])
}

/**
 * Subscribe to multiple tables at once.
 * Useful for pages that display data from several sources.
 */
export function useRealtimeTables(
  subscriptions: Array<{
    table: TableName
    filter?: string
  }>,
  onChangeCallback: () => void
) {
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase.channel("realtime-multi")

    for (const sub of subscriptions) {
      const config: {
        event: "*"
        schema: string
        table: string
        filter?: string
      } = {
        event: "*",
        schema: "public",
        table: sub.table,
      }
      if (sub.filter) config.filter = sub.filter
      channel.on("postgres_changes", config, onChangeCallback)
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(subscriptions), onChangeCallback])
}
